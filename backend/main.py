from fastapi import FastAPI, HTTPException, Depends, Security
from fastapi.security.api_key import APIKeyHeader
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from datetime import datetime
from typing import Optional
import numpy as np, joblib, json, os

# ── Load artifacts ─────────────────────────────────────────────────────────
# Per-region models + StandardScalers (trained on normalized demand target)
# This fixes the scale bias: National (160K MW) no longer drowns out
# NorthEastern (2K MW). Each region has its own model and inverse-scaler.
KNOWN_REGIONS_LIST = ["Eastern","National","NorthEastern","Northern","Southern","Western"]

REGION_MODELS  = {}
REGION_SCALERS = {}
for _r in KNOWN_REGIONS_LIST:
    _mp = f"models/demand_model_{_r}.pkl"
    _sp = f"models/scaler_{_r}.pkl"
    if os.path.exists(_mp) and os.path.exists(_sp):
        REGION_MODELS[_r]  = joblib.load(_mp)
        REGION_SCALERS[_r] = joblib.load(_sp)

# Fallback: legacy single model (if per-region models not yet trained)
_legacy_model = None
if not REGION_MODELS and os.path.exists("models/demand_model.pkl"):
    _legacy_model  = joblib.load("models/demand_model.pkl")

region_encoder = joblib.load("models/region_encoder.pkl")
feature_list   = joblib.load("models/feature_list.pkl")

with open("models/area_lookup.json") as f:
    AREA_LOOKUP = json.load(f)

_metrics_path = os.path.join(os.path.dirname(__file__), "models", "metrics.json")
MODEL_METRICS: dict = {}
if os.path.exists(_metrics_path):
    with open(_metrics_path) as f:
        MODEL_METRICS = json.load(f)

# ── Load circle→area dataset (flat, backward compat) ──────────────────────
_circle_areas_path = os.path.join(os.path.dirname(__file__), "circle_areas.json")
if os.path.exists(_circle_areas_path):
    with open(_circle_areas_path) as f:
        CIRCLE_AREAS: dict = json.load(f)
else:
    CIRCLE_AREAS = {}

# ── Load full district hierarchy (Circle→Division→SubDiv→Section→areas) ──
_hier_path = os.path.join(os.path.dirname(__file__), "models", "district_hierarchy.json")
if os.path.exists(_hier_path):
    with open(_hier_path, encoding="utf-8") as f:
        DISTRICT_HIERARCHY: dict = json.load(f)
else:
    DISTRICT_HIERARCHY = {}

# ── Load lag lookup (historical avg demand by region/hour/dow/month) ───────
import pandas as pd
_lag_path = os.path.join(os.path.dirname(__file__), "models", "lag_lookup.csv")
if os.path.exists(_lag_path):
    _lag_df = pd.read_csv(_lag_path)
    LAG_LOOKUP: dict = {}  # (region, hour, dow, month) -> avg_demand_mw
    for _, row in _lag_df.iterrows():
        key = (row["region"], int(row["hour"]), int(row["day_of_week"]), int(row["month"]))
        LAG_LOOKUP[key] = float(row["demand_mw"])
else:
    LAG_LOOKUP = {}

KNOWN_REGIONS = KNOWN_REGIONS_LIST
using_per_region = bool(REGION_MODELS)
print(f" Mode       : {'per-region v4 (lag+rolling)' if using_per_region else 'legacy single model'}")
print(f" Regions    : {KNOWN_REGIONS}")
print(f" Areas      : {len(AREA_LOOKUP):,} Telangana areas loaded")
print(f" Circles    : {list(CIRCLE_AREAS.keys())}")
print(f" Hier nodes : {len(DISTRICT_HIERARCHY)} circles  |  lag keys: {len(LAG_LOOKUP):,}")

