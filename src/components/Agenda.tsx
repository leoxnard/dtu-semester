"use client";

import { useMemo, useState } from "react";
import type { Course, ScheduleEvent } from "@/lib/schedule";
import { CAMPUS_TZ } from "@/lib/dtu";
import type { Room } from "@/lib/rooms";

const dayFmt = new Intl.DateTimeFormat("en-GB", {
  timeZone: CAMPUS_TZ, weekday: "long", day: "numeric", month: "long",
});
const timeFmt = new Intl.DateTimeFormat("en-GB", {
  timeZone: CAMPUS_TZ, hour: "2-digit", minute: "2-digit", hour12: false,
});
const dayKeyFmt = new Intl.DateTimeFormat("en-CA", {
  timeZone: CAMPUS_TZ, year: "numeric", month: "2-digit", day: "2-digit",
});
const rangeFmt = new Intl.DateTimeFormat("en-GB", {
  timeZone: CAMPUS_TZ, day: "numeric", month: "short",
});

/**
 * Monday 00:00 on campus, `offset` weeks away. Working from the yyyy-mm-dd key
 * rather than the raw Date keeps this correct across the DST switch, where a
 * plain "subtract n × 86 400 000 ms" would drift by an hour.
 */
function weekdayIndex(date = new Date()): number {
  const short = new Intl.DateTimeFormat("en-GB", { timeZone: CAMPUS_TZ, weekday: "short" }).format(date);
  const index = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].indexOf(short);
  return index < 0 ? 0 : index;
}

function weekStart(offset: number): Date {
  const today = new Date();
  const midday = new Date(`${dayKeyFmt.format(today)}T12:00:00Z`);
  midday.setUTCDate(midday.getUTCDate() - weekdayIndex(today) + offset * 7);
  return midday;
}

/**
 * Which week to open on. Teaching runs Monday to Friday, so once it is the
 * weekend the current week holds nothing you can still act on - the useful
 * answer is what is coming, not what is over.
 */
