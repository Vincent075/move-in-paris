import { NextRequest, NextResponse } from "next/server";
import { getMetroLines } from "@/data/paris-metro-lines";

// Use Node runtime (not edge) and ask Vercel for as much time as the plan allows.
// On hobby this is capped to 10s silently.
export const runtime = "nodejs";
export const maxDuration = 60;

interface NearbyPlace {
  type: string;
  name: string;
  distance: string;
  lines?: string[];
}

export async function GET(req: NextRequest) {
  const address = req.nextUrl.searchParams.get("address");
  if (!address) return NextResponse.json({ error: "Adresse requise" }, { status: 400 });

  try {
    // Step 1: Geocode — don't force "Paris" for suburbs
    const searchQuery = address.includes("Paris") || address.includes("paris")
      ? address + ", France"
      : address + ", Île-de-France, France";

    const geoRes = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(searchQuery)}&format=json&limit=1&addressdetails=1`,
      { headers: { "User-Agent": "MoveInParis/1.0" } }
    );
    const geoData = await geoRes.json();
    if (!geoData.length) return NextResponse.json({ places: [], district: "", error: "Adresse non trouvée" });

    const lat = parseFloat(geoData[0].lat);
    const lon = parseFloat(geoData[0].lon);

    // Extract district from geocode result directly
    let district = "";
    const geoAddr = geoData[0].address || {};
    if (geoAddr.postcode && geoAddr.postcode.startsWith("75")) {
      const arrNum = parseInt(geoAddr.postcode.slice(-2));
      district = `Paris ${arrNum}${arrNum === 1 ? "er" : "e"}`;
    } else if (geoAddr.city || geoAddr.town || geoAddr.village || geoAddr.municipality) {
      district = geoAddr.city || geoAddr.town || geoAddr.village || geoAddr.municipality;
    } else if (geoAddr.suburb) {
      district = geoAddr.suburb;
    }

    // Step 2: Query Overpass API for nearby amenities.
    // Vercel hobby kills the function at 10s, so we race 5 mirrors in parallel
    // with a tight per-endpoint timeout. First non-empty response wins.
    const overpassQuery = `[out:json][timeout:8];(node["railway"="station"]["station"="subway"](around:1000,${lat},${lon});node["shop"="supermarket"](around:600,${lat},${lon});node["leisure"="park"](around:800,${lat},${lon});way["leisure"="park"](around:800,${lat},${lon}););out center;`;

    const OVERPASS_ENDPOINTS = [
      "https://overpass-api.de/api/interpreter",
      "https://overpass.kumi.systems/api/interpreter",
      "https://overpass.private.coffee/api/interpreter",
      "https://overpass.osm.ch/api/interpreter",
      "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
    ];

    async function tryEndpoint(url: string): Promise<{ elements: unknown[]; source: string }> {
      const res = await fetch(url, {
        method: "POST",
        body: new URLSearchParams({ data: overpassQuery }).toString(),
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        signal: AbortSignal.timeout(8500),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status} from ${url}`);
      const data = (await res.json()) as { elements?: unknown[] };
      if (!data || !Array.isArray(data.elements) || data.elements.length === 0) {
        throw new Error(`empty from ${url}`);
      }
      return { elements: data.elements, source: url };
    }

    let overpassData: { elements: unknown[]; source: string } | null = null;
    let overpassErrors: string[] = [];
    try {
      overpassData = await Promise.any(OVERPASS_ENDPOINTS.map(tryEndpoint));
    } catch (err) {
      if (err instanceof AggregateError) {
        overpassErrors = err.errors.map((e) => (e instanceof Error ? e.message : String(e)));
      }
      overpassData = null;
    }

    // Surface diagnostics in the response so we can see why it failed in prod
    if (!overpassData) {
      console.error("All Overpass mirrors failed:", overpassErrors);
    } else {
      console.log(`Overpass source: ${overpassData.source}, elements: ${overpassData.elements.length}`);
    }

    let places: NearbyPlace[] = [];
    if (overpassData && overpassData.elements) {
      const seen = new Set<string>();
      for (const raw of overpassData.elements) {
        const el = raw as {
          tags?: Record<string, string>;
          lat?: number;
          lon?: number;
          center?: { lat: number; lon: number };
        };
        const name = el.tags?.name;
        if (!name || seen.has(name)) continue;
        seen.add(name);

        const elLat = el.lat || el.center?.lat;
        const elLon = el.lon || el.center?.lon;
        let dist = "";
        if (elLat && elLon) {
          const meters = haversine(lat, lon, elLat, elLon);
          const minutes = Math.max(1, Math.round(meters / 80));
          dist = `${minutes} min`;
        }

        if (el.tags?.railway === "station") {
          let lines = extractMetroLines(el.tags);
          if (lines.length === 0) lines = getMetroLines(name);
          places.push({ type: "Métro", name, distance: dist, ...(lines.length > 0 ? { lines } : {}) });
        } else if (el.tags?.shop === "supermarket") {
          places.push({ type: "Commerce", name, distance: dist });
        } else if (el.tags?.leisure === "park") {
          places.push({ type: "Parc", name, distance: dist });
        }
      }

      places.sort((a, b) => (parseInt(a.distance) || 99) - (parseInt(b.distance) || 99));
      const metros = places.filter((p) => p.type === "Métro").slice(0, 2);
      const commerces = places.filter((p) => p.type === "Commerce").slice(0, 1);
      const parcs = places.filter((p) => p.type === "Parc").slice(0, 1);
      places = [...metros, ...commerces, ...parcs];
    }

    return NextResponse.json({
      places,
      district,
      ...(overpassData ? {} : { overpassErrors, overpassSkipped: true }),
    });
  } catch (error) {
    console.error("Nearby API error:", error);
    return NextResponse.json({ places: [], district: "", error: "Erreur de recherche" });
  }
}

function extractMetroLines(tags: Record<string, string>): string[] {
  const candidates = [
    tags["ref"],
    tags["line"],
    tags["ref:FR:RATP"],
    tags["lines"],
  ].filter(Boolean) as string[];

  const lines = new Set<string>();

  for (const val of candidates) {
    // Split on common delimiters: semicolon, comma, space
    const parts = val.split(/[;,\s]+/).map((p) => p.trim()).filter(Boolean);
    for (const part of parts) {
      // Accept: 1-14, 3bis, 7bis, A, B (RER), with optional prefix "M" or "ligne"
      const clean = part.replace(/^(ligne|line|m|métro|metro)/i, "").trim();
      if (/^(1[0-4]|[1-9]|3bis|7bis|[AB])$/i.test(clean)) {
        lines.add(clean.toUpperCase().replace(/^([AB])$/, "RER $1"));
      }
    }
  }

  return Array.from(lines);
}

function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
