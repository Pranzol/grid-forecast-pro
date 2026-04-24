from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from datetime import datetime
from typing import Optional
import numpy as np, joblib, json

# ── Load artifacts ─────────────────────────────────────────────────────────
model          = joblib.load("models/demand_model.pkl")
region_encoder = joblib.load("models/region_encoder.pkl")
feature_list   = joblib.load("models/feature_list.pkl")
with open("models/area_lookup.json") as f:
    AREA_LOOKUP = json.load(f)

KNOWN_REGIONS = list(region_encoder.classes_)
print(f"✅ Regions : {KNOWN_REGIONS}")
print(f"✅ Areas   : {len(AREA_LOOKUP):,} Telangana areas loaded")

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
    # National
    "All India":"National","National":"National",
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
}

SEASON_MAP = {12:0,1:0,2:0, 3:1,4:1,5:1, 6:2,7:2,8:2, 9:3,10:3,11:3}

# ── App ────────────────────────────────────────────────────────────────────
app = FastAPI(title="GridForecast Pro API", version="2.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:8080","http://localhost:3000","http://localhost:5173"],
    allow_methods=["*"], allow_headers=["*"],
)

# ── Schemas ────────────────────────────────────────────────────────────────
class PredictRequest(BaseModel):
    city: str             # city name OR TG-NPDCL area name
    date: str             # YYYY-MM-DD
    time: str             # HH:MM
    duration: int         # 1–24 hours
    sqft: Optional[float] = None   # building size — triggers sqft output

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
def make_features(region_enc, hour, dow, month):
    row = {
        "region_enc": region_enc, "hour": hour,
        "day_of_week": dow,       "month": month,
        "is_weekend": int(dow>=5),"season": SEASON_MAP[month],
    }
    return np.array([[row[f] for f in feature_list]])

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
def predict(req: PredictRequest):
    area_key   = req.city.strip().upper()
    area_data  = AREA_LOOKUP.get(area_key)          # TG-NPDCL area hit
    region     = None
    city_label = req.city

    # ── Route 1: known TG-NPDCL area ──────────────────────────────────────
    if area_data:
        region = area_data["region"]   # always "Southern"

    # ── Route 2: known city name ───────────────────────────────────────────
    elif req.city in CITY_TO_REGION:
        region = CITY_TO_REGION[req.city]

    else:
        raise HTTPException(
            status_code=400,
            detail=(
                f"Unknown area/city '{req.city}'. "
                f"Use a Telangana area name (e.g. 'ADILABAD - NORTH') "
                f"or a city name (e.g. 'Hyderabad')."
            )
        )

    region_enc = int(region_encoder.transform([region])[0])
    share      = CITY_SHARE.get(req.city, 0.04)
    is_city    = req.city not in ("All India", "National")

    try:
        dt = datetime.strptime(f"{req.date} {req.time}", "%Y-%m-%d %H:%M")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    hour  = dt.hour
    dow   = dt.weekday()
    month = dt.month

    # ── Predict hourly series ──────────────────────────────────────────────
    series = []
    for h in range(req.duration):
        curr_hour = (hour + h) % 24
        features  = make_features(region_enc, curr_hour, dow, month)
        region_mw = float(model.predict(features)[0])

        # Scale to city if not a TG-NPDCL area
        if area_data:
            # Use area's actual total load scaled by hour pattern
            # (area_data has monthly kW load; scale by regional hourly pattern)
            area_load_kw = area_data["total_load_kw"]
            # Regional hourly factor (ratio vs average hour)
            avg_regional = float(model.predict(
                make_features(region_enc, 12, 1, month))[0])
            hourly_factor = region_mw / avg_regional if avg_regional > 0 else 1.0
            city_mw = (area_load_kw / 1000) * hourly_factor   # kW → MW
        else:
            city_mw = region_mw * share

        series.append(PredictionPoint(
            time=f"{curr_hour:02d}:00",
            demand=round(city_mw, 3),
            forecast=True,
        ))

    demands  = [p.demand for p in series]
    peak_idx = int(np.argmax(demands))
    action, severity = get_action(max(demands), is_city)
    confidence = round(min(95.0, max(70.0, 85.0 - req.duration * 0.5)), 1)

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
        predictedDemandMW=round(demands[0], 3),
        confidencePercent=confidence,
        peakTime=series[peak_idx].time,
        peakDemandMW=round(max(demands), 3),
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
def get_areas():
    """Return all available TG-NPDCL areas grouped by circle"""
    grouped = {}
    for area_key, data in AREA_LOOKUP.items():
        circle = data["circle"]
        grouped.setdefault(circle, []).append(area_key.title())
    return {"circles": grouped, "total_areas": len(AREA_LOOKUP)}

@app.get("/cities")
def get_cities():
    return {"cities": list(CITY_TO_REGION.keys())}

@app.get("/health")
def health():
    return {"status":"ok","regions":KNOWN_REGIONS,"areas":len(AREA_LOOKUP)}