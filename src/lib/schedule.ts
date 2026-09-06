import { parseIcs, type RawEvent } from "./ics";
import { parseLocation, type Room } from "./rooms";
import {
  AUTUMN_MODULE_GRID, SPRING_MODULE_GRID, CAMPUS_TZ, COURSE_COLOURS,
  SLOTS, WEEKDAYS, type SlotLabel, type Weekday,
} from "./dtu";

export type EventKind = "teaching" | "deadline" | "other";

export type ScheduleEvent = {
  uid: string;
  kind: EventKind;
  title: string;
  courseCode: string | null;
  start: string;
  end: string | null;
  allDay: boolean;
  rooms: Room[];
  learnUrl: string | null;
};

export type Course = {
  code: string;
  title: string;
  colour: string;
  module: string | null;
  weekday: Weekday | null;
  slot: SlotLabel | null;
  /** Every distinct room DTU has booked for this course this semester. */
  rooms: Room[];
  learnOu: string | null;
};

export type Semester = { label: string; term: "autumn" | "spring"; start: Date; end: Date };

export type Schedule = {
  semester: { label: string; term: "autumn" | "spring"; start: string; end: string };
  week: { current: number; total: number };
  courses: Course[];
  events: ScheduleEvent[];
};

const TEACHING = /^(lecture|mixed teaching|teaching|exercise|exercises|laboratory|lab|tutorial|project work|group work)$/i;
const DEADLINE = /(hand in|give feedback|submit|due|deadline|quiz+|write reflection|form groups)/i;
const CANCELLED = /^deleted /i;

/** Parts of a Date as seen on campus, not in the server's local zone. */
function campusParts(date: Date) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: CAMPUS_TZ, weekday: "long", year: "numeric", month: "2-digit",
      day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false,
    })
      .formatToParts(date)
      .map((p) => [p.type, p.value]),
  ) as Record<string, string>;
  return {
    weekday: parts.weekday as Weekday,
    hour: Number(parts.hour) % 24,
    ymd: `${parts.year}-${parts.month}-${parts.day}`,
  };
}

function slotForHour(hour: number): SlotLabel | null {
  return SLOTS.find((s) => hour >= s.startHour && hour < s.endHour + 1)?.label ?? null;
}

/** DTU's 13-week teaching periods: autumn starts late Aug, spring late Jan. */
export function currentSemester(now: Date): Semester {
  const y = Number(
    new Intl.DateTimeFormat("en-GB", { timeZone: CAMPUS_TZ, year: "numeric" }).format(now),
  );
  const month = Number(
    new Intl.DateTimeFormat("en-GB", { timeZone: CAMPUS_TZ, month: "2-digit" }).format(now),
  );
  if (month >= 8 && month <= 12) {
    return { label: `autumn ${y}`, term: "autumn", start: new Date(Date.UTC(y, 7, 20)), end: new Date(Date.UTC(y, 11, 24)) };
  }
  if (month <= 6) {
    return { label: `spring ${y}`, term: "spring", start: new Date(Date.UTC(y, 0, 15)), end: new Date(Date.UTC(y, 5, 30)) };
  }
  // July: the coming autumn is what anyone opening this actually wants.
  return { label: `autumn ${y}`, term: "autumn", start: new Date(Date.UTC(y, 7, 20)), end: new Date(Date.UTC(y, 11, 24)) };
}

function classify(event: RawEvent, hasRooms: boolean): EventKind {
  if (CANCELLED.test(event.summary)) return "other";
  if (TEACHING.test(event.summary.trim())) return "teaching";
  if (DEADLINE.test(event.summary)) return "deadline";
  return hasRooms ? "teaching" : "other";
}

/**
 * DTU Learn course ids only appear inside "View event" links on assignment
 * events. They are NOT derivable from the course number, so we harvest what we
 * can — and only from events inside the current semester, because D2L renders
 * old events with today's course name and their ids point at dead instances.
 */
