#!/usr/bin/env python3
import sys
import json
import joblib
import pandas as pd
import numpy as np

# Load the trained model
model = joblib.load('./ml/model_lgbm_quantiles.pkl')
features = model['features']

# Read input from stdin
payload = json.loads(sys.stdin.read())

# Create dataframe from payload
df = pd.DataFrame([payload])

# Calculate derived features
df['age'] = 2025 - df.get('year', 2018)
df['km_per_year'] = df.get('km', 100000) / df['age'].clip(lower=1)
df['is_awd'] = int(df.get('driveline', 'FWD') == 'AWD')
df['is_auto'] = int(str(df.get('gear', 'Manual')).lower() == 'auto')
df['is_electric'] = int(df.get('fuel_type', 'Petrol') == 'Electric')
df['is_hybrid'] = int('Hybrid' in str(df.get('fuel_type', 'Petrol')))

# Ensure all features are present
for f in features:
    if f not in df.columns:
        df[f] = 0

# Select and prepare features
X = df[features].fillna(0)

# Make predictions
p10 = model['p10'].predict(X)[0]
p50 = model['p50'].predict(X)[0]
p90 = model['p90'].predict(X)[0]

# Calculate probability of sale (simplified heuristic)
# Narrower price band and lower km increase probability
band = max(1, p90 - p10)
km_value = payload.get('km', 100000)
age_value = payload.get('year', 2018)

# Probability factors
band_factor = max(0.1, min(0.9, 1.0 - band / 500000))
km_factor = max(0.1, min(0.9, 1.0 - km_value / 300000))
age_factor = max(0.1, min(0.9, (age_value - 2010) / 15))

# Combined probability
prob14 = max(0.15, min(0.85, 0.3 + band_factor * 0.3 + km_factor * 0.2 + age_factor * 0.2))
prob30 = min(0.95, prob14 + 0.15)

# Output results
result = {
    "p10": int(p10),
    "p50": int(p50),
    "p90": int(p90),
    "prob14": round(float(prob14), 2),
    "prob30": round(float(prob30), 2)
}

print(json.dumps(result))