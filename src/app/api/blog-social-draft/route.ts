import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { loadArticles, type Article } from "@/lib/blog-github";

/**
 * POST /api/blog-social-draft
 * Body : { password, slug, platform: "gmb" | "linkedin" }
 *
 * Generates a ready-to-paste social post for Google Business Profile or
 * LinkedIn, derived from a published article. Returns the post text, the
 * cover image to upload, the CTA link, and step-by-step instructions for the
 * target platform.
 */

const SITE_URL = "https://www.move-in-paris.com";
const GMB_MAX_CHARS = 1500;
const LINKEDIN_MAX_CHARS = 3000;

const GMB_SYSTEM = `Tu rédiges des posts Google Business Profile pour Move in Paris, agence de location meublée corporate à Paris (26 rue de l'Étoile, 75017).

Ton : direct, local, expert. Pas d'emoji. Pas de cadratin. Vouvoiement. Charte premium discrète.

CONSIGNES STRICTES :
- 800-1200 caractères MAX (Google tronque au-delà)
- Première phrase = accroche concrète (jamais "Nouvel article sur..." ni "Découvrez")
- Mentionne Paris + le quartier (8e/16e/17e/La Défense/Neuilly) une fois en SEO local
- Style humain (Vincent fondateur écrirait ça, pas une IA)
- Pas de hashtags (inutiles sur GMB)
- Finir par une invitation douce : "Lire l'article complet" / "En savoir plus"
- Ne JAMAIS citer un concurrent par son nom (Lodgis, Paris Attitude, Airbnb...)
- Ne JAMAIS citer un client par son nom (L'Oréal, LVMH...) — dire "grandes entreprises", "groupes CAC 40"

Réponds UNIQUEMENT avec le texte du post, rien d'autre. Pas de guillemets, pas de préambule.`;

const LINKEDIN_SYSTEM = `Tu rédiges des posts LinkedIn pour la page Move in Paris (agence de location meublée corporate Paris, fondée 2018).

Ton : professionnel, expert, owner-focused. Vouvoiement. Pas d'emoji. Charte premium.

CONSIGNES STRICTES :
- 1500-2500 caractères (LinkedIn favorise les posts moyens-longs avec retours à la ligne)
- Structure visuelle obligatoire :
  - Phrase d'accroche (1 ligne) qui s'arrête au "voir plus" — doit être lisible seule
  - Saut de ligne
  - 3-5 paragraphes courts (2-3 phrases max)
  - Sauts de ligne entre les paragraphes (pas de bloc compact, illisible mobile)
  - Conclusion + lien article
  - 3-5 hashtags pertinents en fin (#corporatehousing #mobilitéinternationale #baisociété etc.)
- Adresse les 3 audiences : DRH / propriétaires bailleurs / dirigeants en mobilité
- Mentionne au moins 1 donnée concrète parmi : +200 entreprises clientes, 117 000+ nuits gérées, 4,8/5 sur 61 avis, fondée 2018
- Ne JAMAIS citer un concurrent par son nom
- Ne JAMAIS citer un client par son nom — dire "grandes entreprises CAC 40", "banques d'affaires", "cabinets de conseil internationaux"
- Ne pas commencer par "Nouvel article" ni "Aujourd'hui je partage"

Réponds UNIQUEMENT avec le texte du post. Pas de préambule, pas de guillemets.`;

function buildPrompt(article: Article, platform: "gmb" | "linkedin"): string {
  const url = `${SITE_URL}/blog/${article.slug}`;
  const preview = article.content
    .filter((b) => b.type === "p" || b.type === "h2")
    .slice(0, 12)
    .map((b) => b.text)
    .join("\n\n")
    .slice(0, 4000);

  const platformInfo =
    platform === "gmb"
      ? "Plateforme cible : Google Business Profile (post court 800-1200 chars, local SEO Paris)."
      : "Plateforme cible : LinkedIn (post 1500-2500 chars, B2B owner-focused, structure aérée).";

  return `${platformInfo}

ARTICLE SOURCE :
Titre : ${article.title}
Catégorie : ${article.category}
Excerpt : ${article.excerpt}
URL article : ${url}
Tags : ${article.tags.join(", ")}

CONTENU (extraits) :
${preview}

CONSIGNES SUPPLÉMENTAIRES :
- Le lien vers l'article ${url} DOIT être présent à la fin
- Ton humain, premier degré, jamais de marketing creux`;
}

