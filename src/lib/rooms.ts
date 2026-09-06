export type Room = {
  /** The raw token exactly as DTU wrote it, for display when parsing is unsure. */
  raw: string;
  /** DTU building number, e.g. "306" or "303A". Null when unparseable. */
  building: string | null;
  /** Human label for the room within the building, e.g. "Aud. 32" or "A082". */
  room: string | null;
  /** Seat count, when DTU included it. */
  capacity: number | null;
};

export type ParsedLocation = {
  courseCode: string | null;
  courseTitle: string | null;
  rooms: Room[];
};

function tidy(part: string): string {
  return part.replace(/\s+/g, " ").trim();
}

function prettyRoom(segments: string[]): string | null {
  const label = segments
    .filter(Boolean)
    .map((s) =>
      s
        .replace(/^AUDITORIE\s*/i, "Aud. ")
        .replace(/^AUD\.?\s*/i, "Aud. ")
        .replace(/^R:/i, "room "),
    )
    .join(" · ");
  return label || null;
}

/**
 * DTU writes room bookings in at least four notations, sometimes several in one
 * field. Each is handled explicitly; anything unrecognised is still returned as
 * a raw token so the UI can show *something* rather than silently dropping it.
 */
function parseRoomToken(token: string): Room | null {
  const raw = tidy(token);
  if (!raw) return null;

  const empty: Room = { raw, building: null, room: null, capacity: null };

  // Trailing seat count: "303A.042.AUD (250)"
  let working = raw;
  let capacity: number | null = null;
  const cap = /\((\d{1,4})\)\s*$/.exec(working);
  if (cap) {
    capacity = Number(cap[1]);
    working = working.slice(0, cap.index).trim();
  }

  // 1) "B116-A082" / "B306-H000vest"
  let m = /^B(\d{3}[A-Z]?)-(.+)$/i.exec(working);
  if (m) return { raw, building: m[1].toUpperCase(), room: prettyRoom([m[2]]), capacity };

  // 2) "LYN.306.AUD32.R:132" / "LYN.208.012" / "LYN.302.0NØ.R:003"
  m = /^LYN\.(\d{3}[A-Z]?)\.?(.*)$/i.exec(working);
  if (m) {
    const rest = m[2].split(".").filter(Boolean);
    return { raw, building: m[1].toUpperCase(), room: prettyRoom(rest), capacity };
  }

  // 3) "303A.042.AUD" / "306.H000.VEST.SA"
  m = /^(\d{3}[A-Z]?)\.(.+)$/.exec(working);
  if (m) {
    const rest = m[2].split(".").filter(Boolean);
    return { raw, building: m[1].toUpperCase(), room: prettyRoom(rest), capacity };
  }

  // 4) Free text: "AUD34, building 306" / "53, building 208"
  m = /^(.*?),?\s*building\s+(\d{3}[A-Z]?)$/i.exec(working);
  if (m) return { raw, building: m[2].toUpperCase(), room: prettyRoom([m[1]]), capacity };

  // 5) Bare building number.
  m = /^(\d{3}[A-Z]?)$/.exec(working);
  if (m) return { raw, building: m[1].toUpperCase(), room: null, capacity };

  return empty;
}

/**
 * Splits a LOCATION field into its course reference and its room tokens.
 * Example input:
 *   "B306-H000vest, B341-IT019 (02456 Deep learning, Fall 2026)"
 */
export function parseLocation(location: string): ParsedLocation {
  const value = tidy(location);
  if (!value || /^DTU Learn/i.test(value)) {
    return { courseCode: null, courseTitle: null, rooms: [] };
  }

  let roomsPart = value;
  let courseCode: string | null = null;
  let courseTitle: string | null = null;

  // The course reference is a trailing "(NNNNN Title, Semester)" group…
  const trailing = /\((\d{5})\s+([^)]*?)(?:,\s*(?:Fall|Spring|Autumn)[^)]*)?\)\s*$/i.exec(value);
  if (trailing) {
    courseCode = trailing[1];
    courseTitle = tidy(trailing[2]);
    roomsPart = value.slice(0, trailing.index).trim();
  } else {
    // …or the whole field is just "22112 High performance computing, Fall 2026".
    const bare = /^(\d{5})\s+(.*?)(?:,\s*(?:Fall|Spring|Autumn)\s*\d{4})?$/i.exec(value);
    if (bare) {
      return { courseCode: bare[1], courseTitle: tidy(bare[2]), rooms: [] };
    }
  }

  // "AUD34, building 306" contains a comma but is ONE room, so the free-text
  // form has to be tried on the whole string before splitting on separators.
  const freeText = /^(.*?),?\s*building\s+(\d{3}[A-Z]?)$/i.exec(roomsPart);
  const rooms = freeText
    ? [parseRoomToken(roomsPart)].filter((r): r is Room => r !== null)
    : roomsPart
        .split(/[|,]/)
        .map(parseRoomToken)
        .filter((r): r is Room => r !== null);

  return { courseCode, courseTitle, rooms };
}

/** OSM has no "303A" — the wings share one footprint. Fall back to "303". */
export function buildingLookupKeys(building: string): string[] {
  const stripped = building.replace(/[A-Z]$/i, "");
  return stripped === building ? [building] : [building, stripped];
}
