import type { MetadataRoute } from "next";

/**
 * Web app manifest, so "Add to Home Screen" on iOS and Android installs this
 * with the right name and icon instead of a screenshot of the page.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "DTU Semester",
    short_name: "Semester",
    description: "Your DTU timetable, deadlines and campus map in one page.",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#ffffff",
    theme_color: "#990000",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
    ],
  };
}
