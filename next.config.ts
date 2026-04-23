import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // All migration-critical 301 redirects (old WordPress → new Next.js)
  // live in src/proxy.ts. We disable Next.js's built-in trailing-slash
  // normalization so the proxy handles old URLs in a single 308 hop
  // instead of 2 (strip slash → then match). The proxy emits the
  // correct canonical URL (no trailing slash) directly.
  skipTrailingSlashRedirect: true,
};

export default nextConfig;
