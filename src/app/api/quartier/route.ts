import { NextRequest, NextResponse } from "next/server";
import shapes from "@/data/encadrement/shapes.json";

type Geometry =
  | { type: "Polygon"; coordinates: number[][][] }
  | { type: "MultiPolygon"; coordinates: number[][][][] };

type Shape = { id: number; nom: string; geometry: Geometry };

// Ray casting point-in-polygon for a single ring
function pointInRing(lon: number, lat: number, ring: number[][]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    const intersect =
      yi > lat !== yj > lat &&
      lon < ((xj - xi) * (lat - yi)) / (yj - yi + 1e-12) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

function pointInPolygon(lon: number, lat: number, rings: number[][][]): boolean {
  if (rings.length === 0) return false;
  const [outer, ...holes] = rings;
  if (!pointInRing(lon, lat, outer)) return false;
  for (const hole of holes) {
    if (pointInRing(lon, lat, hole)) return false;
  }
  return true;
}

function pointInGeometry(lon: number, lat: number, geom: Geometry): boolean {
  if (geom.type === "Polygon") {
    return pointInPolygon(lon, lat, geom.coordinates);
  }
  if (geom.type === "MultiPolygon") {
    return geom.coordinates.some((poly) => pointInPolygon(lon, lat, poly));
  }
  return false;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const lat = parseFloat(searchParams.get("lat") || "");
  const lon = parseFloat(searchParams.get("lon") || "");

  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return NextResponse.json({ error: "Invalid lat/lon" }, { status: 400 });
  }

  const all = Object.values(shapes as Record<string, Shape>);
  const match = all.find((s) => pointInGeometry(lon, lat, s.geometry));

  if (!match) {
    return NextResponse.json({ quartier: null });
  }

  return NextResponse.json({
    quartier: { id: match.id, nom: match.nom },
  });
}
