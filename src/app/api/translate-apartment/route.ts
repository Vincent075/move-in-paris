import { NextRequest, NextResponse } from "next/server";
import { translateApartment } from "@/lib/translate";

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
  } | null;

  if (!body) return NextResponse.json({ error: "invalid body" }, { status: 400 });

  try {
    const out = await translateApartment({
      title: body.title ?? "",
      description: body.description ?? "",
      floor: body.floor ?? "",
      features: Array.isArray(body.features) ? body.features : [],
    });
    if (!out) {
      return NextResponse.json(
        { error: "translation_failed" },
        { status: 500 },
      );
    }
    return NextResponse.json(out);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
