import json
import numpy as np
from pathlib import Path
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import cross_val_score
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import Pipeline

with open(Path.home() / 'Downloads/waterpath-ke/data/waterpath_training.json') as f:
    data = json.load(f)

X = np.array([
    [r['latitude'], r['longitude'], r.get('well_depth') or 0, r.get('ph') or 7.5]
    for r in data
])

y = np.array([
    'safe' if r['water_quality'] in ('excellent', 'drinkable') else 'needs_treatment'
    for r in data
])

pipe = Pipeline([
    ('s', StandardScaler()),
    ('m', RandomForestClassifier(n_estimators=300, class_weight="balanced", random_state=42))
])

scores = cross_val_score(pipe, X, y, cv=5, scoring='accuracy')
print(f'Binary classification accuracy: {scores.mean():.2f} (+/- {scores.std():.2f})')