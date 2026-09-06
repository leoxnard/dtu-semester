import { NextResponse } from "next/server";
import { buildSchedule, type Schedule } from "@/lib/schedule";
import { cacheKey, readCache, writeCache } from "@/lib/cache";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TWELVE_HOURS = 12 * 60 * 60 * 1000;
const ALLOWED_HOSTS = new Set(["learn.inside.dtu.dk"]);

/**
 * The feed URL is supplied by whoever is using the site, so this endpoint is a
 * server-side fetcher of user-controlled URLs — an SSRF hole unless the host is
 * pinned. Only DTU Learn is accepted; nothing else can be reached through it.
 */
function validateFeedUrl(input: unknown): { url: URL } | { error: string } {
  if (typeof input !== "string" || !input.trim()) return { error: "No calendar link provided." };
  let url: URL;
  try {
    url = new URL(input.trim());
  } catch {
    return { error: "That is not a valid URL." };
  }
  if (url.protocol !== "https:") return { error: "The calendar link must use https." };
  if (!ALLOWED_HOSTS.has(url.hostname)) {
    return { error: `Only DTU Learn calendar links are accepted (learn.inside.dtu.dk), not ${url.hostname}.` };
  }
  return { url };
}

export async function POST(request: Request) {
  let body: { url?: string; refresh?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Malformed request." }, { status: 400 });
  }

  const checked = validateFeedUrl(body.url);
  if ("error" in checked) return NextResponse.json({ error: checked.error }, { status: 400 });

  const key = `cal-${cacheKey(checked.url.toString())}`;
  const cached = await readCache<Schedule>(key, TWELVE_HOURS);

  if (cached && !cached.stale && !body.refresh) {
    return NextResponse.json({ schedule: cached.value, fetchedAt: cached.storedAt, fromCache: true });
  }

  try {
    const res = await fetch(checked.url, {
      headers: { Accept: "text/calendar, text/plain", "User-Agent": "dtu-semester/1.0" },
      signal: AbortSignal.timeout(20_000),
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`DTU Learn returned HTTP ${res.status}`);

    const text = await res.text();
    if (!text.includes("BEGIN:VCALENDAR")) {
      throw new Error("That link did not return a calendar. Check you copied the feed URL, not a page URL.");
    }

    const schedule = buildSchedule(text);
    await writeCache(key, schedule);
    return NextResponse.json({ schedule, fetchedAt: Date.now(), fromCache: false });
  } catch (err) {
    // Prefer stale data over an empty screen: a timetable from 13 hours ago is
    // still correct, and DTU Learn does go down.
    if (cached) {
      return NextResponse.json({
        schedule: cached.value,
        fetchedAt: cached.storedAt,
        fromCache: true,
        warning: "Could not reach DTU Learn — showing the last version fetched.",
      });
    }
    const message = err instanceof Error ? err.message : "Could not load the calendar.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
