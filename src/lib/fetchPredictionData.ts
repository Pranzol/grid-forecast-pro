import type { LocationValue } from "@/components/grid/LocationSelector";

export interface PredictionPoint {
  time: string;
  demand: number;
  forecast: boolean;
}

export interface PredictionResponse {
  city: string;
  region: string;
  predictedDemandMW: number;
  totalEnergyMWh: number;
  confidencePercent: number;
  peakTime: string;
  peakDemandMW: number;
  recommendedAction: string;
  actionSeverity: "normal" | "warning" | "critical";
  series: PredictionPoint[];
  area?: string;
  stateRegion?: string;

  sqft?: number;
  estimatedKwh?: number;
  estimatedKwhPerSqft?: number;
  estimatedKw?: number;
  monthlyKwhEstimate?: number;
  areaIntensity?: string;
}

export interface PredictionRequest {
  city: string;
  state?: string;
  date: string;
  time: string;
  duration: number;
  sqft?: number;
}

const API_BASE = import.meta.env.VITE_API_URL ?? "http://127.0.0.1:8000";
const API_KEY = import.meta.env.VITE_API_KEY ?? "grid_secure_key_2026";

export function resolveCityFromLocation(location: LocationValue): {
  city: string;
  state?: string;
} {
  const { region, state, circle, area } = location;

  if (area && area.trim()) {

    return { city: area.trim().toUpperCase(), state };
  }

  if (circle && circle.trim()) {

    return {
      city: circle
        .trim()
        .split(" ")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(" "),
      state,
    };
  }


  const STATE_CAPITALS: Record<string, string> = {
    "Andhra Pradesh": "Vijayawada",
    "Arunachal Pradesh": "Itanagar",
    Assam: "Guwahati",
    Bihar: "Patna",
    Chandigarh: "Chandigarh",
    Chhattisgarh: "Raipur",
    "Dadra & Nagar Haveli": "Silvassa",
    "Daman & Diu": "Daman",
    Delhi: "Delhi",
    Goa: "Panaji",
    Gujarat: "Ahmedabad",
    Haryana: "Gurugram",
    "Himachal Pradesh": "Shimla",
    "Jammu & Kashmir": "Srinagar",
    Jharkhand: "Ranchi",
    Karnataka: "Bengaluru",
    Kerala: "Kochi",
    Ladakh: "Jammu",
    Lakshadweep: "Kochi",
    "Madhya Pradesh": "Bhopal",
    Maharashtra: "Mumbai",
    Manipur: "Imphal",
    Meghalaya: "Shillong",
    Mizoram: "Aizawl",
    Nagaland: "Kohima",
    Odisha: "Bhubaneswar",
    Puducherry: "Puducherry",
    Punjab: "Ludhiana",
    Rajasthan: "Jaipur",
    Sikkim: "Gangtok",
    "Tamil Nadu": "Chennai",
    Telangana: "Hyderabad",
    Tripura: "Agartala",
    "Uttar Pradesh": "Lucknow",
    Uttarakhand: "Dehradun",
    "West Bengal": "Kolkata",
    "Andaman & Nicobar Islands": "Kolkata",
  };

  if (state) {
    return { city: STATE_CAPITALS[state] ?? state, state };
  }

  // Region only fallback
  return { city: region || "National" };
}

export async function fetchPredictionData(
  location: LocationValue,
  date: string,
  time: string,
  duration: number,
  sqft?: number
): Promise<PredictionResponse> {
  const { city, state } = resolveCityFromLocation(location);

  const reqBody: PredictionRequest = { city, state, date, time, duration };
  if (sqft) reqBody.sqft = sqft;

  let res: Response;
  try {
    res = await fetch(`${API_BASE}/predict`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": API_KEY,
      },
      body: JSON.stringify(reqBody),
    });
  } catch (networkErr) {
    throw new Error(
      `Cannot reach the backend server at ${API_BASE}. ` +
      `Please make sure the Python API is running:\n` +
      `  cd backend && python -m uvicorn main:app --port 8000 --reload`
    );
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail ?? `Prediction failed: HTTP ${res.status}`);
  }

  const data = await res.json();

  return {
    ...data,
    stateRegion: data.region,
    area: data.city,
  };
}
