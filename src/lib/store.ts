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