# ── India state → TG-NPDCL circles mapping ───────────────────────────────
# All 28 states + 8 UTs. Only Telangana has real circle data in this dataset.
# Other states map to the model's nearest grid region.
STATE_CIRCLES: dict[str, list[str]] = {
    "Andhra Pradesh":           [],
    "Arunachal Pradesh":        [],
    "Assam":                    [],
    "Bihar":                    [],
    "Chhattisgarh":             [],
    "Goa":                      [],
    "Gujarat":                  [],
    "Haryana":                  [],
    "Himachal Pradesh":         [],
    "Jharkhand":                [],
    "Karnataka":                [],
    "Kerala":                   [],
    "Madhya Pradesh":           [],
    "Maharashtra":              [],
    "Manipur":                  [],
    "Meghalaya":                [],
    "Mizoram":                  [],
    "Nagaland":                 [],
    "Odisha":                   [],
    "Punjab":                   [],
    "Rajasthan":                [],
    "Sikkim":                   [],
    "Tamil Nadu":               [],
    "Telangana":                sorted(CIRCLE_AREAS.keys()),
    "Tripura":                  [],
    "Uttar Pradesh":            [],
    "Uttarakhand":              [],
    "West Bengal":              [],
    # Union Territories
    "Andaman & Nicobar Islands":[],
    "Chandigarh":               [],
    "Dadra & Nagar Haveli":     [],
    "Daman & Diu":              [],
    "Delhi":                    [],
    "Jammu & Kashmir":          [],
    "Ladakh":                   [],
    "Lakshadweep":              [],
    "Puducherry":               [],
}

# State → model region mapping (for prediction routing)
STATE_TO_REGION: dict[str, str] = {
    "Andhra Pradesh":           "Southern",
    "Arunachal Pradesh":        "NorthEastern",
    "Assam":                    "NorthEastern",
    "Bihar":                    "Eastern",
    "Chhattisgarh":             "Western",
    "Goa":                      "Western",
    "Gujarat":                  "Western",
    "Haryana":                  "Northern",
    "Himachal Pradesh":         "Northern",
    "Jharkhand":                "Eastern",
    "Karnataka":                "Southern",
    "Kerala":                   "Southern",
    "Madhya Pradesh":           "Western",
    "Maharashtra":              "Western",
    "Manipur":                  "NorthEastern",
    "Meghalaya":                "NorthEastern",
    "Mizoram":                  "NorthEastern",
    "Nagaland":                 "NorthEastern",
    "Odisha":                   "Eastern",
    "Punjab":                   "Northern",
    "Rajasthan":                "Northern",
    "Sikkim":                   "NorthEastern",
    "Tamil Nadu":               "Southern",
    "Telangana":                "Southern",
    "Tripura":                  "NorthEastern",
    "Uttar Pradesh":            "Northern",
    "Uttarakhand":              "Northern",
    "West Bengal":              "Eastern",
    "Andaman & Nicobar Islands":"Southern",
    "Chandigarh":               "Northern",
    "Dadra & Nagar Haveli":     "Western",
    "Daman & Diu":              "Western",
    "Delhi":                    "Northern",
    "Jammu & Kashmir":          "Northern",
    "Ladakh":                   "Northern",
    "Lakshadweep":              "Southern",
    "Puducherry":               "Southern",
}

