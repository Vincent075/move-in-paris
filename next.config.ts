import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // All migration-critical 301 redirects (old WordPress → new Next.js)
  // live in src/proxy.ts. We disable Next.js's built-in trailing-slash
  // normalization so the proxy handles old URLs in a single 308 hop
  // instead of 2 (strip slash → then match). The proxy emits the
  // correct canonical URL (no trailing slash) directly.
  skipTrailingSlashRedirect: true,
  // Les photos de check-in (pièces jointes Airtable) sont réduites par l'optimiseur
  // d'images de Vercel (/_next/image) avant d'être assemblées dans le PDF : pas de
  // binaire natif à embarquer dans la fonction, et un poids maîtrisé (03/09/2026).
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.airtableusercontent.com" },
      { protocol: "https", hostname: "dl.airtable.com" },
    ],
    deviceSizes: [640, 750, 828, 1080, 1200, 1600, 1920, 2048, 3840],
  },
};

export default nextConfig;
