"""
GridForecast Pro — train_model.py  v4
=====================================
Key upgrades from v3:
  1. Data cleaning  : IQR outlier removal, duplicate-hour de-dupe, gap-fill
  2. Feature eng.   : cyclical sin/cos, year trend, lag-24h, lag-168h,
                       rolling-6h mean, rolling-24h mean (via lookup table)
  3. Multi-model    : HistGradientBoosting  vs  RandomForest  vs  ExtraTrees
                       — best model per region is saved automatically
  4. Per-region     : each region trained independently on StandardScaler-
                       normalized target so no scale bias (NE vs National)
  5. Lag lookup     : avg demand by (region, hour, dow, month) for inference
  6. District hier. : full Circle→Division→SubDivision→Section→Area JSON
"""

import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

import pandas as pd
import numpy as np
from sklearn.ensemble import (
    HistGradientBoostingRegressor,
    RandomForestRegressor,
    ExtraTreesRegressor,
)
from sklearn.model_selection import TimeSeriesSplit
from sklearn.metrics import mean_absolute_error, r2_score, mean_absolute_percentage_error
from sklearn.preprocessing import StandardScaler
import joblib, os, json, warnings
warnings.filterwarnings("ignore")

BAR = "=" * 70
print(BAR)
print("GridForecast Pro  — Model Training  v4  (95 %+ target)")
print(BAR)

os.makedirs("models", exist_ok=True)

# ═══════════════════════════════════════════════════════════════════════════
# [1/6]  LOAD HOURLY REGIONAL DEMAND
# ═══════════════════════════════════════════════════════════════════════════
print("\n[1/6]  Loading hourly regional demand (India 2019-2024)...")

REGION_COLS = {
    "National":     "National Hourly Demand",
    "Northern":     "Northen Region Hourly Demand",
    "Western":      "Western Region Hourly Demand",
    "Eastern":      "Eastern Region Hourly Demand",
    "Southern":     "Southern Region Hourly Demand",
    "NorthEastern": "North-Eastern Region Hourly Demand",
}

xl = pd.read_excel("data/hourlyLoadDataIndia.xlsx")
rows = []
for rn, col in REGION_COLS.items():
    t = xl[["datetime", col]].copy()
    t.columns = ["datetime", "demand_mw"]
    t["region"] = rn
    rows.append(t)

raw_df = pd.concat(rows, ignore_index=True)
raw_df["datetime"] = pd.to_datetime(raw_df["datetime"])
raw_df.sort_values(["region", "datetime"], inplace=True)
raw_df.reset_index(drop=True, inplace=True)
print(f"   Raw rows       : {len(raw_df):,}")

# ═══════════════════════════════════════════════════════════════════════════
# [2/6]  DATA CLEANING
# ═══════════════════════════════════════════════════════════════════════════
print("\n[2/6]  Data cleaning...")

cleaned_parts = []
cleaning_report = {}

for region in REGION_COLS:
    rdf = raw_df[raw_df["region"] == region].copy()

    # --- A. Drop exact duplicate (datetime, region) rows ---
    before_dup = len(rdf)
    rdf = rdf.drop_duplicates(subset="datetime", keep="first")
    dup_removed = before_dup - len(rdf)

    # --- B. Fill missing hours with linear interpolation ---
    full_range = pd.date_range(rdf["datetime"].min(), rdf["datetime"].max(), freq="h")
    rdf = rdf.set_index("datetime").reindex(full_range).rename_axis("datetime")
    rdf["region"] = region
    rdf["demand_mw"] = rdf["demand_mw"].interpolate(method="time", limit=6)
    rdf = rdf.dropna(subset=["demand_mw"]).reset_index()
    gap_filled = len(rdf) - (before_dup - dup_removed)

    # --- C. IQR outlier winsorisation (per hour bucket to keep daily shape) ---
    before_out = rdf["demand_mw"].copy()
    for h in range(24):
        mask = rdf["datetime"].dt.hour == h
        q1 = rdf.loc[mask, "demand_mw"].quantile(0.01)
        q3 = rdf.loc[mask, "demand_mw"].quantile(0.99)
        iqr = q3 - q1
        lo, hi = q1 - 1.5 * iqr, q3 + 1.5 * iqr
        rdf.loc[mask, "demand_mw"] = rdf.loc[mask, "demand_mw"].clip(lo, hi)
    clipped = int((rdf["demand_mw"] != before_out).sum())

    cleaning_report[region] = {
        "duplicates_removed": dup_removed,
        "hours_interpolated": gap_filled,
        "outliers_winsorised": clipped,
        "final_rows": len(rdf),
    }
    print(f"   {region:<14} : {len(rdf):>6,} rows  |"
          f" dups={dup_removed}  filled={gap_filled}  clipped={clipped}")
    cleaned_parts.append(rdf)

