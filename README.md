# DTU Semester

A single page showing your DTU timetable, your deadlines and where on campus you
need to be. Built for Lyngby campus.

Paste your DTU Learn calendar link once. Courses, weekdays, time slots, module
placements and room bookings are all derived from that feed — there is nothing
else to configure.

## Layout

1. **Timetable** — the fixed weekly grid. It never changes during a semester, so
   it has no week navigation. Selecting a course opens its details.
2. **Calendar** — the live feed for the next three weeks. Lectures and deadlines
   share one timeline but are visually distinct. Selecting an event zooms the map
   to its building.
3. **Campus map** — OpenStreetMap, with every DTU building numbered. The selected
   building gets Google Maps and Apple Maps walking directions.

The header shows the teaching week, the semester, and the current weather in
Lyngby.

## Privacy

The app is stateless and has no accounts.

- Your calendar link is kept in `localStorage`, in your browser only. A new
  device means pasting it again.
- The server fetches your calendar, caches the *parsed result* under a SHA-256
  hash of the link, and never stores the link itself.
- Only `learn.inside.dtu.dk` URLs are accepted, so the endpoint cannot be used to
  reach anything else on the network it runs in.
- Anyone holding a calendar link can read that person's DTU calendar. Treat it
  like a password; it can be regenerated in DTU Learn at any time.

## Data sources and their limits

| Source | Used for | Limitation |
| --- | --- | --- |
| DTU Learn ICS feed | Courses, times, rooms, deadlines | Room notation is inconsistent; some events carry no room at all |
| OpenStreetMap (via Overpass, at build time) | Building coordinates | Buildings only — OSM does not know individual rooms |
| [DTU Course Analyzer](https://dtucourseanalyzer.pythonanywhere.com) | Grades, workload, evaluations | Independent hobby site with no API; scraped, so it can break |
| Open-Meteo | Weather | — |

Two things the feed cannot give you:

- **Rooms are per building, not per room.** The pin gets you to the door; the room
  number beside it does the rest.
- **DTU Learn deep links only exist for some courses.** The course id appears only
  when a course publishes assignments through Learn. Otherwise the button opens
  the DTU Learn home page.

When a course has several rooms booked — DTU often books an entire exercise-room
pool — all of them are listed and you can mark the one that is yours. That choice
is stored per browser, so people in different exercise groups each keep their own.

## Development

```bash
npm install
npm run dev
```

`npm run build` refreshes `data/buildings.json` from Overpass first. If Overpass
is unreachable the committed snapshot is kept, so builds do not fail because a
volunteer-run API is busy.

## Deployment (Coolify)

Build from the included `Dockerfile`. Nothing needs configuring, but mount a
volume at `/data` so the calendar and course caches survive restarts.

| Setting | Value |
| --- | --- |
| Build | Dockerfile |
| Port | 3000 |
| Volume | `/data` |

Calendars are re-fetched every 12 hours; the header has a manual refresh. If DTU
Learn is unreachable the last good version is shown with a notice rather than an
empty page.

## Typography

DTU's primary typeface is Neo Sans, a licensed Monotype font that cannot be
redistributed, so it is not bundled. The stack is
`"Neo Sans Pro", "Neo Sans", Arial` — DTU's own design guide names Arial as the
second corporate typeface, so the fallback is on-brand. If you have licensed
webfont files, drop `NeoSansPro-{Regular,Medium,Bold}.woff2` into `public/fonts`
and uncomment the `@font-face` blocks at the top of `src/app/globals.css`.

Colours are DTU's corporate palette from
[designguide.dtu.dk/colours](https://designguide.dtu.dk/colours).