# ── City → Region map (major Indian cities) ────────────────────────────────
CITY_TO_REGION = {
    # Northern
    "Delhi":"Northern","New Delhi":"Northern","Noida":"Northern",
    "Gurugram":"Northern","Ghaziabad":"Northern","Faridabad":"Northern",
    "Lucknow":"Northern","Kanpur":"Northern","Agra":"Northern",
    "Varanasi":"Northern","Meerut":"Northern","Prayagraj":"Northern",
    "Jaipur":"Northern","Jodhpur":"Northern","Kota":"Northern","Udaipur":"Northern",
    "Chandigarh":"Northern","Ludhiana":"Northern","Amritsar":"Northern",
    "Dehradun":"Northern","Shimla":"Northern","Srinagar":"Northern","Jammu":"Northern",
    # Western
    "Mumbai":"Western","Pune":"Western","Nagpur":"Western","Nashik":"Western",
    "Thane":"Western","Aurangabad":"Western","Solapur":"Western",
    "Ahmedabad":"Western","Surat":"Western","Vadodara":"Western",
    "Rajkot":"Western","Gandhinagar":"Western","Bhavnagar":"Western",
    "Bhopal":"Western","Indore":"Western","Jabalpur":"Western","Gwalior":"Western",
    "Raipur":"Western","Bilaspur":"Western","Panaji":"Western",
    # Eastern
    "Kolkata":"Eastern","Howrah":"Eastern","Durgapur":"Eastern",
    "Asansol":"Eastern","Siliguri":"Eastern",
    "Patna":"Eastern","Gaya":"Eastern","Muzaffarpur":"Eastern","Bhagalpur":"Eastern",
    "Ranchi":"Eastern","Jamshedpur":"Eastern","Dhanbad":"Eastern","Bokaro":"Eastern",
    "Bhubaneswar":"Eastern","Cuttack":"Eastern","Rourkela":"Eastern",
    "Berhampur":"Eastern","Gangtok":"Eastern",
    # Southern — Telangana circles (from TG-NPDCL data)
    "Warangal":"Southern","Hanumakonda":"Southern","Karimnagar":"Southern",
    "Nizamabad":"Southern","Khammam":"Southern","Adilabad":"Southern",
    "Mancherial":"Southern","Jagityal":"Southern","Peddapally":"Southern",
    "Kamareddy":"Southern","Nirmal":"Southern","Jangaon":"Southern",
    "Mahabubabad":"Southern","Asifabad":"Southern","Bhupalapally":"Southern",
    "Bhadradri Kothagudem":"Southern",
    # Southern — other major cities
    "Bengaluru":"Southern","Bangalore":"Southern","Mysuru":"Southern",
    "Hubballi":"Southern","Mangaluru":"Southern","Belagavi":"Southern",
    "Chennai":"Southern","Coimbatore":"Southern","Madurai":"Southern",
    "Tiruchirappalli":"Southern","Salem":"Southern","Tirunelveli":"Southern",
    "Hyderabad":"Southern","Vijayawada":"Southern","Visakhapatnam":"Southern",
    "Guntur":"Southern","Warangal":"Southern",
    "Kochi":"Southern","Thiruvananthapuram":"Southern",
    "Kozhikode":"Southern","Thrissur":"Southern","Puducherry":"Southern",
    # NorthEastern
    "Guwahati":"NorthEastern","Dispur":"NorthEastern","Silchar":"NorthEastern",
    "Dibrugarh":"NorthEastern","Jorhat":"NorthEastern","Imphal":"NorthEastern",
    "Shillong":"NorthEastern","Aizawl":"NorthEastern","Kohima":"NorthEastern",
    "Dimapur":"NorthEastern","Agartala":"NorthEastern","Itanagar":"NorthEastern",
    # National & Regions
    "All India":"National","National":"National",
    "Northern":"Northern", "Western":"Western", "Eastern":"Eastern",
    "Southern":"Southern", "NorthEastern":"NorthEastern"
}

# City share of its region's total demand
CITY_SHARE = {
    "Delhi":0.28,"New Delhi":0.28,"Noida":0.05,"Gurugram":0.06,
    "Lucknow":0.07,"Kanpur":0.06,"Jaipur":0.07,"Mumbai":0.22,
    "Pune":0.12,"Ahmedabad":0.13,"Surat":0.10,"Kolkata":0.30,
    "Patna":0.09,"Ranchi":0.07,"Bhubaneswar":0.06,
    "Bengaluru":0.20,"Bangalore":0.20,"Chennai":0.18,"Hyderabad":0.18,
    "Warangal":0.04,"Hanumakonda":0.03,"Karimnagar":0.04,"Nizamabad":0.04,
    "Khammam":0.04,"Adilabad":0.02,"Guwahati":0.25,
    "All India":1.0,"National":1.0,
    "Northern":1.0, "Western":1.0, "Eastern":1.0, "Southern":1.0, "NorthEastern":1.0
}

SEASON_MAP = {12:0,1:0,2:0, 3:1,4:1,5:1, 6:2,7:2,8:2, 9:3,10:3,11:3}

# ── App ────────────────────────────────────────────────────────────────────
app = FastAPI(title="GridForecast Pro API", version="2.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"], allow_headers=["*"],
)

