"""Budgets Router - CRUD and Status calculation against actual monthly spending."""

from datetime import date
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field

from app.auth import get_current_user_id
from app.db import supabase

router = APIRouter(prefix="/budgets", tags=["Budgets"])


class BudgetCreate(BaseModel):
    category: str = Field(..., min_length=1, max_length=50)
    monthly_limit: float = Field(..., ge=0)


class BudgetUpdate(BaseModel):
    monthly_limit: float = Field(..., ge=0)


@router.get("")
def list_budgets(user_id: str = Depends(get_current_user_id)):
    """Returns all category budgets configured by the user."""
    res = supabase.table("budgets").select("*").eq("user_id", user_id).execute()
    return res.data or []


@router.post("")
def set_or_create_budget(payload: BudgetCreate, user_id: str = Depends(get_current_user_id)):
    """Creates or updates a budget for a category."""
    clean_cat = payload.category.strip()
    # Check if budget already exists for this category
    existing = (
        supabase.table("budgets")
        .select("*")
        .eq("user_id", user_id)
        .eq("category", clean_cat)
        .execute()
    )

    if existing.data:
        bid = existing.data[0]["id"]
        res = (
            supabase.table("budgets")
            .update({"monthly_limit": payload.monthly_limit})
            .eq("id", bid)
            .eq("user_id", user_id)
            .execute()
        )
        return {"message": "Budget updated", "budget": res.data[0] if res.data else None}
    else:
        new_record = {
            "user_id": user_id,
            "category": clean_cat,
            "monthly_limit": payload.monthly_limit,
        }
        res = supabase.table("budgets").insert(new_record).execute()
        return {"message": "Budget created", "budget": res.data[0] if res.data else None}


@router.delete("/{budget_id}")
def delete_budget(budget_id: str, user_id: str = Depends(get_current_user_id)):
    """Deletes a category budget."""
    existing = supabase.table("budgets").select("*").eq("id", budget_id).eq("user_id", user_id).execute()
    if not existing.data:
        raise HTTPException(status_code=404, detail="Budget not found.")

    supabase.table("budgets").delete().eq("id", budget_id).eq("user_id", user_id).execute()
    return {"message": "Budget deleted successfully"}


@router.get("/status")
def get_budget_status(
    month: Optional[str] = Query(None, description="Month format YYYY-MM"),
    user_id: str = Depends(get_current_user_id),
):
    """Calculates budget status per category based on actual transaction debits.
    
    Status thresholds:
    - 'ok': < 80%
    - 'warning': 80% - 100%
    - 'over': > 100%
    """
    target_month = month or date.today().strftime("%Y-%m")

    # Fetch user's configured budgets
    budgets_res = supabase.table("budgets").select("*").eq("user_id", user_id).execute()
    budgets_list = budgets_res.data or []
    budget_map = {b["category"]: float(b["monthly_limit"]) for b in budgets_list}

    # Fetch user's debits for that month
    txns_res = supabase.table("transactions").select("*").eq("user_id", user_id).execute()
    all_txns = txns_res.data or []

    month_debits = [
        t for t in all_txns
        if t.get("txn_date", "").startswith(target_month) and t.get("txn_type") == "debit"
    ]

    # Calculate actual spending per category
    spent_map = {}
    for t in month_debits:
        cat = t.get("category", "Uncategorized")
        spent_map[cat] = spent_map.get(cat, 0.0) + float(t.get("amount", 0.0))

    all_categories = sorted(list(set(list(budget_map.keys()) + list(spent_map.keys()))))

    categories_status = []
    total_budget = 0.0
    total_spent = 0.0

    for cat in all_categories:
        limit = budget_map.get(cat, 0.0)
        spent = round(spent_map.get(cat, 0.0), 2)
        total_budget += limit
        total_spent += spent

        if limit > 0:
            percent_used = round((spent / limit) * 100, 1)
            remaining = round(max(0.0, limit - spent), 2)
            over_amount = round(max(0.0, spent - limit), 2)
            if percent_used > 100:
                status = "over"
            elif percent_used >= 80:
                status = "warning"
            else:
                status = "ok"
        else:
            percent_used = 100.0 if spent > 0 else 0.0
            remaining = 0.0
            over_amount = spent
            status = "over" if spent > 0 else "ok"

        categories_status.append({
            "category": cat,
            "monthly_limit": round(limit, 2),
            "spent": spent,
            "remaining": remaining,
            "over_amount": over_amount,
            "percent_used": percent_used,
            "status": status,
            "has_budget": limit > 0,
        })

    overall_percent = round((total_spent / total_budget * 100), 1) if total_budget > 0 else 0.0
    overall_status = "over" if total_spent > total_budget and total_budget > 0 else ("warning" if overall_percent >= 80 else "ok")

    return {
        "month": target_month,
        "total_budget": round(total_budget, 2),
        "total_spent": round(total_spent, 2),
        "total_remaining": round(max(0.0, total_budget - total_spent), 2),
        "overall_percent": overall_percent,
        "overall_status": overall_status,
        "categories": categories_status,
        "warnings_count": sum(1 for c in categories_status if c["status"] in ["warning", "over"]),
    }

