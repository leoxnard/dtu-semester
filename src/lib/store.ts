"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * All per-person state lives in this browser only. The server keeps no user
 * data at all, so a new device means pasting the calendar link once more.
 *
 * localStorage rather than a cookie on purpose: a cookie would ride along on
 * every single request, including map tiles and assets, and end up in more
 * logs than necessary. This is only ever sent when we explicitly send it.
 */

const FEED_KEY = "dtu-semester.feed-url";
const ROOM_KEY = "dtu-semester.room-choice";
const DONE_KEY = "dtu-semester.done";
const HIDDEN_SERIES_KEY = "dtu-semester.hidden-series";
const SKIPPED_KEY = "dtu-semester.skipped";
const THEME_KEY = "dtu-semester.theme";
const VIEW_KEY = "dtu-semester.view";
const NICKNAME_KEY = "dtu-semester.nicknames";

function read(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null; // Private mode, or site data blocked.
  }
}

function write(key: string, value: string | null) {
  try {
    if (value === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, value);
  } catch {
    // Nothing we can do; the app still works for this session.
  }
}

export function useFeedUrl() {
  const [feedUrl, setFeedUrlState] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setFeedUrlState(read(FEED_KEY));
    setReady(true);
  }, []);

  const setFeedUrl = useCallback((url: string | null) => {
    write(FEED_KEY, url);
    setFeedUrlState(url);
  }, []);

  return { feedUrl, setFeedUrl, ready };
}

/** Course code -> the room the user marked as theirs (raw token). */
export type RoomChoices = Record<string, string>;

export function useRoomChoices() {
  const [choices, setChoices] = useState<RoomChoices>({});

  useEffect(() => {
    const stored = read(ROOM_KEY);
    if (!stored) return;
    try {
      setChoices(JSON.parse(stored) as RoomChoices);
    } catch {
      write(ROOM_KEY, null);
    }
  }, []);

  const choose = useCallback((courseCode: string, roomRaw: string | null) => {
    setChoices((prev) => {
      const next = { ...prev };
      if (roomRaw === null) delete next[courseCode];
      else next[courseCode] = roomRaw;
      write(ROOM_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  return { choices, choose };
}


/** A set of ids persisted as a JSON array. Used for ticked-off and hidden items. */
function useIdSet(storageKey: string) {
  const [ids, setIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const stored = read(storageKey);
    if (!stored) return;
    try {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) setIds(new Set(parsed.filter((v) => typeof v === "string")));
    } catch {
      write(storageKey, null);
    }
  }, [storageKey]);

  const toggle = useCallback(
    (id: string, force?: boolean) => {
      setIds((prev) => {
        const next = new Set(prev);
        const shouldAdd = force ?? !next.has(id);
        if (shouldAdd) next.add(id);
        else next.delete(id);
        write(storageKey, JSON.stringify([...next]));
        return next;
      });
    },
    [storageKey],
  );

  /**
   * Drops ids that no longer exist in the feed. Without this, per-occurrence
   * state accumulates forever as semesters go by.
   */
  const prune = useCallback(
    (live: Set<string>) => {
      setIds((prev) => {
        const next = new Set([...prev].filter((id) => live.has(id)));
        if (next.size === prev.size) return prev;
        write(storageKey, JSON.stringify([...next]));
        return next;
      });
    },
    [storageKey],
  );

  return { ids, toggle, prune };
}

/** Deadlines the user has ticked off. Keyed by event UID. */
export function useDoneEvents() {
  return useIdSet(DONE_KEY);
}

/** Single occurrences hidden with "hide this week". Keyed by event UID. */
export function useSkippedOccurrences() {
  return useIdSet(SKIPPED_KEY);
}

/** Whole recurring series hidden with "hide always". Keyed by series key. */
export function useHiddenSeries() {
  return useIdSet(HIDDEN_SERIES_KEY);
}

export type Theme = "system" | "light" | "dark";

/**
 * Theme choice. "system" leaves the page to prefers-color-scheme; the other two
 * stamp data-theme on <html>, which the CSS overrides key off.
 */
export function useTheme() {
  const [theme, setThemeState] = useState<Theme>("system");

  useEffect(() => {
    const stored = read(THEME_KEY);
    const value: Theme = stored === "light" || stored === "dark" ? stored : "system";
    setThemeState(value);
    apply(value);
  }, []);

  const setTheme = useCallback((value: Theme) => {
    write(THEME_KEY, value === "system" ? null : value);
    setThemeState(value);
    apply(value);
  }, []);

  return { theme, setTheme };
}

function apply(theme: Theme) {
  const root = document.documentElement;
  if (theme === "system") root.removeAttribute("data-theme");
  else root.setAttribute("data-theme", theme);
}


export type View = "main" | "fullscreen";

/**
 * Which view to open on. Leaving the app while the full-screen timetable is up
 * brings it back next time; being anywhere else — the main page, a course's
 * details — brings back the main page.
 *
 * The choice is durable rather than session-scoped, so reopening a week later
 * still lands on the timetable.
 */
export function useLastView() {
  const [view, setViewState] = useState<View>("main");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setViewState(read(VIEW_KEY) === "fullscreen" ? "fullscreen" : "main");
    setReady(true);
  }, []);

  /** What to open on next launch, without changing what is on screen now. */
  const setLaunchView = useCallback((next: View) => {
    write(VIEW_KEY, next === "fullscreen" ? "fullscreen" : null);
  }, []);

  const setView = useCallback(
    (next: View) => {
      setLaunchView(next);
      setViewState(next);
    },
    [setLaunchView],
  );

  return { view, setView, setLaunchView, ready };
}


/** Course code -> short name, e.g. "02456" -> "DL". */
export type Nicknames = Record<string, string>;

/**
 * Short names for courses, used only where the full title would not fit.
 * Stored per browser like everything else here.
 */
export function useNicknames() {
  const [nicknames, setNicknames] = useState<Nicknames>({});

  useEffect(() => {
    const stored = read(NICKNAME_KEY);
    if (!stored) return;
    try {
      const parsed = JSON.parse(stored);
      if (parsed && typeof parsed === "object") setNicknames(parsed as Nicknames);
    } catch {
      write(NICKNAME_KEY, null);
    }
  }, []);

  const setNickname = useCallback((courseCode: string, nickname: string) => {
    setNicknames((prev) => {
      const next = { ...prev };
      const trimmed = nickname.trim();
      if (trimmed) next[courseCode] = trimmed.slice(0, 24);
      else delete next[courseCode];
      write(NICKNAME_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  return { nicknames, setNickname };
}

/**
 * True on phone-width screens.
 *
 * Deliberately keyed to the viewport rather than to whether the grid overflows:
 * shortening the titles changes the content width, so measuring overflow to
 * decide whether to shorten would let the two flip back and forth forever.
 */
export function useIsNarrow(query = "(max-width: 767px)") {
  const [narrow, setNarrow] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia(query);
    const update = () => setNarrow(mql.matches);
    update();
    mql.addEventListener("change", update);
    return () => mql.removeEventListener("change", update);
  }, [query]);

  return narrow;
}
