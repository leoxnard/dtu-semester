import { NextResponse } from "next/server";
import { fetchCourseAnalysis, type CourseAnalysis } from "@/lib/analyzer";
import { readCache, writeCache } from "@/lib/cache";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Course statistics change once a semester; a week-long cache is generous to
// the volunteer-run site we are reading from.
const ONE_WEEK = 7 * 24 * 60 * 60 * 1000;

export async function GET(_request: Request, context: { params: Promise<{ code: string }> }) {
  const { code } = await context.params;
  if (!/^\d{5}$/.test(code)) {
    return NextResponse.json({ error: "Course codes are five digits." }, { status: 400 });
  }

  const key = `course-${code}`;
  const cached = await readCache<CourseAnalysis>(key, ONE_WEEK);
  if (cached && !cached.stale) return NextResponse.json(cached.value);

  try {
    const analysis = await fetchCourseAnalysis(code);
    await writeCache(key, analysis);
    return NextResponse.json(analysis);
  } catch (err) {
    if (cached) return NextResponse.json(cached.value);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Course Analyzer unavailable." },
      { status: 502 },
    );
  }
}
