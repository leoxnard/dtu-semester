"use client";

import { useEffect, useState } from "react";
import { Dialog } from "./Dialog";
import type { CourseAnalysis } from "@/lib/analyzer";
import type { Course, ScheduleEvent } from "@/lib/schedule";
import { seriesKey, seriesLabel } from "@/lib/series";
import { COURSE_ANALYZER_URL, COURSE_BASE_URL, DTU_LEARN_COURSE, DTU_LEARN_HOME } from "@/lib/dtu";

function Stat({ label, value, note }: { label: string; value: string | null; note?: string | null }) {
  if (!value) return null;
  return (
    <div className="border p-2.5" style={{ borderColor: "var(--rule)" }}>
      <p className="dtu-heading">{label}</p>
      <p className="mt-0.5 text-xl font-medium tabular-nums">{value}</p>
      {note && <p className="text-xs" style={{ color: "var(--ink-soft)" }}>{note}</p>}
    </div>
  );
}

function Prose({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <div>
      <p className="dtu-heading">{label}</p>
      <p className="mt-1 text-sm leading-relaxed" style={{ color: "var(--ink-soft)" }}>{value}</p>
    </div>
  );
}

function Section({
  title,
  children,
  open = false,
}: {
  title: string;
  children: React.ReactNode;
  open?: boolean;
}) {
  return (
    <details open={open} className="border" style={{ borderColor: "var(--rule)" }}>
      <summary className="dtu-focus cursor-pointer list-none px-3 py-2.5 text-sm font-medium marker:content-['']">
        <span className="flex items-center gap-2">
          <svg
            viewBox="0 0 24 24" className="h-3.5 w-3.5 shrink-0 transition-transform"
            fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"
            strokeLinejoin="round" aria-hidden
            style={{ color: "var(--ink-soft)" }}
          >
            <path d="m9 6 6 6-6 6" />
          </svg>
          {title}
        </span>
      </summary>
      <div className="border-t px-3 py-3" style={{ borderColor: "var(--rule)" }}>{children}</div>
    </details>
  );
}

