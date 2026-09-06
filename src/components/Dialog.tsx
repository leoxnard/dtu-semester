"use client";

import { useEffect, useId, type ReactNode } from "react";

/**
 * The one overlay both the course details and the add-entry form use.
 *
 * Four things this exists to get right, all of which were wrong when each
 * dialog rolled its own:
 *
 *  - The page behind is frozen while it is open. Otherwise a scroll gesture
 *    chains from the panel to the page, and once the page has moved the panel
 *    stops responding until it scrolls back.
 *  - `overscroll-contain` stops that chaining at the panel's own edges.
 *  - The close control is a 44px target, not a 24px glyph.
 *  - On a phone it is a sheet anchored to the bottom edge, full width and
 *    nearly full height, rather than a small box floating in the middle.
 */
export function Dialog({
  label,
  header,
  children,
  onClose,
}: {
  label: string;
  /** Rendered inside the sticky header, beside the close button. */
  header: ReactNode;
  children: ReactNode;
  onClose: () => void;
}) {
  const titleId = useId();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Freeze the page behind, and put it back exactly where it was on close.
  useEffect(() => {
    const { body } = document;
    const scrollY = window.scrollY;
    const previous = {
      position: body.style.position,
      top: body.style.top,
      width: body.style.width,
      overflow: body.style.overflow,
    };
    body.style.position = "fixed";
    body.style.top = `-${scrollY}px`;
    body.style.width = "100%";
    body.style.overflow = "hidden";
    return () => {
      body.style.position = previous.position;
      body.style.top = previous.top;
      body.style.width = previous.width;
      body.style.overflow = previous.overflow;
      window.scrollTo(0, scrollY);
    };
  }, []);

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-end justify-center bg-black/40 sm:items-center sm:p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-label={label}
    >
      <div
        className="dtu-panel flex max-h-[92dvh] w-full flex-col overflow-hidden sm:max-w-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header
          className="flex shrink-0 items-start gap-2 border-b p-4"
          style={{ borderColor: "var(--rule-strong)", background: "var(--surface)" }}
        >
          <div id={titleId} className="min-w-0 flex-1">
            {header}
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="dtu-focus -m-1 flex h-11 w-11 shrink-0 items-center justify-center border"
            style={{ borderColor: "var(--rule)", color: "var(--ink-soft)" }}
          >
            <svg
              viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor"
              strokeWidth={1.8} strokeLinecap="round" aria-hidden
            >
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4">{children}</div>
      </div>
    </div>
  );
}
