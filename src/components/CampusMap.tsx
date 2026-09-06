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
      `width:${size}px;height:${size}px;background:${bg};color:#fff;` +
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
export function CampusMap({ focus }: { focus: MapFocus | null }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const focusLayer = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [CAMPUS_CENTRE.lat, CAMPUS_CENTRE.lon],
      zoom: 15,
      scrollWheelZoom: false,
      zoomControl: true,
    });

    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);

    // Every DTU building as a quiet backdrop, so the campus is readable even
    // when nothing is selected.
    const backdrop = L.layerGroup().addTo(map);
    for (const b of ALL_BUILDINGS) {
      L.marker([b.lat, b.lon], { icon: marker(b, "quiet"), interactive: false, keyboard: false })
        .addTo(backdrop);
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
      }).addTo(layer);
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
