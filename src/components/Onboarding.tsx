"use client";

import { useState } from "react";
import { CALENDAR_GUIDE_URL } from "@/lib/dtu";

const STEPS = [
  'Inside a course, open "My Course" → "Calendar".',
  'Click "Settings", tick "Enable Calendar Feeds", then "Save".',
  'Click "Subscribe".',
  'In the dropdown choose All Courses, then copy the link.',
];

export function Onboarding({
  onSubmit,
  error,
  busy,
}: {
  onSubmit: (url: string) => void;
  error: string | null;
  busy: boolean;
}) {
  const [value, setValue] = useState("");

  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col justify-center px-5 py-12">
      <p className="dtu-heading">Technical University of Denmark</p>
      <h1 className="mt-2 text-4xl font-medium tracking-tight" style={{ color: "var(--color-dtu-red)" }}>
        DTU&nbsp;Semester
      </h1>
      <p className="mt-3 max-w-prose text-[15px] leading-relaxed" style={{ color: "var(--ink-soft)" }}>
        Your timetable, deadlines and campus map in one page. Paste your DTU Learn
        calendar link once — everything else is read from it.
      </p>

      <form
        className="mt-8"
        onSubmit={(e) => {
          e.preventDefault();
          if (value.trim()) onSubmit(value.trim());
        }}
      >
        <label htmlFor="feed" className="dtu-heading block">
          DTU Learn calendar link
        </label>
        <input
          id="feed"
          type="url"
          inputMode="url"
          autoComplete="off"
          spellCheck={false}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="https://learn.inside.dtu.dk/d2l/le/calendar/feed/user/feed.ics?token=…"
          className="dtu-focus mt-2 w-full border px-3 py-2.5 text-sm outline-none"
          style={{ borderColor: "var(--rule-strong)", background: "var(--surface)", color: "var(--ink)" }}
        />
        {error && (
          <p className="mt-2 text-sm" style={{ color: "var(--color-dtu-red)" }} role="alert">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={busy || !value.trim()}
          className="dtu-focus mt-4 px-5 py-2.5 text-sm font-medium text-white transition-opacity disabled:opacity-40"
          style={{ background: "var(--color-dtu-red)" }}
        >
          {busy ? "Loading your calendar…" : "Show my semester"}
        </button>
      </form>

      <section className="dtu-panel mt-10 p-5">
        <h2 className="dtu-heading">Where to find the link</h2>
        <ol className="mt-3 space-y-1.5 text-sm" style={{ color: "var(--ink-soft)" }}>
          {STEPS.map((step, i) => (
            <li key={step} className="flex gap-2.5">
              <span className="shrink-0 font-medium tabular-nums" style={{ color: "var(--color-dtu-red)" }}>
                {i + 1}.
              </span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
        <p className="mt-4 border-t pt-3 text-sm" style={{ borderColor: "var(--rule)" }}>
          <strong className="font-medium">Pick “All Courses”</strong>, not a single course — a
          one-course feed leaves most of your timetable empty.
        </p>
        <a
          href={CALENDAR_GUIDE_URL}
          target="_blank"
          rel="noreferrer noopener"
          className="dtu-focus mt-3 inline-block text-sm underline underline-offset-4"
          style={{ color: "var(--color-dtu-red)" }}
        >
          Full guide at DTU Learn Support ↗
        </a>
      </section>

      <p className="mt-6 text-xs leading-relaxed" style={{ color: "var(--ink-soft)" }}>
        Your link is stored in this browser only. The server uses it to fetch your
        calendar and never saves it. Anyone holding this link can read your DTU
        calendar, so treat it like a password — you can regenerate it in DTU Learn
        at any time.
      </p>
    </main>
  );
}