df = pd.concat(cleaned_parts, ignore_index=True).sort_values(["region","datetime"])
print(f"\n   Total after cleaning : {len(df):,} rows")

# ═══════════════════════════════════════════════════════════════════════════
# [3/6]  FEATURE ENGINEERING
# ═══════════════════════════════════════════════════════════════════════════
print("\n[3/6]  Feature engineering (cyclical + lag + rolling)...")

df["hour"]       = df["datetime"].dt.hour
df["day_of_week"]= df["datetime"].dt.dayofweek
df["month"]      = df["datetime"].dt.month
df["year"]       = df["datetime"].dt.year
df["day_of_year"]= df["datetime"].dt.dayofyear
df["is_weekend"] = (df["day_of_week"] >= 5).astype(int)
df["season"]     = df["month"].map({12:0,1:0,2:0, 3:1,4:1,5:1, 6:2,7:2,8:2, 9:3,10:3,11:3})

# Cyclical encoding (no discontinuity at period boundaries)
df["hour_sin"]   = np.sin(2*np.pi*df["hour"]        /24)
df["hour_cos"]   = np.cos(2*np.pi*df["hour"]        /24)
df["dow_sin"]    = np.sin(2*np.pi*df["day_of_week"] /7)
df["dow_cos"]    = np.cos(2*np.pi*df["day_of_week"] /7)
df["month_sin"]  = np.sin(2*np.pi*df["month"]       /12)
df["month_cos"]  = np.cos(2*np.pi*df["month"]       /12)
df["doy_sin"]    = np.sin(2*np.pi*df["day_of_year"] /365)
df["doy_cos"]    = np.cos(2*np.pi*df["day_of_year"] /365)

# Lag features (per region so there is no cross-region contamination)
lag_lookup_parts = []
for region in REGION_COLS:
    rdf = df[df["region"] == region].copy().sort_values("datetime")
    rdf["lag_24h"]   = rdf["demand_mw"].shift(24)   # same hour yesterday
    rdf["lag_48h"]   = rdf["demand_mw"].shift(48)   # same hour 2 days ago
    rdf["lag_168h"]  = rdf["demand_mw"].shift(168)  # same hour last week
    rdf["roll6_mean"]= rdf["demand_mw"].shift(1).rolling(6,  min_periods=3).mean()
    rdf["roll24_mean"]= rdf["demand_mw"].shift(1).rolling(24, min_periods=12).mean()
    rdf["roll_std6"] = rdf["demand_mw"].shift(1).rolling(6,  min_periods=3).std()

    # Lag lookup for inference: avg demand by (hour, dow, month)
    lookup = (rdf.groupby(["hour","day_of_week","month"])["demand_mw"]
                 .mean().round(2).reset_index())
    lookup["region"] = region
    lag_lookup_parts.append(lookup)

    # Put back into main df (use index alignment)
    for col in ["lag_24h","lag_48h","lag_168h","roll6_mean","roll24_mean","roll_std6"]:
        df.loc[df["region"] == region, col] = rdf[col].values

