"""CSV Parser Service - Flexible bank/UPI statement parser using Pandas."""

import io
import re
import pandas as pd


def parse_csv(file_content: bytes | str) -> list[dict]:
    """Parses a bank/UPI statement CSV file and returns standardized transaction dicts.
    
    Standardized fields:
    - txn_date: str (YYYY-MM-DD)
    - description: str
    - amount: float (positive number)
    - txn_type: 'debit' | 'credit'
    """
    if isinstance(file_content, bytes):
        content_str = file_content.decode("utf-8-sig", errors="replace")
    else:
        content_str = file_content

    if not content_str.strip():
        raise ValueError("The provided CSV file is empty.")

    try:
        df = pd.read_csv(io.StringIO(content_str))
    except Exception as e:
        raise ValueError(f"Failed to read CSV: {str(e)}")

    if df.empty:
        raise ValueError("CSV contains no rows.")

    # Strip column names whitespace and convert to lowercase
    col_map = {col: str(col).strip().lower() for col in df.columns}
    df = df.rename(columns=col_map)

    # 1. Detect Date Column
    date_candidates = [
        "date", "txn date", "transaction date", "txndate", "value date",
        "posting date", "transaction_date", "txn_date"
    ]
    date_col = next((c for c in df.columns if c in date_candidates), None)
    if not date_col:
        date_col = next((c for c in df.columns if "date" in c), None)

    if not date_col:
        raise ValueError("Could not find a valid date column (e.g., 'Date', 'Txn Date', 'Transaction Date').")

    # 2. Detect Description Column
    desc_candidates = [
        "description", "narration", "details", "particulars", "remarks",
        "transaction remarks", "transaction details", "merchant"
    ]
    desc_col = next((c for c in df.columns if c in desc_candidates), None)
    if not desc_col:
        desc_col = next((c for c in df.columns if any(k in c for k in ["desc", "narrat", "detail", "remark", "particular"])), None)

    if not desc_col:
        raise ValueError("Could not find a valid description column (e.g., 'Description', 'Narration', 'Particulars').")

    # 3. Detect Amount / Debit / Credit Columns
    debit_col = next((c for c in df.columns if c in ["debit", "withdrawal", "dr", "withdrawals"]), None)
    credit_col = next((c for c in df.columns if c in ["credit", "deposit", "cr", "deposits"]), None)
    amount_col = next((c for c in df.columns if c in ["amount", "txn amount", "transaction amount", "total", "inr"]), None)

    # Detect Type column if amount is a single column
    type_col = next((c for c in df.columns if c in ["type", "txn type", "transaction type", "dr/cr", "cr/dr"]), None)

    if not (amount_col or (debit_col and credit_col) or debit_col or credit_col):
        raise ValueError("Could not find amount columns (need 'Amount' or 'Debit'/'Credit').")

    # Clean empty rows
    df = df.dropna(subset=[date_col, desc_col], how="all")

    transactions = []

    for idx, row in df.iterrows():
        raw_date = str(row[date_col]).strip()
        raw_desc = str(row[desc_col]).strip()

        if not raw_date or raw_date.lower() == "nan" or not raw_desc or raw_desc.lower() == "nan":
            continue

        # Parse date
        try:
            is_year_first = bool(re.match(r"^\d{4}[-/]", raw_date))
            parsed_date = pd.to_datetime(raw_date, dayfirst=not is_year_first)
            iso_date = parsed_date.strftime("%Y-%m-%d")
        except Exception:
            continue

        amount = 0.0
        txn_type = "debit"

        # If separate debit and credit columns
        if debit_col or credit_col:
            val_debit = _clean_amount(row.get(debit_col, 0)) if debit_col else 0.0
            val_credit = _clean_amount(row.get(credit_col, 0)) if credit_col else 0.0

            if val_credit > 0 and val_debit == 0:
                amount = val_credit
                txn_type = "credit"
            elif val_debit > 0:
                amount = val_debit
                txn_type = "debit"
            elif amount_col:
                amount = _clean_amount(row.get(amount_col, 0))
                txn_type = _determine_type(row.get(type_col), raw_desc, amount)
            else:
                continue
        elif amount_col:
            raw_amt_val = row.get(amount_col)
            amount = _clean_amount(raw_amt_val)
            txn_type = _determine_type(row.get(type_col) if type_col else None, raw_desc, amount, raw_amt_str=str(raw_amt_val))

        if amount <= 0:
            continue

        transactions.append({
            "txn_date": iso_date,
            "description": raw_desc,
            "amount": round(abs(amount), 2),
            "txn_type": txn_type,
        })

    if not transactions:
        raise ValueError("No valid transaction rows found in CSV.")

    return transactions


def _clean_amount(val) -> float:
    """Strips currency symbols, commas, and parses float."""
    if pd.isna(val):
        return 0.0
    val_str = str(val).strip()
    # Remove currency symbols and formatting commas
    cleaned = re.sub(r"[₹$,\s]", "", val_str)
    # Check if enclosed in parentheses e.g. (100) -> 100
    if cleaned.startswith("(") and cleaned.endswith(")"):
        cleaned = cleaned[1:-1]
    try:
        return abs(float(cleaned))
    except ValueError:
        return 0.0


def _determine_type(type_val, desc: str, amount: float, raw_amt_str: str = "") -> str:
    """Determines whether a transaction is debit or credit."""
    if type_val and not pd.isna(type_val):
        t_str = str(type_val).strip().lower()
        if any(cr in t_str for cr in ["credit", "cr", "deposit", "in"]):
            return "credit"
        if any(dr in t_str for dr in ["debit", "dr", "withdraw", "out"]):
            return "debit"

    # Check minus sign in raw amount string
    if raw_amt_str.strip().startswith("-") or raw_amt_str.strip().endswith("-"):
        return "debit"

    # Keywords in description
    desc_lower = desc.lower()
    if any(k in desc_lower for k in ["salary", "credited", "refund", "cashback", "interest credited", "deposit"]):
        return "credit"

    # Default to debit
    return "debit"
