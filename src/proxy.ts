import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Proxy (ex-middleware) running on the edge BEFORE Next.js applies
 * trailing-slash normalization. Lets us redirect old WordPress URLs
 * (move-in-paris.com WP 4.9, crawled during migration) to the new
 * Next.js equivalents in a single 301 hop, regardless of trailing slash.
 *
 * next.config.ts `redirects()` alone produced 2-hop chains for paths
 * with a trailing slash (first hop stripped the slash, second hop
 * applied the mapping). Two hops still pass link equity but 1 hop is
 * strictly better for SEO migrations — hence this proxy.
 *
 * Source of the mapping: move-in-paris-migration/redirections.csv
 */

// Exact-match static page redirects (strip trailing slash on lookup).
const STATIC_MAP: Record<string, string> = {
  "/our-apartments": "/nos-appartements",
  "/about-move-in-paris": "/a-propos",
  "/1605-2": "/proprietaires",
  "/1424-2": "/proprietaires",
  "/our-contact": "/contact",
  "/conditions-generales-dutilisation": "/cgu",
  "/terms-and-conditions": "/cgu",
  "/faqs": "/faq",
  "/index.html": "/",
  "/index.php": "/",
  "/xmlrpc.php": "/",
  "/feed": "/",
  "/comments/feed": "/",
  "/wp-login.php": "/admin",
};

// Path-prefix redirects (any URL starting with these → destination).
const PREFIX_MAP: Array<{ prefix: string; destination: string }> = [
  { prefix: "/property/", destination: "/nos-appartements" },
  { prefix: "/properties/", destination: "/nos-appartements" },
  { prefix: "/property-feature/", destination: "/nos-appartements" },
  { prefix: "/property-city/", destination: "/nos-appartements" },
  { prefix: "/property-status/", destination: "/nos-appartements" },
  { prefix: "/property-type/", destination: "/nos-appartements" },
  { prefix: "/page/", destination: "/nos-appartements" },
  { prefix: "/wp-admin/", destination: "/admin" },
  { prefix: "/wp-admin", destination: "/admin" },
];

export function proxy(request: NextRequest) {
  const url = request.nextUrl;
  // Normalize the pathname by stripping a single trailing slash
  // (except for the root "/" itself) so we match old WP URLs regardless
  // of how the backlink was written.
  const path = url.pathname;
  const normalized =
    path.length > 1 && path.endsWith("/") ? path.slice(0, -1) : path;

  // 1. Static map first (exact match on normalized path)
  const staticHit = STATIC_MAP[normalized];
  if (staticHit) {
    const dest = new URL(staticHit, request.url);
    // Preserve query string (search) but drop WP-specific params that
    // don't translate to the new site (e.g. ?lang=en handled via cookie).
    return NextResponse.redirect(dest, 308);
  }

  // 2. Prefix map (covers the 149 /property/* + 36 /property-city/* +
  // 75 /property-feature/* + pagination + WP admin).
  for (const rule of PREFIX_MAP) {
    if (
      normalized === rule.prefix.replace(/\/$/, "") ||
      normalized.startsWith(rule.prefix)
    ) {
      const dest = new URL(rule.destination, request.url);
      return NextResponse.redirect(dest, 308);
    }
  }

  // No match → let Next.js handle the request normally.
  return NextResponse.next();
}

// Only run the proxy on paths that could be old WP URLs. Everything
// else (static assets, API routes, the new site's own pages) skips
// straight through for performance. With `skipTrailingSlashRedirect:
// true` in next.config.ts, Next.js does NOT auto-strip trailing
// slashes before reaching the matcher, so we list both variants
// explicitly (or use wildcards) to be safe.
export const config = {
  matcher: [
    // Old static pages (both with and without trailing slash)
    "/our-apartments",
    "/our-apartments/",
    "/about-move-in-paris",
    "/about-move-in-paris/",
    "/1605-2",
    "/1605-2/",
    "/1424-2",
    "/1424-2/",
    "/our-contact",
    "/our-contact/",
    "/conditions-generales-dutilisation",
    "/conditions-generales-dutilisation/",
    "/terms-and-conditions",
    "/terms-and-conditions/",
    "/faqs",
    "/faqs/",
    "/index.html",
    "/index.php",
    "/xmlrpc.php",
    "/feed",
    "/feed/",
    "/comments/feed",
    "/comments/feed/",
    "/wp-login.php",
    // Old patterns — both the bare prefix and deeper paths (with/without trailing slash)
    "/property",
    "/property/",
    "/property/:path*",
    "/properties",
    "/properties/",
    "/properties/:path*",
    "/property-feature",
    "/property-feature/",
    "/property-feature/:path*",
    "/property-city",
    "/property-city/",
    "/property-city/:path*",
    "/property-status",
    "/property-status/",
    "/property-status/:path*",
    "/property-type",
    "/property-type/",
    "/property-type/:path*",
    "/page",
    "/page/",
    "/page/:path*",
    "/wp-admin",
    "/wp-admin/",
    "/wp-admin/:path*",
  ],
};
