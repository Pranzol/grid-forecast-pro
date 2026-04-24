"""Quick baseline evaluation of the current GradientBoosting model."""
import pandas as pd
import numpy as np
from sklearn.ensemble import GradientBoostingRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error, r2_score, mean_squared_error, mean_absolute_percentage_error
from sklearn.preprocessing import LabelEncoder

print("=" * 70)
print("BASELINE MODEL EVALUATION")
print("=" * 70)

# Load data
xl = pd.read_excel("data/hourlyLoadDataIndia.xlsx")
REGION_COLS = {
    "National":"National Hourly Demand",
    "Northern":"Northen Region Hourly Demand",
    "Western":"Western Region Hourly Demand",
    "Eastern":"Eastern Region Hourly Demand",
    "Southern":"Southern Region Hourly Demand",
    "NorthEastern":"North-Eastern Region Hourly Demand",
}
rows = []
for rn, col in REGION_COLS.items():
    t = xl[["datetime", col]].copy()
    t.columns = ["datetime", "demand_mw"]
    t["region"] = rn
    rows.append(t)

df = pd.concat(rows, ignore_index=True).dropna(subset=["demand_mw"])
df["datetime"]    = pd.to_datetime(df["datetime"])
df["hour"]        = df["datetime"].dt.hour
df["day_of_week"] = df["datetime"].dt.dayofweek
df["month"]       = df["datetime"].dt.month
df["is_weekend"]  = (df["day_of_week"] >= 5).astype(int)
df["season"]      = df["month"].map({12:0,1:0,2:0, 3:1,4:1,5:1, 6:2,7:2,8:2, 9:3,10:3,11:3})

le = LabelEncoder()
df["region_enc"] = le.fit_transform(df["region"])

FEATURES = ["region_enc","hour","day_of_week","month","is_weekend","season"]
X = df[FEATURES]
y = df["demand_mw"]

X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

print(f"\nDataset: {len(df):,} rows  |  Train: {len(X_train):,}  |  Test: {len(X_test):,}")
print(f"Features: {FEATURES}")

# Train current model
print("\nTraining baseline GradientBoosting (n=300, lr=0.05, depth=5)...")
model = GradientBoostingRegressor(
    n_estimators=300, learning_rate=0.05,
    max_depth=5, subsample=0.8, random_state=42, verbose=0,
)
model.fit(X_train, y_train)
y_pred = model.predict(X_test)

mae  = mean_absolute_error(y_test, y_pred)
rmse = np.sqrt(mean_squared_error(y_test, y_pred))
r2   = r2_score(y_test, y_pred)
mape = mean_absolute_percentage_error(y_test, y_pred) * 100

print(f"\n{'METRIC':<20} {'VALUE':>15}")
print("-" * 36)
print(f"{'MAE (MW)':<20} {mae:>15,.2f}")
print(f"{'RMSE (MW)':<20} {rmse:>15,.2f}")
print(f"{'R² Score':<20} {r2:>15.4f}")
print(f"{'MAPE (%)':<20} {mape:>15.2f}")

# Per-region breakdown
print(f"\n{'REGION':<15} {'MAE':>10} {'RMSE':>10} {'R²':>8} {'MAPE%':>8}")
print("-" * 55)
test_df = X_test.copy()
test_df["y_true"] = y_test.values
test_df["y_pred"] = y_pred
for enc_val in sorted(test_df["region_enc"].unique()):
    region_name = le.inverse_transform([enc_val])[0]
    mask = test_df["region_enc"] == enc_val
    yt = test_df.loc[mask, "y_true"]
    yp = test_df.loc[mask, "y_pred"]
    r_mae  = mean_absolute_error(yt, yp)
    r_rmse = np.sqrt(mean_squared_error(yt, yp))
    r_r2   = r2_score(yt, yp)
    r_mape = mean_absolute_percentage_error(yt, yp) * 100
    print(f"{region_name:<15} {r_mae:>10,.1f} {r_rmse:>10,.1f} {r_r2:>8.4f} {r_mape:>8.2f}")

print(f"\nFeature importances:")
for name, imp in sorted(zip(FEATURES, model.feature_importances_), key=lambda x: -x[1]):
    print(f"  {name:<15}: {imp:.4f}")
