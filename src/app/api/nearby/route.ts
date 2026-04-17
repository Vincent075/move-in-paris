import { NextRequest, NextResponse } from "next/server";

interface NearbyPlace {
  type: string;
  name: string;
  distance: string;
}

export async function GET(req: NextRequest) {
  const address = req.nextUrl.searchParams.get("address");
  if (!address) return NextResponse.json({ error: "Adresse requise" }, { status: 400 });

  try {
    // Step 1: Geocode with Nominatim (free, no API key)
    const geoRes = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address + ", Paris, France")}&format=json&limit=1`,
      { headers: { "User-Agent": "MoveInParis/1.0" } }
    );
    const geoData = await geoRes.json();
    if (!geoData.length) return NextResponse.json({ places: [] });

    const lat = parseFloat(geoData[0].lat);
    const lon = parseFloat(geoData[0].lon);

    // Step 2: Query Overpass API for nearby amenities (500m radius)
    const overpassQuery = `
      [out:json][timeout:10];
      (
        node["railway"="station"]["station"="subway"](around:800,${lat},${lon});
        node["railway"="station"]["train"="yes"](around:1000,${lat},${lon});
        node["shop"="supermarket"](around:500,${lat},${lon});
        node["leisure"="park"](around:600,${lat},${lon});
        way["leisure"="park"](around:600,${lat},${lon});
      );
      out body;
    `;

    const overpassRes = await fetch("https://overpass-api.de/api/interpreter", {
      method: "POST",
      body: `data=${encodeURIComponent(overpassQuery)}`,
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });
    const overpassData = await overpassRes.json();

    const places: NearbyPlace[] = [];
    const seen = new Set<string>();

    for (const el of overpassData.elements || []) {
      const name = el.tags?.name;
      if (!name || seen.has(name)) continue;
      seen.add(name);

      // Calculate distance
      const elLat = el.lat || el.center?.lat;
      const elLon = el.lon || el.center?.lon;
      let dist = "";
      if (elLat && elLon) {
        const meters = haversine(lat, lon, elLat, elLon);
        const minutes = Math.max(1, Math.round(meters / 80)); // ~80m/min walking
        dist = `${minutes} min`;
      }

      if (el.tags?.railway === "station") {
        const line = el.tags?.["ref:FR:RATP"] || el.tags?.line || "";
        const displayName = line ? `${name} (${line})` : name;
        places.push({ type: "Métro", name: displayName, distance: dist });
      } else if (el.tags?.shop === "supermarket") {
        places.push({ type: "Commerce", name, distance: dist });
      } else if (el.tags?.leisure === "park") {
        places.push({ type: "Parc", name, distance: dist });
      }
    }

    // Sort by distance
    places.sort((a, b) => {
      const da = parseInt(a.distance) || 99;
      const db = parseInt(b.distance) || 99;
      return da - db;
    });

    // Limit results
    const metros = places.filter((p) => p.type === "Métro").slice(0, 3);
    const commerces = places.filter((p) => p.type === "Commerce").slice(0, 2);
    const parcs = places.filter((p) => p.type === "Parc").slice(0, 1);

    return NextResponse.json({ places: [...metros, ...commerces, ...parcs] });
  } catch (error) {
    console.error("Nearby API error:", error);
    return NextResponse.json({ places: [] });
  }
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
