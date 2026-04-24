/**
 * ============================================================================
 *  GridForecast Pro — Prediction API Integration Point
 * ============================================================================
 *
 *  ⚠️  REPLACE THIS DUMMY IMPLEMENTATION WITH A REAL FETCH CALL
 *      TO YOUR PYTHON BACKEND.
 *
 *  Example real implementation:
 *
 *      const res = await fetch("https://api.your-backend.com/predict", {
 *        method: "POST",
 *        headers: { "Content-Type": "application/json" },
 *        body: JSON.stringify({ city, date, time, duration }),
 *      });
 *      if (!res.ok) throw new Error("Prediction request failed");
 *      return (await res.json()) as PredictionResponse;
 *
 *  The shape of `PredictionResponse` below is what the UI expects.
 * ============================================================================
 */

export interface PredictionPoint {
  /** ISO timestamp or label like "12:00" */
  time: string;
  /** Megawatts */
  demand: number;
  /** Whether this point is a forecast (vs historical) */
  forecast: boolean;
}

export interface PredictionResponse {
  stateRegion: string;
  area: string;
  predictedDemandMW: number;
  confidencePercent: number;
  peakTime: string;
  peakDemandMW: number;
  recommendedAction: string;
  actionSeverity: "normal" | "warning" | "critical";
  series: PredictionPoint[];
}

export interface PredictionRequest {
  stateRegion: string;
  area: string;
  /** ISO date string (YYYY-MM-DD) */
  date: string;
  /** 24h time string (HH:mm) */
  time: string;
  /** Forecast window in hours, 1–24 */
  duration: number;
}

/**
 * 🔌 INTEGRATION POINT — swap the body of this function with your backend call.
 */
export async function fetchPredictionData(
  stateRegion: string,
  area: string,
  date: string,
  time: string,
  duration: number,
): Promise<PredictionResponse> {
  // Simulate network latency
  await new Promise((resolve) => setTimeout(resolve, 1500));

  // ---- Dummy data generation below (remove when wiring real API) ----
  const [hourStr, minuteStr] = time.split(":");
  const startHour = parseInt(hourStr, 10) + parseInt(minuteStr, 10) / 60;

  const baseDemand = 3800 + Math.random() * 600;
  const series: PredictionPoint[] = [];

  // 6 historical points (1 per 30 min before request time)
  for (let i = 6; i >= 1; i--) {
    const t = startHour - i * 0.5;
    const demand =
      baseDemand +
      Math.sin(t * 0.6) * 350 +
      (Math.random() - 0.5) * 120;
    series.push({
      time: formatHour(t),
      demand: Math.round(demand),
      forecast: false,
    });
  }

  // Bridge point (current time)
  const bridge = baseDemand + Math.sin(startHour * 0.6) * 350;
  series.push({
    time: formatHour(startHour),
    demand: Math.round(bridge),
    forecast: false,
  });

  // Forecast points across the duration window
  const steps = Math.max(2, Math.min(24, duration * 2));
  let peakDemand = 0;
  let peakIdx = 0;
  for (let i = 1; i <= steps; i++) {
    const t = startHour + (i * duration) / steps;
    const demand =
      baseDemand +
      Math.sin(t * 0.55) * 420 +
      i * 18 +
      (Math.random() - 0.5) * 80;
    const rounded = Math.round(demand);
    if (rounded > peakDemand) {
      peakDemand = rounded;
      peakIdx = series.length;
    }
    series.push({
      time: formatHour(t),
      demand: rounded,
      forecast: true,
    });
  }

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
