import Anthropic from "@anthropic-ai/sdk";

type Apartment = {
  slug: string;
  title: string;
  address: string;
  district: string;
  surface: number;
  rooms: number;
  bedrooms: number;
  images: string[];
};

type Article = {
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  readTime: number;
  date: string;
  author: string;
  image: string;
  tags: string[];
  metaDescription: string;
  content: Array<{ type: string; text: string; level?: number }>;
  status?: "draft" | "published";
  apartment_slug?: string;
  apartment_cover?: string;
  idea_id?: string;
  created_at?: string;
  published_at?: string | null;
};

type Idea = {
  id: string;
  topic: string;
  angle: string;
  target_keywords: string[];
  priority_score: number;
  used: boolean;
  created_at: string;
  used_at: string | null;
  generated_article_slug: string | null;
  trend_source?: string;
};

export type GenerationError =
  | { kind: "no_key" }
  | { kind: "no_idea" }
  | { kind: "no_apartment" }
  | { kind: "api_error"; message: string }
  | { kind: "bad_response"; message: string };

export function isGenerationError(x: unknown): x is GenerationError {
  return typeof x === "object" && x !== null && "kind" in x;
}

/**
 * Pick the most recent apartment whose cover image has not been used yet by
 * any previously-generated article. Prefers status="À louer" / "Disponible".
 * Falls back to any apartment if all recent covers are already used.
 */
export function pickApartmentForArticle(
  apartments: Apartment[],
  articles: Article[],
): { apartment: Apartment; cover: string } | null {
  if (apartments.length === 0) return null;

  const usedCovers = new Set(
    articles
      .map((a) => a.apartment_cover || a.image)
      .filter((s): s is string => typeof s === "string" && s.length > 0),
  );

  // Recent first (admin appends to end of apartments.json — same convention
  // we already use for the public listing).
  const recent = [...apartments].reverse();

  for (const apt of recent) {
    if (!apt.images || apt.images.length === 0) continue;
    const cover = apt.images[0];
    if (!usedCovers.has(cover)) {
      return { apartment: apt, cover };
    }
  }

  // Every recent cover is used — fall back to a random unused image of any apartment.
  for (const apt of recent) {
    for (const img of apt.images || []) {
      if (!usedCovers.has(img)) return { apartment: apt, cover: img };
    }
  }

  // Hard fallback: oldest apartment first image.
  const fallback = apartments[0];
  return fallback?.images?.[0]
    ? { apartment: fallback, cover: fallback.images[0] }
    : null;
}

/**
 * Pick the top-priority unused idea from the pool.
 */
export function pickIdea(ideas: Idea[]): Idea | null {
  const available = ideas.filter((i) => !i.used);
  if (available.length === 0) return null;
  return available.sort((a, b) => b.priority_score - a.priority_score)[0];
}

