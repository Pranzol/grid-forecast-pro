export interface PredictionPoint {
  time: string;
  demand: number;
  forecast: boolean;
}

export interface PredictionResponse {
<<<<<<< HEAD
  stateRegion: string;
  area: string;
=======
  city: string;
  region: string;
>>>>>>> main
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
<<<<<<< HEAD
  stateRegion: string;
  area: string;
  /** ISO date string (YYYY-MM-DD) */
=======
  city: string;
>>>>>>> main
  date: string;
  time: string;
  duration: number;
  sqft?: number;
}

const API_BASE = import.meta.env.VITE_API_URL ?? "http://127.0.0.1:5000";

export async function fetchPredictionData(
  stateRegion: string,
  area: string,
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

<<<<<<< HEAD
  const predictedDemandMW = series[series.length - 1].demand;
  const confidencePercent = Math.round(88 + Math.random() * 9);

  let recommendedAction = "Maintain current output";
  let actionSeverity: PredictionResponse["actionSeverity"] = "normal";
  if (peakDemand > 4500) {
    recommendedAction = "Spin up auxiliary generators";
    actionSeverity = "warning";
  }
  if (peakDemand > 4900) {
    recommendedAction = "Activate peak load reserves immediately";
    actionSeverity = "critical";
  }

  return {
    stateRegion,
    area,
    predictedDemandMW,
    confidencePercent,
    peakTime: series[peakIdx]?.time ?? formatHour(startHour + duration / 2),
    peakDemandMW: peakDemand,
    recommendedAction,
    actionSeverity,
    series,
  };
}

function formatHour(h: number): string {
  const normalized = ((h % 24) + 24) % 24;
  const hh = Math.floor(normalized);
  const mm = Math.round((normalized - hh) * 60);
  return `${hh.toString().padStart(2, "0")}:${mm.toString().padStart(2, "0")}`;
}
=======
  return res.json();
}
>>>>>>> main