# Save lag lookup table for inference-time substitution
lag_lookup_df = pd.concat(lag_lookup_parts, ignore_index=True)
lag_lookup_df.to_csv("models/lag_lookup.csv", index=False)
print(f"   Lag lookup saved: {len(lag_lookup_df):,} rows")

# Drop rows that still have NaN after lag computation (first ~168 rows per region)
before_drop = len(df)
df = df.dropna(subset=["lag_24h","lag_48h","lag_168h","roll6_mean","roll24_mean","roll_std6"])
print(f"   Rows after lag trimming: {len(df):,} (dropped {before_drop-len(df):,} boundary rows)")

# ═══════════════════════════════════════════════════════════════════════════
# [4/6]  PER-REGION MULTI-MODEL TRAINING
# ═══════════════════════════════════════════════════════════════════════════
FEATURES = [
    # Temporal calendar
    "hour","day_of_week","month","year","is_weekend","season",
    # Cyclical
    "hour_sin","hour_cos","dow_sin","dow_cos",
    "month_sin","month_cos","doy_sin","doy_cos",
    # Lag + rolling (the biggest accuracy drivers)
    "lag_24h","lag_48h","lag_168h",
    "roll6_mean","roll24_mean","roll_std6",
]

CANDIDATES = {
    "HistGB": HistGradientBoostingRegressor(
        max_iter=600, max_depth=7, learning_rate=0.04,
        min_samples_leaf=15, l2_regularization=0.1, random_state=42,
    ),
    "RF": RandomForestRegressor(
        n_estimators=300, max_depth=20, min_samples_leaf=5,
        n_jobs=-1, random_state=42,
    ),
    "ET": ExtraTreesRegressor(
        n_estimators=300, max_depth=20, min_samples_leaf=5,
        n_jobs=-1, random_state=42,
    ),
}

print(f"\n[4/6]  Training  (features={len(FEATURES)})...")
print("-" * 70)
fmt = f"{'Region':<14} {'Model':<8} {'R2':>8} {'MAE(MW)':>12} {'MAPE%':>8} {'Best':>6}"
print(fmt)
print("-" * 70)

all_metrics = {}
scalers     = {}

for region in REGION_COLS:
    rdf = df[df["region"] == region].copy().sort_values("datetime").reset_index(drop=True)

    X = rdf[FEATURES].values
    y = rdf["demand_mw"].values.reshape(-1, 1)

    # StandardScaler on the target — equal treatment for all regions
    scaler = StandardScaler()
    y_sc   = scaler.fit_transform(y).ravel()

    # Time-series split: last 20% of time for testing (no leakage)
    split  = int(len(X) * 0.80)
    X_tr, X_te = X[:split], X[split:]
    y_tr, y_te = y_sc[:split], y_sc[split:]

    best_name  = None
    best_r2    = -np.inf
    best_model = None

    region_results = {}
    for name, candidate in CANDIDATES.items():
        candidate.fit(X_tr, y_tr)
        yp_sc = candidate.predict(X_te)
        yp_mw = scaler.inverse_transform(yp_sc.reshape(-1,1)).ravel()
        yt_mw = scaler.inverse_transform(y_te.reshape(-1,1)).ravel()

        r2   = r2_score(y_te, yp_sc)
        mae  = mean_absolute_error(yt_mw, yp_mw)
        mape = mean_absolute_percentage_error(yt_mw, yp_mw) * 100
        region_results[name] = {"r2":r2,"mae_mw":mae,"mape_pct":mape}

        marker = ""
        if r2 > best_r2:
            best_r2    = r2
            best_name  = name
            best_model = candidate
            marker     = "<--"
        print(f"  {region:<14} {name:<8} {r2:>8.4f} {mae:>12,.0f} {mape:>8.2f}  {marker}")

    # Save best model + scaler for this region
    joblib.dump(best_model,                 f"models/demand_model_{region}.pkl")
    joblib.dump(scaler,                     f"models/scaler_{region}.pkl")

    # Final test metrics (inverse-scaled)
    yp_best_sc = best_model.predict(X_te)
    yp_best_mw = scaler.inverse_transform(yp_best_sc.reshape(-1,1)).ravel()
    yt_mw      = scaler.inverse_transform(y_te.reshape(-1,1)).ravel()

    all_metrics[region] = {
        "best_model":   best_name,
        "r2":           round(float(best_r2), 4),
        "mae_mw":       round(float(mean_absolute_error(yt_mw, yp_best_mw)), 2),
        "mape_pct":     round(float(mean_absolute_percentage_error(yt_mw, yp_best_mw)*100), 2),
        "train_rows":   int(split),
        "test_rows":    int(len(X_te)),
        "scaler_mean":  round(float(scaler.mean_[0]), 2),
        "scaler_std":   round(float(scaler.scale_[0]), 2),
        "all_models":   {n: {k: round(v,4) for k,v in res.items()}
                         for n, res in region_results.items()},
    }
    scalers[region] = scaler
    print(f"  --> best: {best_name}  R2={best_r2:.4f}\n")

