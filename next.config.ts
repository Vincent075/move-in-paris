import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 301 redirects from the old WordPress site (move-in-paris.com WP 4.9)
  // to the new Next.js site. Preserves SEO juice by mapping every known
  // old URL pattern to its closest equivalent on the new site.
  // Source of mapping: crawl of the old site (500 URLs, 297 live pages)
  // performed during the migration — see move-in-paris-migration/redirections.csv.
  async redirects() {
    return [
      // ===== Static pages =====
      { source: "/our-apartments", destination: "/nos-appartements", permanent: true },
      { source: "/our-apartments/", destination: "/nos-appartements", permanent: true },
      { source: "/about-move-in-paris", destination: "/a-propos", permanent: true },
      { source: "/about-move-in-paris/", destination: "/a-propos", permanent: true },
      { source: "/1605-2", destination: "/proprietaires", permanent: true },
      { source: "/1605-2/", destination: "/proprietaires", permanent: true },
      { source: "/1424-2", destination: "/proprietaires", permanent: true },
      { source: "/1424-2/", destination: "/proprietaires", permanent: true },
      { source: "/our-contact", destination: "/contact", permanent: true },
      { source: "/our-contact/", destination: "/contact", permanent: true },
      { source: "/conditions-generales-dutilisation", destination: "/cgu", permanent: true },
      { source: "/conditions-generales-dutilisation/", destination: "/cgu", permanent: true },
      { source: "/terms-and-conditions", destination: "/cgu", permanent: true },
      { source: "/terms-and-conditions/", destination: "/cgu", permanent: true },
      { source: "/faqs", destination: "/faq", permanent: true },
      { source: "/faqs/", destination: "/faq", permanent: true },

      // ===== Old apartment details =====
      // All /property/<old-slug>/ go to the listings page (the new slugs
      // don't map 1:1 since we reimported apartments from scratch).
      { source: "/property/:slug*", destination: "/nos-appartements", permanent: true },
      { source: "/properties/:slug*", destination: "/nos-appartements", permanent: true },

      // ===== Old taxonomies / filter pages =====
      { source: "/property-feature/:slug*", destination: "/nos-appartements", permanent: true },
      { source: "/property-city/:slug*", destination: "/nos-appartements", permanent: true },
      { source: "/property-status/:slug*", destination: "/nos-appartements", permanent: true },
      { source: "/property-type/:slug*", destination: "/nos-appartements", permanent: true },

      // ===== Pagination =====
      { source: "/page/:n*", destination: "/nos-appartements", permanent: true },

      // ===== WordPress internals / feeds =====
      { source: "/wp-admin", destination: "/admin", permanent: false },
      { source: "/wp-admin/:path*", destination: "/admin", permanent: false },
      { source: "/wp-login.php", destination: "/admin", permanent: false },
      { source: "/xmlrpc.php", destination: "/", permanent: false },
      { source: "/feed", destination: "/", permanent: false },
      { source: "/feed/", destination: "/", permanent: false },
      { source: "/comments/feed", destination: "/", permanent: false },
      { source: "/comments/feed/", destination: "/", permanent: false },

      // ===== Homepage variants =====
      { source: "/index.html", destination: "/", permanent: true },
      { source: "/index.php", destination: "/", permanent: true },
    ];
  },
};

export default nextConfig;
