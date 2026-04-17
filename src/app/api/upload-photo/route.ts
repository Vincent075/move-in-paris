import { NextRequest, NextResponse } from "next/server";

const REPO_OWNER = "Vincent075";
const REPO_NAME = "move-in-paris";

export async function POST(req: NextRequest) {
  try {
    const token = process.env.GITHUB_TOKEN;
    if (!token) return NextResponse.json({ error: "Token manquant" }, { status: 500 });

    const formData = await req.formData();
    const password = formData.get("password") as string;
    if (password !== process.env.ADMIN_PASSWORD) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const photo = formData.get("photo") as File;
    const slug = formData.get("slug") as string;
    const fileName = formData.get("fileName") as string;

    if (!photo || !slug || !fileName) {
      return NextResponse.json({ error: "Données manquantes" }, { status: 400 });
    }

    const buffer = await photo.arrayBuffer();
    const base64 = Buffer.from(buffer).toString("base64");
    const path = `public/apartments/${slug}/${fileName}`;

    const res = await fetch(
      `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${encodeURI(path)}`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          Accept: "application/vnd.github+json",
        },
        body: JSON.stringify({
          message: `Photo ${fileName}`,
          content: base64,
        }),
      }
    );

    if (!res.ok) {
      const err = await res.text();
      return NextResponse.json({ error: err }, { status: res.status });
    }

    return NextResponse.json({ success: true, path: `/apartments/${slug}/${fileName}` });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erreur upload" }, { status: 500 });
  }
}