# ── Security ───────────────────────────────────────────────────────────────
API_KEY = os.environ.get("GRID_API_KEY", "grid_secure_key_2026")
API_KEY_NAME = "X-API-Key"
api_key_header = APIKeyHeader(name=API_KEY_NAME, auto_error=False)

async def get_api_key(api_key_header: str = Security(api_key_header)):
    if api_key_header == API_KEY:
        return api_key_header
    else:
        raise HTTPException(
            status_code=403, detail="Could not validate API Key"
        )

# ── Schemas ────────────────────────────────────────────────────────────────
class PredictRequest(BaseModel):
    city: str                       # city/area name OR TG-NPDCL area name
    date: str                       # YYYY-MM-DD
    time: str                       # HH:MM
    duration: int                   # 1-24 hours
    sqft: Optional[float] = None    # building size - triggers sqft output
    state: Optional[str]  = None    # Indian state (for state+area flow)

class PredictionPoint(BaseModel):
    time: str
    demand: float
    forecast: bool

class PredictResponse(BaseModel):
    city: str
    region: str
    predictedDemandMW: float
    confidencePercent: float
    peakTime: str
    peakDemandMW: float
    recommendedAction: str
    actionSeverity: str
    series: list[PredictionPoint]
    # sqft-level outputs (only when sqft provided)
    sqft: Optional[float]                = None
    estimatedKwh: Optional[float]        = None   # total kWh for duration
    estimatedKwhPerSqft: Optional[float] = None   # kWh/sqft for duration
    estimatedKw: Optional[float]         = None   # peak kW load
    monthlyKwhEstimate: Optional[float]  = None   # projected monthly usage
    areaIntensity: Optional[str]         = None   # Low / Medium / High

# ── Helpers ────────────────────────────────────────────────────────────────
def _lag_avg(region: str, hour: int, dow: int, month: int) -> float:
    """Return historical avg demand for this region/hour/dow/month combination.
    Used to substitute lag features at inference time (we have no live history)."""
    return LAG_LOOKUP.get((region, hour, dow, month),
           LAG_LOOKUP.get((region, hour, 0, month), 0.0))

def make_features(region: str, hour: int, dow: int, month: int,
                  year: int = 2025, doy: int = 180,
                  region_enc_compat=None):
    """Build full feature vector for v4 (lag + rolling + cyclical) models.
    Falls back to the old 11-feature set if per-region models are not loaded."""
    season = SEASON_MAP[month]
    hour_sin  = np.sin(2*np.pi*hour /24);  hour_cos  = np.cos(2*np.pi*hour /24)
    dow_sin   = np.sin(2*np.pi*dow  /7);   dow_cos   = np.cos(2*np.pi*dow  /7)
    month_sin = np.sin(2*np.pi*month/12);  month_cos = np.cos(2*np.pi*month/12)
    doy_sin   = np.sin(2*np.pi*doy  /365); doy_cos   = np.cos(2*np.pi*doy  /365)

    if REGION_MODELS and region in REGION_MODELS:
        # v4 feature set (22 features incl. lag/rolling)
        lag24  = _lag_avg(region, hour, dow, month)
        lag48  = _lag_avg(region, hour, (dow-1)%7, month)
        lag168 = _lag_avg(region, hour, dow, month)   # same DoW same month prev week
        roll6  = np.mean([_lag_avg(region, (hour-i)%24, dow, month) for i in range(1,7)])
        roll24 = np.mean([_lag_avg(region, (hour-i)%24, dow, month) for i in range(1,25)])
        roll_std6 = np.std([_lag_avg(region, (hour-i)%24, dow, month) for i in range(1,7)])
        row_v4 = [
            hour, dow, month, year, int(dow>=5), season,
            hour_sin, hour_cos, dow_sin, dow_cos,
            month_sin, month_cos, doy_sin, doy_cos,
            lag24, lag48, lag168, roll6, roll24, roll_std6,
        ]
        # feature_list from v4 has 20 features
        V4_FEATURES = [
            "hour","day_of_week","month","year","is_weekend","season",
            "hour_sin","hour_cos","dow_sin","dow_cos",
            "month_sin","month_cos","doy_sin","doy_cos",
            "lag_24h","lag_48h","lag_168h",
            "roll6_mean","roll24_mean","roll_std6",
        ]
        return np.array([row_v4])
    else:
        # Legacy 11-feature set (v3)
        row_legacy = [
            region_enc_compat, hour, dow, month, int(dow>=5), season,
            hour_sin, hour_cos, dow_sin, dow_cos, month_sin, month_cos,
        ]
        return np.array([row_legacy])