function slugify(title: string): string {
  return title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

const SYSTEM_PROMPT = `Tu es rédacteur SEO senior pour Move in Paris, agence parisienne de location meublée corporate (bail société Code civil 1714-1762) fondée en 2018.

Cibles SEO : "location meublée société Paris" et longue traîne associée (bail société, DRH, expat, cadre, corporate housing).

Ton autorité :
- 56 appartements catalogue Paris 8e/16e/17e/La Défense/Neuilly
- +200 entreprises clientes (CAC 40, banques, conseil)
- 117 000+ nuits gérées
- 4,8/5 sur 61 avis Google
- Service 100 % gratuit propriétaire, toujours
- Court terme (≤12 mois) : 0 € locataire entreprise, 0 € dépôt de garantie
- Long terme (>12 mois) : 12,5 % HT loyer annuel à charge entreprise + 2 mois DG reversés intégralement au bailleur

Charte rédactionnelle :
- Voix éditoriale humaine (anti-AI detection) — variations de rythme, je/nous, anecdotes terrain, exemples chiffrés concrets
- Vouvoiement public
- Pas d'emojis, pas de superlatifs creux, pas de cadratin (—)
- Style premium discret à la Hermès/Cartier — pas de "ô la la"
- Citations de loi/source précises quand possible
- Sweet spot AI citability : passages de 134-167 mots auto-suffisants, premier passage donne LA réponse en 40 mots
- 5 FAQ obligatoires en fin d'article, réponses 100-150 mots
- Lien interne vers l'appartement fourni (paragraphe d'illustration) avec slug exact /appartement/[slug-fourni]
- Lien interne vers /location-meublee-entreprise (hub société) et au moins une page quartier
- Mention discrète des chiffres clés (200+ entreprises, 117 000 nuits, 4,8/5) MAX 2 fois dans l'article

INTERDICTIONS strictes :
- Pas de citation nominative de concurrents (Lodgis, Paris Attitude, MFP, Airbnb) — possible de dire "agences classiques" ou "plateformes touristiques"
- Pas de citation nominative de clients corporate (L'Oréal, LVMH, etc.) — dire "grandes entreprises du CAC 40", "banques d'affaires", "cabinets de conseil internationaux"
- Pas d'engagement de résultat juridique ou fiscal (toujours conditionnel : "généralement", "en règle générale", "consultez votre conseil")
- Pas d'emoji nulle part`;

function userPrompt(idea: Idea, apt: Apartment): string {
  const district = apt.district || "Paris";
  return `Rédige un article de blog complet de 2000 à 2800 mots sur le sujet suivant.

SUJET : ${idea.topic}

ANGLE ÉDITORIAL : ${idea.angle}

MOTS-CLÉS CIBLES (à intégrer naturellement, pas de bourrage) : ${idea.target_keywords.join(", ")}

APPARTEMENT À CITER COMME ILLUSTRATION (dans un paragraphe dédié au milieu de l'article) :
- Titre : ${apt.title}
- Adresse : ${apt.address}
- Quartier : ${district}
- Surface : ${apt.surface} m²
- Pièces : ${apt.rooms} pièces, ${apt.bedrooms} chambres
- Slug pour le lien interne : ${apt.slug}

STRUCTURE OBLIGATOIRE (renvoie un JSON strict, voir format ci-dessous) :
1. Excerpt de 180-220 caractères (pour la meta description et la carte blog)
2. Meta description SEO 140-160 caractères avec mot-clé principal
3. Category courte (ex: "Bail société", "Réglementation", "Mobilité internationale")
4. Tags : 4-6 tags pertinents
5. Content = tableau de blocs typés :
   - { "type": "p", "text": "..." }  → paragraphe
   - { "type": "h2", "text": "..." } → sous-titre principal (5-7 H2 dans l'article)
   - { "type": "h3", "text": "..." } → sous-sous-titre (optionnel sous chaque H2)
   - { "type": "faq-q", "text": "..." } → question FAQ
   - { "type": "faq-a", "text": "..." } → réponse FAQ
6. Première phrase d'intro = accroche journalistique (pas "Dans cet article")
7. Au milieu : 1 paragraphe d'illustration avec mention naturelle de l'appartement + lien markdown [voir cet appartement à ${district}](/appartement/${apt.slug})
8. Au minimum 1 lien markdown vers [/location-meublee-entreprise](/location-meublee-entreprise) ET 1 lien vers une page quartier pertinente parmi /location-meublee-entreprise-paris-8e, /location-meublee-entreprise-paris-16e, /location-meublee-entreprise-paris-17e, /location-meublee-entreprise-la-defense, /location-meublee-entreprise-neuilly
9. Section FAQ finale = exactement 5 paires faq-q/faq-a (réponses 100-150 mots)

FORMAT DE RÉPONSE — réponds UNIQUEMENT avec un objet JSON valide (pas de markdown wrapper, pas de prose) :
{
  "title": "...",
  "excerpt": "...",
  "metaDescription": "...",
  "category": "...",
  "tags": ["...", "...", "...", "...", "..."],
  "readTime": <nombre estimé en minutes, 2000 mots = ~10 min>,
  "content": [
    { "type": "p", "text": "..." },
    { "type": "h2", "text": "..." },
    ...
  ]
}`;
}

export async function generateArticle(
  idea: Idea,
  apartment: Apartment,
  cover: string,
): Promise<Article | GenerationError> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return { kind: "no_key" };

  const client = new Anthropic({ apiKey });

  let response;
  try {
    response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 8000,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userPrompt(idea, apartment) }],
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return { kind: "api_error", message };
  }

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    return { kind: "bad_response", message: "No text block in response" };
  }

  // Strip any accidental ```json fences from the model
  const cleaned = textBlock.text
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```\s*$/i, "")
    .trim();

  let parsed: {
    title?: string;
    excerpt?: string;
    metaDescription?: string;
    category?: string;
    tags?: string[];
    readTime?: number;
    content?: Array<{ type: string; text: string }>;
  };
  try {
    parsed = JSON.parse(cleaned);
  } catch (e) {
    return {
      kind: "bad_response",
      message: `Invalid JSON: ${e instanceof Error ? e.message : String(e)} — first 200 chars: ${cleaned.slice(0, 200)}`,
    };
  }

  if (!parsed.title || !parsed.content || !Array.isArray(parsed.content)) {
    return { kind: "bad_response", message: "Missing required fields (title / content)" };
  }

  const now = new Date().toISOString();
  const slug = slugify(parsed.title);

  const article: Article = {
    slug,
    title: parsed.title,
    excerpt: parsed.excerpt || "",
    category: parsed.category || "Location société",
    readTime: typeof parsed.readTime === "number" ? parsed.readTime : 10,
    date: now.slice(0, 10),
    author: "Move in Paris",
    image: cover,
    tags: Array.isArray(parsed.tags) ? parsed.tags : [],
    metaDescription: parsed.metaDescription || parsed.excerpt || "",
    content: parsed.content,
    status: "draft",
    apartment_slug: apartment.slug,
    apartment_cover: cover,
    idea_id: idea.id,
    created_at: now,
    published_at: null,
  };

  return article;
}

export type { Apartment, Article, Idea };