print("-" * 70)

# ═══════════════════════════════════════════════════════════════════════════
# [5/6]  NATIONWIDE DATA CLEANING + AREA LOOKUP + DISTRICT HIERARCHY
# ═══════════════════════════════════════════════════════════════════════════
print("\n[5/6]  Nationwide data cleaning + district hierarchy...")

from circle_to_state import CIRCLE_TO_STATE
import glob

all_files = glob.glob("data/*.csv")
data_files = [f for f in all_files if "consumption" in f.lower() or "electricity" in f.lower() or "energy" in f.lower()]
df_list = []
for f in data_files:
    try:
        df_list.append(pd.read_csv(f))
    except Exception as e:
        print(f"   Skipping {f}: {e}")

if not df_list:
    tg_raw = pd.read_csv("data/TG-NPDCL_consumption_detail_commercial_JANUARY-2025.csv")
else:
    tg_raw = pd.concat(df_list, ignore_index=True)
    tg_raw = tg_raw.dropna(subset=["Circle"])

print(f"   Raw rows: {len(tg_raw):,}")

# ---- Nationwide Data Cleaning ----
# 1. Standardise string columns
for col in ["Circle","Division","SubDivision","Section","Area","CatDesc"]:
    if col in tg_raw.columns:
        tg_raw[col] = tg_raw[col].astype(str).str.strip().str.upper()

# 2. Remove rows with zero TotServices (no consumers = no valid intensity)
before = len(tg_raw)
tg_raw = tg_raw[tg_raw["TotServices"] > 0].copy()
print(f"   Dropped zero-service rows: {before - len(tg_raw):,}")

# 3. Remove extreme outlier areas (Units per service > 99th pct)
tg_raw["ups"] = tg_raw["Units"] / tg_raw["TotServices"]
threshold_hi  = tg_raw["ups"].quantile(0.99)
threshold_lo  = tg_raw["ups"].quantile(0.01)
before = len(tg_raw)
tg_raw = tg_raw[(tg_raw["ups"] >= threshold_lo) & (tg_raw["ups"] <= threshold_hi)]
print(f"   Dropped extreme-outlier rows (units/service): {before - len(tg_raw):,}")

# 4. Aggregate to Area level
area_df = tg_raw.groupby(["Circle","Division","SubDivision","Section","Area"]).agg(
    total_units     = ("Units",         "sum"),
    total_load      = ("Load",          "sum"),
    total_services  = ("TotServices",   "sum"),
    billed_services = ("BilledServices","sum"),
).reset_index()

area_df["units_per_service"]   = area_df["total_units"]  / area_df["total_services"]
area_df["load_per_service_kw"] = area_df["total_load"]   / area_df["total_services"]
area_df["kwh_per_sqft_month"]  = area_df["units_per_service"]  / 500
area_df["kw_per_sqft"]         = area_df["load_per_service_kw"]/ 500
area_df["kwh_per_sqft_hour"]   = area_df["kwh_per_sqft_month"] / 730

