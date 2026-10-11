"""Anomaly Service - Detects unusual spending using statistical thresholds."""

import pandas as pd


def flag_unusual(df: pd.DataFrame) -> pd.DataFrame:
    """Flags unusual debit transactions per category.
    
    A transaction is flagged as unusual if:
    - There are at least 5 transactions in that category
    - Its amount > mean + 2.5 * std OR > 3x median
    - and amount > 2x median
    """
    if df.empty:
        df_copy = df.copy()
        df_copy["is_unusual"] = False
        return df_copy

    df_copy = df.copy()
    df_copy["is_unusual"] = False

    # Filter to debits only for anomaly evaluation
    is_debit = df_copy.get("txn_type", pd.Series("debit", index=df_copy.index)) == "debit"
    debits_df = df_copy[is_debit]

    for cat, g in debits_df.groupby("category"):
        if len(g) < 5:
            continue

        mean = float(g["amount"].mean())
        std = float(g["amount"].std()) if len(g) > 1 else 0.0
        median = float(g["amount"].median())

        limit = min(mean + 2.5 * std, 3 * median) if std > 0 else 3 * median
        threshold = max(limit, median * 2)

        unusual_indices = g[g["amount"] > threshold].index
        df_copy.loc[unusual_indices, "is_unusual"] = True

    return df_copy

