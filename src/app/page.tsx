"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Onboarding } from "@/components/Onboarding";
import { Header } from "@/components/Header";
import { WeekGrid } from "@/components/WeekGrid";
import { Agenda } from "@/components/Agenda";
import { MapPanel, type MapSelection } from "@/components/MapPanel";
import { CourseModal, seriesForCourse } from "@/components/CourseModal";
import { TimetableFullscreen } from "@/components/TimetableFullscreen";
import { findBuilding, type Building } from "@/lib/buildings";
import {
  useDoneEvents, useFeedUrl, useHiddenSeries, useIsNarrow, useLastView, useNicknames,
  useRoomChoices, useSkippedOccurrences,
} from "@/lib/store";
import { seriesKey } from "@/lib/series";
import type { Course, Schedule, ScheduleEvent } from "@/lib/schedule";
import type { Room } from "@/lib/rooms";

type Loaded = { schedule: Schedule; fetchedAt: number; warning?: string };

export default function Page() {
  const { feedUrl, setFeedUrl, ready } = useFeedUrl();
  const { choices, choose } = useRoomChoices();
  const { ids: done, toggle: toggleDone, prune: pruneDone } = useDoneEvents();
  const { ids: skipped, toggle: toggleSkipped, prune: pruneSkipped } = useSkippedOccurrences();
  const { ids: hiddenSeries, toggle: toggleSeries } = useHiddenSeries();
  const { view, setView, setLaunchView, ready: viewReady } = useLastView();
  const { nicknames, setNickname } = useNicknames();
  const isNarrow = useIsNarrow();

  /** Short name where the full title would not fit, full title everywhere else. */
  const displayName = useCallback(
    (course: Course) => (isNarrow && nicknames[course.code]) || course.title,
    [isNarrow, nicknames],
  );

  const [data, setData] = useState<Loaded | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [selectedEventUid, setSelectedEventUid] = useState<string | null>(null);
  const [modalCourse, setModalCourse] = useState<Course | null>(null);
  // Map full screen is deliberately not remembered across launches: only the
  // timetable earns that, because it is the thing you glance at every morning.
  const [mapFullscreen, setMapFullscreen] = useState(false);
  const [pickedBuilding, setPickedBuilding] = useState<Building | null>(null);

  /**
   * Opening a course's details counts as being somewhere other than the
   * full-screen timetable, so the next launch lands on the main page. The
   * current screen is left alone — tapping a course from full screen should
   * not yank the timetable away behind the dialog.
   */
  const openCourse = useCallback(
    (course: Course) => {
      setModalCourse(course);
      setLaunchView("main");
    },
    [setLaunchView],
  );

  const load = useCallback(
    async (url: string, refresh = false) => {
      setBusy(true);
      setError(null);
      try {
        const res = await fetch("/api/calendar", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url, refresh }),
        });
        const body = await res.json();
        if (!res.ok) throw new Error(body.error ?? "Could not load the calendar.");
        setData({ schedule: body.schedule, fetchedAt: body.fetchedAt, warning: body.warning });
        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not load the calendar.");
        return false;
      } finally {
        setBusy(false);
      }
    },
    [],
  );

  useEffect(() => {
    if (ready && feedUrl) void load(feedUrl);
  }, [ready, feedUrl, load]);

  useEffect(() => {
    if (!mapFullscreen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMapFullscreen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mapFullscreen]);

  // Stop the page behind a full-screen view from scrolling under it.
  useEffect(() => {
    const locked = mapFullscreen || view === "fullscreen";
    if (!locked) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [mapFullscreen, view]);

  // Per-occurrence state is keyed by UID, which only exists while the event is
  // in the feed. Drop the rest so it cannot pile up semester after semester.
  useEffect(() => {
    if (!data) return;
    const live = new Set(data.schedule.events.map((e) => e.uid));
    pruneDone(live);
    pruneSkipped(live);
  }, [data, pruneDone, pruneSkipped]);

  /** What the calendar actually shows: the feed minus anything hidden. */
  const visibleEvents = useMemo(() => {
    if (!data) return [];
    return data.schedule.events.filter(
      (e) => !skipped.has(e.uid) && !hiddenSeries.has(seriesKey(e)),
    );
  }, [data, skipped, hiddenSeries]);

  const selectedEvent = useMemo(
    () => visibleEvents.find((e) => e.uid === selectedEventUid) ?? null,
    [visibleEvents, selectedEventUid],
  );

  /**
   * Turns whichever event is selected into a map focus. A course whose room the
   * user has marked pins only that room; otherwise every booked building shows
   * and the map frames all of them.
   */
  const selection: MapSelection | null = useMemo(() => {
    if (!selectedEvent) return null;

    const rooms: Room[] = selectedEvent.rooms;
    const chosenRaw = selectedEvent.courseCode ? choices[selectedEvent.courseCode] ?? null : null;
    const chosenRoom = rooms.find((r) => r.raw === chosenRaw) ?? null;

    const buildings = [
      ...new Map(
        rooms
          .map((r) => findBuilding(r.building))
          .filter((b): b is Building => b !== null)
          .map((b) => [b.ref, b]),
      ).values(),
    ];

    return {
      title: selectedEvent.title,
      courseCode: selectedEvent.courseCode,
      rooms,
      chosenRoomRaw: chosenRaw,
      onChooseRoom: selectedEvent.courseCode
        ? (raw) => choose(selectedEvent.courseCode as string, raw)
        : null,
      focus: {
        buildings: chosenRoom ? buildings.filter((b) => b.ref === findBuilding(chosenRoom.building)?.ref) : buildings,
        primary: chosenRoom ? findBuilding(chosenRoom.building) : null,
        label: chosenRoom?.room ?? null,
      },
    };
  }, [selectedEvent, choices, choose]);

  if (!ready || !viewReady) return null;

  if (!feedUrl) {
    return (
      <Onboarding
        error={error}
        busy={busy}
        onSubmit={async (url) => {
          if (await load(url)) setFeedUrl(url);
        }}
      />
    );
  }

  if (!data) {
    return (
      <main className="mx-auto max-w-2xl px-5 py-20 text-center">
        {error ? (
          <>
            <p className="text-sm" style={{ color: "var(--color-dtu-red)" }}>{error}</p>
            <div className="mt-4 flex justify-center gap-3">
              <button onClick={() => void load(feedUrl, true)} className="dtu-focus px-4 py-2 text-sm font-medium text-white" style={{ background: "var(--color-dtu-red)" }}>
                Try again
              </button>
              <button onClick={() => setFeedUrl(null)} className="dtu-focus border px-4 py-2 text-sm" style={{ borderColor: "var(--rule-strong)" }}>
                Use a different link
              </button>
            </div>
          </>
        ) : (
          <p className="text-sm" style={{ color: "var(--ink-soft)" }}>Loading your semester…</p>
        )}
      </main>
    );
  }

  const { schedule } = data;

  if (view === "fullscreen") {
    return (
      <>
        <TimetableFullscreen
          courses={schedule.courses}
          term={schedule.semester.term}
          semesterLabel={schedule.semester.label}
          week={schedule.week}
          onSelectCourse={openCourse}
          onClose={() => setView("main")}
          displayName={displayName}
        />
        {modalCourse && (
          <CourseModal
            course={modalCourse}
            series={seriesForCourse(schedule.events, modalCourse.code, hiddenSeries)}
            onToggleSeries={(key, hidden) => toggleSeries(key, hidden)}
            nickname={nicknames[modalCourse.code] ?? ""}
            onNicknameChange={(value) => setNickname(modalCourse.code, value)}
            onClose={() => setModalCourse(null)}
          />
        )}
      </>
    );
  }

  return (
    <>
      <Header
        semesterLabel={schedule.semester.label}
        week={schedule.week}
        fetchedAt={data.fetchedAt}
        refreshing={busy}
        onRefresh={() => void load(feedUrl, true)}
        onForget={() => {
          setFeedUrl(null);
          setData(null);
          setSelectedEventUid(null);
        }}
      />

      <main className="mx-auto max-w-6xl space-y-8 px-4 py-6 sm:px-6">
        {data.warning && (
          <p className="border p-2.5 text-sm" style={{ borderColor: "var(--color-dtu-red)", color: "var(--color-dtu-red)" }}>
            {data.warning}
          </p>
        )}

        {schedule.courses.length === 0 && (
          <p className="border p-3 text-sm" style={{ borderColor: "var(--rule)", color: "var(--ink-soft)" }}>
            No courses found for {schedule.semester.label}. If you subscribed to a single course
            rather than “All Courses”, regenerate the link in DTU Learn.
          </p>
        )}

        <WeekGrid
          courses={schedule.courses}
          term={schedule.semester.term}
          onSelectCourse={openCourse}
          onFullscreen={() => setView("fullscreen")}
          displayName={displayName}
        />

        <Agenda
          events={visibleEvents}
          courses={schedule.courses}
          courseName={(code) => {
            const course = schedule.courses.find((c) => c.code === code);
            return course ? displayName(course) : null;
          }}
          selectedUid={selectedEventUid}
          onSelectEvent={(e) => {
            setPickedBuilding(null);
            setSelectedEventUid((prev) => (prev === e.uid ? null : e.uid));
          }}
          done={done}
          onToggleDone={toggleDone}
          onHideOccurrence={(uid) => {
            toggleSkipped(uid, true);
            setSelectedEventUid(null);
          }}
          onHideSeries={(key) => {
            toggleSeries(key, true);
            setSelectedEventUid(null);
          }}
          hiddenSeriesCount={hiddenSeries.size}
        />

        <MapPanel
          selection={selection}
          pickedBuilding={pickedBuilding}
          onPickBuilding={setPickedBuilding}
          fullscreen={mapFullscreen}
          onToggleFullscreen={() => setMapFullscreen((v) => !v)}
        />

        <footer className="border-t pt-4 text-xs leading-relaxed" style={{ borderColor: "var(--rule)", color: "var(--ink-soft)" }}>
          A student project. Not affiliated with or endorsed by DTU. Map data ©
          OpenStreetMap contributors. Course statistics from the DTU Course Analyzer. Your
          calendar link stays in this browser.
        </footer>
      </main>

      {modalCourse && (
        <CourseModal
          course={modalCourse}
          series={seriesForCourse(schedule.events, modalCourse.code, hiddenSeries)}
          onToggleSeries={(key, hidden) => toggleSeries(key, hidden)}
          nickname={nicknames[modalCourse.code] ?? ""}
          onNicknameChange={(value) => setNickname(modalCourse.code, value)}
          onClose={() => setModalCourse(null)}
        />
      )}
    </>
  );
}
