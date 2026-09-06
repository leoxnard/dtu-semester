"use client";

import { useEffect, useState } from "react";
import type { CourseAnalysis } from "@/lib/analyzer";
import type { Course } from "@/lib/schedule";
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

function GradeChart({ bars }: { bars: CourseAnalysis["gradeDistribution"] }) {
  if (bars.length === 0) return null;
  const max = Math.max(...bars.map((b) => b.percent), 1);
  return (
    <div>
      <p className="dtu-heading">Grade distribution</p>
      <ul className="mt-2 space-y-1">
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

export function CourseModal({ course, onClose }: { course: Course; onClose: () => void }) {
  const [analysis, setAnalysis] = useState<CourseAnalysis | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "failed">("loading");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

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
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`${course.code} ${course.title}`}
    >
      <div
        className="dtu-panel max-h-[92dvh] w-full max-w-3xl overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <header
          className="sticky top-0 flex items-start gap-3 border-b p-4"
          style={{ borderColor: "var(--rule-strong)", background: "var(--surface)" }}
        >
          <span aria-hidden className="mt-1 h-8 w-1.5 shrink-0" style={{ background: course.colour }} />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium tabular-nums" style={{ color: "var(--color-dtu-red)" }}>
              {course.code}
              {course.module && <span style={{ color: "var(--ink-soft)" }}> · {course.module}</span>}
              {analysis?.ects && <span style={{ color: "var(--ink-soft)" }}> · {analysis.ects} ECTS</span>}
            </p>
            <h2 className="text-lg font-medium leading-tight">{course.title}</h2>
            {analysis?.danishTitle && (
              <p className="text-xs" style={{ color: "var(--ink-soft)" }}>{analysis.danishTitle}</p>
            )}
          </div>
          <button onClick={onClose} className="dtu-focus shrink-0 px-2 text-xl leading-none" aria-label="Close">
            ×
          </button>
        </header>

        <div className="space-y-5 p-4">
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

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="border p-2.5" style={{ borderColor: "var(--rule)" }}>
              <p className="dtu-heading">Scheduled</p>
              <p className="mt-0.5 text-sm">
                {course.weekday && course.slot ? `${course.weekday} ${course.slot}` : "Not in the feed"}
              </p>
            </div>
            <div className="border p-2.5" style={{ borderColor: "var(--rule)" }}>
              <p className="dtu-heading">Rooms booked</p>
              <p className="mt-0.5 text-sm">
                {course.rooms.length
                  ? [...new Set(course.rooms.map((r) => r.building))].map((b) => `Building ${b}`).join(", ")
                  : "None in the feed"}
              </p>
            </div>
          </div>

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

              <GradeChart bars={analysis.gradeDistribution} />

              {analysis.ratings.length > 0 && (
                <div>
                  <p className="dtu-heading">Student evaluation</p>
                  <ul className="mt-1.5 space-y-0.5 text-sm" style={{ color: "var(--ink-soft)" }}>
                    {analysis.ratings.map((r) => (
                      <li key={r.label} className="flex justify-between gap-3">
                        <span className="capitalize">{r.label}</span>
                        <span className="tabular-nums" style={{ color: "var(--ink)" }}>{r.value}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {analysis.semesterBreakdown.length > 0 && (
                <div>
                  <p className="dtu-heading">Semester breakdown</p>
                  <div className="mt-1.5 overflow-x-auto">
                    <table className="w-full min-w-[22rem] border-collapse text-sm">
                      <thead>
                        <tr className="text-left" style={{ color: "var(--ink-soft)" }}>
                          <th className="border-b py-1 pr-2 font-normal" style={{ borderColor: "var(--rule)" }}>Semester</th>
                          <th className="border-b py-1 pr-2 font-normal" style={{ borderColor: "var(--rule)" }}>Grade</th>
                          <th className="border-b py-1 pr-2 font-normal" style={{ borderColor: "var(--rule)" }}>Failed</th>
                          <th className="border-b py-1 font-normal" style={{ borderColor: "var(--rule)" }}>Students</th>
                        </tr>
                      </thead>
                      <tbody>
                        {analysis.semesterBreakdown.map((row) => (
                          <tr key={row.semester}>
                            <td className="border-b py-1 pr-2" style={{ borderColor: "var(--rule)" }}>{row.semester}</td>
                            <td className="border-b py-1 pr-2 tabular-nums" style={{ borderColor: "var(--rule)" }}>{row.grade}</td>
                            <td className="border-b py-1 pr-2 tabular-nums" style={{ borderColor: "var(--rule)" }}>{row.failed}</td>
                            <td className="border-b py-1 tabular-nums" style={{ borderColor: "var(--rule)" }}>{row.students}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div className="space-y-3">
                <Prose label="Exam" value={[f["exam type"], f["duration"], f["aid"]].filter(Boolean).join(" · ")} />
                <Prose label="Scope and form" value={f["scope and form"]} />
                <Prose label="Prerequisites" value={f["prerequisites"]} />
                <Prose label="Responsible" value={analysis.responsible ?? undefined} />
                <Prose label="Content" value={f["content"]} />
                <Prose label="Objectives" value={f["objectives"]} />
                <Prose label="Teacher's note" value={f["teacher's note"]} />
              </div>

              <p className="border-t pt-3 text-xs" style={{ borderColor: "var(--rule)", color: "var(--ink-soft)" }}>
                Statistics from the DTU Course Analyzer, an independent student project.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
