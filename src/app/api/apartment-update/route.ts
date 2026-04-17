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

// GET: fetch all apartments
export async function GET(req: NextRequest) {
  const password = req.nextUrl.searchParams.get("password");
  if (password !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  try {
    const file = await githubAPI("contents/src/data/apartments.json");
    const content = Buffer.from(file.content, "base64").toString("utf-8");
    const apartments = JSON.parse(content);
    return NextResponse.json({ apartments });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// PUT: update an existing apartment
export async function PUT(req: NextRequest) {
  try {
    const data = await req.json();

    if (data.password !== process.env.ADMIN_PASSWORD) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const { slug, updates } = data;
    if (!slug) return NextResponse.json({ error: "Slug requis" }, { status: 400 });

    const currentFile = await githubAPI("contents/src/data/apartments.json");
    const currentContent = Buffer.from(currentFile.content, "base64").toString("utf-8");
    const apartments = JSON.parse(currentContent);

    const index = apartments.findIndex((a: { slug: string }) => a.slug === slug);
    if (index === -1) {
      return NextResponse.json({ error: "Appartement non trouvé" }, { status: 404 });
    }

    // Merge updates
    apartments[index] = { ...apartments[index], ...updates };

    const newContent = Buffer.from(JSON.stringify(apartments, null, 2)).toString("base64");
    await githubAPI("contents/src/data/apartments.json", "PUT", {
      message: `Modification appartement ${apartments[index].title}`,
      content: newContent,
      sha: currentFile.sha,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// DELETE: remove an apartment
export async function DELETE(req: NextRequest) {
  try {
    const data = await req.json();

    if (data.password !== process.env.ADMIN_PASSWORD) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const { slug } = data;

    const currentFile = await githubAPI("contents/src/data/apartments.json");
    const currentContent = Buffer.from(currentFile.content, "base64").toString("utf-8");
    const apartments = JSON.parse(currentContent);

    const filtered = apartments.filter((a: { slug: string }) => a.slug !== slug);
    if (filtered.length === apartments.length) {
      return NextResponse.json({ error: "Appartement non trouvé" }, { status: 404 });
    }

    const newContent = Buffer.from(JSON.stringify(filtered, null, 2)).toString("base64");
    await githubAPI("contents/src/data/apartments.json", "PUT", {
      message: `Suppression appartement ${slug}`,
      content: newContent,
      sha: currentFile.sha,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