def get_action(demand_mw, is_city):
    hi, lo = (5000,3000) if is_city else (200000,150000)
    if demand_mw > hi:   return "Activate emergency reserves immediately", "critical"
    if demand_mw > lo:   return "Prepare peaking units for dispatch",       "warning"
    return "Normal grid operations — monitor closely",                       "normal"

def intensity_label(kwh_per_sqft_month):
    if kwh_per_sqft_month < 0.10:  return "Low"
    if kwh_per_sqft_month < 0.20:  return "Medium"
    return "High"

# ── Predict endpoint ───────────────────────────────────────────────────────
@app.post("/predict", response_model=PredictResponse)
def predict(req: PredictRequest, api_key: str = Depends(get_api_key)):
    area_key   = req.city.strip().upper()
    area_data  = AREA_LOOKUP.get(area_key)          # TG-NPDCL area hit
    region     = None
    city_label = req.city

    # ── Route 1: known TG-NPDCL area ─────────────────────────────────────
    if area_data:
        region = area_data["region"]   # always "Southern"

    # ── Route 2: state-based lookup ───────────────────────────────────────
    elif req.state and req.state in STATE_TO_REGION:
        region = STATE_TO_REGION[req.state]

    # ── Route 3: known city name ───────────────────────────────────────────
    elif req.city in CITY_TO_REGION:
        region = CITY_TO_REGION[req.city]

    else:
        raise HTTPException(
            status_code=400,
            detail=(
                f"Unknown area/city '{req.city}'. "
                f"Provide a valid Indian state via 'state' field, "
                f"a Telangana area name (e.g. 'ADILABAD - NORTH'), "
                f"or a city name (e.g. 'Hyderabad')."
            )
        )

    region_enc = int(region_encoder.transform([region])[0])
    import datetime as _dt
    _doy = int(_dt.date.fromisoformat(req.date).timetuple().tm_yday) if req.date else 180
    share      = CITY_SHARE.get(req.city, 0.04)
    is_city    = req.city not in ("All India", "National")

    try:
        dt = datetime.strptime(f"{req.date} {req.time}", "%Y-%m-%d %H:%M")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    hour  = dt.hour
    dow   = dt.weekday()
    month = dt.month

    # ── Helper: compute area MW for a given hour ──────────────────────────
    def compute_mw(h, d, m):
        feats = make_features(region, h, d, m, year=dt.year, doy=_doy,
                              region_enc_compat=region_enc)

        if REGION_MODELS and region in REGION_MODELS:
            # ── Per-region v4 path: predict normalized → inverse-scale ────
            mdl    = REGION_MODELS[region]
            scaler = REGION_SCALERS[region]
            r_mw   = float(scaler.inverse_transform(
                mdl.predict(feats).reshape(-1,1))[0,0])

            if area_data:
                area_load_kw = area_data["total_load_kw"]
                avg_ref = float(scaler.inverse_transform(
                    mdl.predict(
                        make_features(region, 12, 0, m, year=dt.year, doy=_doy,
                                      region_enc_compat=region_enc)
                    ).reshape(-1,1))[0,0])
                hourly_factor = r_mw / avg_ref if avg_ref > 0 else 1.0
                return round((area_load_kw / 1000) * hourly_factor, 3)
            else:
                return round(r_mw * share, 3)
        else:
            # ── Legacy single-model fallback ──────────────────────────────
            r_mw = float(_legacy_model.predict(feats)[0])
            if area_data:
                area_load_kw = area_data["total_load_kw"]
                avg_regional = float(_legacy_model.predict(
                    make_features(region, 12, 1, m,
                                  region_enc_compat=region_enc))[0])
                hourly_factor = r_mw / avg_regional if avg_regional > 0 else 1.0
                return round((area_load_kw / 1000) * hourly_factor, 3)
            else:
                return round(r_mw * share, 3)

    # ── Generate 6 historical hours before the selected time ───────────────
    HIST_HOURS = 6
    series = []
    for h in range(-HIST_HOURS, 0):
        h_hour  = (hour + h) % 24
        h_dow   = dow  # keep same day-of-week for simplicity
        h_month = month
        series.append(PredictionPoint(
            time=f"{h_hour:02d}:00",
            demand=compute_mw(h_hour, h_dow, h_month),
            forecast=False,
        ))

    # ── Generate forecast window (user-requested duration) ─────────────────
    for h in range(req.duration):
        curr_hour = (hour + h) % 24
        series.append(PredictionPoint(
            time=f"{curr_hour:02d}:00",
            demand=compute_mw(curr_hour, dow, month),
            forecast=True,
        ))

    # Use only the forecast portion to compute summary stats
    forecast_demands = [p.demand for p in series if p.forecast]
    peak_idx_global  = max(
        (i for i, p in enumerate(series) if p.forecast),
        key=lambda i: series[i].demand
    )
    action, severity = get_action(max(forecast_demands), is_city)
    # Confidence derived from actual model metrics when available
    region_metrics = MODEL_METRICS.get(region, {})
    base_conf = 100.0 - region_metrics.get("mape_pct", 15.0)  # e.g. MAPE 4% → 96% base
    confidence = round(min(97.0, max(60.0, base_conf - req.duration * 0.4)), 1)

    # ── sqft-level calculations ────────────────────────────────────────────
    sqft_out = est_kwh = est_kwh_sqft = est_kw = monthly_est = area_int = None

    if req.sqft and req.sqft > 0:
        sqft = req.sqft

        if area_data:
            # Use real TG-NPDCL intensity for this exact area
            kwh_per_sqft_hour  = area_data["kwh_per_sqft_hour"]
            kw_per_sqft        = area_data["kw_per_sqft"]
        else:
            # Use Southern region average (from TG-NPDCL dataset)
            kwh_per_sqft_hour  = 0.000330
            kw_per_sqft        = 0.004108

        est_kwh        = round(kwh_per_sqft_hour * sqft * req.duration, 2)
        est_kwh_sqft   = round(kwh_per_sqft_hour * req.duration, 6)
        est_kw         = round(kw_per_sqft * sqft, 2)
        monthly_est    = round(kwh_per_sqft_hour * sqft * 730, 2)   # 730 hrs/month
        kwh_mo_sqft    = kwh_per_sqft_hour * 730
        area_int       = intensity_label(kwh_mo_sqft)
        sqft_out       = sqft

    return PredictResponse(
        city=city_label,
        region=region,
        predictedDemandMW=round(forecast_demands[0], 3),
        confidencePercent=confidence,
        peakTime=series[peak_idx_global].time,
        peakDemandMW=round(max(forecast_demands), 3),
        recommendedAction=action,
        actionSeverity=severity,
        series=series,
        sqft=sqft_out,
        estimatedKwh=est_kwh,
        estimatedKwhPerSqft=est_kwh_sqft,
        estimatedKw=est_kw,
        monthlyKwhEstimate=monthly_est,
        areaIntensity=area_int,
    )

