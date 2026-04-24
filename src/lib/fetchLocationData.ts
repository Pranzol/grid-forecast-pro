const API_BASE = import.meta.env.VITE_API_URL ?? "http://127.0.0.1:5000";

export interface StateAreasResponse {
  state: string;
  region: string;
  circles: Record<string, string[]>; // circle → sorted areas
  total_areas?: number;
  message?: string;
}

/** Fetch all areas for a specific Indian state from the backend */
export async function fetchStateAreas(
  state: string
): Promise<StateAreasResponse> {
  const encoded = encodeURIComponent(state);
  const res = await fetch(`${API_BASE}/states/${encoded}/areas`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail ?? `Failed to fetch areas for ${state}`);
  }
  return res.json();
}

/** Fetch the list of all Indian states from the backend */
export async function fetchStates(): Promise<{
  states: string[];
  state_circles: Record<string, string[]>;
}> {
  const res = await fetch(`${API_BASE}/states`);
  if (!res.ok) throw new Error("Failed to fetch states");
  return res.json();
}