async function callClaude(systemPrompt: string, userPrompt: string, maxChars: number): Promise<string | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;
  const client = new Anthropic({ apiKey });

  try {
    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1500,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    });
    const block = response.content.find((b) => b.type === "text");
    if (!block || block.type !== "text") return null;
    const text = block.text.trim();
    return text.length > maxChars ? text.slice(0, maxChars - 3) + "..." : text;
  } catch (e) {
    console.error("[blog-social-draft] Claude error:", e instanceof Error ? e.message : e);
    return null;
  }
}

function fallback(article: Article, platform: "gmb" | "linkedin"): string {
  const url = `${SITE_URL}/blog/${article.slug}`;
  if (platform === "gmb") {
    return `${article.title}\n\n${article.excerpt}\n\nLire l'article complet : ${url}`.slice(0, GMB_MAX_CHARS);
  }
  return `${article.title}\n\n${article.excerpt}\n\n${article.content
    .filter((b) => b.type === "p")
    .slice(0, 2)
    .map((b) => b.text)
    .join("\n\n")}\n\nLire l'article : ${url}\n\n#corporatehousing #mobilitéinternationale #locationmeublée #paris`.slice(
    0,
    LINKEDIN_MAX_CHARS,
  );
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (body.password !== process.env.ADMIN_PASSWORD) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }
    const slug = (body.slug || "").trim();
    const platform: "gmb" | "linkedin" = body.platform === "linkedin" ? "linkedin" : "gmb";
    if (!slug) return NextResponse.json({ error: "slug requis" }, { status: 400 });

    const { content: articles } = await loadArticles();
    const article = articles.find((a) => a.slug === slug);
    if (!article) {
      return NextResponse.json({ error: "Article introuvable" }, { status: 404 });
    }

    const maxChars = platform === "gmb" ? GMB_MAX_CHARS : LINKEDIN_MAX_CHARS;
    const systemPrompt = platform === "gmb" ? GMB_SYSTEM : LINKEDIN_SYSTEM;
    const userPrompt = buildPrompt(article, platform);

    let text = await callClaude(systemPrompt, userPrompt, maxChars);
    let source: "claude" | "template" = "claude";
    if (!text) {
      text = fallback(article, platform);
      source = "template";
    }

    const articleUrl = `${SITE_URL}/blog/${article.slug}`;
    const imageAbsolute = article.image?.startsWith("/")
      ? `${SITE_URL}${article.image}`
      : article.image || "";

    const instructions =
      platform === "gmb"
        ? [
            "1. Copie le texte (bouton ci-dessous).",
            "2. Télécharge l'image cover (bouton).",
            "3. Ouvre Google Business Profile → fiche Move in Paris.",
            "4. Clique « Ajouter une mise à jour » → colle le texte.",
            "5. Upload l'image cover.",
            "6. Ajoute le bouton « En savoir plus » avec l'URL de l'article.",
            "7. Publie.",
          ]
        : [
            "1. Copie le texte (bouton ci-dessous).",
            "2. Télécharge l'image cover (bouton).",
            "3. Va sur https://www.linkedin.com/company/moveinparis/admin/page-posts/published/",
            "4. Clique « Démarrer une publication ».",
            "5. Colle le texte.",
            "6. Ajoute l'image cover via l'icône image.",
            "7. Vérifie que les hashtags sont bien à la fin, publie.",
          ];

    const interfaceUrl =
      platform === "gmb"
        ? "https://www.google.com/search?q=Move+in+Paris+Etoile&hl=fr"
        : "https://www.linkedin.com/company/moveinparis/admin/page-posts/published/";

    return NextResponse.json({
      success: true,
      article: {
        slug: article.slug,
        title: article.title,
        public_url: articleUrl,
      },
      post: {
        platform,
        text,
        char_count: text.length,
        char_max: maxChars,
        image_url: imageAbsolute,
        cta: { label: "Lire l'article", url: articleUrl },
        source,
      },
      interface_url: interfaceUrl,
      instructions,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Erreur" },
      { status: 500 },
    );
  }
}
