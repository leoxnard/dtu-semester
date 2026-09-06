import { NextResponse } from "next/server";
import { readCache, writeCache } from "@/lib/cache";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export type DayWeather = {
  /** yyyy-mm-dd in campus local time. */
  date: string;
  tempMax: number;
  tempMin: number;
  /** Millimetres of rain expected across the day. */
  precipitation: number;
  precipitationChance: number | null;
  code: number;
};

const LYNGBY = "latitude=55.786&longitude=12.522";
const URL_ =
  `https://api.open-meteo.com/v1/forecast?${LYNGBY}` +
  "&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max" +
  "&timezone=Europe%2FCopenhagen&forecast_days=16";

const THREE_HOURS = 3 * 60 * 60 * 1000;

/**
 * Daily forecast for Lyngby campus.
 *
 * Open-Meteo is the source because it needs no key and no account. The links in
 * the UI point at DMI, the Danish meteorological institute, for anyone who wants
 * the authoritative national forecast rather than a one-line summary.
 */
export async function GET() {
  const cached = await readCache<DayWeather[]>("weather-daily-lyngby", THREE_HOURS);
  if (cached && !cached.stale) return NextResponse.json({ days: cached.value });

  try {
    const res = await fetch(URL_, { signal: AbortSignal.timeout(8000), cache: "no-store" });
    if (!res.ok) throw new Error(String(res.status));
    const daily = (await res.json()).daily;

    const days: DayWeather[] = daily.time.map((date: string, i: number) => ({
      date,
      tempMax: Math.round(daily.temperature_2m_max[i]),
      tempMin: Math.round(daily.temperature_2m_min[i]),
      precipitation: Math.round(daily.precipitation_sum[i] * 10) / 10,
      precipitationChance: daily.precipitation_probability_max?.[i] ?? null,
      code: daily.weather_code[i],
    }));

    await writeCache("weather-daily-lyngby", days);
    return NextResponse.json({ days });
  } catch {
    if (cached) return NextResponse.json({ days: cached.value });
    return NextResponse.json({ days: [] }, { status: 503 });
  }
}
