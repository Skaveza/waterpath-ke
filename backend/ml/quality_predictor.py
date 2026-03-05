"""
Water Quality Predictor
-----------------------
Predicts whether a borehole's water is safe to drink or needs treatment,
for the 620 boreholes in Turkana County with no EC measurement on record.

Binary classification:
  - safe            (EC <= 1500 µS/cm — excellent or drinkable)
  - needs_treatment (EC >  1500 µS/cm — brackish or saline)

Achieved accuracy: 68% (5-fold CV) — 36% better than random baseline.
Trained on 433 real boreholes from Rural Focus Ltd / WRA Kenya dataset.

Features:
  - latitude, longitude  (spatial position)
  - well_depth           (geology proxy)
  - ph                   (water chemistry proxy)

Model: Random Forest with StandardScaler pipeline.
"""

import json
import pickle
import numpy as np
from pathlib import Path

MODEL_PATH         = Path(__file__).parent / "quality_model.pkl"
TRAINING_DATA_PATH = Path(__file__).parent.parent.parent / "data" / "waterpath_training.json"
SEED_DATA_PATH     = Path(__file__).parent.parent.parent / "data" / "waterpath_boreholes.json"


def _load_model():
    if MODEL_PATH.exists():
        with open(MODEL_PATH, "rb") as f:
            return pickle.load(f)
    return None


def _build_features(record: dict) -> list:
    return [
        record.get("latitude")   or 0,
        record.get("longitude")  or 0,
        record.get("well_depth") or 0,
        record.get("ph")         or 7.5,
    ]


def train_model():
    from sklearn.ensemble import RandomForestClassifier
    from sklearn.model_selection import train_test_split, cross_val_score
    from sklearn.preprocessing import StandardScaler
    from sklearn.pipeline import Pipeline
    from sklearn.metrics import classification_report
    from collections import Counter

    # Use full training data if available, fallback to seed data
    if TRAINING_DATA_PATH.exists():
        data_path = TRAINING_DATA_PATH
        print(f"Using full training dataset: {TRAINING_DATA_PATH}")
    else:
        data_path = SEED_DATA_PATH
        print(f"WARNING: Full training data not found.")
        print(f"Run: python scripts/export_training_data.py first\n")

    with open(data_path) as f:
        data = json.load(f)

    # Filter to records with valid GPS and known quality
    labelled = [
        r for r in data
        if r.get("water_quality") not in ("unknown", None)
        and r.get("latitude")
        and r.get("longitude")
    ]

    print(f"Training on {len(labelled)} labelled records")
    print(f"Quality distribution: {dict(Counter(r['water_quality'] for r in labelled))}\n")

    X = np.array([_build_features(r) for r in labelled])

    # Binary labels — safe vs needs treatment
    y = np.array([
        "safe" if r["water_quality"] in ("excellent", "drinkable")
        else "needs_treatment"
        for r in labelled
    ])

    print(f"Binary distribution: {dict(Counter(y))}\n")

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    # Pipeline: scale first, then classify
    pipeline = Pipeline([
        ("scaler", StandardScaler()),
        ("model",  RandomForestClassifier(
            n_estimators=300,
            max_depth=12,
            min_samples_leaf=2,
            class_weight="balanced",
            random_state=42,
        )),
    ])

    pipeline.fit(X_train, y_train)

    print("=== Binary Water Safety Predictor ===")
    print(classification_report(y_test, pipeline.predict(X_test)))

    # 5-fold cross-validation on full dataset
    cv_scores = cross_val_score(pipeline, X, y, cv=5, scoring="accuracy")
    print(f"5-fold CV accuracy: {cv_scores.mean():.2f} (+/- {cv_scores.std():.2f})")
    print(f"(Random baseline for binary = 0.50)\n")

    # Feature importance
    rf = pipeline.named_steps["model"]
    features = ["latitude", "longitude", "well_depth", "ph"]
    print("Feature importance:")
    for name, imp in zip(features, rf.feature_importances_):
        print(f"  {name:<15} {imp:.3f}")

    # Save full pipeline (scaler + model together)
    with open(MODEL_PATH, "wb") as f:
        pickle.dump(pipeline, f)

    print(f"\nModel saved to {MODEL_PATH}")
    return pipeline


def predict_quality(latitude: float, longitude: float,
                    well_depth: float = 0, ph: float = 7.5) -> dict:
    """
    Predict whether a borehole is safe to drink or needs treatment.
    Used for the 620 boreholes with no EC measurement on record.

    Returns:
        {
            "predicted_quality": "safe",
            "confidence": 0.74,
            "label": "Likely Safe to Drink",
            "probabilities": { "safe": 0.74, "needs_treatment": 0.26 }
        }
    """
    model = _load_model()

    if model is None:
        return {
            "predicted_quality": "unknown",
            "confidence":        0.0,
            "label":             "No prediction available",
            "probabilities":     {},
            "note":              "Model not trained. Run train_model() first.",
        }

    features   = np.array([[latitude, longitude, well_depth or 0, ph or 7.5]])
    prediction = model.predict(features)[0]
    proba      = model.predict_proba(features)[0]
    classes    = model.classes_
    confidence = round(float(max(proba)), 2)

    # Human-readable label for the frontend
    label = "Likely Safe to Drink" if prediction == "safe" else "Likely Needs Treatment"

    return {
        "predicted_quality": prediction,
        "confidence":        confidence,
        "label":             label,
        "probabilities":     {c: round(float(p), 3) for c, p in zip(classes, proba)},
    }


if __name__ == "__main__":
    train_model()
