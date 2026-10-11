"""Transactions Router - Upload, list, update, and delete transactions."""

import uuid
from typing import Optional
from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from pydantic import BaseModel, Field
import pandas as pd

from app.auth import get_current_user_id
from app.db import supabase
from app.services.csv_parser import parse_csv
from app.services.categorizer import categorize
from app.services.anomaly import flag_unusual
from app.services.ml_categorizer import MLCategorizer

router = APIRouter(prefix="/transactions", tags=["Transactions"])

# Initialize ML categorizer in memory
ml_clf = MLCategorizer(confidence_threshold=0.6)


class TransactionCategoryUpdate(BaseModel):
    category: str = Field(..., min_length=1, max_length=50)


class TransactionCreate(BaseModel):
    txn_date: str
    description: str
    amount: float
    txn_type: str = "debit"
    category: Optional[str] = None


@router.post("/upload")
async def upload_transactions(
    file: UploadFile = File(...),
    user_id: str = Depends(get_current_user_id)
):
    """Upload, parse, categorize, flag anomalies, and insert bank/UPI statement CSV."""
    if not file.filename.lower().endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV files are accepted.")

    # Security check: Limit upload size to 5MB
    content = await file.read()
    if len(content) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File size exceeds maximum allowed limit (5 MB).")

    try:
        parsed_rows = parse_csv(content)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to parse CSV file: {str(e)}")

    if not parsed_rows:
        raise HTTPException(status_code=400, detail="No valid transactions parsed from file.")

    # Fetch user's existing transactions to check duplicates and history
    existing_res = supabase.table("transactions").select("*").eq("user_id", user_id).execute()
    existing_txns = existing_res.data or []

    # Train ML categorizer if user already has categorized transactions
    if existing_txns:
        descs = [t["description"] for t in existing_txns if t.get("category") and t["category"] != "Uncategorized"]
        cats = [t["category"] for t in existing_txns if t.get("category") and t["category"] != "Uncategorized"]
        if len(descs) >= 10:
            ml_clf.train(descs, cats)

    # Set of existing keys to skip exact duplicates (date + description + amount)
    existing_set = {
        (t["txn_date"], t["description"].strip().lower(), float(t["amount"]), t["txn_type"])
        for t in existing_txns
    }

    upload_batch_id = str(uuid.uuid4())
    to_insert = []
    rows_skipped = 0
    category_counts = {}

    for row in parsed_rows:
        key = (row["txn_date"], row["description"].strip().lower(), float(row["amount"]), row["txn_type"])
        if key in existing_set:
            rows_skipped += 1
            continue

        # Rule-based categorization
        category = categorize(row["description"])

        # ML fallback if rule gave 'Uncategorized' and ML has confidence
        if category == "Uncategorized" and ml_clf.is_trained:
            ml_cat, conf = ml_clf.predict(row["description"])
            if ml_cat != "Uncategorized":
                category = ml_cat

        category_counts[category] = category_counts.get(category, 0) + 1

        to_insert.append({
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "txn_date": row["txn_date"],
            "description": row["description"],
            "amount": row["amount"],
            "txn_type": row["txn_type"],
            "category": category,
            "is_unusual": False,
            "upload_batch": upload_batch_id,
        })
        existing_set.add(key)

    if not to_insert:
        return {
            "message": "No new transactions imported. All entries were duplicates.",
            "rows_imported": 0,
            "rows_skipped": rows_skipped,
            "category_counts": category_counts,
            "unusual_count": 0,
        }

    # Anomaly detection over debits combining history + new batch
    all_debits = [t for t in (existing_txns + to_insert) if t["txn_type"] == "debit"]
    if all_debits:
        debits_df = pd.DataFrame(all_debits)
        flagged_df = flag_unusual(debits_df)
        unusual_ids = set(flagged_df[flagged_df["is_unusual"] == True]["id"].tolist())
        for row in to_insert:
            if row["id"] in unusual_ids:
                row["is_unusual"] = True

    # Insert into Supabase
    supabase.table("transactions").insert(to_insert).execute()

    unusual_count = sum(1 for r in to_insert if r["is_unusual"])

    return {
        "message": f"Successfully imported {len(to_insert)} transactions.",
        "rows_imported": len(to_insert),
        "rows_skipped": rows_skipped,
        "category_counts": category_counts,
        "unusual_count": unusual_count,
        "batch_id": upload_batch_id,
    }


