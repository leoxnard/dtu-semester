"use client";

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
}: {
  courses: Course[];
  term: "autumn" | "spring";
  onSelectCourse: (course: Course) => void;
}) {
  const grid = term === "autumn" ? AUTUMN_MODULE_GRID : SPRING_MODULE_GRID;
  const todayName = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Copenhagen",
    weekday: "long",
  }).format(new Date()) as Weekday;

  const at = (day: Weekday, slot: SlotLabel) =>
    courses.find((c) => c.weekday === day && c.slot === slot);

  return (
    <section aria-labelledby="grid-heading">
      <h2 id="grid-heading" className="dtu-heading mb-2">Timetable · {term}</h2>

      <div className="overflow-x-auto">
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
                  className="border px-2 py-1.5 text-left font-medium"
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
                  className="border px-2 py-1.5 text-left align-top text-xs font-normal tabular-nums"
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
                      className="border p-0 align-top"
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
                              className="dtu-focus flex w-full gap-2 px-0.5 py-1 text-left"
                            >
                              <span
                                aria-hidden
                                className="mt-0.5 w-1 shrink-0 self-stretch"
                                style={{ background: course.colour }}
                              />
                              <span className="text-[13px] font-medium leading-snug">
                                {course.title}
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
