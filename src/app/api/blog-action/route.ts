import { NextRequest, NextResponse } from "next/server";
import {
  loadArticles,
  loadIdeas,
  saveArticles,
  saveIdeas,
  type Article,
  type Idea,
} from "@/lib/blog-github";

/**
 * Admin endpoint for everything that is NOT "generate a new article".
 *
 * GET  /api/blog-action?password=...&type=articles | type=ideas
 *      Returns the full list (for the admin UI).
 *
 * POST /api/blog-action
 * Body : { password, action, ... }
 *   action = "idea_create"   { topic, angle?, keywords? }
 *   action = "idea_delete"   { idea_id }
 *   action = "article_publish"   { slug }
 *   action = "article_unpublish" { slug }
 *   action = "article_update"    { slug, patch }   patch = whitelist
 *   action = "article_delete"    { slug }
 */

const EDITABLE_FIELDS: Array<keyof Article> = [
  "title",
  "excerpt",
  "metaDescription",
  "category",
  "tags",
  "readTime",
  "image",
  "content",
];

function unauthorized() {
  return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
}

export async function GET(req: NextRequest) {
  const password = req.nextUrl.searchParams.get("password");
  if (password !== process.env.ADMIN_PASSWORD) return unauthorized();

  const type = req.nextUrl.searchParams.get("type");
  try {
    if (type === "ideas") {
      const { content } = await loadIdeas();
      return NextResponse.json({ ideas: content });
    }
    if (type === "articles" || !type) {
      const { content } = await loadArticles();
      return NextResponse.json({ articles: content });
    }
    return NextResponse.json({ error: "type inconnu" }, { status: 400 });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Erreur" },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (body.password !== process.env.ADMIN_PASSWORD) return unauthorized();
    const { action } = body;
    if (!action) return NextResponse.json({ error: "action requis" }, { status: 400 });

    switch (action) {
      case "idea_create":
        return ideaCreate(body);
      case "idea_delete":
        return ideaDelete(body);
      case "article_publish":
        return articleSetStatus(body, "published");
      case "article_unpublish":
        return articleSetStatus(body, "draft");
      case "article_update":
        return articleUpdate(body);
      case "article_delete":
        return articleDelete(body);
      default:
        return NextResponse.json({ error: `action inconnue: ${action}` }, { status: 400 });
    }
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Erreur" },
      { status: 500 },
    );
  }
}

async function ideaCreate(body: {
  topic?: string;
  angle?: string;
  keywords?: string[];
  priority_score?: number;
}) {
  const topic = (body.topic || "").trim();
  if (topic.length < 5) {
    return NextResponse.json({ error: "topic requis (min 5 chars)" }, { status: 400 });
  }
  const { sha, content } = await loadIdeas();
  const idea: Idea = {
    id: `idea-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    topic,
    angle: (body.angle || "").trim() || "Ajoutée manuellement via admin",
    target_keywords: Array.isArray(body.keywords) ? body.keywords : [],
    priority_score: typeof body.priority_score === "number" ? body.priority_score : 100,
    used: false,
    created_at: new Date().toISOString(),
    used_at: null,
    generated_article_slug: null,
    trend_source: "admin_manual",
  };
  const next = [idea, ...content];
  await saveIdeas(sha, next, `blog: add idea "${topic.slice(0, 60)}"`);
  return NextResponse.json({ success: true, idea });
}

async function ideaDelete(body: { idea_id?: string }) {
  const id = body.idea_id;
  if (!id) return NextResponse.json({ error: "idea_id requis" }, { status: 400 });
  const { sha, content } = await loadIdeas();
  const next = content.filter((i) => i.id !== id);
  if (next.length === content.length) {
    return NextResponse.json({ error: "idée introuvable" }, { status: 404 });
  }
  await saveIdeas(sha, next, `blog: delete idea ${id}`);
  return NextResponse.json({ success: true });
}

async function articleSetStatus(
  body: { slug?: string },
  status: "published" | "draft",
) {
  const slug = body.slug;
  if (!slug) return NextResponse.json({ error: "slug requis" }, { status: 400 });
  const { sha, content } = await loadArticles();
  const idx = content.findIndex((a) => a.slug === slug);
  if (idx === -1) {
    return NextResponse.json({ error: "article introuvable" }, { status: 404 });
  }
  const now = new Date().toISOString();
  content[idx] = {
    ...content[idx],
    status,
    published_at: status === "published" ? (content[idx].published_at || now) : null,
  };
  await saveArticles(sha, content, `blog: ${status} ${slug}`);
  return NextResponse.json({ success: true, article: content[idx] });
}

async function articleUpdate(body: {
  slug?: string;
  patch?: Partial<Article>;
}) {
  const slug = body.slug;
  if (!slug) return NextResponse.json({ error: "slug requis" }, { status: 400 });
  if (!body.patch || typeof body.patch !== "object") {
    return NextResponse.json({ error: "patch requis" }, { status: 400 });
  }
  const { sha, content } = await loadArticles();
  const idx = content.findIndex((a) => a.slug === slug);
  if (idx === -1) {
    return NextResponse.json({ error: "article introuvable" }, { status: 404 });
  }
  const patch: Partial<Article> = {};
  for (const k of EDITABLE_FIELDS) {
    if (k in body.patch) (patch as Record<string, unknown>)[k] = body.patch[k];
  }
  content[idx] = { ...content[idx], ...patch };
  await saveArticles(sha, content, `blog: update ${slug}`);
  return NextResponse.json({ success: true, article: content[idx] });
}

async function articleDelete(body: { slug?: string }) {
  const slug = body.slug;
  if (!slug) return NextResponse.json({ error: "slug requis" }, { status: 400 });
  const { sha, content } = await loadArticles();
  const next = content.filter((a) => a.slug !== slug);
  if (next.length === content.length) {
    return NextResponse.json({ error: "article introuvable" }, { status: 404 });
  }
  await saveArticles(sha, next, `blog: delete ${slug}`);
  return NextResponse.json({ success: true });
}
