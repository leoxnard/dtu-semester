"use client";

import { DtuLogo } from "./DtuLogo";

/**
 * Deliberately thin: where you are in the semester, and a way into the
 * settings. Anything you only change occasionally lives in there instead.
 */
export function Header({
  semesterLabel,
  week,
  onOpenSettings,
}: {
  semesterLabel: string;
  week: { current: number; total: number };
  onOpenSettings: () => void;
}) {
  return (
    <header
      className="flex items-center gap-3 border-b px-4 py-2.5 sm:px-6"
      style={{ borderColor: "var(--rule-strong)" }}
    >
      <DtuLogo className="dtu-mark h-7 w-auto shrink-0" />

      <span className="min-w-0 truncate text-sm">
        <span className="font-medium tabular-nums">
          Week {week.current} of {week.total}
        </span>
        <span style={{ color: "var(--ink-soft)" }}> · {semesterLabel}</span>
      </span>

      <button
        onClick={onOpenSettings}
        aria-label="Settings"
        title="Settings"
        className="dtu-focus ml-auto flex h-10 w-10 shrink-0 items-center justify-center border"
        style={{ borderColor: "var(--rule)", color: "var(--ink-soft)" }}
      >
        <svg
          viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor"
          strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden
        >
          <circle cx="12" cy="12" r="3.1" />
          <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1.03 1.56V21a2 2 0 1 1-4 0v-.09A1.7 1.7 0 0 0 8.9 19.3a1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-1.56-1.03H3a2 2 0 1 1 0-4h.09A1.7 1.7 0 0 0 4.7 8.9a1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1.03-1.56V3a2 2 0 1 1 4 0v.09A1.7 1.7 0 0 0 15.1 4.7a1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.7 1.7 0 0 0 19.4 9v.09a1.7 1.7 0 0 0 1.56 1.03H21a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-1.56 1.03Z" />
        </svg>
      </button>
    </header>
  );
}
