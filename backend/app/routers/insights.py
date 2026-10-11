"""Insights Router - Month-end projections, unusual spending flags, and month-over-month summaries."""

from datetime import date
import pandas as pd
from fastapi import APIRouter, Depends, Query

from app.auth import get_current_user_id
from app.db import supabase
from app.services.forecast import project_month_end

router = APIRouter(prefix="/insights", tags=["Insights"])


def _format_inr(number: float) -> str:
    """Formats number with Indian currency grouping (₹)."""
    s = f"{abs(number):.2f}"
    parts = s.split(".")
    integer_part = parts[0]
    decimal_part = parts[1]

    if len(integer_part) > 3:
        last3 = integer_part[-3:]
        other = integer_part[:-3]
        groups = []
        while len(other) > 2:
            groups.insert(0, other[-2:])
            other = other[:-2]
        if other:
            groups.insert(0, other)
        groups.append(last3)
        formatted = ",".join(groups)
    else:
        formatted = integer_part

    sign = "-" if number < 0 else ""
    return f"{sign}₹{formatted}.{decimal_part}"


@router.get("/projection")
def get_spending_projection(
    month: str | None = Query(None, description="Month YYYY-MM"),
    user_id: str = Depends(get_current_user_id),
):
    """Calculates linear month-end spending projection based on actual month-to-date spending.
    Formula: spent_so_far / days_elapsed * days_in_month
    """
    today = date.today()
    target_month = month or today.strftime("%Y-%m")

    # Fetch user transactions
    txns_res = supabase.table("transactions").select("*").eq("user_id", user_id).execute()
    all_txns = txns_res.data or []

    month_debits = [
        t for t in all_txns
        if t.get("txn_date", "").startswith(target_month) and t.get("txn_type") == "debit"
    ]
    spent_so_far = sum(float(t.get("amount", 0.0)) for t in month_debits)

    # Fetch total budget
    budgets_res = supabase.table("budgets").select("*").eq("user_id", user_id).execute()
    total_budget = sum(float(b.get("monthly_limit", 0.0)) for b in (budgets_res.data or []))

    # If querying past month, days_elapsed is days_in_month
    is_current_month = (target_month == today.strftime("%Y-%m"))
    projection_date = today if is_current_month else date(int(target_month.split("-")[0]), int(target_month.split("-")[1]), 28)

    projection_data = project_month_end(spent_so_far, total_budget=total_budget if total_budget > 0 else None, today=projection_date)
    projection_data["model_type"] = "Simple linear projection (spent_so_far / days_elapsed * days_in_month)"
    projection_data["is_current_month"] = is_current_month

    return projection_data


@router.get("/unusual")
def get_unusual_spending(user_id: str = Depends(get_current_user_id)):
    """Returns transactions flagged as unusual spending with statistical rationale."""
    res = (
        supabase.table("transactions")
        .select("*")
        .eq("user_id", user_id)
        .eq("is_unusual", True)
        .order("txn_date", desc=True)
        .execute()
    )
    items = res.data or []

    return {
        "disclaimer": "Unusual spending alerts are statistical suggestions based on your personal spending history, not fraud detection. These may be planned large purchases.",
        "count": len(items),
        "unusual_transactions": items,
    }


