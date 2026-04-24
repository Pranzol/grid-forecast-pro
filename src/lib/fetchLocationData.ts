const API_BASE = import.meta.env.VITE_API_URL ?? "http://127.0.0.1:5000";
const API_KEY = import.meta.env.VITE_API_KEY ?? "grid_secure_key_2026";

const defaultHeaders = { "X-API-Key": API_KEY };

// ── Response types ──────────────────────────────────────────────────────────

export interface StateAreasResponse {
  state: string;
  region: string;
  circles: Record<string, string[]>; // circle → sorted areas
  total_areas?: number;
  message?: string;
}

/** Circle detail: divisions + full sub-division hierarchy */
export interface CircleDetailResponse {
  circle: string;
  divisions: string[];
  /** Full nested: { division: { subdivision: { section: area[] } } } */
  detail: Record<string, Record<string, Record<string, string[]>>>;
}

export interface DivisionDetailResponse {
  circle: string;
  division: string;
  subdivisions: string[];
  detail: Record<string, Record<string, string[]>>;
}

export interface DistrictsResponse {
  circles: string[];
  total_circles: number;
}

// ── API functions ────────────────────────────────────────────────────────────

/** Fetch all areas for a specific Indian state from the backend */
export async function fetchStateAreas(
  state: string
): Promise<StateAreasResponse> {
  const encoded = encodeURIComponent(state);
  const res = await fetch(`${API_BASE}/states/${encoded}/areas`, { headers: defaultHeaders });
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
  const res = await fetch(`${API_BASE}/states`, { headers: defaultHeaders });
  if (!res.ok) throw new Error("Failed to fetch states");
  return res.json();
}

/** Fetch all TG-NPDCL circles (top-level districts) */
export async function fetchDistricts(): Promise<DistrictsResponse> {
  const res = await fetch(`${API_BASE}/districts`, { headers: defaultHeaders });
  if (!res.ok) throw new Error("Failed to fetch districts");
  return res.json();
}

/** Fetch all divisions within a circle, with full sub-hierarchy */
export async function fetchCircleDetail(
  circle: string
): Promise<CircleDetailResponse> {
  const encoded = encodeURIComponent(circle);
  const res = await fetch(`${API_BASE}/districts/${encoded}`, { headers: defaultHeaders });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail ?? `Failed to fetch circle ${circle}`);
  }
  return res.json();
}

/** Fetch all subdivisions within a division */
export async function fetchDivisionDetail(
  circle: string,
  division: string
): Promise<DivisionDetailResponse> {
  const c = encodeURIComponent(circle);
  const d = encodeURIComponent(division);
  const res = await fetch(`${API_BASE}/districts/${c}/${d}`, { headers: defaultHeaders });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail ?? `Failed to fetch division ${division}`);
  }
  return res.json();
}
