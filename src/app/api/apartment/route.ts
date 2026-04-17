import { NextRequest, NextResponse } from "next/server";

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
    const formData = await req.formData();
    const password = formData.get("password") as string;

    if (password !== process.env.ADMIN_PASSWORD) {
      return NextResponse.json({ error: "Mot de passe incorrect" }, { status: 401 });
    }

    const slug = formData.get("slug") as string;
    if (!slug) {
      return NextResponse.json({ error: "Le titre est requis" }, { status: 400 });
    }

    // Extract apartment data
    const apartment = {
      slug,
      title: formData.get("title") as string,
      address: formData.get("address") as string,
      district: formData.get("district") as string,
      surface: parseInt(formData.get("surface") as string) || 0,
      rooms: parseInt(formData.get("rooms") as string) || 0,
      bedrooms: parseInt(formData.get("bedrooms") as string) || 0,
      bathrooms: parseInt(formData.get("bathrooms") as string) || 0,
      floor: formData.get("floor") as string || "",
      status: formData.get("status") as string || "À louer",
      description: formData.get("description") as string || "",
      features: ((formData.get("features") as string) || "").split("\n").map((f) => f.trim()).filter(Boolean),
      photos: slug,
      images: [] as string[],
      nearby: JSON.parse((formData.get("nearby") as string) || "[]"),
    };

    // Upload photos one by one
    const photos = formData.getAll("photos") as File[];
    let photoIndex = 0;

    for (let i = 0; i < photos.length; i++) {
      const photo = photos[i];
      if (!photo.size || photo.size < 100) continue;

      photoIndex++;
      const ext = photo.name.split(".").pop()?.toLowerCase() || "jpg";
      const fileName = `photo-${photoIndex}.${ext}`;
      const path = `public/${slug}/${fileName}`;

      try {
        const buffer = await photo.arrayBuffer();
        const base64 = Buffer.from(buffer).toString("base64");

        await githubAPI(`contents/${path}`, "PUT", {
          message: `Photo ${fileName} - ${apartment.title}`,
          content: base64,
        });

        apartment.images.push(`/${slug}/${fileName}`);
      } catch (photoErr) {
        console.error(`Erreur upload photo ${fileName}:`, photoErr);
        // Continue with other photos
      }
    }

    // Get current apartments.json
    const currentFile = await githubAPI("contents/src/data/apartments.json");

    if (!currentFile.content) {
      return NextResponse.json({ error: "Impossible de lire apartments.json" }, { status: 500 });
    }

    const currentContent = Buffer.from(currentFile.content, "base64").toString("utf-8");
    const apartments = JSON.parse(currentContent);

    // Check if slug already exists
    if (apartments.find((a: { slug: string }) => a.slug === slug)) {
      return NextResponse.json({ error: "Un appartement avec ce nom existe déjà" }, { status: 400 });
    }

    // Add new apartment
    apartments.push(apartment);

    // Update apartments.json
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
