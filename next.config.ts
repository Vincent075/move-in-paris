import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // All migration-critical 301 redirects (old WordPress → new Next.js)
  // now live in src/proxy.ts to avoid the 2-hop chain caused by
  // Next.js's default trailing-slash normalization running before
  // `redirects()`. The proxy runs edge-side in a single 308 hop.
  // See move-in-paris-migration/redirections.csv for the full mapping.
};

export default nextConfig;