@router.get("/summary")
def get_monthly_summary(
    month: str | None = Query(None, description="Month YYYY-MM"),
    user_id: str = Depends(get_current_user_id),
):
    """Compares current month vs previous month per category and overall.
    Generates template-based insight sentences strictly computed from real transaction numbers.
    """
    today = date.today()
    curr_m = month or today.strftime("%Y-%m")

    # Determine previous month string
    curr_year, curr_month = int(curr_m.split("-")[0]), int(curr_m.split("-")[1])
    if curr_month == 1:
        prev_m = f"{curr_year - 1}-12"
    else:
        prev_m = f"{curr_year}-{curr_month - 1:02d}"

    txns_res = supabase.table("transactions").select("*").eq("user_id", user_id).execute()
    all_txns = txns_res.data or []

    curr_txns = [t for t in all_txns if t.get("txn_date", "").startswith(curr_m)]
    prev_txns = [t for t in all_txns if t.get("txn_date", "").startswith(prev_m)]

    curr_income = sum(float(t["amount"]) for t in curr_txns if t.get("txn_type") == "credit")
    curr_expense = sum(float(t["amount"]) for t in curr_txns if t.get("txn_type") == "debit")

    prev_income = sum(float(t["amount"]) for t in prev_txns if t.get("txn_type") == "credit")
    prev_expense = sum(float(t["amount"]) for t in prev_txns if t.get("txn_type") == "debit")

    # Category spend breakdowns
    curr_cat_spend = {}
    for t in curr_txns:
        if t.get("txn_type") == "debit":
            c = t.get("category", "Uncategorized")
            curr_cat_spend[c] = curr_cat_spend.get(c, 0.0) + float(t["amount"])

    prev_cat_spend = {}
    for t in prev_txns:
        if t.get("txn_type") == "debit":
            c = t.get("category", "Uncategorized")
            prev_cat_spend[c] = prev_cat_spend.get(c, 0.0) + float(t["amount"])

    all_cats = sorted(list(set(list(curr_cat_spend.keys()) + list(prev_cat_spend.keys()))))
    category_comparisons = []
    generated_sentences = []

    for c in all_cats:
        c_curr = round(curr_cat_spend.get(c, 0.0), 2)
        c_prev = round(prev_cat_spend.get(c, 0.0), 2)
        diff = round(c_curr - c_prev, 2)

        if c_prev > 0:
            pct_change = round(((c_curr - c_prev) / c_prev) * 100, 1)
        else:
            pct_change = 100.0 if c_curr > 0 else 0.0

        category_comparisons.append({
            "category": c,
            "current_month": c_curr,
            "previous_month": c_prev,
            "difference": diff,
            "percentage_change": pct_change,
        })

        # Sentence templates built strictly with computed numbers
        if c_prev > 0 and abs(diff) >= 50:
            if diff > 0:
                sentence = f"{c} spending increased by {pct_change}% vs last month ({_format_inr(diff)} more)."
            else:
                sentence = f"{c} spending decreased by {abs(pct_change)}% vs last month ({_format_inr(abs(diff))} saved)."
            generated_sentences.append(sentence)
        elif c_prev == 0 and c_curr > 0:
            generated_sentences.append(f"New spending in {c}: {_format_inr(c_curr)} recorded this month.")

    # Overall month change
    expense_diff = round(curr_expense - prev_expense, 2)
    expense_pct = round(((curr_expense - prev_expense) / prev_expense * 100), 1) if prev_expense > 0 else 0.0

    if prev_expense > 0:
        if expense_diff > 0:
            generated_sentences.insert(0, f"Overall expenses are up {expense_pct}% ({_format_inr(expense_diff)} more) compared to {prev_m}.")
        else:
            generated_sentences.insert(0, f"Overall expenses are down {abs(expense_pct)}% ({_format_inr(abs(expense_diff))} less) compared to {prev_m}.")

    top_category = max(curr_cat_spend.items(), key=lambda x: x[1])[0] if curr_cat_spend else "None"
    top_amount = curr_cat_spend.get(top_category, 0.0)
    if top_category != "None":
        generated_sentences.append(f"Your highest spending category this month is {top_category} at {_format_inr(top_amount)}.")

    return {
        "current_month": curr_m,
        "previous_month": prev_m,
        "current_income": round(curr_income, 2),
        "current_expense": round(curr_expense, 2),
        "previous_income": round(prev_income, 2),
        "previous_expense": round(prev_expense, 2),
        "net_savings": round(curr_income - curr_expense, 2),
        "savings_rate_percent": round(((curr_income - curr_expense) / curr_income * 100), 1) if curr_income > 0 else 0.0,
        "top_spending_category": top_category,
        "top_spending_amount": round(top_amount, 2),
        "category_comparisons": category_comparisons,
        "insight_sentences": generated_sentences,
    }

