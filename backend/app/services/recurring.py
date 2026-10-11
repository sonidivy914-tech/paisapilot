"""Recurring Service - Detects subscription and recurring payments from debits."""

import re
from datetime import timedelta
import pandas as pd


def normalize(desc: str) -> str:
    """Normalizes transaction description for clustering."""
    cleaned = re.sub(r"[^a-z0-9 ]", "", desc.lower())
    return " ".join(cleaned.split())


def detect_recurring(df: pd.DataFrame) -> list[dict]:
    """Detects recurring payments from transactions.
    
    Expected DataFrame columns: txn_date, description, amount, txn_type
    Criteria:
    - Debits only
    - Grouped by normalized description
    - 2+ occurrences
    - Amounts within 5% of each other
    - Average interval of 25-35 days (monthly) or 6-8 days (weekly)
    """
    if df.empty:
        return []

    df_copy = df.copy()

    # Filter for debits
    if "txn_type" in df_copy.columns:
        df_copy = df_copy[df_copy["txn_type"] == "debit"]

    if df_copy.empty:
        return []

    df_copy["parsed_date"] = pd.to_datetime(df_copy["txn_date"])
    df_copy["key"] = df_copy["description"].map(normalize)

    found = []

    for key, g in df_copy.groupby("key"):
        if len(g) < 2:
            continue

        g = g.sort_values("parsed_date")
        amounts = g["amount"].astype(float)
        max_amt = amounts.max()

        if max_amt <= 0:
            continue

        # Check amount variation <= 5%
        if (max_amt - amounts.min()) / max_amt > 0.05:
            continue

        gaps = g["parsed_date"].diff().dt.days.dropna()
        if gaps.empty:
            continue

        avg_gap = gaps.mean()

        if 25 <= avg_gap <= 35:
            freq = "monthly"
            last_dt = g["parsed_date"].iloc[-1].date()
            next_due = (last_dt + timedelta(days=30)).isoformat()
        elif 6 <= avg_gap <= 8:
            freq = "weekly"
            last_dt = g["parsed_date"].iloc[-1].date()
            next_due = (last_dt + timedelta(days=7)).isoformat()
        else:
            continue

        last_paid = g["parsed_date"].iloc[-1].date().isoformat()
        last_amount = round(float(amounts.iloc[-1]), 2)

        found.append({
            "name": key.title(),
            "amount": last_amount,
            "frequency": freq,
            "last_paid": last_paid,
            "next_due": next_due,
            "annual_cost": round(last_amount * (12 if freq == "monthly" else 52), 2),
            "is_active": True,
        })

    return found

