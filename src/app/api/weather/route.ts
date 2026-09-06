import { NextResponse } from "next/server";
import { readCache, writeCache } from "@/lib/cache";

export const runtime = "nodejs";
export const revalidate = 900;

type Weather = { temperature: number; precipitationProbability: number | null; code: number };

const LYNGBY = "latitude=55.786&longitude=12.522";
const URL_ = `https://api.open-meteo.com/v1/forecast?${LYNGBY}&current=temperature_2m,weather_code,precipitation_probability&timezone=Europe%2FCopenhagen`;

export async function GET() {
  const cached = await readCache<Weather>("weather-lyngby", 15 * 60 * 1000);
  if (cached && !cached.stale) return NextResponse.json(cached.value);

  try {
    const res = await fetch(URL_, { signal: AbortSignal.timeout(8000), cache: "no-store" });
    if (!res.ok) throw new Error(String(res.status));
    const data = await res.json();
    const value: Weather = {
      temperature: Math.round(data.current.temperature_2m),
      precipitationProbability: data.current.precipitation_probability ?? null,
      code: data.current.weather_code,
    };
    await writeCache("weather-lyngby", value);
    return NextResponse.json(value);
  } catch {
    if (cached) return NextResponse.json(cached.value);
    return NextResponse.json({ error: "unavailable" }, { status: 503 });
  }
}
