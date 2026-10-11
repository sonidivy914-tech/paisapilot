"""Unit and Integration Tests for PaisaPilot Backend Core Logic."""

import pytest
import pandas as pd
from datetime import date
from fastapi.testclient import TestClient

from app.main import app
from app.services.csv_parser import parse_csv
from app.services.categorizer import categorize
from app.services.forecast import project_month_end
from app.services.anomaly import flag_unusual
from app.services.recurring import detect_recurring
from app.services.ml_categorizer import MLCategorizer

client = TestClient(app)


def test_health_check():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_unauthenticated_api_call_returns_401():
    response = client.get("/transactions")
    assert response.status_code == 401


def test_categorizer_rules():
    assert categorize("Blinkit Instant Groceries") == "Groceries"
    assert categorize("Uber Ride Delhi") == "Transport"
    assert categorize("Netflix Subscription") == "Subscription"
    assert categorize("Zomato Dinner Order") == "Food & Dining"
    assert categorize("Amazon Electronics") == "Shopping"
    assert categorize("Jio Fiber Bill") == "Bills & Utilities"
    assert categorize("Apollo Pharmacy") == "Health"
    assert categorize("Salary Credit from Company") == "Income"
    assert categorize("Random Unrecognized Merchant XYZ") == "Uncategorized"


def test_csv_parser():
    sample_csv = """Date,Description,Amount,Type
2026-09-01,Salary Credit,30000,credit
2026-09-01,DMart Grocery Store,850,debit
2026-09-02,Uber Ride,220,debit
2026-09-03,Netflix,199,debit
"""
    rows = parse_csv(sample_csv)
    assert len(rows) == 4
    assert rows[0]["txn_date"] == "2026-09-01"
    assert rows[0]["amount"] == 30000.0
    assert rows[0]["txn_type"] == "credit"
    assert rows[1]["txn_type"] == "debit"
    assert rows[1]["amount"] == 850.0


def test_csv_parser_malformed_throws_error():
    with pytest.raises(ValueError):
        parse_csv("Random,Header,Without,Dates\n1,2,3,4")

    with pytest.raises(ValueError):
        parse_csv("")


def test_forecast_projection():
    # Day 15 of 30-day month, spent 1500 -> projected = 1500 / 15 * 30 = 3000
    test_date = date(2026, 9, 15)
    res = project_month_end(1500.0, total_budget=2500.0, today=test_date)
    assert res["spent_so_far"] == 1500.0
    assert res["days_elapsed"] == 15
    assert res["days_in_month"] == 30
    assert res["projected"] == 3000.0
    assert res["exceeds_budget"] is True
    assert res["difference"] == 500.0


def test_anomaly_detection():
    # Category with 5 normal items (around 500-1000) and 1 huge item (5500)
    txns = [
        {"id": "1", "category": "Shopping", "amount": 800.0, "txn_type": "debit"},
        {"id": "2", "category": "Shopping", "amount": 950.0, "txn_type": "debit"},
        {"id": "3", "category": "Shopping", "amount": 600.0, "txn_type": "debit"},
        {"id": "4", "category": "Shopping", "amount": 750.0, "txn_type": "debit"},
        {"id": "5", "category": "Shopping", "amount": 900.0, "txn_type": "debit"},
        {"id": "6", "category": "Shopping", "amount": 5500.0, "txn_type": "debit"},
    ]
    df = pd.DataFrame(txns)
    flagged = flag_unusual(df)
    assert flagged.loc[flagged["id"] == "6", "is_unusual"].values[0] == True
    assert flagged.loc[flagged["id"] == "1", "is_unusual"].values[0] == False


def test_recurring_subscriptions_detection():
    txns = [
        {"txn_date": "2026-07-03", "description": "Netflix", "amount": 199.0, "txn_type": "debit"},
        {"txn_date": "2026-08-03", "description": "Netflix", "amount": 199.0, "txn_type": "debit"},
        {"txn_date": "2026-09-03", "description": "Netflix", "amount": 199.0, "txn_type": "debit"},
    ]
    df = pd.DataFrame(txns)
    found = detect_recurring(df)
    assert len(found) == 1
    assert "Netflix" in found[0]["name"]
    assert found[0]["frequency"] == "monthly"
    assert found[0]["amount"] == 199.0
    assert found[0]["annual_cost"] == 199.0 * 12


def test_ml_categorizer():
    clf = MLCategorizer(confidence_threshold=0.5)
    descs = [
        "Fresh Apples", "Organic Milk", "Brown Rice", "Whole Wheat Bread", "Farm Vegetables",
        "Uber ride to airport", "Ola taxi downtown", "Metro smartcard recharge", "Fastag toll plaza", "Petrol pump fuel",
    ]
    cats = [
        "Groceries", "Groceries", "Groceries", "Groceries", "Groceries",
        "Transport", "Transport", "Transport", "Transport", "Transport",
    ]
    res = clf.train(descs, cats)
    assert res["trained"] is True
    pred, conf = clf.predict("Fresh organic vegetable market")
    assert pred == "Groceries"

