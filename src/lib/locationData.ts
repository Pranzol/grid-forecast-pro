/**
 * Location data derived from TG-NPDCL CSV dataset (backend/data/)
 * All 28 Indian states + 8 Union Territories listed alphabetically.
 * Only Telangana has granular circle→area data from the uploaded dataset.
 * Other states route to their nearest grid region model.
 */

export const ALL_STATES = [
  "Andaman & Nicobar Islands",
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chandigarh",
  "Chhattisgarh",
  "Dadra & Nagar Haveli",
  "Daman & Diu",
  "Delhi",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jammu & Kashmir",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Ladakh",
  "Lakshadweep",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Puducherry",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
] as const;

export type IndianState = (typeof ALL_STATES)[number];

/** States that have granular area data (from uploaded dataset) */
export const STATES_WITH_AREAS: ReadonlySet<string> = new Set(["Telangana"]);

/** TG-NPDCL circles for Telangana — mapped from the CSV dataset */
export const TELANGANA_CIRCLES = [
  "ADILABAD",
  "ASIFABAD",
  "BHADRADRI KOTHAGUDEM",
  "BHUPALAPALLY",
  "HANUMAKONDA",
  "JAGITYAL",
  "JANGAON",
  "KAMAREDDY",
  "KARIMNAGAR",
  "KHAMMAM",
  "MAHABUBABAD",
  "MANCHERIAL",
  "NIRMAL",
  "NIZAMABAD",
  "PEDDAPALLY",
  "WARANGAL",
] as const;

export type TelanganaCircle = (typeof TELANGANA_CIRCLES)[number];

/** State → grid region mapping (matches model training regions) */
export const STATE_TO_REGION: Record<string, string> = {
  "Andaman & Nicobar Islands": "Southern",
  "Andhra Pradesh": "Southern",
  "Arunachal Pradesh": "NorthEastern",
  Assam: "NorthEastern",
  Bihar: "Eastern",
  Chandigarh: "Northern",
  Chhattisgarh: "Western",
  "Dadra & Nagar Haveli": "Western",
  "Daman & Diu": "Western",
  Delhi: "Northern",
  Goa: "Western",
  Gujarat: "Western",
  Haryana: "Northern",
  "Himachal Pradesh": "Northern",
  "Jammu & Kashmir": "Northern",
  Jharkhand: "Eastern",
  Karnataka: "Southern",
  Kerala: "Southern",
  Ladakh: "Northern",
  Lakshadweep: "Southern",
  "Madhya Pradesh": "Western",
  Maharashtra: "Western",
  Manipur: "NorthEastern",
  Meghalaya: "NorthEastern",
  Mizoram: "NorthEastern",
  Nagaland: "NorthEastern",
  Odisha: "Eastern",
  Puducherry: "Southern",
  Punjab: "Northern",
  Rajasthan: "Northern",
  Sikkim: "NorthEastern",
  "Tamil Nadu": "Southern",
  Telangana: "Southern",
  Tripura: "NorthEastern",
  "Uttar Pradesh": "Northern",
  Uttarakhand: "Northern",
  "West Bengal": "Eastern",
};

/** Circle → display-friendly name */
export function formatCircleName(circle: string): string {
  return circle
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

/** Area → display-friendly name */
export function formatAreaName(area: string): string {
  return area
    .split(" ")
    .map((w) =>
      w.length > 2
        ? w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()
        : w.toUpperCase()
    )
    .join(" ");
}
