import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 10;

type Prediction = {
  place_id: string;
  description: string;
  structured_formatting?: { main_text: string; secondary_text?: string };
};

const AUTOCOMPLETE_URL = "https://maps.googleapis.com/maps/api/place/autocomplete/json";

export async function GET(req: NextRequest) {
  const input = req.nextUrl.searchParams.get("input")?.trim();
  if (!input) return NextResponse.json({ predictions: [] });

  const key = process.env.GOOGLE_MAPS_SERVER_KEY;
  if (!key) {
    return NextResponse.json({ error: "server key not configured" }, { status: 500 });
  }

  const params = new URLSearchParams({
    input,
    key,
    language: "fr",
    components: "country:fr",
    location: "48.8566,2.3522",
    radius: "30000",
  });

  try {
    const res = await fetch(`${AUTOCOMPLETE_URL}?${params.toString()}`, { cache: "no-store" });
    const body = (await res.json()) as {
      status: string;
      predictions?: Prediction[];
      error_message?: string;
    };
    if (body.status !== "OK" && body.status !== "ZERO_RESULTS") {
      return NextResponse.json(
        { error: body.error_message ?? body.status, predictions: [] },
        { status: 200 },
      );
    }
    const predictions = (body.predictions ?? []).slice(0, 5).map((p) => ({
      place_id: p.place_id,
      description: p.description,
      structured_formatting: p.structured_formatting,
    }));
    return NextResponse.json({ predictions });
  } catch {
    return NextResponse.json({ error: "fetch failed", predictions: [] }, { status: 200 });
  }
}
