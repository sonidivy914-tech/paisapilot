"""ML Categorizer & Anomaly Service (Phase 6)
Using scikit-learn:
- TF-IDF + LogisticRegression for text categorization
- IsolationForest for statistical anomaly detection
- Used as fallback when keyword rule categorizer returns 'Uncategorized'
"""

import numpy as np
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline
from sklearn.ensemble import IsolationForest
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score


class MLCategorizer:
    def __init__(self, confidence_threshold: float = 0.6):
        self.confidence_threshold = confidence_threshold
        self.pipeline: Pipeline | None = None
        self.is_trained = False

    def train(self, descriptions: list[str], categories: list[str]) -> dict:
        """Trains the TF-IDF + LogisticRegression model on categorized transactions."""
        valid_pairs = [
            (desc, cat) for desc, cat in zip(descriptions, categories)
            if desc and cat and cat != "Uncategorized"
        ]

        if len(valid_pairs) < 10:
            return {"trained": False, "reason": "Need at least 10 categorized transactions to train model."}

        X = [p[0] for p in valid_pairs]
        y = [p[1] for p in valid_pairs]

        unique_classes = set(y)
        if len(unique_classes) < 2:
            return {"trained": False, "reason": "Need at least 2 distinct categories to train classifier."}

        # Train/test split evaluation
        if len(X) >= 15:
            X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
        else:
            X_train, y_train = X, y
            X_test, y_test = X, y

        pipeline = Pipeline([
            ("tfidf", TfidfVectorizer(ngram_range=(1, 2), min_df=1, lowercase=True)),
            ("clf", LogisticRegression(max_iter=1000, random_state=42))
        ])

        pipeline.fit(X_train, y_train)
        accuracy = float(accuracy_score(y_test, pipeline.predict(X_test)))

        # Train on full data for best inference
        pipeline.fit(X, y)
        self.pipeline = pipeline
        self.is_trained = True

        return {
            "trained": True,
            "accuracy": round(accuracy, 3),
            "samples": len(X),
            "categories": list(unique_classes),
        }

    def predict(self, description: str) -> tuple[str, float]:
        """Predicts category and probability. Returns ('Uncategorized', 0.0) if under threshold."""
        if not self.is_trained or not self.pipeline or not description:
            return "Uncategorized", 0.0

        probs = self.pipeline.predict_proba([description])[0]
        classes = self.pipeline.classes_
        max_idx = int(np.argmax(probs))
        confidence = float(probs[max_idx])

        if confidence >= self.confidence_threshold:
            return str(classes[max_idx]), confidence

        return "Uncategorized", confidence


def detect_isolation_forest_anomalies(df: pd.DataFrame, contamination: float = 0.05) -> pd.DataFrame:
    """Uses IsolationForest to flag unusual debits as an alternative/enhancement."""
    if df.empty or len(df) < 10:
        df_copy = df.copy()
        df_copy["is_unusual_ml"] = False
        return df_copy

    df_copy = df.copy()
    df_copy["is_unusual_ml"] = False

    debits = df_copy[df_copy["txn_type"] == "debit"]
    if len(debits) < 10:
        return df_copy

    amounts = debits[["amount"]].values
    iso = IsolationForest(contamination=contamination, random_state=42)
    preds = iso.fit_predict(amounts)

    # -1 indicates anomaly
    unusual_indices = debits.iloc[preds == -1].index
    df_copy.loc[unusual_indices, "is_unusual_ml"] = True
    return df_copy

