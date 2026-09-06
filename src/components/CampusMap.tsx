"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { ALL_BUILDINGS, CAMPUS_CENTRE, type Building } from "@/lib/buildings";

export type MapFocus = {
  buildings: Building[];
  /** The one the user marked as theirs, if any — it gets the solid marker. */
  primary: Building | null;
  label: string | null;
};

function marker(building: Building, tone: "primary" | "secondary" | "quiet") {
  const size = tone === "quiet" ? 20 : 30;
  const bg = tone === "primary" ? "#990000" : tone === "secondary" ? "#2F3EEA" : "rgba(0,0,0,.35)";
  return L.divIcon({
    className: "",
    html:
      `<div style="display:flex;align-items:center;justify-content:center;` +
      `width:${size}px;height:${size}px;background:${bg};color:#fff;cursor:pointer;` +
      `font:500 ${tone === "quiet" ? 10 : 12}px Arial,sans-serif;` +
      `border:1px solid rgba(255,255,255,.85)">${building.ref}</div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

/**
 * Row 3: the campus map. Building footprints come from OpenStreetMap and are
 * baked into the image at build time, so this never calls Overpass at runtime.
 *
 * Precision limit worth knowing: OSM knows "building 208", not "auditorium 54
 * on the first floor". The pin gets you to the door; the room number next to it
 * gets you the rest of the way.
 */
export type Located = { lat: number; lon: number; accuracy: number };

export function CampusMap({
  focus,
  onSelectBuilding,
  location,
}: {
  focus: MapFocus | null;
  onSelectBuilding: (building: Building) => void;
  /** The viewer's own position, when they have asked for it. */
  location: Located | null;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const focusLayer = useRef<L.LayerGroup | null>(null);
  const meLayer = useRef<L.LayerGroup | null>(null);

  // The map is built once; routing clicks through a ref keeps the handler
  // current without tearing the whole map down when the callback changes.
  const selectRef = useRef(onSelectBuilding);
  useEffect(() => {
    selectRef.current = onSelectBuilding;
  }, [onSelectBuilding]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [CAMPUS_CENTRE.lat, CAMPUS_CENTRE.lon],
      zoom: 15,
      scrollWheelZoom: false,
      zoomControl: false,
    });

    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);

    // Every DTU building as a quiet backdrop, so the campus is readable even
    // when nothing is selected — and clickable, so you can get directions to a
    // building you have no teaching in.
    const backdrop = L.layerGroup().addTo(map);
    for (const b of ALL_BUILDINGS) {
      L.marker([b.lat, b.lon], {
        icon: marker(b, "quiet"),
        keyboard: true,
        title: `Building ${b.ref}`,
        alt: `Building ${b.ref}`,
      })
        .addTo(backdrop)
        .on("click", () => selectRef.current(b));
    }

    focusLayer.current = L.layerGroup().addTo(map);
    mapRef.current = map;

    // Leaflet caches its container size, so it renders half a map after any
    // resize it did not cause — entering full screen, a phone rotating, the
    // sidebar reflowing. Watching the element covers all of them at once.
    const observer = new ResizeObserver(() => map.invalidateSize({ animate: false }));
    observer.observe(containerRef.current);

    return () => {
      observer.disconnect();
      map.remove();
      mapRef.current = null;
      focusLayer.current = null;
    };
  }, []);

  // The viewer's own position: a dot plus the accuracy circle, so a vague fix
  // reads as vague rather than as false precision.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    meLayer.current?.remove();
    meLayer.current = null;
    if (!location) return;

    const group = L.layerGroup().addTo(map);
    L.circle([location.lat, location.lon], {
      radius: Math.max(location.accuracy, 5),
      color: "#2F3EEA", weight: 1, fillColor: "#2F3EEA", fillOpacity: 0.12,
    }).addTo(group);
    L.marker([location.lat, location.lon], {
      icon: L.divIcon({
        className: "",
        html:
          '<div style="width:14px;height:14px;border-radius:50%;background:#2F3EEA;' +
          'border:2px solid #fff;box-shadow:0 0 0 1px rgba(0,0,0,.25)"></div>',
        iconSize: [14, 14],
        iconAnchor: [7, 7],
      }),
      interactive: false,
      keyboard: false,
    }).addTo(group);
    meLayer.current = group;
  }, [location]);

  useEffect(() => {
    const map = mapRef.current;
    const layer = focusLayer.current;
    if (!map || !layer) return;

    layer.clearLayers();

    if (!focus || focus.buildings.length === 0) {
      map.setView([CAMPUS_CENTRE.lat, CAMPUS_CENTRE.lon], 15, { animate: true });
      return;
    }

    for (const b of focus.buildings) {
      const isPrimary = focus.primary?.ref === b.ref;
      const pin = L.marker([b.lat, b.lon], {
        icon: marker(b, isPrimary || focus.buildings.length === 1 ? "primary" : "secondary"),
        zIndexOffset: isPrimary ? 1000 : 0,
        title: `Building ${b.ref}`,
      })
        .addTo(layer)
        .on("click", () => selectRef.current(b));
      if (focus.label) pin.bindTooltip(focus.label, { direction: "top", offset: [0, -16] });
    }

    const target = focus.primary ?? focus.buildings[0];
    if (focus.buildings.length === 1 || focus.primary) {
      map.setView([target.lat, target.lon], 18, { animate: true });
    } else {
      map.fitBounds(L.latLngBounds(focus.buildings.map((b) => [b.lat, b.lon] as [number, number])), {
        padding: [48, 48],
        maxZoom: 18,
      });
    }
  }, [focus]);

  return <div ref={containerRef} className="h-full w-full" style={{ minHeight: "22rem" }} />;
}

export default CampusMap;
