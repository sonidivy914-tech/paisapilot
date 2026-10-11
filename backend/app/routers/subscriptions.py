"""Subscriptions Router - Detect and manage recurring subscription payments."""

import uuid
from typing import Optional
import pandas as pd
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from app.auth import get_current_user_id
from app.db import supabase
from app.services.recurring import detect_recurring

router = APIRouter(prefix="/subscriptions", tags=["Subscriptions"])


class SubscriptionCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    amount: float = Field(..., gt=0)
    frequency: str = Field("monthly", pattern=r"^(monthly|weekly|annual)$")
    last_paid: Optional[str] = None
    next_due: Optional[str] = None


class SubscriptionUpdate(BaseModel):
    name: Optional[str] = None
    amount: Optional[float] = None
    frequency: Optional[str] = None
    is_active: Optional[bool] = None


@router.get("")
def list_subscriptions(user_id: str = Depends(get_current_user_id)):
    """Lists saved subscriptions with computed monthly and annual totals."""
    res = supabase.table("subscriptions").select("*").eq("user_id", user_id).execute()
    subs = res.data or []

    monthly_total = 0.0
    annual_total = 0.0

    for s in subs:
        if s.get("is_active", True):
            amt = float(s.get("amount", 0.0))
            freq = s.get("frequency", "monthly")
            if freq == "monthly":
                monthly_total += amt
                annual_total += amt * 12
            elif freq == "weekly":
                monthly_total += amt * 4.33
                annual_total += amt * 52
            elif freq == "annual":
                monthly_total += amt / 12
                annual_total += amt

    return {
        "subscriptions": subs,
        "active_count": sum(1 for s in subs if s.get("is_active", True)),
        "monthly_total": round(monthly_total, 2),
        "annual_total": round(annual_total, 2),
    }


@router.post("/detect")
def detect_and_save_subscriptions(user_id: str = Depends(get_current_user_id)):
    """Runs recurring detection algorithm across user's debit transactions.
    Saves newly discovered subscriptions into Supabase table.
    """
    txns_res = supabase.table("transactions").select("*").eq("user_id", user_id).execute()
    all_txns = txns_res.data or []

    if not all_txns:
        return {"message": "No transactions found to analyze.", "detected": []}

    df = pd.DataFrame(all_txns)
    detected_list = detect_recurring(df)

    # Fetch existing subscriptions to avoid duplicates
    existing_res = supabase.table("subscriptions").select("*").eq("user_id", user_id).execute()
    existing_names = {s["name"].strip().lower() for s in (existing_res.data or [])}

    new_saved = []
    for item in detected_list:
        if item["name"].strip().lower() not in existing_names:
            sub_record = {
                "id": str(uuid.uuid4()),
                "user_id": user_id,
                "name": item["name"],
                "amount": item["amount"],
                "frequency": item["frequency"],
                "last_paid": item["last_paid"],
                "next_due": item["next_due"],
                "is_active": True,
            }
            supabase.table("subscriptions").insert(sub_record).execute()
            new_saved.append(sub_record)

    return {
        "message": f"Detected {len(detected_list)} recurring payments ({len(new_saved)} newly added).",
        "detected_count": len(detected_list),
        "newly_saved_count": len(new_saved),
        "detected": detected_list,
    }


@router.post("")
def add_subscription(payload: SubscriptionCreate, user_id: str = Depends(get_current_user_id)):
    """Manually adds a recurring subscription."""
    new_sub = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "name": payload.name.strip(),
        "amount": payload.amount,
        "frequency": payload.frequency,
        "last_paid": payload.last_paid,
        "next_due": payload.next_due,
        "is_active": True,
    }
    res = supabase.table("subscriptions").insert(new_sub).execute()
    return {"message": "Subscription added", "subscription": res.data[0] if res.data else new_sub}


@router.patch("/{subscription_id}")
def update_subscription(
    subscription_id: str,
    payload: SubscriptionUpdate,
    user_id: str = Depends(get_current_user_id),
):
    """Updates subscription details or active status."""
    existing = supabase.table("subscriptions").select("*").eq("id", subscription_id).eq("user_id", user_id).execute()
    if not existing.data:
        raise HTTPException(status_code=404, detail="Subscription not found.")

    update_dict = {k: v for k, v in payload.model_dump().items() if v is not None}
    if not update_dict:
        return {"message": "No changes requested", "subscription": existing.data[0]}

    res = (
        supabase.table("subscriptions")
        .update(update_dict)
        .eq("id", subscription_id)
        .eq("user_id", user_id)
        .execute()
    )
    return {"message": "Subscription updated", "subscription": res.data[0] if res.data else None}


@router.delete("/{subscription_id}")
def delete_subscription(subscription_id: str, user_id: str = Depends(get_current_user_id)):
    """Deletes a subscription record."""
    existing = supabase.table("subscriptions").select("*").eq("id", subscription_id).eq("user_id", user_id).execute()
    if not existing.data:
        raise HTTPException(status_code=404, detail="Subscription not found.")

    supabase.table("subscriptions").delete().eq("id", subscription_id).eq("user_id", user_id).execute()
    return {"message": "Subscription deleted successfully"}
