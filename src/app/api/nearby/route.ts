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

    // Step 2: Query Overpass API for nearby amenities
    const overpassQuery = `
      [out:json][timeout:8];
      (
        node["railway"="station"]["station"="subway"](around:1000,${lat},${lon});
        node["shop"="supermarket"](around:600,${lat},${lon});
        node["leisure"="park"](around:800,${lat},${lon});
        way["leisure"="park"](around:800,${lat},${lon});
      );
      out center;
    `;

    let places: NearbyPlace[] = [];

    try {
      const overpassRes = await fetch("https://overpass-api.de/api/interpreter", {
        method: "POST",
        body: `data=${encodeURIComponent(overpassQuery)}`,
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        signal: AbortSignal.timeout(8000),
      });
      const overpassData = await overpassRes.json();

      const seen = new Set<string>();

      for (const el of overpassData.elements || []) {
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
          places.push({ type: "Métro", name, distance: dist });
        } else if (el.tags?.shop === "supermarket") {
          places.push({ type: "Commerce", name, distance: dist });
        } else if (el.tags?.leisure === "park") {
          places.push({ type: "Parc", name, distance: dist });
        }
      }

      places.sort((a, b) => (parseInt(a.distance) || 99) - (parseInt(b.distance) || 99));

      const metros = places.filter((p) => p.type === "Métro").slice(0, 3);
      const commerces = places.filter((p) => p.type === "Commerce").slice(0, 2);
      const parcs = places.filter((p) => p.type === "Parc").slice(0, 1);
      places = [...metros, ...commerces, ...parcs];
    } catch {
      // Overpass timeout — return just district, no nearby
    }

    return NextResponse.json({ places, district });
  } catch (error) {
    console.error("Nearby API error:", error);
    return NextResponse.json({ places: [], district: "", error: "Erreur de recherche" });
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
