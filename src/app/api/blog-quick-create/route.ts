import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import {
  loadApartments,
  loadArticles,
  saveArticles,
  type Article,
  type Idea,
} from "@/lib/blog-github";
import {
  generateArticle,
  isGenerationError,
  pickApartmentForArticle,
} from "@/lib/blog-generator";

/**
 * Quick-create endpoint : the admin types a few keywords or a one-liner
 * idea ("loi Pinel 2026", "DPE F bail société", "Salon de l'immobilier") and
 * we immediately :
 *   1. expand the seed into a structured idea (topic + angle + keywords)
 *      using Claude Haiku — fast, $0.0001 per call,
 *   2. pick an apartment with an unused cover image,
 *   3. generate the full article through the standard blog-generator helper,
 *   4. commit the article as a draft.
 *
 * Skips the ideas pool entirely — the seed lives only in the resulting
 * article's `idea_id` slot ("quick-<timestamp>"). Good for reactive writing
 * around a news beat or a Vincent inspiration.
 */

export const maxDuration = 60;

async function expandSeed(seed: string): Promise<Idea | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;
  const client = new Anthropic({ apiKey });

  const system = `Tu es éditeur en chef d'un blog B2B premium pour Move in Paris (location meublée corporate Paris). Tu transformes une idée brute en brief éditorial structuré.`;
  const prompt = `Idée brute du fondateur Vincent : "${seed}"

Transforme cette idée en brief éditorial pour un article SEO de 2000-2800 mots ciblant DRH / propriétaires bailleurs parisiens / dirigeants en mobilité.

Si l'idée mentionne une actualité (loi, événement, nouvelle norme) — fais le lien avec le marché de la location meublée corporate Paris en 2026.

Réponds UNIQUEMENT avec un objet JSON valide, sans wrapper markdown :
{
  "topic": "titre éditorial 60-90 chars (interrogatif si possible, intègre 2026 ou Paris)",
  "angle": "1-2 phrases sur l'angle de l'article (à quel besoin/objection il répond)",
  "target_keywords": ["mot-clé 1", "mot-clé 2", "mot-clé 3", "mot-clé 4"]
}`;

  try {
    const r = await client.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 600,
      system,
      messages: [{ role: "user", content: prompt }],
    });
    const block = r.content.find((b) => b.type === "text");
    if (!block || block.type !== "text") return null;
    const cleaned = block.text
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```\s*$/i, "")
      .trim();
    const parsed = JSON.parse(cleaned) as Partial<Idea>;
    if (!parsed.topic) return null;
    return {
      id: `quick-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      topic: parsed.topic,
      angle: parsed.angle || "",
      target_keywords: Array.isArray(parsed.target_keywords) ? parsed.target_keywords : [],
      priority_score: 999,
      used: true,
      created_at: new Date().toISOString(),
      used_at: new Date().toISOString(),
      generated_article_slug: null,
      trend_source: "quick_create",
    };
  } catch (e) {
    console.error("[blog-quick-create] expandSeed fail:", e instanceof Error ? e.message : e);
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (body.password !== process.env.ADMIN_PASSWORD) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }
    const seed = (body.seed || body.keywords || body.topic || "").trim();
    if (seed.length < 3) {
      return NextResponse.json(
        { error: "Saisis quelques mots-clés ou une idée (3 chars min)." },
        { status: 400 },
      );
    }

    // 1. Expand seed → structured idea via Haiku.
    const idea = await expandSeed(seed);
    if (!idea) {
      return NextResponse.json(
        { error: "Échec expansion de l'idée (clé Anthropic ?)." },
        { status: 502 },
      );
    }

    // 2. Pick the right apartment (recent + unused cover).
    const [apartmentsFile, articlesFile] = await Promise.all([
      loadApartments(),
      loadArticles(),
    ]);
    const picked = pickApartmentForArticle(
      apartmentsFile.content,
      articlesFile.content,
    );
    if (!picked) {
      return NextResponse.json(
        { error: "Aucun appartement disponible." },
        { status: 404 },
      );
    }

    // 3. Generate the article.
    const result = await generateArticle(idea, picked.apartment, picked.cover);
    if (isGenerationError(result)) {
      return NextResponse.json(
        {
          error: `Génération échouée : ${result.kind}${"message" in result ? ` — ${result.message}` : ""}`,
        },
        { status: 502 },
      );
    }
    const article: Article = result;

    // 4. Persist (with slug collision protection + fresh sha to dodge races).
    const fresh = await loadArticles();
    let finalSlug = article.slug;
    let suffix = 2;
    const existingSlugs = new Set(fresh.content.map((a) => a.slug));
    while (existingSlugs.has(finalSlug)) {
      finalSlug = `${article.slug}-${suffix++}`;
    }
    article.slug = finalSlug;
    const next = [...fresh.content, article];
    await saveArticles(fresh.sha, next, `blog: quick-create "${article.title.slice(0, 60)}"`);

    return NextResponse.json({
      success: true,
      article,
      used_apartment: {
        slug: picked.apartment.slug,
        title: picked.apartment.title,
        cover: picked.cover,
      },
      expanded_idea: {
        topic: idea.topic,
        angle: idea.angle,
        keywords: idea.target_keywords,
      },
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Erreur" },
      { status: 500 },
    );
  }
}
