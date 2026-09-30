Brain note: ~/brain/Projects/timetable.md

# DTU Semester (repo `dtu-semester`)

A single-page app for a DTU semester (https://dtu-semester.leonardsima.de): timetable,
deadlines, a live calendar from a DTU Learn iCal link, a campus map with building
directions, and a daily weather forecast. See README.md for the product details.

## Stack

- Next.js (App Router, `output: standalone`), React, TypeScript, Tailwind v4
- Leaflet + OpenStreetMap for the map. Building data comes from Overpass
  (`scripts/fetch-buildings.mjs` → `data/buildings.json`).
- cheerio for scraping DTU course pages
- No database. User state is per browser (`src/lib/store.ts`), and server caches are
  under `/data/cache` (`src/lib/cache.ts`).

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | Dev server |
| `npm run build` | Refreshes `data/buildings.json` from Overpass (keeps the committed snapshot if that fails), then `next build` |
| `npm run lint` | ESLint |
| `npm run data:buildings` | Refresh building data only |

There are no tests. Lint and build are the checks.

## Layout

- `src/app/api/calendar`: fetches and parses the DTU Learn iCal (`src/lib/ics.ts`,
  `series.ts`), refetched every 12 h, serving the last good version on failure
- `src/app/api/course/[code]`: DTU course info scraping (`src/lib/dtu.ts`, `analyzer.ts`)
- `src/app/api/weather`: forecast (`src/lib/weather.ts`)
- `src/lib/rooms.ts`, `buildings.ts`: room → building → map position
- `src/components/`: UI (WeekGrid, Agenda, CampusMap, …)

## Deployment

Coolify on leosrv using the Dockerfile. Port 3000, volume `/data`, runs as the non-root
user `nextjs`, behind the Cloudflare Tunnel. No env vars are required (`.env.example` lists
the optional ones).

## Conventions

- External sources (DTU Learn, DTU course pages, Overpass, weather) are unreliable. Always
  fall back to cached or last-good data with a notice, never an empty page or a failed build.
- Neo Sans webfont slots exist but the fonts are not bundled (licensed). See the README.
- Throwaway work goes in `scratch/` (ignored).
