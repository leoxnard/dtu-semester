import { CAMPUS_TZ } from "./dtu";
import type { ScheduleEvent } from "./schedule";

/**
 * A stable identity for a *recurring* entry.
 *
 * ICS gives every occurrence its own UID, so hiding "this series forever" needs
 * a key derived from what the occurrences have in common. Course + weekday +
 * start time + the exact set of rooms is what distinguishes, for example, the
 * two Tuesday 18:00 lectures of 02807 that DTU books into different buildings.
 */
const whenFmt = new Intl.DateTimeFormat("en-GB", {
  timeZone: CAMPUS_TZ, weekday: "long", hour: "2-digit", minute: "2-digit", hour12: false,
});

export function seriesKey(event: ScheduleEvent): string {
  const when = whenFmt.format(new Date(event.start));
  const rooms = event.rooms.map((r) => r.raw).sort().join("+");
  return `${event.courseCode ?? "?"}|${when}|${rooms || "no-room"}`;
}

/**
 * Short human label, e.g. "Tuesday 18:00 · 306 Aud. 32". The room is part of it
 * because a course can have two bookings in the SAME building at the same hour,
 * and "Friday 08:00 · Building 208" twice over would be unusable in a list.
 */
export function seriesLabel(event: ScheduleEvent): string {
  const when = whenFmt.format(new Date(event.start));
  if (event.rooms.length === 0) return `${when} · no room`;
  if (event.rooms.length === 1) {
    const [r] = event.rooms;
    return `${when} · ${r.building ?? ""} ${r.room ?? r.raw}`.replace(/\s+/g, " ").trim();
  }
  const buildings = [...new Set(event.rooms.map((r) => r.building).filter(Boolean))];
  return `${when} · ${buildings.join(", ")} · ${event.rooms.length} rooms`;
}
