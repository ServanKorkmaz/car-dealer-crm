#!/usr/bin/env python3
import os
import sys
import json
import joblib
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestRegressor
from sklearn.linear_model import QuantileRegressor

# Load data from FINN sample
df = pd.read_json('./seed/finn_sample.json')

# Feature engineering
df['equipment_len'] = df['equipment'].apply(lambda x: len(x) if isinstance(x, list) else 0)
df['is_awd'] = (df['driveline'] == 'AWD').astype(int)
df['is_auto'] = (df['gear'].str.lower() == 'auto').astype(int)
df['is_electric'] = (df['fuel_type'] == 'Electric').astype(int)
df['is_hybrid'] = df['fuel_type'].str.contains('Hybrid', na=False).astype(int)
df['age'] = 2025 - df['year']
df['km_per_year'] = df['km'] / df['age'].clip(lower=1)
df['season_month'] = 1  # January
df['supply_density'] = 12

# Select features for model
features = [
    'km', 'year', 'age', 'km_per_year', 
    'equipment_len', 'is_awd', 'is_auto', 
    'is_electric', 'is_hybrid',
    'season_month', 'supply_density'
]

X = df[features].fillna(0)
y = df['price'].fillna(df['price'].median())

# Split data
X_train, X_val, y_train, y_val = train_test_split(X, y, test_size=0.3, random_state=42)

def fit_quantile(alpha):
    """Train a QuantileRegressor model for a specific quantile."""
    # Use QuantileRegressor for quantile predictions
    if alpha == 0.5:
        # Use RandomForest for median (more stable)
        m = RandomForestRegressor(
            n_estimators=50,
            max_depth=5,
            random_state=42
        )
        m.fit(X_train, y_train)
    else:
        # Use QuantileRegressor for other quantiles
        m = QuantileRegressor(
            quantile=alpha,
            alpha=0.1,
            solver='highs'
        )
        m.fit(X_train, y_train)
    return m

# Train models for different quantiles
print("Training quantile models...")
m_p10 = fit_quantile(0.10)
m_p50 = fit_quantile(0.50)
m_p90 = fit_quantile(0.90)

# Save models
os.makedirs('./ml', exist_ok=True)
model_path = './ml/model_lgbm_quantiles.pkl'
joblib.dump({
    'p10': m_p10, 
    'p50': m_p50, 
    'p90': m_p90, 
    'features': features
}, model_path)

print(f'Saved model to {model_path}')
print(f'Features used: {features}')

# Test predictions on sample data
test_sample = X.iloc[0:1]
p10_pred = m_p10.predict(test_sample)[0]
p50_pred = m_p50.predict(test_sample)[0]
p90_pred = m_p90.predict(test_sample)[0]

print(f"\nSample prediction:")
print(f"  P10: {p10_pred:,.0f} NOK")
print(f"  P50: {p50_pred:,.0f} NOK")
print(f"  P90: {p90_pred:,.0f} NOK")