area_df["state"]  = area_df["Circle"].map(CIRCLE_TO_STATE).fillna("Telangana")

STATE_TO_REGION = {
    "Andhra Pradesh": "Southern", "Arunachal Pradesh": "NorthEastern", "Assam": "NorthEastern",
    "Bihar": "Eastern", "Chhattisgarh": "Western", "Goa": "Western", "Gujarat": "Western",
    "Haryana": "Northern", "Himachal Pradesh": "Northern", "Jharkhand": "Eastern",
    "Karnataka": "Southern", "Kerala": "Southern", "Madhya Pradesh": "Western",
    "Maharashtra": "Western", "Manipur": "NorthEastern", "Meghalaya": "NorthEastern",
    "Mizoram": "NorthEastern", "Nagaland": "NorthEastern", "Odisha": "Eastern",
    "Punjab": "Northern", "Rajasthan": "Northern", "Sikkim": "NorthEastern",
    "Tamil Nadu": "Southern", "Telangana": "Southern", "Tripura": "NorthEastern",
    "Uttar Pradesh": "Northern", "Uttarakhand": "Northern", "West Bengal": "Eastern",
    "Delhi": "Northern", "Jammu & Kashmir": "Northern", "Ladakh": "Northern",
    "Chandigarh": "Northern", "Puducherry": "Southern", "Andaman & Nicobar Islands": "Southern",
    "Dadra & Nagar Haveli": "Western", "Daman & Diu": "Western"
}

area_df["region"] = area_df["state"].map(STATE_TO_REGION).fillna("Southern")

print(f"   Clean areas: {len(area_df):,}  |  Circles: {area_df['Circle'].nunique()}")

# ---- Build Area Lookup (for prediction) ----
area_lookup = {}
circle_to_state_export = {}
for _, row in area_df.iterrows():
    key = row["Area"].strip().upper()
    area_lookup[key] = {
        "circle":             row["Circle"],
        "division":           row["Division"],
        "subdivision":        row["SubDivision"],
        "section":            row["Section"],
        "region":             row["region"],
        "kwh_per_sqft_month": round(float(row["kwh_per_sqft_month"]),  6),
        "kw_per_sqft":        round(float(row["kw_per_sqft"]),         6),
        "kwh_per_sqft_hour":  round(float(row["kwh_per_sqft_hour"]),   8),
        "total_load_kw":      round(float(row["total_load"]),          3),
        "total_services":     int(row["total_services"]),
    }
    if row["Circle"] not in circle_to_state_export:
        circle_to_state_export[row["Circle"]] = row["state"]
        
with open("models/circle_to_state.json", "w", encoding="utf-8") as f:
    json.dump(circle_to_state_export, f)
with open("models/area_lookup.json", "w", encoding="utf-8") as f:
    json.dump(area_lookup, f)
print(f"   Saved {len(area_lookup)} areas -> models/area_lookup.json")

# ---- Build Full District Hierarchy JSON ----
# Structure: { Circle: { Division: { SubDivision: { Section: [areas] } } } }
hierarchy: dict = {}
for _, row in area_df.iterrows():
    c  = row["Circle"]
    d  = row["Division"]
    sd = row["SubDivision"]
    se = row["Section"]
    a  = row["Area"]
    hierarchy.setdefault(c, {}).setdefault(d, {}).setdefault(sd, {}).setdefault(se, [])
    if a not in hierarchy[c][d][sd][se]:
        hierarchy[c][d][sd][se].append(a)

# Sort everything
for c in hierarchy:
    for d in hierarchy[c]:
        for sd in hierarchy[c][d]:
            for se in hierarchy[c][d][sd]:
                hierarchy[c][d][sd][se].sort()
            hierarchy[c][d][sd] = dict(sorted(hierarchy[c][d][sd].items()))
        hierarchy[c][d] = dict(sorted(hierarchy[c][d].items()))
    hierarchy[c] = dict(sorted(hierarchy[c].items()))
