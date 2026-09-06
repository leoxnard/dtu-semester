import data from "../../data/buildings.json";
import { buildingLookupKeys } from "./rooms";

export type Building = { ref: string; name: string | null; lat: number; lon: number };

const INDEX = new Map<string, Building>(
  (data.buildings as Building[]).map((b) => [b.ref.toUpperCase(), b]),
);

export const ALL_BUILDINGS = data.buildings as Building[];
export const CAMPUS_CENTRE = { lat: 55.786, lon: 12.5215 };

/** "303A" is not a separate OSM footprint — fall back to "303". */
export function findBuilding(ref: string | null | undefined): Building | null {
  if (!ref) return null;
  for (const key of buildingLookupKeys(ref.toUpperCase())) {
    const hit = INDEX.get(key);
    if (hit) return hit;
  }
  return null;
}

export function googleMapsUrl(b: Building, label?: string): string {
  const q = encodeURIComponent(`${b.lat},${b.lon}`);
  return `https://www.google.com/maps/dir/?api=1&destination=${q}&destination_place_id=&travelmode=walking#${encodeURIComponent(label ?? b.ref)}`;
}

export function appleMapsUrl(b: Building, label?: string): string {
  const params = new URLSearchParams({
    daddr: `${b.lat},${b.lon}`,
    q: label ?? `DTU Building ${b.ref}`,
    dirflg: "w",
  });
  return `https://maps.apple.com/?${params}`;
}
