"use client";

import dynamic from "next/dynamic";
import type { MapFocus } from "./CampusMap";
import { appleMapsUrl, googleMapsUrl, type Building } from "@/lib/buildings";
import type { Room } from "@/lib/rooms";

// Leaflet touches `window` on import, so it must never run during SSR.
const CampusMap = dynamic(() => import("./CampusMap"), {
  ssr: false,
  loading: () => (
    <div
      className="flex h-full w-full items-center justify-center text-sm"
      style={{ background: "var(--surface-alt)", color: "var(--ink-soft)" }}
    >
      Loading campus map…
    </div>
  ),
});

export type MapSelection = {
  title: string;
  courseCode: string | null;
  rooms: Room[];
  focus: MapFocus;
  chosenRoomRaw: string | null;
  onChooseRoom: ((raw: string | null) => void) | null;
};

export function MapPanel({
  selection,
  pickedBuilding,
  onPickBuilding,
  fullscreen,
  onToggleFullscreen,
}: {
  selection: MapSelection | null;
  /** A building tapped straight on the map, with no event behind it. */
  pickedBuilding: Building | null;
  onPickBuilding: (building: Building | null) => void;
  fullscreen: boolean;
  onToggleFullscreen: () => void;
}) {
  const target: Building | null =
    pickedBuilding ?? selection?.focus.primary ?? selection?.focus.buildings[0] ?? null;
  const rooms = pickedBuilding ? [] : selection?.rooms ?? [];
  const multiple = rooms.length > 1;

  return (
    <section
      aria-labelledby="map-heading"
      className={fullscreen ? "fixed inset-0 z-[900] flex flex-col p-3" : undefined}
      // margin:0 matters: the parent's space-y-8 puts a 32px margin on this
      // section, and on a fixed element with top:0/bottom:0 that margin eats
      // 32px of height, leaving the page visible in the gap.
      style={fullscreen ? { background: "var(--bg)", margin: 0 } : undefined}
    >
      <div className="mb-2 flex items-center gap-3">
        <h2 id="map-heading" className="dtu-heading">Campus map</h2>
        <button
          onClick={onToggleFullscreen}
          className="dtu-focus ml-auto border px-3 py-1 text-xs font-medium"
          style={{ borderColor: "var(--rule-strong)" }}
        >
          {fullscreen ? "Exit full screen" : "Full screen"}
        </button>
      </div>

      <div
        className={
          fullscreen
            ? "dtu-panel grid min-h-0 flex-1 grid-rows-[minmax(0,1fr)_auto] lg:grid-cols-[minmax(0,1fr)_20rem] lg:grid-rows-1"
            : "dtu-panel grid lg:grid-cols-[minmax(0,1fr)_20rem]"
        }
      >
        <div className={fullscreen ? "min-h-0" : "min-h-[22rem] lg:min-h-[26rem]"}>
          <CampusMap
            focus={
              pickedBuilding
                ? { buildings: [pickedBuilding], primary: pickedBuilding, label: null }
                : selection?.focus ?? null
            }
            onSelectBuilding={onPickBuilding}
          />
        </div>

        <div
          className={
            fullscreen
              ? "max-h-[45dvh] overflow-y-auto border-t p-4 lg:max-h-none lg:border-l lg:border-t-0"
              : "border-t p-4 lg:border-l lg:border-t-0"
          }
          style={{ borderColor: "var(--rule)" }}
        >
          {pickedBuilding ? (
            <>
              <p className="text-sm font-medium leading-snug">Building {pickedBuilding.ref}</p>
              <p className="text-xs" style={{ color: "var(--ink-soft)" }}>Picked on the map</p>
              <button
                onClick={() => onPickBuilding(null)}
                className="dtu-focus mt-2 text-xs underline underline-offset-4"
                style={{ color: "var(--color-dtu-red)" }}
              >
                Back to the selected event
              </button>
            </>
          ) : !selection ? (
            <p className="text-sm" style={{ color: "var(--ink-soft)" }}>
              Select an event in the calendar above, or tap any building on the map, to get
              directions to it.
            </p>
          ) : (
            <>
              <p className="text-sm font-medium leading-snug">{selection.title}</p>
              {selection.courseCode && (
                <p className="text-xs tabular-nums" style={{ color: "var(--ink-soft)" }}>
                  {selection.courseCode}
                </p>
              )}

              {rooms.length === 0 ? (
                <p className="mt-3 text-sm" style={{ color: "var(--ink-soft)" }}>
                  No room in the feed for this event.
                </p>
              ) : (
                <div className="mt-3">
                  {multiple && (
                    <p className="dtu-heading mb-1.5">
                      {rooms.length} rooms booked — mark yours
                    </p>
                  )}
                  <ul className="space-y-1">
                    {rooms.map((room) => {
                      const chosen = selection.chosenRoomRaw === room.raw;
                      return (
                        <li key={room.raw}>
                          <button
                            disabled={!selection.onChooseRoom}
                            onClick={() => selection.onChooseRoom?.(chosen ? null : room.raw)}
                            className="dtu-focus flex w-full items-baseline gap-2 border px-2 py-1.5 text-left text-sm disabled:cursor-default"
                            style={{
                              borderColor: chosen ? "var(--color-dtu-red)" : "var(--rule)",
                              background: chosen ? "var(--surface-alt)" : undefined,
                            }}
                            aria-pressed={chosen}
                            title={selection.onChooseRoom ? (chosen ? "Unmark this room" : "Mark this as your room") : undefined}
                          >
                            <span className="font-medium tabular-nums">
                              {room.building ?? "?"}
                            </span>
                            <span style={{ color: "var(--ink-soft)" }}>
                              {room.room ?? room.raw}
                              {room.capacity ? ` · ${room.capacity} seats` : ""}
                            </span>
                            {chosen && (
                              <span
                                className="ml-auto shrink-0 text-[10px] font-medium uppercase tracking-wide"
                                style={{ color: "var(--color-dtu-red)" }}
                              >
                                Yours
                              </span>
                            )}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                  {multiple && !selection.chosenRoomRaw && (
                    <p className="mt-2 text-xs" style={{ color: "var(--ink-soft)" }}>
                      DTU books the whole room pool for this course. Marking yours pins the map to
                      it — stored in this browser only.
                    </p>
                  )}
                </div>
              )}

              {selection.focus.buildings.length === 0 && rooms.length > 0 && (
                <p className="mt-3 text-xs" style={{ color: "var(--ink-soft)" }}>
                  This building is not mapped in OpenStreetMap, so there is nothing to pin.
                </p>
              )}
            </>
          )}

          {/* Directions apply to whatever the map is pointing at, whether that
              came from a calendar event or from tapping a building. */}
          {target && (
            <div className="mt-4 flex flex-wrap gap-2">
              <a
                href={googleMapsUrl(target, `DTU Building ${target.ref}`)}
                target="_blank"
                rel="noreferrer noopener"
                className="dtu-focus px-3 py-1.5 text-xs font-medium text-white"
                style={{ background: "var(--color-dtu-red)" }}
              >
                Google Maps ↗
              </a>
              <a
                href={appleMapsUrl(target, `DTU Building ${target.ref}`)}
                target="_blank"
                rel="noreferrer noopener"
                className="dtu-focus border px-3 py-1.5 text-xs font-medium"
                style={{ borderColor: "var(--rule-strong)" }}
              >
                Apple Maps ↗
              </a>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
