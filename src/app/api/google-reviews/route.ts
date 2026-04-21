import { NextResponse } from "next/server";

// Cache the Google Places response for 1h server-side so we don't burn quota.
export const revalidate = 3600;

type GoogleReview = {
  author_name: string;
  profile_photo_url?: string;
  rating: number;
  relative_time_description: string;
  text: string;
  time: number;
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
      { status: 200 }, // soft-fail so the front can fall back silently
    );
  }

  try {
    const url = new URL("https://maps.googleapis.com/maps/api/place/details/json");
    url.searchParams.set("place_id", placeId);
    url.searchParams.set("fields", "reviews,rating,user_ratings_total");
    url.searchParams.set("reviews_sort", "newest");
    url.searchParams.set("reviews_no_translations", "true");
    url.searchParams.set("language", "fr");
    url.searchParams.set("key", apiKey);

    const res = await fetch(url.toString(), { next: { revalidate: 3600 } });
    if (!res.ok) {
      return NextResponse.json(
        { reviews: [], error: `Google Places HTTP ${res.status}` },
        { status: 200 },
      );
    }

    const data = (await res.json()) as {
      status?: string;
      error_message?: string;
      result?: {
        reviews?: GoogleReview[];
        rating?: number;
        user_ratings_total?: number;
      };
    };

    if (data.status && data.status !== "OK") {
      return NextResponse.json(
        { reviews: [], error: `${data.status}: ${data.error_message || ""}` },
        { status: 200 },
      );
    }

    // Keep only 5-star reviews (tight quality control for the landing).
    const reviews: PublicReview[] = (data.result?.reviews || [])
      .filter((r) => r.rating === 5)
      .slice(0, 6)
      .map((r) => ({
        author: r.author_name,
        photo: r.profile_photo_url || null,
        rating: r.rating,
        relative: r.relative_time_description,
        text: r.text,
      }));

    return NextResponse.json({
      reviews,
      averageRating: data.result?.rating ?? null,
      totalReviews: data.result?.user_ratings_total ?? null,
    });
  } catch (err) {
    console.error("Google Reviews error:", err);
    return NextResponse.json({ reviews: [], error: "Erreur Google" }, { status: 200 });
  }
}
