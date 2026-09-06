"use client";

import { SLOTS, WEEKDAYS, type SlotLabel, type Weekday } from "@/lib/dtu";
import { DtuLogo } from "./DtuLogo";
import type { Course } from "@/lib/schedule";

/**
 * The timetable, alone, filling the screen.
 *
 * The grid is transposed relative to the normal view: weekdays run down the
 * page and the three time blocks run across. Five day columns on a 375px phone
 * leaves 70px each, which is unreadable — three columns leaves ~120px, which is
 * not, so the whole week fits in portrait with no horizontal scrolling.
 */
export function TimetableFullscreen({
  courses,
  term,
  semesterLabel,
  week,
  onSelectCourse,
  onClose,
  displayName,
}: {
  courses: Course[];
  term: "autumn" | "spring";
  semesterLabel: string;
  week: { current: number; total: number };
  onSelectCourse: (course: Course) => void;
  onClose: () => void;
  displayName: (course: Course) => string;
}) {
  const todayName = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Copenhagen",
    weekday: "long",
  }).format(new Date()) as Weekday;

  const at = (day: Weekday, slot: SlotLabel) =>
    courses.find((c) => c.weekday === day && c.slot === slot);

  return (
    <div
      className="fixed inset-0 z-[900] flex flex-col overflow-y-auto"
      style={{ background: "var(--bg)" }}
    >
      <header
        className="flex shrink-0 items-center gap-3 border-b px-4 py-3"
        style={{ borderColor: "var(--rule-strong)" }}
      >
        <DtuLogo className="dtu-mark h-8 w-auto shrink-0" />
        <span className="text-sm">
          <span className="font-medium tabular-nums">Week {week.current} of {week.total}</span>
          <span style={{ color: "var(--ink-soft)" }}> · {semesterLabel}</span>
        </span>
        <button
          onClick={onClose}
          className="dtu-focus ml-auto border px-3 py-1.5 text-xs font-medium"
          style={{ borderColor: "var(--rule-strong)" }}
        >
          Exit full screen
        </button>
      </header>

      <div className="flex min-h-0 flex-1 flex-col p-3">
        <div
          className="grid shrink-0 gap-px pl-[4.5rem] text-center"
          style={{ gridTemplateColumns: `repeat(${SLOTS.length}, minmax(0, 1fr))` }}
        >
          {SLOTS.map((slot) => (
            <div key={slot.label} className="dtu-heading pb-1 tabular-nums">
              {slot.label}
            </div>
          ))}
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-2">
          {WEEKDAYS.map((day) => {
            const isToday = day === todayName;
            return (
              <div key={day} className="flex min-h-0 flex-1 items-stretch gap-2">
                <div
                  className="flex w-[4.25rem] shrink-0 items-center justify-center text-sm font-medium"
                  style={{ color: isToday ? "var(--color-dtu-red)" : "var(--ink-soft)" }}
                >
                  {day.slice(0, 3)}
                </div>

                <div
                  className="grid min-h-0 flex-1 gap-2"
                  style={{ gridTemplateColumns: `repeat(${SLOTS.length}, minmax(0, 1fr))` }}
                >
                  {SLOTS.map((slot) => {
                    const course = at(day, slot.label);
                    if (!course) {
                      return (
                        <div
                          key={slot.label}
                          className="border"
                          style={{
                            borderColor: "var(--rule)",
                            background: isToday ? "var(--surface-alt)" : undefined,
                          }}
                        />
                      );
                    }
                    return (
                      <button
                        key={slot.label}
                        onClick={() => onSelectCourse(course)}
                        className="dtu-focus flex min-w-0 flex-col items-center justify-center border p-2 text-center"
                        style={{ borderColor: course.colour, background: `${course.colour}1a` }}
                      >
                        <span className="text-[13px] font-medium leading-tight">
                          {displayName(course)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        <p className="mt-2 shrink-0 text-center text-xs" style={{ color: "var(--ink-soft)" }}>
          Tap a course for its number, rooms and grades.
        </p>
      </div>
    </div>
  );
}
