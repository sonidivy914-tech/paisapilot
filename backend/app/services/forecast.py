"""Forecast Service - Linear month-end spending projection computed from real transaction data."""

import calendar
from datetime import date


def project_month_end(spent_so_far: float, total_budget: float | None = None, today: date | None = None) -> dict:
    """Calculates linear month-end spending projection based on actual spending.
    
    Formula: spent_so_far / days_elapsed * days_in_month
    """
    today = today or date.today()
    days_in_month = calendar.monthrange(today.year, today.month)[1]
    days_elapsed = max(today.day, 1)

    projected = (spent_so_far / days_elapsed) * days_in_month
    daily_average = spent_so_far / days_elapsed

    exceeds_budget = False
    difference = 0.0
    if total_budget is not None and total_budget > 0:
        exceeds_budget = projected > total_budget
        difference = round(projected - total_budget, 2)

    return {
        "spent_so_far": round(spent_so_far, 2),
        "days_elapsed": days_elapsed,
        "days_in_month": days_in_month,
        "daily_average": round(daily_average, 2),
        "projected": round(projected, 2),
        "total_budget": round(total_budget, 2) if total_budget is not None else None,
        "exceeds_budget": exceeds_budget,
        "difference": difference,
    }

