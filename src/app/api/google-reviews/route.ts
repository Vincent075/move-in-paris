import { NextResponse } from "next/server";

// Cache the Google Places response for 1h server-side so we don't burn quota.
export const revalidate = 3600;

type NewReview = {
  name?: string;
  relativePublishTimeDescription?: string;
  rating?: number;
  text?: { text?: string; languageCode?: string };
  originalText?: { text?: string; languageCode?: string };
  authorAttribution?: {
    displayName?: string;
    uri?: string;
    photoUri?: string;
  };
  publishTime?: string;
};

type NewPlaceDetails = {
  id?: string;
  displayName?: { text?: string };
  rating?: number;
  userRatingCount?: number;
  reviews?: NewReview[];
};

type PublicReview = {
  author: string;
  photo: string | null;
  rating: number;
  relative: string;
  text: string;
};

export async function GET() {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  const placeId = process.env.GOOGLE_PLACES_PLACE_ID;

  if (!apiKey || !placeId) {
    return NextResponse.json(
      { reviews: [], error: "GOOGLE_PLACES_API_KEY ou GOOGLE_PLACES_PLACE_ID manquant" },
      { status: 200 },
    );
  }

  try {
    // Places API (New) — https://places.googleapis.com/v1/places/{id}
    // Fields requested via X-Goog-FieldMask header (FieldMask is mandatory).
    const url = `https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}?languageCode=fr&regionCode=FR`;

    const res = await fetch(url, {
      headers: {
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": "id,displayName,rating,userRatingCount,reviews",
      },
      next: { revalidate: 3600 },
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      return NextResponse.json(
        { reviews: [], error: `Places API HTTP ${res.status}: ${body.slice(0, 200)}` },
        { status: 200 },
      );
    }

    const data = (await res.json()) as NewPlaceDetails;

    // Filter to 5-star reviews only, map to the public shape.
    const reviews: PublicReview[] = (data.reviews || [])
      .filter((r) => r.rating === 5)
      .slice(0, 6)
      .map((r) => ({
        author: r.authorAttribution?.displayName || "Client Google",
        photo: r.authorAttribution?.photoUri || null,
        rating: r.rating || 5,
        relative: r.relativePublishTimeDescription || "",
        text: r.text?.text || r.originalText?.text || "",
      }))
      .filter((r) => r.text.length > 0);

    return NextResponse.json({
      reviews,
      averageRating: data.rating ?? null,
      totalReviews: data.userRatingCount ?? null,
    });
  } catch (err) {
    console.error("Google Reviews error:", err);
    return NextResponse.json({ reviews: [], error: "Erreur Google" }, { status: 200 });
  }
}