function defaultWeekOffset(): number {
  return weekdayIndex() >= 5 ? 1 : 0;
}

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
  done,
  courseName,
  chosenRoom,
  onToggleDone,
  hiddenSeriesCount,
  onAddEntry,
  onRemoveCustom,
}: {
  events: ScheduleEvent[];
  courses: Course[];
  selectedUid: string | null;
  onSelectEvent: (event: ScheduleEvent) => void;
  done: Set<string>;
  /** Course title for the code, already shortened if the screen is narrow. */
  courseName: (code: string | null) => string | null;
  /** The room the user marked as theirs for this course, if any. */
  chosenRoom: (code: string | null) => Room | null;
  onToggleDone: (uid: string) => void;
  hiddenSeriesCount: number;
  onAddEntry: () => void;
  /** Custom entries carry an id so they can be deleted again. */
  onRemoveCustom: (id: string) => void;
}) {
  const todayKey = dayKeyFmt.format(new Date());
  const [baseOffset] = useState(defaultWeekOffset);
  const [weekOffset, setWeekOffset] = useState(baseOffset);

  const { days, rangeLabel } = useMemo(() => {
    const start = weekStart(weekOffset);
    const startKey = dayKeyFmt.format(start);
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 6);
    const endKey = dayKeyFmt.format(end);

    const inWeek = events
      .filter((e) => {
        const key = dayKeyFmt.format(new Date(e.start));
        return key >= startKey && key <= endKey;
      })
      .sort((a, b) => Date.parse(a.start) - Date.parse(b.start));

    const grouped = new Map<string, ScheduleEvent[]>();
    for (const e of inWeek) {
      const key = dayKeyFmt.format(new Date(e.start));
      const bucket = grouped.get(key);
      if (bucket) bucket.push(e);
      else grouped.set(key, [e]);
    }

    return {
      days: [...grouped.entries()],
      rangeLabel: `${rangeFmt.format(start)} – ${rangeFmt.format(end)}`,
    };
  }, [events, weekOffset]);

  const colourOf = (code: string | null) =>
    courses.find((c) => c.code === code)?.colour ?? "var(--ink-soft)";

  return (
    <section aria-labelledby="agenda-heading">
      <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1">
        <h2 id="agenda-heading" className="dtu-heading">Calendar</h2>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setWeekOffset((w) => w - 1)}
            className="dtu-focus border px-3 py-1.5 text-sm leading-5"
            style={{ borderColor: "var(--rule-strong)" }}
            aria-label="Previous week"
          >
            ‹
          </button>
          <span className="min-w-[8.5rem] text-center text-sm font-medium tabular-nums">
            {rangeLabel}
          </span>
          <button
            onClick={() => setWeekOffset((w) => w + 1)}
            className="dtu-focus border px-3 py-1.5 text-sm leading-5"
            style={{ borderColor: "var(--rule-strong)" }}
            aria-label="Next week"
          >
            ›
          </button>
        </div>

        {weekOffset !== baseOffset && (
          <button
            onClick={() => setWeekOffset(baseOffset)}
            className="dtu-focus text-xs underline underline-offset-4"
            style={{ color: "var(--color-dtu-red)" }}
          >
            {baseOffset === 0 ? "This week" : "Next week"}
          </button>
        )}

        {baseOffset === 1 && weekOffset === 1 && (
          <span className="text-xs" style={{ color: "var(--ink-soft)" }}>
            Weekend — showing next week
          </span>
        )}

        {hiddenSeriesCount > 0 && (
          <span className="text-xs" style={{ color: "var(--ink-soft)" }}>
            {hiddenSeriesCount} hidden — turn back on in a course&rsquo;s details
          </span>
        )}

        <button
          onClick={onAddEntry}
          className="dtu-focus ml-auto border px-3 py-1 text-xs font-medium"
          style={{ borderColor: "var(--rule-strong)" }}
        >
          Add entry
        </button>
      </div>

      <div className="dtu-panel">
        {days.length === 0 && (
          <p className="p-4 text-sm" style={{ color: "var(--ink-soft)" }}>
            Nothing scheduled this week.
          </p>
        )}
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
                  const isDone = done.has(event.uid);
                  const buildings = [...new Set(event.rooms.map((r) => r.building).filter(Boolean))];
                  // Once a room is marked as theirs, that is the answer — no
                  // point still listing the whole pool or asking them to pick.
                  const mine = chosenRoom(event.courseCode);
                  const mineHere = mine && event.rooms.some((r) => r.raw === mine.raw) ? mine : null;
                  const customId = event.uid.startsWith("custom:") ? event.uid.slice(7) : null;

                  return (
                    <li key={event.uid} className="border-b last:border-b-0" style={{ borderColor: "var(--rule)" }}>
                      <div className="flex items-stretch" style={{ background: selected ? "var(--surface-alt)" : undefined }}>
                        <button
                          onClick={() => onSelectEvent(event)}
                          className="dtu-focus flex min-w-0 flex-1 items-start gap-3 px-3 py-2 text-left"
                          aria-pressed={selected}
                          style={{ opacity: isDone ? 0.45 : 1 }}
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
                              {courseName(event.courseCode) && (
                                <span className="min-w-0 truncate text-xs" style={{ color: "var(--ink-soft)" }}>
                                  {courseName(event.courseCode)}
                                </span>
                              )}
                              {isDeadline && !isDone && (
                                <span
                                  className="px-1 py-px text-[10px] font-medium uppercase tracking-wide text-white"
                                  style={{ background: "var(--color-dtu-red)" }}
                                >
                                  Deadline
                                </span>
                              )}
                              {customId && (
                                <span
                                  className="border px-1 py-px text-[10px] font-medium uppercase tracking-wide"
                                  style={{ borderColor: "var(--rule-strong)", color: "var(--ink-soft)" }}
                                >
                                  Added
                                </span>
                              )}
                            </span>
                            <span
                              className="block text-sm leading-snug"
                              style={{ textDecoration: isDone ? "line-through" : undefined }}
                            >
                              {event.title}
                            </span>
                            {mineHere ? (
                              <span className="block text-xs" style={{ color: "var(--ink-soft)" }}>
                                Building {mineHere.building}
                                {mineHere.room ? ` · ${mineHere.room}` : ""}
                              </span>
                            ) : (
                              buildings.length > 0 && (
                                <span className="block text-xs" style={{ color: "var(--ink-soft)" }}>
                                  Building {buildings.join(", ")}
                                  {buildings.length > 1 && " — select to see rooms"}
                                </span>
                              )
                            )}
                          </span>
                        </button>

                        {customId && (
                          <button
                            onClick={() => onRemoveCustom(customId)}
                            className="dtu-focus shrink-0 px-2 text-lg leading-none"
                            style={{ color: "var(--ink-soft)" }}
                            title="Delete this entry"
                            aria-label={`Delete ${event.title}`}
                          >
                            ×
                          </button>
                        )}

                        {isDeadline && (
                          <label
                            className="flex cursor-pointer items-center self-stretch pl-1 pr-3"
                            title={isDone ? "Mark as not done" : "Mark as done"}
                          >
                            <input
                              type="checkbox"
                              checked={isDone}
                              onChange={() => onToggleDone(event.uid)}
                              className="dtu-focus h-4 w-4 accent-[var(--color-dtu-red)]"
                            />
                            <span className="sr-only">Mark &ldquo;{event.title}&rdquo; as done</span>
                          </label>
                        )}
                      </div>
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
