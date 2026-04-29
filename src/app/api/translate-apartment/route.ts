import { NextRequest, NextResponse } from "next/server";
import { translateApartment, isTranslateError } from "@/lib/translate";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const password = req.nextUrl.searchParams.get("password");
  if (password !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as {
    title?: string;
    description?: string;
    floor?: string;
    features?: string[];
    bedrooms?: number;
    rooms?: number;
  } | null;

  if (!body) return NextResponse.json({ error: "invalid_body" }, { status: 400 });

  try {
    const out = await translateApartment({
      title: body.title ?? "",
      description: body.description ?? "",
      floor: body.floor ?? "",
      features: Array.isArray(body.features) ? body.features : [],
      bedrooms: typeof body.bedrooms === "number" ? body.bedrooms : undefined,
      rooms: typeof body.rooms === "number" ? body.rooms : undefined,
    });

    if (isTranslateError(out)) {
      const status = out.kind === "no_key" ? 503 : 500;
      const detail =
        out.kind === "no_key"
          ? "ANTHROPIC_API_KEY absente sur Vercel"
          : out.kind === "api_error"
            ? `API Claude: ${out.message}`
            : `Réponse invalide: ${out.message}`;
      return NextResponse.json({ error: detail }, { status });
    }

    return NextResponse.json(out);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: `Erreur serveur: ${message}` }, { status: 500 });
  }
}