@app.get("/areas")
def get_areas(api_key: str = Depends(get_api_key)):
    """Return all available TG-NPDCL areas grouped by circle"""
    grouped = {}
    for area_key, data in AREA_LOOKUP.items():
        circle = data["circle"]
        grouped.setdefault(circle, []).append(area_key.title())
    return {"circles": grouped, "total_areas": len(AREA_LOOKUP)}

@app.get("/cities")
def get_cities(api_key: str = Depends(get_api_key)):
    return {"cities": list(CITY_TO_REGION.keys())}

@app.get("/states")
def get_states(api_key: str = Depends(get_api_key)):
    """Return all Indian states in alphabetical order with available circles"""
    return {
        "states": sorted(STATE_CIRCLES.keys()),
        "state_circles": {s: sorted(c) for s, c in STATE_CIRCLES.items()},
    }

@app.get("/states/{state}/areas")
def get_areas_by_state(state: str, api_key: str = Depends(get_api_key)):
    """Return all areas for a given Indian state, grouped by circle"""
    if state not in STATE_CIRCLES:
        raise HTTPException(status_code=404, detail=f"State '{state}' not found")
    circles = STATE_CIRCLES[state]
    if not circles:
        return {
            "state": state,
            "region": STATE_TO_REGION.get(state, "Unknown"),
            "circles": {},
            "message": "No granular area data available for this state. Predictions use regional model."
        }
    result: dict[str, list[str]] = {}
    for circle in circles:
        areas = sorted(CIRCLE_AREAS.get(circle, []))
        if areas:
            result[circle] = areas
    return {
        "state": state,
        "region": STATE_TO_REGION.get(state, "Unknown"),
        "circles": result,
        "total_areas": sum(len(v) for v in result.values()),
    }