hierarchy = dict(sorted(hierarchy.items()))

with open("models/district_hierarchy.json", "w", encoding="utf-8") as f:
    json.dump(hierarchy, f, ensure_ascii=False)

# Also rebuild flat circle_areas.json (backward compat)
circle_areas: dict = {}
for c in hierarchy:
    all_areas: list[str] = []
    for d in hierarchy[c]:
        for sd in hierarchy[c][d]:
            for se in hierarchy[c][d][sd]:
                all_areas.extend(hierarchy[c][d][sd][se])
    circle_areas[c] = sorted(set(all_areas))
with open("circle_areas.json", "w", encoding="utf-8") as f:
    json.dump(circle_areas, f, ensure_ascii=False)

circles_cnt  = len(hierarchy)
divisions    = sum(len(hierarchy[c]) for c in hierarchy)
subdivisions = sum(len(hierarchy[c][d]) for c in hierarchy for d in hierarchy[c])
sections     = sum(len(hierarchy[c][d][sd]) for c in hierarchy for d in hierarchy[c] for sd in hierarchy[c][d])
print(f"   Hierarchy: {circles_cnt} circles -> {divisions} divs -> {subdivisions} sub-divs -> {sections} sections")
print(f"   Saved: models/district_hierarchy.json  +  circle_areas.json")

# ═══════════════════════════════════════════════════════════════════════════
# [6/6]  SAVE REMAINING ARTIFACTS + ACCURACY REPORT
# ═══════════════════════════════════════════════════════════════════════════
print("\n[6/6]  Saving artifacts + accuracy report...")

from sklearn.preprocessing import LabelEncoder
le = LabelEncoder()
le.fit(list(REGION_COLS.keys()))
joblib.dump(le,       "models/region_encoder.pkl")
joblib.dump(FEATURES, "models/feature_list.pkl")

with open("models/metrics.json", "w", encoding="utf-8") as f:
    json.dump(all_metrics, f, indent=2)

with open("models/cleaning_report.json", "w", encoding="utf-8") as f:
    json.dump(cleaning_report, f, indent=2)

# ---- Final Accuracy Table ----
print()
print(BAR)
print("  FINAL ACCURACY REPORT  (per-region best model, time-series test split)")
print(BAR)
hdr = f"  {'Region':<14} {'Model':<8} {'R2':>8} {'MAE (MW)':>12} {'MAPE%':>8} {'Accuracy%':>10}"
print(hdr)
print("  " + "-" * 62)
for region, m in all_metrics.items():
    acc = round(100 - m["mape_pct"], 1)
    star = " ***" if acc >= 95 else (" **" if acc >= 90 else "")
    print(f"  {region:<14} {m['best_model']:<8} {m['r2']:>8.4f} "
          f"{m['mae_mw']:>12,.0f} {m['mape_pct']:>8.2f} {acc:>9.1f}%{star}")

overall_mape = np.mean([m["mape_pct"] for m in all_metrics.values()])
overall_acc  = round(100 - overall_mape, 1)
print("  " + "-" * 62)
print(f"  {'OVERALL AVERAGE':<22} {'':<8} {'':<12} {overall_mape:>8.2f} {overall_acc:>9.1f}%")
print(BAR)
print(f"\n  Models saved   : models/demand_model_{{region}}.pkl x {len(all_metrics)}")
print(f"  Scalers saved  : models/scaler_{{region}}.pkl x {len(all_metrics)}")
print(f"  Metrics        : models/metrics.json")
print(f"  Lag lookup     : models/lag_lookup.csv")
print(f"  District hier. : models/district_hierarchy.json")
print(f"  Areas          : {len(area_lookup):,} Telangana areas")
print(BAR)