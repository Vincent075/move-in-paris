import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 15;

type Mode = "transit" | "bicycling" | "driving";

type LegSummary = {
  durationMinutes: number;
  distanceMeters: number;
  steps?: string[];
};

const GOOGLE_DIRECTIONS_URL = "https://maps.googleapis.com/maps/api/directions/json";

function formatStepSummary(step: {
  travel_mode?: string;
  transit_details?: {
    line?: { short_name?: string; name?: string; vehicle?: { type?: string } };
  };
}): string | null {
  if (step.travel_mode !== "TRANSIT" || !step.transit_details?.line) return null;
  const line = step.transit_details.line;
  const name = line.short_name ?? line.name;
  if (!name) return null;
  const type = line.vehicle?.type?.toLowerCase();
  if (type === "subway" || type === "metro_rail") return `M${name}`;
  if (type === "heavy_rail" || type === "commuter_train") return `RER ${name}`;
  if (type === "tram") return `T${name}`;
  if (type === "bus") return `Bus ${name}`;
  return name;
}

async function fetchMode(
  origin: string,
  destination: string,
  mode: Mode,
  key: string,
): Promise<LegSummary | null> {
  const params = new URLSearchParams({
    origin,
    destination,
    mode,
    key,
    units: "metric",
    language: "fr",
    region: "fr",
  });
  if (mode === "transit") {
    params.set("transit_mode", "subway|train|tram|bus");
    params.set("departure_time", "now");
  }
  const res = await fetch(`${GOOGLE_DIRECTIONS_URL}?${params.toString()}`, {
    signal: AbortSignal.timeout(6000),
  });
  if (!res.ok) return null;
  const data = await res.json() as {
    status?: string;
    routes?: {
      legs?: {
        duration?: { value?: number };
        distance?: { value?: number };
        steps?: Parameters<typeof formatStepSummary>[0][];
      }[];
    }[];
  };
  if (data.status !== "OK" || !data.routes?.length) return null;
  const leg = data.routes[0].legs?.[0];
  if (!leg?.duration?.value || !leg?.distance?.value) return null;
  const steps = mode === "transit"
    ? (leg.steps ?? []).map(formatStepSummary).filter((s): s is string => Boolean(s))
    : undefined;
  return {
    durationMinutes: Math.round(leg.duration.value / 60),
    distanceMeters: leg.distance.value,
    ...(steps && steps.length > 0 ? { steps } : {}),
  };
}

export async function GET(req: NextRequest) {
  const origin = req.nextUrl.searchParams.get("origin");
  const destination = req.nextUrl.searchParams.get("destination");
  if (!origin || !destination) {
    return NextResponse.json({ error: "origin and destination required" }, { status: 400 });
  }
  const key = process.env.GOOGLE_MAPS_SERVER_KEY;
  if (!key) {
    return NextResponse.json({ error: "server key not configured" }, { status: 500 });
  }

  try {
    const [transit, bicycling, driving] = await Promise.all([
      fetchMode(origin, destination, "transit", key),
      fetchMode(origin, destination, "bicycling", key),
      fetchMode(origin, destination, "driving", key),
    ]);
    if (!transit && !bicycling && !driving) {
      return NextResponse.json({ error: "no_route_found" }, { status: 404 });
    }
    return NextResponse.json({ transit, bicycling, driving });
  } catch (err) {
    console.error("Directions API error:", err);
    return NextResponse.json({ error: "upstream_error" }, { status: 502 });
  }
}