# ── District hierarchy endpoints ───────────────────────────────────────────
@app.get("/districts")
def get_districts(api_key: str = Depends(get_api_key)):
    """Return all TG-NPDCL circles (district-level) with their divisions"""
    return {
        "circles": sorted(DISTRICT_HIERARCHY.keys()),
        "total_circles": len(DISTRICT_HIERARCHY),
    }

@app.get("/districts/{circle}")
def get_circle_detail(circle: str, api_key: str = Depends(get_api_key)):
    """Return all divisions within a circle, each with their subdivisions"""
    circle_up = circle.strip().upper()
    if circle_up not in DISTRICT_HIERARCHY:
        raise HTTPException(status_code=404, detail=f"Circle '{circle}' not found")
    data = DISTRICT_HIERARCHY[circle_up]
    return {
        "circle":    circle_up,
        "divisions": sorted(data.keys()),
        "detail":    data,
    }

@app.get("/districts/{circle}/{division}")
def get_division_detail(circle: str, division: str, api_key: str = Depends(get_api_key)):
    """Return all sub-divisions + sections + areas within a division"""
    circle_up   = circle.strip().upper()
    division_up = division.strip().upper()
    if circle_up not in DISTRICT_HIERARCHY:
        raise HTTPException(status_code=404, detail=f"Circle '{circle}' not found")
    div_data = DISTRICT_HIERARCHY[circle_up].get(division_up)
    if div_data is None:
        raise HTTPException(status_code=404, detail=f"Division '{division}' not in circle '{circle}'")
    return {
        "circle":       circle_up,
        "division":     division_up,
        "subdivisions": sorted(div_data.keys()),
        "detail":       div_data,
    }

@app.get("/metrics")
def get_metrics(api_key: str = Depends(get_api_key)):
    """Return per-region model accuracy metrics (from last training run)"""
    if not MODEL_METRICS:
        raise HTTPException(status_code=503, detail="Metrics not available — run train_model.py first")
    summary = {
        region: {
            "best_model": m.get("best_model"),
            "r2":         m.get("r2"),
            "mae_mw":     m.get("mae_mw"),
            "mape_pct":   m.get("mape_pct"),
            "accuracy_pct": round(100 - m.get("mape_pct", 0), 1),
        }
        for region, m in MODEL_METRICS.items()
    }
    overall_mape = round(sum(m["mape_pct"] for m in summary.values()) / len(summary), 2)
    return {
        "model_version":  "v4-per-region-lag-scaled",
        "overall_accuracy_pct": round(100 - overall_mape, 1),
        "overall_mape_pct": overall_mape,
        "regions": summary,
    }

@app.get("/health")
def health():
    return {
        "status":       "ok",
        "model_version":"v4-per-region-lag-scaled" if REGION_MODELS else "v2-legacy",
        "regions":      KNOWN_REGIONS,
        "areas":        len(AREA_LOOKUP),
        "circles":      len(CIRCLE_AREAS),
        "district_hierarchy_circles": len(DISTRICT_HIERARCHY),
    }