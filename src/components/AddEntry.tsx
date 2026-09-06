"use client";

import { useState } from "react";
import { Dialog } from "./Dialog";
import type { Course } from "@/lib/schedule";
import type { CustomEntry } from "@/lib/store";

/**
 * Adding something the DTU feed does not know about — a reading group, a
 * supervisor meeting, a task you set yourself.
 *
 * Entries live in this browser like everything else, and are merged into the
 * calendar alongside the feed rather than kept in a separate list, because the
 * whole point is to see one timeline.
 */
export function AddEntry({
  courses,
  onAdd,
  onClose,
}: {
  courses: Course[];
  onAdd: (entry: Omit<CustomEntry, "id">) => void;
  onClose: () => void;
}) {
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Copenhagen",
    year: "numeric", month: "2-digit", day: "2-digit",
  }).format(new Date());

  const [kind, setKind] = useState<CustomEntry["kind"]>("task");
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(today);
  const [time, setTime] = useState("");
  const [courseCode, setCourseCode] = useState("");
  const [location, setLocation] = useState("");

  const field = {
    borderColor: "var(--rule-strong)",
    background: "var(--surface)",
    color: "var(--ink)",
  };

  return (
    <Dialog
      label="Add an entry"
      onClose={onClose}
      header={<h2 className="text-lg font-medium">Add to the calendar</h2>}
    >
      <form
        id="add-entry-form"
        onSubmit={(e) => {
          e.preventDefault();
          if (!title.trim()) return;
          onAdd({
            kind,
            title: title.trim(),
            date,
            // A task with no time is due at the end of that day, which is what
            // "hand in on the 12th" actually means.
            time: time || (kind === "task" ? "23:59" : null),
            courseCode: courseCode || null,
            location: location.trim() || null,
          });
          onClose();
        }}
      >
        <div className="flex border" style={{ borderColor: "var(--rule-strong)" }} role="group" aria-label="Type">
          {(["task", "event"] as const).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setKind(option)}
              className="dtu-focus flex-1 py-1.5 text-sm capitalize"
              style={{
                background: kind === option ? "var(--color-dtu-red)" : "transparent",
                color: kind === option ? "#fff" : "var(--ink-soft)",
              }}
              aria-pressed={kind === option}
            >
              {option}
            </button>
          ))}
        </div>
        <p className="mt-1 text-xs" style={{ color: "var(--ink-soft)" }}>
          {kind === "task"
            ? "Something to hand in or finish. Can be ticked off."
            : "Something that happens at a time, like a meeting."}
        </p>

        <label htmlFor="entry-title" className="dtu-heading mt-4 block">Title</label>
        <input
          id="entry-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          maxLength={120}
          autoFocus
          placeholder={kind === "task" ? "Hand in report 2" : "Study group"}
          className="dtu-focus mt-1 w-full border px-2 py-1.5 text-sm outline-none"
          style={field}
        />

        <div className="mt-3 grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="entry-date" className="dtu-heading block">Date</label>
            <input
              id="entry-date" type="date" value={date} required
              onChange={(e) => setDate(e.target.value)}
              className="dtu-focus mt-1 w-full border px-2 py-1.5 text-sm outline-none"
              style={field}
            />
          </div>
          <div>
            <label htmlFor="entry-time" className="dtu-heading block">
              Time <span style={{ textTransform: "none" }}>(optional)</span>
            </label>
            <input
              id="entry-time" type="time" value={time}
              onChange={(e) => setTime(e.target.value)}
              className="dtu-focus mt-1 w-full border px-2 py-1.5 text-sm outline-none"
              style={field}
            />
          </div>
        </div>

        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="entry-course" className="dtu-heading block">
              Course <span style={{ textTransform: "none" }}>(optional)</span>
            </label>
            <select
              id="entry-course" value={courseCode}
              onChange={(e) => setCourseCode(e.target.value)}
              className="dtu-focus mt-1 w-full border px-2 py-1.5 text-sm outline-none"
              style={field}
            >
              <option value="">None</option>
              {courses.map((c) => (
                <option key={c.code} value={c.code}>{c.code} {c.title}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="entry-room" className="dtu-heading block">
              Building <span style={{ textTransform: "none" }}>(optional)</span>
            </label>
            <input
              id="entry-room" value={location} inputMode="numeric"
              onChange={(e) => setLocation(e.target.value)}
              placeholder="306"
              className="dtu-focus mt-1 w-full border px-2 py-1.5 text-sm outline-none"
              style={field}
            />
          </div>
        </div>

        <div className="mt-5 flex gap-2">
          <button
            type="submit"
            disabled={!title.trim()}
            className="dtu-focus px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
            style={{ background: "var(--color-dtu-red)" }}
          >
            Add
          </button>
          <button type="button" onClick={onClose} className="dtu-focus border px-4 py-2 text-sm" style={{ borderColor: "var(--rule-strong)" }}>
            Cancel
          </button>
        </div>
      </form>
    </Dialog>
  );
}
