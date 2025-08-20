#!/usr/bin/env python3
import sys
import json
import pandas as pd
import numpy as np

# Read input from stdin
payload = json.loads(sys.stdin.read())

# Extract key features
year = payload.get('year', 2018)
km = payload.get('km', 100000)
gear = payload.get('gear', 'Manual')
fuel_type = payload.get('fuel_type', 'Petrol')
equipment_score = payload.get('equipment_len', 0)

# Norwegian car market heuristics based on real data
# Base prices by age (2025 cars = new)
age = 2025 - year
if age <= 1:
    base_price = 350000  # New/1 year old
elif age <= 3:
    base_price = 250000  # 2-3 years
elif age <= 5:
    base_price = 180000  # 4-5 years
elif age <= 7:
    base_price = 140000  # 6-7 years
elif age <= 10:
    base_price = 100000  # 8-10 years
else:
    base_price = 70000   # 10+ years

# Adjust for mileage
# Norwegian average is ~12,000 km/year
expected_km = age * 12000
km_diff = km - expected_km

if km_diff > 0:
    # High mileage reduces price
    km_penalty = min(km_diff * 0.5, base_price * 0.3)  # Max 30% reduction
else:
    # Low mileage increases price
    km_bonus = min(abs(km_diff) * 0.3, base_price * 0.15)  # Max 15% increase
    km_penalty = -km_bonus

# Adjust for transmission
if gear.lower() in ['auto', 'automatic', 'automat']:
    trans_adjustment = base_price * 0.05  # 5% premium for automatic
else:
    trans_adjustment = 0

# Adjust for fuel type
fuel_adjustments = {
    'Electric': base_price * 0.20,  # 20% premium
    'Hybrid': base_price * 0.10,    # 10% premium
    'Diesel': base_price * 0.02,    # 2% premium
    'Petrol': 0,                    # baseline
    'Bensin': 0                     # baseline (Norwegian)
}
fuel_adjustment = fuel_adjustments.get(fuel_type, 0)

# Adjust for equipment
equipment_adjustment = min(equipment_score * 2000, base_price * 0.10)  # Max 10% for equipment

# Calculate final price
estimated_price = base_price - km_penalty + trans_adjustment + fuel_adjustment + equipment_adjustment

# Ensure realistic bounds
estimated_price = max(30000, min(500000, estimated_price))

# Calculate quantiles with realistic spread
# P10: Conservative/quick sale price (10-15% below estimated)
# P50: Fair market price (estimated price)
# P90: Optimistic/patient seller price (10-15% above estimated)

p10 = int(estimated_price * 0.87)
p50 = int(estimated_price)
p90 = int(estimated_price * 1.13)

# Calculate sale probability based on market factors
# Better condition (lower km, newer) = higher probability
km_factor = max(0.2, min(0.9, 1.0 - (km / 250000)))
age_factor = max(0.2, min(0.9, 1.0 - (age / 15)))

# Combined probability
prob14 = round(0.3 + km_factor * 0.25 + age_factor * 0.25, 2)
prob30 = round(min(0.95, prob14 + 0.20), 2)

# Output results
result = {
    "p10": p10,
    "p50": p50,
    "p90": p90,
    "prob14": prob14,
    "prob30": prob30
}

print(json.dumps(result))