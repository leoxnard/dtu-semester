import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DTU Semester",
  description: "Your DTU timetable, deadlines and campus map in one place.",
  // Home-screen behaviour on iOS: full-screen, own title, no Safari chrome.
  appleWebApp: { capable: true, title: "Semester", statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = {
  themeColor: "#990000",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Apply the saved theme before first paint, so a dark-mode user does
            not get a white flash on every navigation. */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              `try{var t=localStorage.getItem("dtu-semester.theme");` +
              `if(t==="light"||t==="dark")document.documentElement.setAttribute("data-theme",t)}catch(e){}`,
          }}
        />
      </head>
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
