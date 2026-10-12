import json
from collections import Counter
from pathlib import Path

import numpy as np
from sklearn.cluster import KMeans
from sklearn.dummy import DummyClassifier
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import GroupKFold, StratifiedKFold, cross_val_score
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler

DATA = Path(__file__).resolve().parents[1] / "data" / "waterpath_training.json"
with open(DATA) as f:
    data = json.load(f)

X = np.array([[r["latitude"], r["longitude"], r.get("well_depth") or 0, r.get("ph") or 7.5] for r in data])
y = np.array(["safe" if r["water_quality"] in ("excellent", "drinkable") else "needs_treatment" for r in data])

counts = Counter(y)
print("Rows:", len(y), dict(counts))
print(f"Majority-class baseline: {max(counts.values()) / len(y):.1%}")
print("Missing depth:", sum(1 for r in data if not r.get("well_depth")),
      "| missing pH:", sum(1 for r in data if not r.get("ph")))

def rf():
    return Pipeline([("s", StandardScaler()),
                     ("m", RandomForestClassifier(n_estimators=300, class_weight="balanced", random_state=42))])

skf = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
print(f"Dummy majority, CV:                 {cross_val_score(DummyClassifier(strategy='most_frequent'), X, y, cv=skf).mean():.1%}")
print(f"RF, original cv=5 (unshuffled):     {cross_val_score(rf(), X, y, cv=5).mean():.1%}")
print(f"RF, shuffled random 5-fold:         {cross_val_score(rf(), X, y, cv=skf).mean():.1%}")
print(f"RF, shuffled, balanced accuracy:    {cross_val_score(rf(), X, y, cv=skf, scoring='balanced_accuracy').mean():.1%}")

groups = KMeans(n_clusters=5, random_state=42, n_init=10).fit_predict(X[:, :2])
spatial = cross_val_score(rf(), X, y, cv=GroupKFold(n_splits=5), groups=groups)
print(f"RF, spatial (hold out whole regions): {spatial.mean():.1%} (+/- {spatial.std():.1%})")