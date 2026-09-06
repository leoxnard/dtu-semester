// Build-time fetch of DTU Lyngby building footprints from OpenStreetMap.
// Runs once per image build so the app never depends on Overpass at runtime.
import { writeFileSync, existsSync, readFileSync } from "node:fs";

const OUT = "data/buildings.json";
const BBOX = "55.7775,12.5100,55.7950,12.5350"; // DTU Lyngby campus
const QUERY = `[out:json][timeout:90];
(way["building"](${BBOX});
 relation["building"](${BBOX}););
out tags center;`;

const ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
];

async function fetchBuildings() {
  let lastErr;
  for (const url of ENDPOINTS) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "User-Agent": "dtu-timetable/1.0 (personal student dashboard)",
        },
        body: new URLSearchParams({ data: QUERY }),
      });
      if (!res.ok) throw new Error(`${url} -> HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      lastErr = err;
      console.warn(`  ! ${err.message}`);
    }
  }
  throw lastErr;
}

const data = await fetchBuildings().catch((err) => {
  // A build must not fail because a volunteer-run API is busy. Keep the
  // previous snapshot if we have one; only a first-ever build can hard-fail.
  if (existsSync(OUT)) {
    console.warn(`! Overpass unreachable (${err.message}) - keeping existing ${OUT}`);
    process.exit(0);
  }
  console.error(`! Overpass unreachable and no cached ${OUT} exists.`);
  throw err;
});

const buildings = [];
for (const el of data.elements ?? []) {
  const ref = el.tags?.ref?.trim();
  const center = el.center ?? (el.lat != null ? { lat: el.lat, lon: el.lon } : null);
  if (!ref || !center) continue;
  if (!/^\d{3}[A-Z]?$/.test(ref)) continue; // DTU buildings are 3 digits, sometimes + a wing letter
  buildings.push({
    ref,
    name: el.tags.name?.trim() || null,
    lat: Number(center.lat.toFixed(6)),
    lon: Number(center.lon.toFixed(6)),
  });
}

buildings.sort((a, b) => a.ref.localeCompare(b.ref, "en", { numeric: true }));

const deduped = [...new Map(buildings.map((b) => [b.ref, b])).values()];
writeFileSync(OUT, JSON.stringify({ fetchedAt: new Date().toISOString(), buildings: deduped }, null, 2));
console.log(`✓ ${deduped.length} DTU buildings written to ${OUT}`);
