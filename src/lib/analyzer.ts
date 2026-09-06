import * as cheerio from "cheerio";
import { COURSE_ANALYZER_URL } from "./dtu";

/**
 * Scraper for dtucourseanalyzer.pythonanywhere.com.
 *
 * That site is a volunteer-run project on free hosting with no API, so this is
 * the most brittle part of the app by a wide margin. Two defences:
 *   1. Anchor on label text ("Average grade:") rather than table position, so
 *      re-ordering the page does not break extraction.
 *   2. Every field is independent and optional. A layout change loses fields,
 *      never the whole panel — and the link to the original always works.
 */

export type GradeBar = { grade: string; percent: number; count: number | null };
export type SemesterRow = { semester: string; grade: string; failed: string; students: string };
export type EvaluationRow = { semester: string; values: string[] };

export type CourseAnalysis = {
  code: string;
  fetchedAt: number;
  facts: Record<string, string>;
  averageGrade: string | null;
  gradeCount: string | null;
  failedShare: string | null;
  absentShare: string | null;
  workloadBurden: string | null;
  overworkedShare: string | null;
  overworkedDetail: string | null;
  averageRating: string | null;
  evaluationCount: string | null;
  ratings: { label: string; value: string }[];
  gradeDistribution: GradeBar[];
  semesterBreakdown: SemesterRow[];
  evaluationHistory: { headers: string[]; rows: EvaluationRow[] };
  danishTitle: string | null;
  ects: string | null;
  responsible: string | null;
};

const clean = (s: string) => s.replace(/­/g, "").replace(/\s+/g, " ").trim();

export function parseAnalyzerHtml(html: string, code: string): CourseAnalysis {
  const $ = cheerio.load(html);

  // label -> [remaining cell texts], keyed on the first cell of every row.
  const byLabel = new Map<string, string[]>();
  $("table tr").each((_, tr) => {
    const cells = $(tr).find("td, th").toArray().map((c) => clean($(c).text()));
    if (cells.length < 2) return;
    const label = cells[0].replace(/\s*\[\?\]\s*$/, "").replace(/:$/, "").trim().toLowerCase();
    if (label && !byLabel.has(label)) byLabel.set(label, cells.slice(1));
  });

  const cell = (label: string, index = 0): string | null => {
    const v = byLabel.get(label.toLowerCase())?.[index];
    return v && v.length ? v : null;
  };

  // "(2669 grades)" -> "2669 grades"
  const paren = (s: string | null) => s?.replace(/^\((.*)\)$/, "$1") ?? null;

  const facts: Record<string, string> = {};
  for (const key of [
    "danish title", "language", "ects-points", "course level", "sign-ups",
    "schedule", "location", "exam type", "hand-ins", "exam info", "aid",
    "duration", "scope and form", "prerequisites", "subsequent", "study lines",
    "description", "objectives", "content", "teacher's note", "responsible",
  ]) {
    const v = cell(key);
    if (v) facts[key] = v;
  }

  // Multi-row tables identified by their header signature, not their index.
  const semesterBreakdown: SemesterRow[] = [];
  const evaluationHistory: { headers: string[]; rows: EvaluationRow[] } = { headers: [], rows: [] };
  const gradeDistribution: GradeBar[] = [];

  $("table").each((_, table) => {
    const rows = $(table).find("tr").toArray();
    if (rows.length < 2) return;
    const header = $(rows[0]).find("td, th").toArray().map((c) => clean($(c).text()));

    if (header[1] === "Grade" && header.includes("Failed")) {
      for (const tr of rows.slice(1)) {
        const c = $(tr).find("td, th").toArray().map((x) => clean($(x).text()));
        if (c[0]) semesterBreakdown.push({ semester: c[0], grade: c[1] ?? "", failed: c[2] ?? "", students: c[3] ?? "" });
      }
    } else if (header[1] === "A" && header.includes("Votes")) {
      evaluationHistory.headers = header.slice(1);
      for (const tr of rows.slice(1)) {
        const c = $(tr).find("td, th").toArray().map((x) => clean($(x).text()));
        if (c[0]) evaluationHistory.rows.push({ semester: c[0], values: c.slice(1) });
      }
    } else if (header[0] === "Grade" && header[1] === "Distribution") {
      for (const tr of rows.slice(1)) {
        const c = $(tr).find("td, th").toArray().map((x) => clean($(x).text()));
        const percent = Number.parseFloat((c[2] ?? c[1] ?? "").replace("%", ""));
        if (!c[0] || Number.isNaN(percent)) continue;
        const countMatch = /\((\d+)\)/.exec(c[3] ?? "");
        gradeDistribution.push({
          grade: c[0].replace(/"/g, ""),
          percent,
          count: countMatch ? Number(countMatch[1]) : null,
        });
      }
    }
  });

  const ratings: { label: string; value: string }[] = [];
  for (const [label, cells] of byLabel) {
    if (label.startsWith('"') && cells[0] && /^[\d.]+$/.test(cells[0])) {
      ratings.push({ label: clean(label).replace(/"/g, ""), value: cells[0] });
    }
  }

  return {
    code,
    fetchedAt: Date.now(),
    facts,
    averageGrade: cell("average grade"),
    gradeCount: paren(cell("average grade", 1)),
    failedShare: cell("failed students"),
    absentShare: paren(cell("failed students", 1)),
    workloadBurden: cell("workload burden"),
    overworkedShare: cell("overworked students"),
    overworkedDetail: paren(cell("overworked students", 1)),
    averageRating: cell("average rating"),
    evaluationCount: paren(cell("average rating", 1)),
    ratings,
    gradeDistribution,
    semesterBreakdown,
    evaluationHistory,
    danishTitle: cell("danish title"),
    ects: cell("ects-points"),
    responsible: cell("responsible"),
  };
}

export async function fetchCourseAnalysis(code: string): Promise<CourseAnalysis> {
  const res = await fetch(COURSE_ANALYZER_URL(code), {
    headers: { "User-Agent": "dtu-semester/1.0 (personal student dashboard)" },
    signal: AbortSignal.timeout(15_000),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Course Analyzer returned HTTP ${res.status}`);
  return parseAnalyzerHtml(await res.text(), code);
}