@router.get("")
def list_transactions(
    month: Optional[str] = Query(None, description="Filter by YYYY-MM"),
    category: Optional[str] = Query(None, description="Filter by Category"),
    search: Optional[str] = Query(None, description="Search description"),
    txn_type: Optional[str] = Query(None, description="debit or credit"),
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=200),
    user_id: str = Depends(get_current_user_id),
):
    """Lists transactions with filtering, searching, and pagination."""
    res = supabase.table("transactions").select("*").eq("user_id", user_id).order("txn_date", desc=True).execute()
    data = res.data or []

    # Filter in memory or by query
    filtered = data
    if month:
        filtered = [t for t in filtered if t.get("txn_date", "").startswith(month)]
    if category and category != "All":
        filtered = [t for t in filtered if t.get("category", "").lower() == category.lower()]
    if txn_type and txn_type != "All":
        filtered = [t for t in filtered if t.get("txn_type", "").lower() == txn_type.lower()]
    if search:
        s = search.strip().lower()
        filtered = [t for t in filtered if s in t.get("description", "").lower()]

    total_count = len(filtered)
    start_idx = (page - 1) * limit
    end_idx = start_idx + limit
    paginated = filtered[start_idx:end_idx]

    return {
        "transactions": paginated,
        "total_count": total_count,
        "page": page,
        "limit": limit,
        "total_pages": max(1, (total_count + limit - 1) // limit),
    }


@router.patch("/{transaction_id}")
def update_transaction_category(
    transaction_id: str,
    payload: TransactionCategoryUpdate,
    user_id: str = Depends(get_current_user_id),
):
    """Allows user to re-categorize a transaction."""
    # Verify transaction belongs to user
    existing = supabase.table("transactions").select("*").eq("id", transaction_id).eq("user_id", user_id).execute()
    if not existing.data:
        raise HTTPException(status_code=404, detail="Transaction not found.")

    res = (
        supabase.table("transactions")
        .update({"category": payload.category.strip()})
        .eq("id", transaction_id)
        .eq("user_id", user_id)
        .execute()
    )
    return {"message": "Category updated successfully", "transaction": res.data[0] if res.data else None}


@router.delete("/{transaction_id}")
def delete_transaction(
    transaction_id: str,
    user_id: str = Depends(get_current_user_id),
):
    """Deletes a single transaction."""
    existing = supabase.table("transactions").select("*").eq("id", transaction_id).eq("user_id", user_id).execute()
    if not existing.data:
        raise HTTPException(status_code=404, detail="Transaction not found.")

    supabase.table("transactions").delete().eq("id", transaction_id).eq("user_id", user_id).execute()
    return {"message": "Transaction deleted successfully"}


@router.delete("")
def delete_all_user_data(
    user_id: str = Depends(get_current_user_id),
):
    """Security rule: 'Delete all my data' option."""
    supabase.table("transactions").delete().eq("user_id", user_id).execute()
    supabase.table("budgets").delete().eq("user_id", user_id).execute()
    supabase.table("subscriptions").delete().eq("user_id", user_id).execute()
    supabase.table("goals").delete().eq("user_id", user_id).execute()
    return {"message": "All user data deleted successfully."}


@router.post("/seed-demo")
def seed_demo_data(
    user_id: str = Depends(get_current_user_id),
):
    """Loads realistic synthetic transactions into the user's account for testing/demo."""
    sample_records = [
        ("2026-09-01", "Salary Credit", 45000.0, "credit", "Income"),
        ("2026-09-01", "DMart Grocery Store", 1850.0, "debit", "Groceries"),
        ("2026-09-02", "Uber Ride", 320.0, "debit", "Transport"),
        ("2026-09-03", "Netflix Subscription", 199.0, "debit", "Subscription"),
        ("2026-09-04", "Zomato Restaurant", 650.0, "debit", "Food & Dining"),
        ("2026-09-05", "Amazon Shopping", 1499.0, "debit", "Shopping"),
        ("2026-09-07", "Spotify Premium", 119.0, "debit", "Subscription"),
        ("2026-09-09", "Swiggy Food Delivery", 540.0, "debit", "Food & Dining"),
        ("2026-09-11", "Ola Cab Ride", 280.0, "debit", "Transport"),
        ("2026-09-14", "Jio Fiber Recharge", 499.0, "debit", "Bills & Utilities"),
        ("2026-09-16", "Flipkart Sale", 899.0, "debit", "Shopping"),
        ("2026-09-18", "Zomato Restaurant", 720.0, "debit", "Food & Dining"),
        ("2026-09-20", "BigBasket Groceries", 1210.0, "debit", "Groceries"),
        ("2026-09-22", "Myntra Fashion", 1150.0, "debit", "Shopping"),
        ("2026-09-25", "Apollo Pharmacy", 420.0, "debit", "Health"),
        ("2026-09-27", "Amazon Apple Electronics", 6500.0, "debit", "Shopping"), # Unusual
        ("2026-10-01", "Salary Credit", 45000.0, "credit", "Income"),
        ("2026-10-02", "Netflix Subscription", 199.0, "debit", "Subscription"),
        ("2026-10-03", "DMart Grocery Store", 1980.0, "debit", "Groceries"),
        ("2026-10-04", "Spotify Premium", 119.0, "debit", "Subscription"),
        ("2026-10-05", "Zomato Restaurant", 780.0, "debit", "Food & Dining"),
        ("2026-10-06", "Uber Ride", 340.0, "debit", "Transport"),
        ("2026-10-08", "Jio Fiber Recharge", 499.0, "debit", "Bills & Utilities"),
        ("2026-10-09", "Swiggy Order", 560.0, "debit", "Food & Dining"),
        ("2026-10-10", "Blinkit Quick Mart", 620.0, "debit", "Groceries"),
    ]

    # Clean existing demo or add
    to_insert = []
    for dt, desc, amt, typ, cat in sample_records:
        to_insert.append({
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "txn_date": dt,
            "description": desc,
            "amount": amt,
            "txn_type": typ,
            "category": cat,
            "is_unusual": (amt >= 5000.0 and typ == "debit"),
            "upload_batch": str(uuid.uuid4()),
        })

    supabase.table("transactions").insert(to_insert).execute()

    # Also seed a sample budget and goal if not present
    existing_budgets = supabase.table("budgets").select("*").eq("user_id", user_id).execute()
    if not existing_budgets.data:
        sample_budgets = [
            {"user_id": user_id, "category": "Food & Dining", "monthly_limit": 3000.0},
            {"user_id": user_id, "category": "Groceries", "monthly_limit": 5000.0},
            {"user_id": user_id, "category": "Shopping", "monthly_limit": 4000.0},
            {"user_id": user_id, "category": "Transport", "monthly_limit": 2000.0},
            {"user_id": user_id, "category": "Bills & Utilities", "monthly_limit": 1500.0},
        ]
        supabase.table("budgets").insert(sample_budgets).execute()

    existing_goals = supabase.table("goals").select("*").eq("user_id", user_id).execute()
    if not existing_goals.data:
        sample_goals = [
            {"user_id": user_id, "title": "Emergency Fund", "target_amount": 100000.0, "saved_amount": 42000.0, "target_date": "2027-04-30"},
            {"user_id": user_id, "title": "New Laptop", "target_amount": 60000.0, "saved_amount": 25000.0, "target_date": "2027-02-15"}
        ]
        supabase.table("goals").insert(sample_goals).execute()

    return {"message": "Demo transactions, budgets, and goals seeded successfully", "count": len(to_insert)}

