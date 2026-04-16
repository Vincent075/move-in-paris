import { NextRequest, NextResponse } from "next/server";

const GITHUB_TOKEN = process.env.GITHUB_TOKEN!;
const REPO_OWNER = "Vincent075";
const REPO_NAME = "move-in-paris";

async function githubAPI(path: string, method = "GET", body?: unknown) {
  const res = await fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      "Content-Type": "application/json",
      Accept: "application/vnd.github+json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  return res.json();
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const password = formData.get("password") as string;

    if (password !== process.env.ADMIN_PASSWORD) {
      return NextResponse.json({ error: "Mot de passe incorrect" }, { status: 401 });
    }

    // Extract apartment data
    const apartment = {
      slug: formData.get("slug") as string,
      title: formData.get("title") as string,
      address: formData.get("address") as string,
      district: formData.get("district") as string,
      surface: parseInt(formData.get("surface") as string),
      rooms: parseInt(formData.get("rooms") as string),
      bedrooms: parseInt(formData.get("bedrooms") as string),
      bathrooms: parseInt(formData.get("bathrooms") as string),
      floor: formData.get("floor") as string,
      status: formData.get("status") as string,
      description: formData.get("description") as string,
      features: (formData.get("features") as string).split("\n").map((f) => f.trim()).filter(Boolean),
      photos: formData.get("slug") as string,
      images: [] as string[],
      nearby: JSON.parse(formData.get("nearby") as string || "[]"),
    };

    // Upload photos
    const photos = formData.getAll("photos") as File[];
    const imageNames = [
      "salon-1.jpg", "salon-2.jpg", "salon-3.jpg", "salon-4.jpg",
      "cuisine-1.jpg", "cuisine-2.jpg", "chambre-1.jpg", "chambre-2.jpg",
      "sdb-1.jpg", "sdb-2.jpg", "vue-1.jpg", "vue-2.jpg",
    ];

    for (let i = 0; i < photos.length; i++) {
      const photo = photos[i];
      if (!photo.size) continue;

      const buffer = await photo.arrayBuffer();
      const base64 = Buffer.from(buffer).toString("base64");
      const fileName = imageNames[i] || `photo-${i + 1}.jpg`;
      const path = `public/${apartment.slug}/${fileName}`;

      await githubAPI(`contents/${path}`, "PUT", {
        message: `Ajout photo ${fileName} pour ${apartment.title}`,
        content: base64,
      });

      apartment.images.push(`/${apartment.slug}/${fileName}`);
    }

    // Get current apartments.json
    const currentFile = await githubAPI("contents/src/data/apartments.json");
    const currentContent = Buffer.from(currentFile.content, "base64").toString("utf-8");
    const apartments = JSON.parse(currentContent);

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
    console.error(error);
    return NextResponse.json({ error: "Erreur lors de l'ajout" }, { status: 500 });
  }
}
