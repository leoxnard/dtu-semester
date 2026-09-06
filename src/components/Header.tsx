"use client";

import { useEffect, useState } from "react";
import { useTheme, type Theme } from "@/lib/store";
import { DtuLogo } from "./DtuLogo";

type Weather = { temperature: number; precipitationProbability: number | null; code: number };

/** WMO weather codes, condensed to the few states worth knowing before cycling. */
function describe(code: number): string {
  if (code === 0) return "Clear";
  if (code <= 3) return "Cloudy";
  if (code <= 48) return "Fog";
  if (code <= 57) return "Drizzle";
  if (code <= 67) return "Rain";
  if (code <= 77) return "Snow";
  if (code <= 82) return "Showers";
  if (code <= 86) return "Snow showers";
  return "Thunderstorm";
}

export function Header({
  semesterLabel,
  week,
  fetchedAt,
  onRefresh,
  refreshing,
  onForget,
}: {
  semesterLabel: string;
  week: { current: number; total: number };
  fetchedAt: number | null;
  onRefresh: () => void;
  refreshing: boolean;
  onForget: () => void;
}) {
  const [weather, setWeather] = useState<Weather | null>(null);
  const { theme, setTheme } = useTheme();

  const THEMES: { value: Theme; label: string; title: string }[] = [
    { value: "light", label: "☀", title: "Light" },
    { value: "dark", label: "☾", title: "Dark" },
    { value: "system", label: "A", title: "Match system" },
  ];

  useEffect(() => {
    let cancelled = false;
    fetch("/api/weather")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!cancelled && d && typeof d.temperature === "number") setWeather(d);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <header
      className="flex flex-wrap items-center gap-x-5 gap-y-2 border-b px-4 py-3 sm:px-6"
      style={{ borderColor: "var(--rule-strong)" }}
    >
      <DtuLogo className="dtu-mark h-8 w-auto shrink-0" />

      <span className="text-sm">
        <span className="font-medium tabular-nums">
          Week {week.current} of {week.total}
        </span>
        <span style={{ color: "var(--ink-soft)" }}> · {semesterLabel}</span>
      </span>

      <div className="ml-auto flex items-center gap-4 text-sm">
        {weather && (
          <span style={{ color: "var(--ink-soft)" }} title="Lyngby campus">
            <span className="tabular-nums">{weather.temperature}°C</span> {describe(weather.code)}
            {weather.precipitationProbability != null && weather.precipitationProbability > 0 && (
              <span className="tabular-nums"> · {weather.precipitationProbability}% rain</span>
            )}
          </span>
        )}

        <button
          onClick={onRefresh}
          disabled={refreshing}
          className="dtu-focus underline underline-offset-4 disabled:opacity-40"
          style={{ color: "var(--ink-soft)" }}
          title={fetchedAt ? `Last updated ${new Date(fetchedAt).toLocaleString("en-GB")}` : undefined}
        >
          {refreshing ? "Refreshing…" : "Refresh"}
        </button>

        <button
          onClick={onForget}
          className="dtu-focus underline underline-offset-4"
          style={{ color: "var(--ink-soft)" }}
        >
          Forget link
        </button>

        <div className="flex border" style={{ borderColor: "var(--rule)" }} role="group" aria-label="Colour theme">
          {THEMES.map((option) => {
            const active = theme === option.value;
            return (
              <button
                key={option.value}
                onClick={() => setTheme(option.value)}
                className="dtu-focus w-9 py-1 text-sm leading-5"
                style={{
                  background: active ? "var(--color-dtu-red)" : "transparent",
                  color: active ? "#fff" : "var(--ink-soft)",
                }}
                aria-pressed={active}
                title={option.title}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
}