function harvestLearnOu(event: RawEvent): string | null {
  return /(?:ou=|d2l\/le\/calendar\/|d2l\/le\/content\/)(\d{5,7})/.exec(event.description)?.[1] ?? null;
}

function roomKey(r: Room) {
  return `${r.building ?? "?"}|${r.room ?? "?"}`;
}

export function buildSchedule(icsText: string, now = new Date()): Schedule {
  const semester = currentSemester(now);
  const grid = semester.term === "autumn" ? AUTUMN_MODULE_GRID : SPRING_MODULE_GRID;
  const raw = parseIcs(icsText);

  const inSemester = raw.filter((e) => e.start >= semester.start && e.start <= semester.end);

  type Acc = {
    code: string; title: string;
    slots: Map<string, number>;
    rooms: Map<string, Room>;
    learnOu: Map<string, number>;
  };
  const byCourse = new Map<string, Acc>();
  const events: ScheduleEvent[] = [];

  for (const e of inSemester) {
    const loc = parseLocation(e.location);
    const kind = classify(e, loc.rooms.length > 0);
    if (CANCELLED.test(e.summary)) continue;

    const ou = harvestLearnOu(e);

    if (loc.courseCode) {
      let acc = byCourse.get(loc.courseCode);
      if (!acc) {
        acc = { code: loc.courseCode, title: loc.courseTitle ?? loc.courseCode, slots: new Map(), rooms: new Map(), learnOu: new Map() };
        byCourse.set(loc.courseCode, acc);
      }
      if (loc.courseTitle && loc.courseTitle.length > acc.title.length) acc.title = loc.courseTitle;
      for (const r of loc.rooms) if (r.building) acc.rooms.set(roomKey(r), r);
      if (ou) acc.learnOu.set(ou, (acc.learnOu.get(ou) ?? 0) + 1);

      // Only real teaching defines the weekly grid; a 23:59 deadline would
      // otherwise place the course on Sunday night.
      if (kind === "teaching" && !e.allDay) {
        const { weekday, hour } = campusParts(e.start);
        const slot = slotForHour(hour);
        if (slot && (WEEKDAYS as readonly string[]).includes(weekday)) {
          const key = `${weekday}|${slot}`;
          acc.slots.set(key, (acc.slots.get(key) ?? 0) + 1);
        }
      }
    }

    events.push({
      uid: e.uid,
      kind,
      title: e.summary || "(untitled)",
      courseCode: loc.courseCode,
      start: e.start.toISOString(),
      end: e.end?.toISOString() ?? null,
      allDay: e.allDay,
      rooms: loc.rooms.filter((r) => r.building || r.room),
      learnUrl: ou ? `https://learn.inside.dtu.dk/d2l/home/${ou}` : null,
    });
  }

  const courses: Course[] = [...byCourse.values()]
    .sort((a, b) => a.code.localeCompare(b.code))
    .map((acc, i) => {
      const best = [...acc.slots.entries()].sort((a, b) => b[1] - a[1])[0];
      const [weekday, slot] = best ? (best[0].split("|") as [Weekday, SlotLabel]) : [null, null];
      const bestOu = [...acc.learnOu.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
      return {
        code: acc.code,
        title: acc.title,
        colour: COURSE_COLOURS[i % COURSE_COLOURS.length],
        module: weekday && slot ? grid[weekday]?.[slot] ?? null : null,
        weekday, slot,
        rooms: [...acc.rooms.values()],
        learnOu: bestOu,
      };
    });

  const msPerWeek = 7 * 24 * 3600 * 1000;
  const current = Math.floor((now.getTime() - semester.start.getTime()) / msPerWeek) + 1;

  return {
    semester: { ...semester, start: semester.start.toISOString(), end: semester.end.toISOString() },
    week: { current: Math.min(Math.max(current, 1), 13), total: 13 },
    courses,
    events,
  };
}
