"use client";

import { useMemo } from "react";
import type { Course, ScheduleEvent } from "@/lib/schedule";
import { CAMPUS_TZ } from "@/lib/dtu";

const dayFmt = new Intl.DateTimeFormat("en-GB", {
  timeZone: CAMPUS_TZ, weekday: "long", day: "numeric", month: "long",
});
const timeFmt = new Intl.DateTimeFormat("en-GB", {
  timeZone: CAMPUS_TZ, hour: "2-digit", minute: "2-digit", hour12: false,
});
const dayKeyFmt = new Intl.DateTimeFormat("en-CA", {
  timeZone: CAMPUS_TZ, year: "numeric", month: "2-digit", day: "2-digit",
});

function relativeDay(key: string, todayKey: string): string | null {
  if (key === todayKey) return "Today";
  const diff = (Date.parse(key) - Date.parse(todayKey)) / 86_400_000;
  if (diff === 1) return "Tomorrow";
  return null;
}

/**
 * Row 2: the live calendar. Teaching and deadlines share a timeline but are
 * visually distinct — the whole point of the feed is that deadlines cannot hide
 * among the lectures.
 */
export function Agenda({
  events,
  courses,
  selectedUid,
  onSelectEvent,
}: {
  events: ScheduleEvent[];
  courses: Course[];
  selectedUid: string | null;
  onSelectEvent: (event: ScheduleEvent) => void;
}) {
  const todayKey = dayKeyFmt.format(new Date());

  const days = useMemo(() => {
    const now = Date.now();
    const horizon = now + 21 * 86_400_000;
    const upcoming = events
      .filter((e) => {
        const end = e.end ? Date.parse(e.end) : Date.parse(e.start) + 3_600_000;
        return end >= now && Date.parse(e.start) <= horizon;
      })
      .sort((a, b) => Date.parse(a.start) - Date.parse(b.start));

    const grouped = new Map<string, ScheduleEvent[]>();
    for (const e of upcoming) {
      const key = dayKeyFmt.format(new Date(e.start));
      const bucket = grouped.get(key);
      if (bucket) bucket.push(e);
      else grouped.set(key, [e]);
    }
    return [...grouped.entries()];
  }, [events]);

  const colourOf = (code: string | null) =>
    courses.find((c) => c.code === code)?.colour ?? "var(--ink-soft)";

  if (days.length === 0) {
    return (
      <section aria-labelledby="agenda-heading">
        <h2 id="agenda-heading" className="dtu-heading mb-2">Calendar · next three weeks</h2>
        <p className="dtu-panel p-4 text-sm" style={{ color: "var(--ink-soft)" }}>
          Nothing scheduled in the next three weeks.
        </p>
      </section>
    );
  }

  return (
    <section aria-labelledby="agenda-heading">
      <h2 id="agenda-heading" className="dtu-heading mb-2">Calendar · next three weeks</h2>

      <div className="dtu-panel max-h-[26rem] overflow-y-auto">
        {days.map(([key, dayEvents]) => {
          const label = relativeDay(key, todayKey);
          return (
            <div key={key}>
              <h3
                className="sticky top-0 z-10 border-b px-3 py-1.5 text-xs font-medium"
                style={{
                  borderColor: "var(--rule)",
                  background: "var(--surface-alt)",
                  color: label ? "var(--color-dtu-red)" : "var(--ink-soft)",
                }}
              >
                {label ? `${label} · ` : ""}
                {dayFmt.format(new Date(`${key}T12:00:00Z`))}
              </h3>

              <ul>
                {dayEvents.map((event) => {
                  const isDeadline = event.kind === "deadline";
                  const selected = event.uid === selectedUid;
                  const buildings = [...new Set(event.rooms.map((r) => r.building).filter(Boolean))];

                  return (
                    <li key={event.uid} className="border-b last:border-b-0" style={{ borderColor: "var(--rule)" }}>
                      <button
                        onClick={() => onSelectEvent(event)}
                        className="dtu-focus flex w-full items-start gap-3 px-3 py-2 text-left"
                        style={{ background: selected ? "var(--surface-alt)" : undefined }}
                        aria-pressed={selected}
                      >
                        <span
                          className="mt-0.5 w-11 shrink-0 text-xs tabular-nums"
                          style={{ color: "var(--ink-soft)" }}
                        >
                          {event.allDay ? "all day" : timeFmt.format(new Date(event.start))}
                        </span>

                        <span
                          aria-hidden
                          className="mt-1 h-3 w-1 shrink-0"
                          style={{ background: colourOf(event.courseCode) }}
                        />

                        <span className="min-w-0 flex-1">
                          <span className="flex flex-wrap items-baseline gap-x-2">
                            {event.courseCode && (
                              <span className="text-xs font-medium tabular-nums">{event.courseCode}</span>
                            )}
                            {isDeadline && (
                              <span
                                className="px-1 py-px text-[10px] font-medium uppercase tracking-wide text-white"
                                style={{ background: "var(--color-dtu-red)" }}
                              >
                                Deadline
                              </span>
                            )}
                          </span>
                          <span className="block text-sm leading-snug">{event.title}</span>
                          {buildings.length > 0 && (
                            <span className="block text-xs" style={{ color: "var(--ink-soft)" }}>
                              Building {buildings.join(", ")}
                              {buildings.length > 1 && " — select to see rooms"}
                            </span>
                          )}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </div>
    </section>
  );
}
