"use client";

import { Dialog } from "./Dialog";
import { MoonIcon, SunIcon, SystemIcon } from "./ThemeIcons";
import { useTheme, type Theme } from "@/lib/store";

const THEMES: { value: Theme; Icon: (p: { className?: string }) => React.ReactElement; label: string }[] = [
  { value: "light", Icon: SunIcon, label: "Light" },
  { value: "dark", Icon: MoonIcon, label: "Dark" },
  { value: "system", Icon: SystemIcon, label: "System" },
];

/**
 * Everything that is a setting rather than a thing you look at, moved out of
 * the header so the header can just say where you are in the semester.
 */
export function Settings({
  fetchedAt,
  refreshing,
  onRefresh,
  onForget,
  onClose,
}: {
  fetchedAt: number | null;
  refreshing: boolean;
  onRefresh: () => void;
  onForget: () => void;
  onClose: () => void;
}) {
  const { theme, setTheme } = useTheme();

  return (
    <Dialog label="Settings" onClose={onClose} header={<h2 className="text-lg font-medium">Settings</h2>}>
      <div className="space-y-6">
        <section>
          <p className="dtu-heading">Appearance</p>
          <div className="mt-2 flex border" style={{ borderColor: "var(--rule-strong)" }} role="group" aria-label="Colour theme">
            {THEMES.map(({ value, Icon, label }) => {
              const active = theme === value;
              return (
                <button
                  key={value}
                  onClick={() => setTheme(value)}
                  className="dtu-focus flex flex-1 items-center justify-center gap-2 py-2.5 text-sm"
                  style={{
                    background: active ? "var(--color-dtu-red)" : "transparent",
                    color: active ? "#fff" : "var(--ink-soft)",
                  }}
                  aria-pressed={active}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </button>
              );
            })}
          </div>
        </section>

        <section>
          <p className="dtu-heading">Calendar</p>
          <p className="mt-1 text-xs" style={{ color: "var(--ink-soft)" }}>
            {fetchedAt
              ? `Last updated ${new Date(fetchedAt).toLocaleString("en-GB")}. Refreshes on its own every 12 hours.`
              : "Refreshes on its own every 12 hours."}
          </p>
          <button
            onClick={onRefresh}
            disabled={refreshing}
            className="dtu-focus mt-2 w-full border px-3 py-2.5 text-sm font-medium disabled:opacity-50"
            style={{ borderColor: "var(--rule-strong)" }}
          >
            {refreshing ? "Refreshing…" : "Refresh now"}
          </button>
        </section>

        <section>
          <p className="dtu-heading">Remove calendar</p>
          <p className="mt-1 text-xs" style={{ color: "var(--ink-soft)" }}>
            Forgets your DTU Learn link on this device. Your marked rooms, short names, added
            entries and ticked-off deadlines stay, and the link can be pasted again at any time.
          </p>
          <button
            onClick={onForget}
            className="dtu-focus mt-2 w-full px-3 py-2.5 text-sm font-medium text-white"
            style={{ background: "var(--color-dtu-red)" }}
          >
            Remove calendar link
          </button>
        </section>

        <p className="border-t pt-3 text-[11px]" style={{ borderColor: "var(--rule)", color: "var(--ink-soft)" }}>
          A student project. Not affiliated with or endorsed by DTU.
        </p>
      </div>
    </Dialog>
  );
}
