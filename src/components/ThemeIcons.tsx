/**
 * Theme switch icons. One family, one stroke weight, no colour of their own —
 * they inherit currentColor so the active one reads on the red chip and the
 * inactive ones on the page background.
 */

const base = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export function SunIcon({ className }: { className?: string }) {
  return (
    <svg {...base} className={className} aria-hidden>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2.6v2.2M12 19.2v2.2M21.4 12h-2.2M4.8 12H2.6M18.6 5.4l-1.6 1.6M7 17l-1.6 1.6M18.6 18.6L17 17M7 7L5.4 5.4" />
    </svg>
  );
}

export function MoonIcon({ className }: { className?: string }) {
  return (
    <svg {...base} className={className} aria-hidden>
      <path d="M20.5 14.4A8.6 8.6 0 0 1 9.6 3.5a8.6 8.6 0 1 0 10.9 10.9Z" />
    </svg>
  );
}

/** "Follow the device" — a display, the thing whose setting is being followed. */
export function SystemIcon({ className }: { className?: string }) {
  return (
    <svg {...base} className={className} aria-hidden>
      <rect x="2.8" y="4.2" width="18.4" height="12.4" rx="1.6" />
      <path d="M9 20.2h6M12 16.6v3.6" />
    </svg>
  );
}
