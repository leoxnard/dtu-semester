"use client";

import { useEffect, useRef, useState } from "react";
import { SLOTS, WEEKDAYS, AUTUMN_MODULE_GRID, SPRING_MODULE_GRID, type SlotLabel, type Weekday } from "@/lib/dtu";
import type { Course } from "@/lib/schedule";

/**
 * Row 1: DTU's fixed module grid. It never changes during a semester and has no
 * week navigation on purpose — it answers "what do I have on Tuesdays?", while
 * row 2 answers "what is happening this week?".
 */
export function WeekGrid({
  courses,
  term,
  onSelectCourse,
  onFullscreen,
  displayName,
}: {
  courses: Course[];
  term: "autumn" | "spring";
  onSelectCourse: (course: Course) => void;
  onFullscreen: () => void;
  displayName: (course: Course) => string;
}) {
  const grid = term === "autumn" ? AUTUMN_MODULE_GRID : SPRING_MODULE_GRID;

  /**
   * Full screen only earns its place when the week does not actually fit — on a
   * phone, where the five day columns overflow. On a wide screen the whole grid
   * is already visible and the button would be noise.
   */
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [overflows, setOverflows] = useState(false);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const measure = () => setOverflows(el.scrollWidth > el.clientWidth + 1);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [courses]);
  const todayName = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Copenhagen",
    weekday: "long",
  }).format(new Date()) as Weekday;

  const at = (day: Weekday, slot: SlotLabel) =>
    courses.find((c) => c.weekday === day && c.slot === slot);

  return (
    <section aria-labelledby="grid-heading">
      <div className="mb-2 flex items-center gap-3">
        <h2 id="grid-heading" className="dtu-heading">Timetable · {term}</h2>
        {overflows && (
          <button
            onClick={onFullscreen}
            className="dtu-focus ml-auto border px-3 py-1 text-xs font-medium"
            style={{ borderColor: "var(--rule-strong)" }}
            title="Show the timetable on its own, filling the screen"
          >
            Full screen
          </button>
        )}
      </div>

      <div ref={scrollerRef} className="overflow-x-auto">
        <table className="w-full min-w-[44rem] border-collapse text-sm">
          <thead>
            <tr>
              <th className="w-16 border p-0" style={{ borderColor: "var(--rule)" }}>
                <span className="sr-only">Time</span>
              </th>
              {WEEKDAYS.map((day) => (
                <th
                  key={day}
                  scope="col"
                  className="border px-2 py-1.5 text-left align-middle font-medium"
                  style={{
                    borderColor: "var(--rule)",
                    background: day === todayName ? "var(--surface-alt)" : undefined,
                  }}
                >
                  {day}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {SLOTS.map((slot) => (
              <tr key={slot.label}>
                <th
                  scope="row"
                  className="border px-2 py-1.5 text-left align-middle text-xs font-normal tabular-nums"
                  style={{ borderColor: "var(--rule)", color: "var(--ink-soft)" }}
                >
                  {slot.label}
                </th>

                {WEEKDAYS.map((day) => {
                  const module = grid[day]?.[slot.label];
                  const course = at(day, slot.label);

                  return (
                    <td
                      key={day}
                      className="border p-0 align-middle"
                      style={{
                        borderColor: "var(--rule)",
                        background: day === todayName ? "var(--surface-alt)" : undefined,
                      }}
                    >
                      {module && (
                        <div className="p-1">
                          {course ? (
                            <button
                              onClick={() => onSelectCourse(course)}
                              className="dtu-focus flex h-11 w-full items-center gap-2 px-0.5 text-left"
                            >
                              <span
                                aria-hidden
                                className="h-7 w-1 shrink-0"
                                style={{ background: course.colour }}
                              />
                              <span className="text-[13px] font-medium leading-snug">
                                {displayName(course)}
                              </span>
                            </button>
                          ) : (
                            <div className="h-11" />
                          )}
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-2 text-xs" style={{ color: "var(--ink-soft)" }}>
        Derived from your calendar feed. Select a course for its number, grades and links.
      </p>
    </section>
  );
}
