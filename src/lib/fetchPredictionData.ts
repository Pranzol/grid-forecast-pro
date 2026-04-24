export interface PredictionPoint {
  time: string;
  demand: number;
  forecast: boolean;
}

export interface PredictionResponse {
  city: string;
  region: string;
  predictedDemandMW: number;
  confidencePercent: number;
  peakTime: string;
  peakDemandMW: number;
  recommendedAction: string;
  actionSeverity: "normal" | "warning" | "critical";
  series: PredictionPoint[];
  // New sqft-level outputs (only when sqft provided)
  sqft?: number;
  estimatedKwh?: number;
  estimatedKwhPerSqft?: number;
  estimatedKw?: number;
  monthlyKwhEstimate?: number;
  areaIntensity?: string;
}

export interface PredictionRequest {
  city: string;
  date: string;
  time: string;
  duration: number;
  sqft?: number;
}

const API_BASE = import.meta.env.VITE_API_URL ?? "http://127.0.0.1:5000";

export async function fetchPredictionData(
  city: string,
  date: string,
  time: string,
  duration: number,
  sqft?: number
): Promise<PredictionResponse> {
  const reqBody: PredictionRequest = { city, date, time, duration };
  if (sqft) reqBody.sqft = sqft;

  const res = await fetch(`${API_BASE}/predict`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(reqBody),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail ?? `Prediction failed: HTTP ${res.status}`);
  }

  return res.json();
}