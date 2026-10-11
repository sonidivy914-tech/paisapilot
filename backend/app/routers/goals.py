"""Goals Router - Track and compute savings goals with required monthly contributions."""

import math
import uuid
from datetime import date, datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from app.auth import get_current_user_id
from app.db import supabase

router = APIRouter(prefix="/goals", tags=["Savings Goals"])


class GoalCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=100)
    target_amount: float = Field(..., gt=0)
    saved_amount: float = Field(0.0, ge=0)
    target_date: Optional[str] = None


class GoalUpdate(BaseModel):
    title: Optional[str] = None
    target_amount: Optional[float] = None
    saved_amount: Optional[float] = None
    target_date: Optional[str] = None


def _calculate_goal_metrics(goal: dict) -> dict:
    """Computes completion percentage, remaining amount, and required monthly savings."""
    target = float(goal.get("target_amount", 0.0))
    saved = float(goal.get("saved_amount", 0.0))
    remaining = max(0.0, round(target - saved, 2))
    percent = min(100.0, round((saved / target) * 100, 1)) if target > 0 else 0.0
    is_completed = saved >= target

    target_date_str = goal.get("target_date")
    months_left = 1
    required_monthly = remaining

    if target_date_str and not is_completed:
        try:
            target_dt = datetime.strptime(target_date_str, "%Y-%m-%d").date()
            today = date.today()
            # Calculate difference in months
            diff_days = (target_dt - today).days
            if diff_days > 0:
                months_left = max(1, math.ceil(diff_days / 30.4))
                required_monthly = round(remaining / months_left, 2)
            else:
                months_left = 0
                required_monthly = remaining
        except Exception:
            months_left = 1
            required_monthly = remaining

    g_copy = goal.copy()
    g_copy.update({
        "percent_complete": percent,
        "remaining_amount": remaining,
        "months_left": months_left,
        "required_monthly_saving": required_monthly,
        "is_completed": is_completed,
    })
    return g_copy


@router.get("")
def list_goals(user_id: str = Depends(get_current_user_id)):
    """Lists all savings goals with dynamically computed progress metrics."""
    res = supabase.table("goals").select("*").eq("user_id", user_id).order("created_at", desc=False).execute()
    goals = res.data or []

    computed_goals = [_calculate_goal_metrics(g) for g in goals]
    total_target = sum(float(g["target_amount"]) for g in goals)
    total_saved = sum(float(g["saved_amount"]) for g in goals)

    return {
        "goals": computed_goals,
        "total_target": round(total_target, 2),
        "total_saved": round(total_saved, 2),
        "total_remaining": max(0.0, round(total_target - total_saved, 2)),
        "overall_progress": round((total_saved / total_target * 100), 1) if total_target > 0 else 0.0,
    }


@router.post("")
def create_goal(payload: GoalCreate, user_id: str = Depends(get_current_user_id)):
    """Creates a new savings goal."""
    new_goal = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "title": payload.title.strip(),
        "target_amount": payload.target_amount,
        "saved_amount": payload.saved_amount,
        "target_date": payload.target_date,
    }
    res = supabase.table("goals").insert(new_goal).execute()
    created = res.data[0] if res.data else new_goal
    return {"message": "Goal created successfully", "goal": _calculate_goal_metrics(created)}


@router.patch("/{goal_id}")
def update_goal(
    goal_id: str,
    payload: GoalUpdate,
    user_id: str = Depends(get_current_user_id),
):
    """Updates goal target, saved amount, or target date."""
    existing = supabase.table("goals").select("*").eq("id", goal_id).eq("user_id", user_id).execute()
    if not existing.data:
        raise HTTPException(status_code=404, detail="Goal not found.")

    update_dict = {k: v for k, v in payload.model_dump().items() if v is not None}
    if not update_dict:
        return {"message": "No changes", "goal": _calculate_goal_metrics(existing.data[0])}

    res = supabase.table("goals").update(update_dict).eq("id", goal_id).eq("user_id", user_id).execute()
    updated = res.data[0] if res.data else existing.data[0]
    return {"message": "Goal updated successfully", "goal": _calculate_goal_metrics(updated)}


@router.delete("/{goal_id}")
def delete_goal(goal_id: str, user_id: str = Depends(get_current_user_id)):
    """Deletes a savings goal."""
    existing = supabase.table("goals").select("*").eq("id", goal_id).eq("user_id", user_id).execute()
    if not existing.data:
        raise HTTPException(status_code=404, detail="Goal not found.")

    supabase.table("goals").delete().eq("id", goal_id).eq("user_id", user_id).execute()
    return {"message": "Goal deleted successfully"}

