import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // The ICS token travels as a request body field; keep it out of any log line.
  logging: { fetches: { fullUrl: false } },
};

export default nextConfig;
