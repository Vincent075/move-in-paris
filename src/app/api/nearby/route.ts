import { NextRequest, NextResponse } from "next/server";
import { getMetroLines } from "@/data/paris-metro-lines";

// Overpass can take up to ~20s; keep the route itself generous so a
// race across mirrors has time to resolve without Vercel killing us.
export const maxDuration = 25;

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
    // The public overpass-api.de endpoint is notoriously overloaded (504s),
    // so we race multiple mirrors and take the first non-empty response.
    const overpassQuery = `
      [out:json][timeout:20];
      (
        node["railway"="station"]["station"="subway"](around:1000,${lat},${lon});
        node["shop"="supermarket"](around:600,${lat},${lon});
        node["leisure"="park"](around:800,${lat},${lon});
        way["leisure"="park"](around:800,${lat},${lon});
      );
      out center;
    `;

    const OVERPASS_ENDPOINTS = [
      "https://overpass-api.de/api/interpreter",
      "https://overpass.kumi.systems/api/interpreter",
      "https://overpass.private.coffee/api/interpreter",
    ];

    async function tryEndpoint(url: string): Promise<{ elements: unknown[] }> {
      const res = await fetch(url, {
        method: "POST",
        body: `data=${encodeURIComponent(overpassQuery)}`,
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        signal: AbortSignal.timeout(22000),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (!data || !Array.isArray(data.elements) || data.elements.length === 0) {
        throw new Error("empty");
      }
      return data as { elements: unknown[] };
    }

    let overpassData: { elements?: unknown[] } | null = null;
    try {
      // Race mirrors — first non-empty response wins, others aborted
      overpassData = await Promise.any(OVERPASS_ENDPOINTS.map(tryEndpoint));
    } catch {
      overpassData = null;
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

    return NextResponse.json({ places, district });
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
