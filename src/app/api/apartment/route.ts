import { NextRequest, NextResponse } from "next/server";
import { translateApartment, isTranslateError } from "@/lib/translate";

const REPO_OWNER = "Vincent075";
const REPO_NAME = "move-in-paris";

async function githubAPI(path: string, method = "GET", body?: unknown) {
  const token = process.env.GITHUB_TOKEN;
  if (!token) throw new Error("GITHUB_TOKEN manquant");

  const res = await fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/vnd.github+json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`GitHub API ${res.status}: ${errText}`);
  }

  return res.json();
}

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();

    if (data.password !== process.env.ADMIN_PASSWORD) {
      return NextResponse.json({ error: "Mot de passe incorrect" }, { status: 401 });
    }

    const apartment: Record<string, unknown> = {
      slug: data.slug,
      title: data.title,
      address: data.address,
      district: data.district,
      surface: data.surface || 0,
      rooms: data.rooms || 0,
      bedrooms: data.bedrooms || 0,
      bathrooms: data.bathrooms || 0,
      floor: data.floor || "",
      status: data.status || "À louer",
      description: data.description || "",
      features: data.features || [],
      photos: data.slug,
      images: data.images || [],
      nearby: data.nearby || [],
    };

    if (!apartment.slug) {
      return NextResponse.json({ error: "Le titre est requis" }, { status: 400 });
    }

    const translated = await translateApartment({
      title: String(apartment.title ?? ""),
      description: String(apartment.description ?? ""),
      floor: String(apartment.floor ?? ""),
      features: Array.isArray(apartment.features)
        ? (apartment.features as string[])
        : [],
    });
    if (!isTranslateError(translated)) {
      apartment.title_en = translated.title_en;
      apartment.description_en = translated.description_en;
      apartment.floor_en = translated.floor_en;
      apartment.features_en = translated.features_en;
    }

    // Get current apartments.json
    const currentFile = await githubAPI("contents/src/data/apartments.json");
    if (!currentFile.content) {
      return NextResponse.json({ error: "Impossible de lire apartments.json" }, { status: 500 });
    }

    const currentContent = Buffer.from(currentFile.content, "base64").toString("utf-8");
    const apartments = JSON.parse(currentContent);

    if (apartments.find((a: { slug: string }) => a.slug === apartment.slug)) {
      return NextResponse.json({ error: "Un appartement avec ce nom existe déjà" }, { status: 400 });
    }

    apartments.push(apartment);

    const newContent = Buffer.from(JSON.stringify(apartments, null, 2)).toString("base64");
    await githubAPI("contents/src/data/apartments.json", "PUT", {
      message: `Ajout appartement ${apartment.title}`,
      content: newContent,
      sha: currentFile.sha,
    });

    return NextResponse.json({ success: true, slug: apartment.slug });
  } catch (error) {
    console.error("Erreur API:", error);
    const message = error instanceof Error ? error.message : "Erreur inconnue";
    return NextResponse.json({ error: `Erreur: ${message}` }, { status: 500 });
  }
}
