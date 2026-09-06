import { CAMPUS_TZ } from "./dtu";

export type RawEvent = {
  uid: string;
  summary: string;
  location: string;
  description: string;
  start: Date;
  end: Date | null;
  allDay: boolean;
};

/** Unfold RFC 5545 continuation lines (CRLF followed by a space or tab). */
function unfold(text: string): string {
  return text.replace(/\r\n/g, "\n").replace(/\n[ \t]/g, "");
}

/** Undo the RFC 5545 TEXT escaping: \n \, \; \\ */
function unescapeText(value: string): string {
  return value
    .replace(/\\n/gi, "\n")
    .replace(/\\,/g, ",")
    .replace(/\;/g, ";")
    .replace(/\\\\/g, "\\");
}

/**
 * Offset of a named IANA zone from UTC at a given instant, in minutes.
 * Avoids shipping a tzdata library while still being correct across the
 * DST switch — a naive +2 would put every event after 25 Oct an hour off.
 */
function zoneOffsetMinutes(date: Date, timeZone: string): number {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const parts = Object.fromEntries(
    dtf.formatToParts(date).map((p) => [p.type, p.value]),
  ) as Record<string, string>;
  const asUTC = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour) === 24 ? 0 : Number(parts.hour),
    Number(parts.minute),
    Number(parts.second),
  );
  return (asUTC - date.getTime()) / 60000;
}

/** Interpret Y/M/D H:M:S as wall-clock time in `timeZone` and return the instant. */
function fromZonedTime(
  y: number, mo: number, d: number, h: number, mi: number, s: number, timeZone: string,
): Date {
  const guess = Date.UTC(y, mo - 1, d, h, mi, s);
  // Two passes converge for every real-world offset, including DST edges.
  let offset = zoneOffsetMinutes(new Date(guess), timeZone);
  offset = zoneOffsetMinutes(new Date(guess - offset * 60000), timeZone);
  return new Date(guess - offset * 60000);
}

function parseDateValue(raw: string, params: string): { date: Date; allDay: boolean } | null {
  const value = raw.trim();
  const dateOnly = /^(\d{4})(\d{2})(\d{2})$/.exec(value);
  if (dateOnly) {
    const [, y, m, d] = dateOnly;
    return {
      date: fromZonedTime(+y, +m, +d, 0, 0, 0, CAMPUS_TZ),
      allDay: true,
    };
  }
  const dateTime = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(Z)?$/.exec(value);
  if (!dateTime) return null;
  const [, y, m, d, h, mi, s, utc] = dateTime;
  if (utc) {
    return { date: new Date(Date.UTC(+y, +m - 1, +d, +h, +mi, +s)), allDay: false };
  }
  const tzid = /TZID=([^;:]+)/.exec(params)?.[1];
  return {
    date: fromZonedTime(+y, +m, +d, +h, +mi, +s, tzid || CAMPUS_TZ),
    allDay: false,
  };
}

export function parseIcs(text: string): RawEvent[] {
  const body = unfold(text);
  const events: RawEvent[] = [];

  for (const block of body.split("BEGIN:VEVENT").slice(1)) {
    const chunk = block.split("END:VEVENT")[0];
    const fields = new Map<string, { params: string; value: string }>();

    for (const line of chunk.split("\n")) {
      const colon = line.indexOf(":");
      if (colon === -1) continue;
      const head = line.slice(0, colon);
      const semi = head.indexOf(";");
      const name = (semi === -1 ? head : head.slice(0, semi)).trim().toUpperCase();
      if (!name) continue;
      fields.set(name, {
        params: semi === -1 ? "" : head.slice(semi),
        value: line.slice(colon + 1),
      });
    }

    const dtstart = fields.get("DTSTART");
    if (!dtstart) continue;
    const start = parseDateValue(dtstart.value, dtstart.params);
    if (!start) continue;

    const dtend = fields.get("DTEND");
    const end = dtend ? parseDateValue(dtend.value, dtend.params)?.date ?? null : null;

    events.push({
      uid: fields.get("UID")?.value.trim() ?? crypto.randomUUID(),
      summary: unescapeText(fields.get("SUMMARY")?.value ?? "").trim(),
      location: unescapeText(fields.get("LOCATION")?.value ?? "").trim(),
      description: unescapeText(fields.get("DESCRIPTION")?.value ?? "").trim(),
      start: start.date,
      end,
      allDay: start.allDay,
    });
  }

  return events.sort((a, b) => a.start.getTime() - b.start.getTime());
}
