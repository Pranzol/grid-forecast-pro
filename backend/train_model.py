import pandas as pd
import numpy as np
from sklearn.ensemble import GradientBoostingRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error, r2_score
from sklearn.preprocessing import LabelEncoder
import joblib, os, json

print("=" * 60)
print("GridForecast Pro — Model Training")
print("=" * 60)

# ══════════════════════════════════════════════════════════════
# DATASET 1: Hourly Regional Demand (India, 2019–2024)
# ══════════════════════════════════════════════════════════════
print("\n[1/4] Loading hourly regional demand data...")
xl = pd.read_excel("data/hourlyLoadDataIndia.xlsx")

REGION_COLS = {
    "National":     "National Hourly Demand",
    "Northern":     "Northen Region Hourly Demand",
    "Western":      "Western Region Hourly Demand",
    "Eastern":      "Eastern Region Hourly Demand",
    "Southern":     "Southern Region Hourly Demand",
    "NorthEastern": "North-Eastern Region Hourly Demand",
}

rows = []
for region_name, col in REGION_COLS.items():
    temp = xl[["datetime", col]].copy()
    temp.columns = ["datetime", "demand_mw"]
    temp["region"] = region_name
    rows.append(temp)

regional_df = pd.concat(rows, ignore_index=True).dropna(subset=["demand_mw"])
regional_df["datetime"]    = pd.to_datetime(regional_df["datetime"])
regional_df["hour"]        = regional_df["datetime"].dt.hour
regional_df["day_of_week"] = regional_df["datetime"].dt.dayofweek
regional_df["month"]       = regional_df["datetime"].dt.month
regional_df["is_weekend"]  = (regional_df["day_of_week"] >= 5).astype(int)
regional_df["season"]      = regional_df["month"].map({
    12:0,1:0,2:0, 3:1,4:1,5:1, 6:2,7:2,8:2, 9:3,10:3,11:3
})

print(f"   Regional rows: {len(regional_df):,}")

# ══════════════════════════════════════════════════════════════
# DATASET 2: TG-NPDCL Area-level consumption (Telangana, Jan 2025)
# ══════════════════════════════════════════════════════════════
print("\n[2/4] Loading TG-NPDCL area consumption data...")
tg = pd.read_csv("data/TG-NPDCL_consumption_detail_commercial_JANUARY-2025.csv")

# Aggregate to area level
area_df = tg.groupby(["Circle", "Division", "Area"]).agg(
    total_units    = ("Units",          "sum"),
    total_load     = ("Load",           "sum"),
    total_services = ("TotServices",    "sum"),
    billed_services= ("BilledServices", "sum"),
).reset_index()

area_df["units_per_service"]   = area_df["total_units"]  / area_df["total_services"]
area_df["load_per_service_kw"] = area_df["total_load"]   / area_df["total_services"]
# 500 sqft = avg commercial connection size
area_df["kwh_per_sqft_month"]  = area_df["units_per_service"]   / 500
area_df["kw_per_sqft"]         = area_df["load_per_service_kw"] / 500
# kWh per sqft per HOUR (month = 730 hours)
area_df["kwh_per_sqft_hour"]   = area_df["kwh_per_sqft_month"] / 730
area_df["region"]              = "Southern"  # all TG-NPDCL areas are Southern

print(f"   Areas loaded: {len(area_df):,}")
print(f"   Circles (districts): {area_df['Circle'].nunique()}")

# ══════════════════════════════════════════════════════════════
# BUILD AREA LOOKUP TABLE (used at prediction time)
# ══════════════════════════════════════════════════════════════
print("\n[3/4] Building area lookup table...")
area_lookup = {}
for _, row in area_df.iterrows():
    key = row["Area"].strip().upper()
    area_lookup[key] = {
        "circle":             row["Circle"],
        "division":           row["Division"],
        "region":             "Southern",
        "kwh_per_sqft_month": round(row["kwh_per_sqft_month"],  6),
        "kw_per_sqft":        round(row["kw_per_sqft"],         6),
        "kwh_per_sqft_hour":  round(row["kwh_per_sqft_hour"],   8),
        "total_load_kw":      round(row["total_load"],          3),
        "total_services":     int(row["total_services"]),
    }

os.makedirs("models", exist_ok=True)
with open("models/area_lookup.json", "w") as f:
    json.dump(area_lookup, f)
print(f"   Saved {len(area_lookup)} areas → models/area_lookup.json")

# ══════════════════════════════════════════════════════════════
# TRAIN ML MODEL on regional hourly demand
# ══════════════════════════════════════════════════════════════
print("\n[4/4] Training ML model on regional demand...")

le = LabelEncoder()
regional_df["region_enc"] = le.fit_transform(regional_df["region"])

FEATURES = ["region_enc","hour","day_of_week","month","is_weekend","season"]
TARGET   = "demand_mw"

X = regional_df[FEATURES]
y = regional_df[TARGET]

X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

model = GradientBoostingRegressor(
    n_estimators=300, learning_rate=0.05,
    max_depth=5, subsample=0.8,
    random_state=42, verbose=1,
)
model.fit(X_train, y_train)

y_pred = model.predict(X_test)
print(f"\n   ✅ MAE : {mean_absolute_error(y_test, y_pred):,.2f} MW")
print(f"   ✅ R²  : {r2_score(y_test, y_pred):.4f}")

joblib.dump(model,    "models/demand_model.pkl")
joblib.dump(le,       "models/region_encoder.pkl")
joblib.dump(FEATURES, "models/feature_list.pkl")

print("\n✅ All models saved to models/")
print(f"✅ Regions: {list(le.classes_)}")
print(f"✅ Areas  : {len(area_lookup):,} Telangana areas ready")
print("=" * 60)