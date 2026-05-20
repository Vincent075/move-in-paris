import { NextRequest, NextResponse } from "next/server";
import {
  loadApartments,
  loadArticles,
  loadIdeas,
  saveArticles,
  saveIdeas,
} from "@/lib/blog-github";
import {
  generateArticle,
  isGenerationError,
  pickApartmentForArticle,
  pickIdea,
} from "@/lib/blog-generator";

/**
 * Generate ONE blog article and commit it as a draft to articles.json.
 *
 * Auth modes :
 *   - Admin UI : POST /api/blog-generate with body { password, idea_id? }
 *   - Cron     : GET  /api/blog-generate?cron_secret=... (set Vercel cron secret in env)
 *
 * If idea_id is provided, that exact idea is used (admin "Generate now from
 * this idea" button). Otherwise the top-priority unused idea is picked.
 *
 * The model is given the most recently added apartment whose cover image has
 * not yet been used in any previous article. The article is saved with
 * status="draft" — Vincent reviews and clicks "Publish" from the admin.
 *
 * Max duration : 60s (Claude generation is the bottleneck, typically 20-40s).
 */

// Pro plan caps maxDuration at 300s. Haiku + GitHub I/O fit comfortably
// in ~15-30s, but Anthropic and GitHub APIs occasionally lag and we'd
// rather wait than serve FUNCTION_INVOCATION_TIMEOUT.
export const maxDuration = 300;

async function run(ideaId?: string) {
  // 1. Read everything in parallel — GitHub API is the slow path here.
  const [apartmentsFile, articlesFile, ideasFile] = await Promise.all([
    loadApartments(),
    loadArticles(),
    loadIdeas(),
  ]);

  // 2. Pick the idea (specific one if requested, else top priority unused).
  let idea = ideaId
    ? ideasFile.content.find((i) => i.id === ideaId && !i.used)
    : pickIdea(ideasFile.content);

  if (!idea) {
    return NextResponse.json(
      {
        error: ideaId
          ? "Idée introuvable ou déjà utilisée"
          : "Aucune idée disponible dans le pool",
      },
      { status: 404 },
    );
  }

  // 3. Pick an apartment + cover image not yet used by any past article.
  const picked = pickApartmentForArticle(
    apartmentsFile.content,
    articlesFile.content,
  );
  if (!picked) {
    return NextResponse.json({ error: "Aucun appartement disponible" }, { status: 404 });
  }

  // 4. Call Claude.
  const result = await generateArticle(idea, picked.apartment, picked.cover);
  if (isGenerationError(result)) {
    return NextResponse.json(
      {
        error: `Génération échouée : ${result.kind}${"message" in result ? ` — ${result.message}` : ""}`,
      },
      { status: 502 },
    );
  }
  const article = result;

  // 5. Make sure the slug doesn't collide with an existing article.
  let finalSlug = article.slug;
  let suffix = 2;
  const existingSlugs = new Set(articlesFile.content.map((a) => a.slug));
  while (existingSlugs.has(finalSlug)) {
    finalSlug = `${article.slug}-${suffix++}`;
  }
  article.slug = finalSlug;

  // 6. Persist the new article. Reload article SHA after the long Claude
  //    call to reduce the chance of a 409 race with the admin (cron at
  //    9:00 vs Vincent editing at the same moment is unlikely but possible).
  const freshArticles = await loadArticles();
  const nextArticles = [...freshArticles.content, article];
  await saveArticles(
    freshArticles.sha,
    nextArticles,
    `blog: draft "${article.title.slice(0, 60)}"`,
  );

  // 7. Mark the idea as used, with a pointer to the freshly created slug.
  const freshIdeas = await loadIdeas();
  const nextIdeas = freshIdeas.content.map((i) =>
    i.id === idea.id
      ? {
          ...i,
          used: true,
          used_at: new Date().toISOString(),
          generated_article_slug: article.slug,
        }
      : i,
  );
  await saveIdeas(
    freshIdeas.sha,
    nextIdeas,
    `blog: mark idea ${idea.id} as used`,
  );

  return NextResponse.json({
    success: true,
    article,
    used_apartment: {
      slug: picked.apartment.slug,
      title: picked.apartment.title,
      cover: picked.cover,
    },
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (body.password !== process.env.ADMIN_PASSWORD) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }
    return await run(typeof body.idea_id === "string" ? body.idea_id : undefined);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Erreur" },
      { status: 500 },
    );
  }
}

export async function GET(req: NextRequest) {
  // Cron path : Vercel sets `Authorization: Bearer <CRON_SECRET>` for cron jobs.
  // We also accept ?cron_secret= for manual testing.
  const authHeader = req.headers.get("authorization") || "";
  const querySecret = req.nextUrl.searchParams.get("cron_secret");
  const secret = process.env.CRON_SECRET;

  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET non configuré" }, { status: 503 });
  }

  const headerOk = authHeader === `Bearer ${secret}`;
  const queryOk = querySecret === secret;
  if (!headerOk && !queryOk) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  try {
    return await run();
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Erreur" },
      { status: 500 },
    );
  }
}