function GradeChart({ bars }: { bars: CourseAnalysis["gradeDistribution"] }) {
  const max = Math.max(...bars.map((b) => b.percent), 1);
  return (
    <div>
      <ul className="space-y-1">
        {bars.map((bar) => (
          <li key={bar.grade} className="flex items-center gap-2 text-xs">
            <span className="w-10 shrink-0 text-right tabular-nums">{bar.grade}</span>
            <span className="h-3.5 flex-1" style={{ background: "var(--surface-alt)" }}>
              <span
                className="block h-full"
                style={{ width: `${(bar.percent / max) * 100}%`, background: "var(--color-dtu-red)" }}
              />
            </span>
            <span className="w-20 shrink-0 tabular-nums" style={{ color: "var(--ink-soft)" }}>
              {bar.percent}%{bar.count != null ? ` (${bar.count})` : ""}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export type SeriesRow = { key: string; label: string; count: number; hidden: boolean };

/** One row per recurring entry of this course, so any of them can be turned back on. */
export function seriesForCourse(
  events: ScheduleEvent[],
  courseCode: string,
  hidden: Set<string>,
): SeriesRow[] {
  const rows = new Map<string, SeriesRow>();
  for (const event of events) {
    if (event.courseCode !== courseCode || event.kind !== "teaching") continue;
    const key = seriesKey(event);
    const existing = rows.get(key);
    if (existing) existing.count += 1;
    else rows.set(key, { key, label: seriesLabel(event), count: 1, hidden: hidden.has(key) });
  }
  return [...rows.values()].sort((a, b) => a.label.localeCompare(b.label));
}

export function CourseModal({
  course,
  series,
  onToggleSeries,
  nickname,
  onNicknameChange,
  onClose,
}: {
  course: Course;
  series: SeriesRow[];
  onToggleSeries: (key: string, hidden: boolean) => void;
  nickname: string;
  onNicknameChange: (value: string) => void;
  onClose: () => void;
}) {
  const [analysis, setAnalysis] = useState<CourseAnalysis | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "failed">("loading");
  const [editingNickname, setEditingNickname] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setState("loading");
    fetch(`/api/course/${course.code}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((data: CourseAnalysis) => {
        if (cancelled) return;
        setAnalysis(data);
        setState("ready");
      })
      .catch(() => !cancelled && setState("failed"));
    return () => { cancelled = true; };
  }, [course.code]);

  const f = analysis?.facts ?? {};

  return (
    <Dialog
      label={`${course.code} ${course.title}`}
      onClose={onClose}
      header={
        <div className="flex items-start gap-3">
          <span aria-hidden className="mt-1 h-8 w-1.5 shrink-0" style={{ background: course.colour }} />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium tabular-nums" style={{ color: "var(--color-dtu-red)" }}>
              {course.code}
              {course.module && <span style={{ color: "var(--ink-soft)" }}> · {course.module}</span>}
              {analysis?.ects && <span style={{ color: "var(--ink-soft)" }}> · {analysis.ects} ECTS</span>}
            </p>

            <div className="flex flex-wrap items-baseline gap-x-2">
              {/* The real title always stands. A short name sits beside it, never
                  in place of it, so the course stays identifiable here. */}
              <h2 className="text-lg font-medium leading-tight">{course.title}</h2>
              {nickname && !editingNickname && (
                <span className="text-sm" style={{ color: "var(--ink-soft)" }}>{nickname}</span>
              )}
              {!editingNickname && (
                <button
                  onClick={() => setEditingNickname(true)}
                  className="dtu-focus -m-1 flex h-8 w-8 shrink-0 items-center justify-center"
                  style={{ color: "var(--ink-soft)" }}
                  aria-label={nickname ? "Edit short name" : "Add a short name"}
                  title={nickname ? "Edit short name" : "Add a short name"}
                >
                  <svg
                    viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor"
                    strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden
                  >
                    <path d="M12 20h9" />
                    <path d="M16.4 3.6a2 2 0 0 1 2.8 2.8L7.6 18H4.8v-2.8Z" />
                  </svg>
                </button>
              )}
            </div>

            {editingNickname && (
              <div className="mt-1.5 flex items-center gap-2">
                <input
                  autoFocus
                  value={nickname}
                  onChange={(e) => onNicknameChange(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && setEditingNickname(false)}
                  maxLength={24}
                  placeholder="Short name, e.g. DL"
                  aria-label="Short name"
                  className="dtu-focus w-40 border px-2 py-1 text-sm outline-none"
                  style={{ borderColor: "var(--rule-strong)", background: "var(--surface)", color: "var(--ink)" }}
                />
                <button
                  onClick={() => setEditingNickname(false)}
                  className="dtu-focus border px-2 py-1 text-xs"
                  style={{ borderColor: "var(--rule-strong)" }}
                >
                  Done
                </button>
              </div>
            )}
            {editingNickname && (
              <p className="mt-1 text-xs" style={{ color: "var(--ink-soft)" }}>
                Shown in the timetable on narrow screens. The full title is never replaced.
              </p>
            )}

            {analysis?.danishTitle && !editingNickname && (
              <p className="text-xs" style={{ color: "var(--ink-soft)" }}>{analysis.danishTitle}</p>
            )}
          </div>
        </div>
      }
    >
      <div className="space-y-5">
          <div className="flex flex-wrap gap-2">
            <a href={COURSE_ANALYZER_URL(course.code)} target="_blank" rel="noreferrer noopener"
               className="dtu-focus px-3 py-1.5 text-xs font-medium text-white" style={{ background: "var(--color-dtu-red)" }}>
              Course Analyzer ↗
            </a>
            <a href={COURSE_BASE_URL(course.code)} target="_blank" rel="noreferrer noopener"
               className="dtu-focus border px-3 py-1.5 text-xs font-medium" style={{ borderColor: "var(--rule-strong)" }}>
              Course base ↗
            </a>
            <a href={course.learnOu ? DTU_LEARN_COURSE(course.learnOu) : DTU_LEARN_HOME}
               target="_blank" rel="noreferrer noopener"
               className="dtu-focus border px-3 py-1.5 text-xs font-medium" style={{ borderColor: "var(--rule-strong)" }}
               title={course.learnOu ? undefined : "This course publishes no link to its DTU Learn page, so this opens the DTU Learn home page."}>
              {course.learnOu ? "DTU Learn ↗" : "DTU Learn (home) ↗"}
            </a>
          </div>

          <p className="text-sm" style={{ color: "var(--ink-soft)" }}>
            {course.weekday && course.slot ? (
              <span style={{ color: "var(--ink)" }}>{course.weekday} {course.slot}</span>
            ) : (
              "Not in the feed"
            )}
            {course.rooms.length > 0 && (
              <>
                {" · "}
                {[...new Set(course.rooms.map((r) => r.building))].join(", ")}
              </>
            )}
          </p>

          {series.length > 0 && (
            <Section title={`Recurring entries (${series.length})`} open={series.length > 1}>
              <p className="text-xs" style={{ color: "var(--ink-soft)" }}>
                DTU sometimes books one course into several rooms at the same hour. Switch off the
                ones you do not attend — this is the only place to switch them back on.
              </p>
              <ul className="mt-2 space-y-1">
                {series.map((row) => (
                  <li key={row.key}>
                    <label
                      className="flex cursor-pointer items-center gap-2.5 border px-2 py-1.5 text-sm"
                      style={{ borderColor: "var(--rule)", opacity: row.hidden ? 0.55 : 1 }}
                    >
                      <input
                        type="checkbox"
                        checked={!row.hidden}
                        onChange={() => onToggleSeries(row.key, !row.hidden)}
                        className="dtu-focus h-3.5 w-3.5 accent-[var(--color-dtu-red)]"
                      />
                      <span
                        className="min-w-0 flex-1"
                        style={{ textDecoration: row.hidden ? "line-through" : undefined }}
                      >
                        {row.label}
                      </span>
                      <span className="shrink-0 text-xs tabular-nums" style={{ color: "var(--ink-soft)" }}>
                        {row.count}×
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {state === "loading" && (
            <p className="text-sm" style={{ color: "var(--ink-soft)" }}>Loading course statistics…</p>
          )}

          {state === "failed" && (
            <p className="border p-3 text-sm" style={{ borderColor: "var(--rule)", color: "var(--ink-soft)" }}>
              Course Analyzer is unreachable right now. Everything else on this page still works —
              use the link above to open it directly.
            </p>
          )}

          {analysis && (
            <>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <Stat label="Average grade" value={analysis.averageGrade} note={analysis.gradeCount} />
                <Stat label="Failed" value={analysis.failedShare} note={analysis.absentShare} />
                <Stat label="Workload" value={analysis.workloadBurden} note="of 7" />
                <Stat label="Rating" value={analysis.averageRating} note={analysis.evaluationCount} />
              </div>

              {analysis.overworkedShare && (
                <p className="text-sm" style={{ color: "var(--ink-soft)" }}>
                  <strong className="font-medium" style={{ color: "var(--ink)" }}>
                    {analysis.overworkedShare}
                  </strong>{" "}
                  report being overworked{analysis.overworkedDetail ? ` (${analysis.overworkedDetail})` : ""}.
                </p>
              )}

              {analysis.gradeDistribution.length > 0 && (
                <Section title="Grade distribution">
                  <GradeChart bars={analysis.gradeDistribution} />
                </Section>
              )}

              {analysis.ratings.length > 0 && (
                <Section title="Student evaluation">
                  <ul className="space-y-0.5 text-sm" style={{ color: "var(--ink-soft)" }}>
                    {analysis.ratings.map((r) => (
                      <li key={r.label} className="flex justify-between gap-3">
                        <span className="capitalize">{r.label}</span>
                        <span className="tabular-nums" style={{ color: "var(--ink)" }}>{r.value}</span>
                      </li>
                    ))}
                  </ul>
                </Section>
              )}

              {analysis.semesterBreakdown.length > 0 && (
                <Section title="Semester breakdown">
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[22rem] border-collapse text-sm">
                      <thead>
                        <tr className="text-center" style={{ color: "var(--ink-soft)" }}>
                          <th className="border-b py-1 text-center font-normal" style={{ borderColor: "var(--rule)" }}>Semester</th>
                          <th className="border-b py-1 text-center font-normal" style={{ borderColor: "var(--rule)" }}>Grade</th>
                          <th className="border-b py-1 text-center font-normal" style={{ borderColor: "var(--rule)" }}>Failed</th>
                          <th className="border-b py-1 text-center font-normal" style={{ borderColor: "var(--rule)" }}>Students</th>
                        </tr>
                      </thead>
                      <tbody>
                        {analysis.semesterBreakdown.map((row) => (
                          <tr key={row.semester}>
                            <td className="border-b py-1 text-center align-middle" style={{ borderColor: "var(--rule)" }}>{row.semester}</td>
                            <td className="border-b py-1 text-center align-middle tabular-nums" style={{ borderColor: "var(--rule)" }}>{row.grade}</td>
                            <td className="border-b py-1 text-center align-middle tabular-nums" style={{ borderColor: "var(--rule)" }}>{row.failed}</td>
                            <td className="border-b py-1 text-center align-middle tabular-nums" style={{ borderColor: "var(--rule)" }}>{row.students}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Section>
              )}

              <Section title="Exam and prerequisites">
                <div className="space-y-3">
                  <Prose label="Exam" value={[f["exam type"], f["duration"], f["aid"]].filter(Boolean).join(" · ")} />
                  <Prose label="Scope and form" value={f["scope and form"]} />
                  <Prose label="Prerequisites" value={f["prerequisites"]} />
                  <Prose label="Responsible" value={analysis.responsible ?? undefined} />
                </div>
              </Section>

              <Section title="Course description">
                <div className="space-y-3">
                  <Prose label="Content" value={f["content"]} />
                  <Prose label="Objectives" value={f["objectives"]} />
                  <Prose label="Teacher's note" value={f["teacher's note"]} />
                </div>
              </Section>

              <p className="border-t pt-3 text-xs" style={{ borderColor: "var(--rule)", color: "var(--ink-soft)" }}>
                Statistics from the DTU Course Analyzer, an independent student project.
              </p>
            </>
          )}
      </div>
    </Dialog>
  );
}
