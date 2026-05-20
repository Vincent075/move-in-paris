"use client";

import { useState, useEffect, useCallback } from "react";

type Block = { type: string; text: string };

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
  content: Block[];
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

type SocialPost = {
  platform: "gmb" | "linkedin";
  text: string;
  char_count: number;
  char_max: number;
  image_url: string;
  cta: { label: string; url: string };
  source: "claude" | "template";
};

type SocialDraft = {
  article: { slug: string; title: string; public_url: string };
  post: SocialPost;
  interface_url: string;
  instructions: string[];
};

type Toast = { type: "ok" | "err" | "info"; text: string } | null;

const GOLD = "#B88B58";
const GOLD_LIGHT = "#D4AF7A";
const DEEP = "#0D0D0D";

/**
 * Safe JSON parser : when Vercel returns an HTML error page (timeout, 502),
 * res.json() throws "Unexpected token 'A'…". This helper reads the body as
 * text first and tries to parse — if it fails, we surface a readable error.
 */
async function safeJsonFetch(url: string, init?: RequestInit): Promise<{
  ok: boolean;
  status: number;
  data: Record<string, unknown> | null;
  rawText?: string;
}> {
  let res: Response;
  try {
    res = await fetch(url, init);
  } catch (err) {
    return {
      ok: false,
      status: 0,
      data: { error: err instanceof Error ? err.message : "Network error" },
    };
  }
  const text = await res.text();
  let data: Record<string, unknown> | null = null;
  try {
    data = JSON.parse(text);
  } catch {
    // Server returned HTML or plain text (Vercel 504 timeout etc.)
    data = {
      error: text.slice(0, 200).replace(/<[^>]+>/g, "").trim() ||
        `HTTP ${res.status} (réponse non-JSON)`,
    };
  }
  return { ok: res.ok, status: res.status, data, rawText: text };
}

export default function BlogTab({ password }: { password: string }) {
  const [articles, setArticles] = useState<Article[]>([]);
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState<string | null>(null);
  const [quickGenerating, setQuickGenerating] = useState(false);
  const [quickSeed, setQuickSeed] = useState("");
  const [toast, setToast] = useState<Toast>(null);
  const [editingSlug, setEditingSlug] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<Article>>({});
  const [showIdeaForm, setShowIdeaForm] = useState(false);
  const [newIdea, setNewIdea] = useState({ topic: "", angle: "", keywords: "" });
  const [socialDraft, setSocialDraft] = useState<SocialDraft | null>(null);
  const [socialLoading, setSocialLoading] = useState<string | null>(null);
  const [socialError, setSocialError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<"all" | "draft" | "published">("all");
  const [ideasExpanded, setIdeasExpanded] = useState(false);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [a, i] = await Promise.all([
        safeJsonFetch(`/api/blog-action?password=${encodeURIComponent(password)}&type=articles`),
        safeJsonFetch(`/api/blog-action?password=${encodeURIComponent(password)}&type=ideas`),
      ]);
      const aData = a.data as { articles?: Article[]; error?: string };
      const iData = i.data as { ideas?: Idea[]; error?: string };
      if (aData?.articles) setArticles(aData.articles);
      else if (aData?.error) setToast({ type: "err", text: `Articles : ${aData.error}` });
      if (iData?.ideas) setIdeas(iData.ideas);
      else if (iData?.error) setToast({ type: "err", text: `Idées : ${iData.error}` });
    } catch (err) {
      setToast({ type: "err", text: err instanceof Error ? err.message : String(err) });
    }
    setLoading(false);
  }, [password]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  async function generateNow(ideaId?: string) {
    setGenerating(ideaId || "top");
    setToast({ type: "info", text: "Génération en cours via Claude Haiku 4.5 — environ 10-20 secondes." });
    const { ok, data } = await safeJsonFetch("/api/blog-generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password, idea_id: ideaId }),
    });
    const payload = data as {
      success?: boolean;
      article?: Article;
      used_apartment?: { title: string; slug: string };
      error?: string;
    };
    if (ok && payload?.success && payload.article) {
      setToast({
        type: "ok",
        text: `Article généré en draft : « ${payload.article.title} » — appart utilisé : ${payload.used_apartment?.title}. Relis et publie quand prêt.`,
      });
      fetchAll();
    } else {
      setToast({ type: "err", text: payload?.error || "Échec génération" });
    }
    setGenerating(null);
  }

  async function quickCreate(e: React.FormEvent) {
    e.preventDefault();
    if (quickSeed.trim().length < 3) {
      setToast({ type: "err", text: "Quelques mots-clés ou une idée (3 chars min)." });
      return;
    }
    setQuickGenerating(true);
    setToast({
      type: "info",
      text: "Création éclair : Haiku transforme ton idée en brief puis rédige l'article (~15-25 sec).",
    });
    const { ok, data } = await safeJsonFetch("/api/blog-quick-create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password, seed: quickSeed.trim() }),
    });
    const payload = data as {
      success?: boolean;
      article?: Article;
      expanded_idea?: { topic: string };
      used_apartment?: { title: string };
      error?: string;
    };
    if (ok && payload?.success && payload.article) {
      setToast({
        type: "ok",
        text: `Draft créé : « ${payload.article.title} » (à partir de ${payload.expanded_idea?.topic ? `« ${payload.expanded_idea.topic} »` : "ton idée"})`,
      });
      setQuickSeed("");
      fetchAll();
    } else {
      setToast({ type: "err", text: payload?.error || "Échec création éclair" });
    }
    setQuickGenerating(false);
  }

  async function ideaCreate(e: React.FormEvent) {
    e.preventDefault();
    if (newIdea.topic.trim().length < 5) {
      setToast({ type: "err", text: "Topic trop court (5 chars min)" });
      return;
    }
    const keywords = newIdea.keywords.split(",").map((s) => s.trim()).filter(Boolean);
    const { ok, data } = await safeJsonFetch("/api/blog-action", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        password,
        action: "idea_create",
        topic: newIdea.topic,
        angle: newIdea.angle,
        keywords,
      }),
    });
    const payload = data as { success?: boolean; error?: string };
    if (ok && payload?.success) {
      setToast({ type: "ok", text: "Idée ajoutée au pool." });
      setNewIdea({ topic: "", angle: "", keywords: "" });
      setShowIdeaForm(false);
      fetchAll();
    } else {
      setToast({ type: "err", text: payload?.error || "Échec ajout idée" });
    }
  }

  async function ideaDelete(id: string, topic: string) {
    if (!confirm(`Supprimer l'idée « ${topic.slice(0, 50)}… » ?`)) return;
    const { ok, data } = await safeJsonFetch("/api/blog-action", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password, action: "idea_delete", idea_id: id }),
    });
    const payload = data as { success?: boolean; error?: string };
    if (ok && payload?.success) {
      setToast({ type: "ok", text: "Idée supprimée." });
      fetchAll();
    } else {
      setToast({ type: "err", text: payload?.error || "Échec" });
    }
  }

  async function articleAction(slug: string, action: string, extra?: Record<string, unknown>) {
    const { ok, data } = await safeJsonFetch("/api/blog-action", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password, action, slug, ...extra }),
    });
    const payload = data as { success?: boolean; error?: string };
    if (ok && payload?.success) {
      setToast({ type: "ok", text: `Action « ${action} » OK. Vercel redéploie sous ~2 min.` });
      fetchAll();
      return true;
    }
    setToast({ type: "err", text: payload?.error || "Échec" });
    return false;
  }

  function startEdit(article: Article) {
    setEditingSlug(article.slug);
    setEditData({ ...article });
  }

  async function saveEdit() {
    if (!editingSlug) return;
    const ok = await articleAction(editingSlug, "article_update", {
      patch: {
        title: editData.title,
        excerpt: editData.excerpt,
        metaDescription: editData.metaDescription,
        category: editData.category,
        tags: editData.tags,
        readTime: editData.readTime,
        image: editData.image,
        content: editData.content,
      },
    });
    if (ok) {
      setEditingSlug(null);
      setEditData({});
    }
  }

  async function openSocial(slug: string, platform: "gmb" | "linkedin") {
    setSocialLoading(`${slug}-${platform}`);
    setSocialError(null);
    // Pop the modal immediately with a loader so Vincent gets instant visual
    // feedback (the fetch can take 5-15s for Claude to rewrite).
    setSocialDraft({
      article: { slug, title: "", public_url: "" },
      post: {
        platform,
        text: "",
        char_count: 0,
        char_max: platform === "gmb" ? 1500 : 3000,
        image_url: "",
        cta: { label: "", url: "" },
        source: "claude",
      },
      interface_url: "",
      instructions: [],
    });
    const { ok, data } = await safeJsonFetch("/api/blog-social-draft", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password, slug, platform }),
    });
    const payload = data as { success?: boolean; error?: string } & Partial<SocialDraft>;
    if (ok && payload?.success && payload.post) {
      setSocialDraft(payload as SocialDraft);
    } else {
      setSocialError(payload?.error || "Erreur génération post");
    }
    setSocialLoading(null);
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text).then(
      () => setToast({ type: "ok", text: "Copié dans le presse-papier." }),
      () => setToast({ type: "err", text: "Impossible de copier." }),
    );
  }

  const filteredArticles = articles
    .slice()
    .sort((a, b) => {
      const ad = a.created_at || a.date;
      const bd = b.created_at || b.date;
      return ad < bd ? 1 : -1;
    })
    .filter((a) => {
      if (statusFilter === "all") return true;
      const s = a.status || "published";
      return s === statusFilter;
    });

  const unusedIdeas = ideas
    .filter((i) => !i.used)
    .sort((a, b) => b.priority_score - a.priority_score);
  const visibleIdeas = ideasExpanded ? unusedIdeas : unusedIdeas.slice(0, 6);

  const draftCount = articles.filter((a) => (a.status || "published") === "draft").length;
  const publishedCount = articles.length - draftCount;

  return (
    <div className="space-y-10">
      {toast && (
        <div
          className={`p-4 text-sm flex items-start gap-3 ${
            toast.type === "ok"
              ? "bg-emerald-50 border border-emerald-200 text-emerald-900"
              : toast.type === "info"
                ? "bg-amber-50 border border-amber-200 text-amber-900"
                : "bg-rose-50 border border-rose-200 text-rose-900"
          }`}
          style={{ borderRadius: 4 }}
        >
          <span className="flex-1 leading-relaxed">{toast.text}</span>
          <button onClick={() => setToast(null)} className="text-lg leading-none opacity-60 hover:opacity-100">
            ×
          </button>
        </div>
      )}

      {/* ============ HERO BANNER ============ */}
      <header
        className="relative overflow-hidden text-white"
        style={{
          background: `linear-gradient(135deg, ${DEEP} 0%, #1F1A14 100%)`,
          borderRadius: 6,
        }}
      >
        <div
          aria-hidden
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 30%, rgba(184,139,88,0.6) 0%, transparent 50%), radial-gradient(circle at 80% 70%, rgba(184,139,88,0.4) 0%, transparent 50%)",
          }}
        />
        <div className="relative p-8 lg:p-10">
          <p className="text-[10px] uppercase tracking-[0.3em] mb-3" style={{ color: GOLD }}>
            Move in Paris · Editorial Engine
          </p>
          <h1 className="font-serif text-3xl lg:text-4xl mb-2">L&apos;art du contenu, automatisé.</h1>
          <p className="text-sm text-white/70 leading-relaxed max-w-2xl">
            Un article SEO/GEO mardi + vendredi à 9h. Idées du pool, ou création éclair à la demande
            depuis quelques mots-clés. Relis le draft, publie d&apos;un clic, diffuse en GMB et
            LinkedIn dans la foulée.
          </p>
          <div className="mt-6 grid grid-cols-3 gap-6 max-w-md">
            <Stat label="Articles publiés" value={publishedCount} />
            <Stat label="Drafts en attente" value={draftCount} accent={draftCount > 0} />
            <Stat label="Idées en pool" value={unusedIdeas.length} />
          </div>
        </div>
      </header>

      {/* ============ CRÉATION ÉCLAIR ============ */}
      <section
        className="bg-white border border-[#E8E4DF] p-6 lg:p-8"
        style={{ borderRadius: 6 }}
      >
        <div className="flex items-start justify-between mb-5 flex-wrap gap-3">
          <div>
            <h2 className="font-serif text-xl text-[#1A1A1A]">Création éclair</h2>
            <p className="text-xs text-[#6B6B6B] mt-1 max-w-xl">
              Tape une actualité, un sujet ou des mots-clés. Claude expand l&apos;idée en brief
              éditorial puis rédige l&apos;article complet — un draft en ~20 sec.
            </p>
          </div>
        </div>

        <form onSubmit={quickCreate} className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            value={quickSeed}
            onChange={(e) => setQuickSeed(e.target.value)}
            placeholder="Ex : loi anti-Airbnb 2026, salaire DRH expat, prix m² Trocadéro…"
            className="flex-1 px-4 py-3 border border-[#E8E4DF] text-sm focus:border-[#B88B58] focus:outline-none focus:ring-2 focus:ring-[#B88B58]/20"
            disabled={quickGenerating}
          />
          <button
            type="submit"
            disabled={quickGenerating || quickSeed.trim().length < 3}
            className="px-6 py-3 text-xs uppercase tracking-[0.15em] font-semibold text-[#0D0D0D] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              backgroundColor: quickGenerating ? "#6B6B6B" : GOLD,
              color: quickGenerating ? "white" : DEEP,
            }}
            onMouseEnter={(e) => {
              if (!quickGenerating) e.currentTarget.style.backgroundColor = GOLD_LIGHT;
            }}
            onMouseLeave={(e) => {
              if (!quickGenerating) e.currentTarget.style.backgroundColor = GOLD;
            }}
          >
            {quickGenerating ? "Rédaction…" : "Créer un draft"}
          </button>
        </form>
        <p className="text-[10px] text-[#9A8C7A] mt-3 italic">
          L&apos;article généré est en draft — relis avant de publier. Modèle : Claude Haiku 4.5.
        </p>
      </section>

      {/* ============ POOL D'IDÉES ============ */}
      <section
        className="bg-white border border-[#E8E4DF] p-6 lg:p-8"
        style={{ borderRadius: 6 }}
      >
        <div className="flex items-start justify-between mb-5 flex-wrap gap-3">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h2 className="font-serif text-xl text-[#1A1A1A]">Pool d&apos;idées</h2>
              <span
                className="text-[10px] uppercase tracking-[0.15em] px-2 py-0.5 font-semibold"
                style={{ backgroundColor: `${GOLD}15`, color: GOLD }}
              >
                {unusedIdeas.length} disponibles
              </span>
            </div>
            <p className="text-xs text-[#6B6B6B] max-w-2xl leading-relaxed">
              Mardi + vendredi 9h UTC, l&apos;agent IA pioche la priorité la plus haute et publie un
              draft. Tu peux aussi déclencher la génération sur une idée précise, ajouter
              manuellement une idée, ou supprimer celles devenues hors-sujet.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowIdeaForm((v) => !v)}
              className="px-4 py-2 text-xs uppercase tracking-[0.15em] border transition-all"
              style={{
                borderColor: GOLD,
                color: showIdeaForm ? "white" : GOLD,
                backgroundColor: showIdeaForm ? GOLD : "transparent",
              }}
            >
              {showIdeaForm ? "Fermer" : "+ Nouvelle idée"}
            </button>
            <button
              onClick={() => generateNow()}
              disabled={generating !== null || unusedIdeas.length === 0}
              className="px-5 py-2 text-xs uppercase tracking-[0.15em] font-semibold transition-all disabled:opacity-50"
              style={{
                backgroundColor: generating === "top" ? "#6B6B6B" : DEEP,
                color: "white",
              }}
              onMouseEnter={(e) => {
                if (!generating) e.currentTarget.style.backgroundColor = GOLD;
                if (!generating) e.currentTarget.style.color = DEEP;
              }}
              onMouseLeave={(e) => {
                if (!generating) e.currentTarget.style.backgroundColor = DEEP;
                if (!generating) e.currentTarget.style.color = "white";
              }}
            >
              {generating === "top" ? "Génération…" : "Générer la top idée"}
            </button>
          </div>
        </div>

        {showIdeaForm && (
          <form
            onSubmit={ideaCreate}
            className="mb-6 p-5 border border-[#E8E4DF] space-y-3"
            style={{ backgroundColor: "#FAFAF8", borderRadius: 4 }}
          >
            <input
              type="text"
              required
              minLength={5}
              placeholder="Topic — sujet de l'article (5 chars min)"
              value={newIdea.topic}
              onChange={(e) => setNewIdea({ ...newIdea, topic: e.target.value })}
              className="w-full px-3 py-2 border border-[#E8E4DF] text-sm focus:border-[#B88B58] focus:outline-none bg-white"
            />
            <textarea
              rows={2}
              placeholder="Angle éditorial — comment traiter le sujet (optionnel)"
              value={newIdea.angle}
              onChange={(e) => setNewIdea({ ...newIdea, angle: e.target.value })}
              className="w-full px-3 py-2 border border-[#E8E4DF] text-sm focus:border-[#B88B58] focus:outline-none bg-white resize-y"
            />
            <input
              type="text"
              placeholder="Mots-clés SEO séparés par virgules"
              value={newIdea.keywords}
              onChange={(e) => setNewIdea({ ...newIdea, keywords: e.target.value })}
              className="w-full px-3 py-2 border border-[#E8E4DF] text-sm focus:border-[#B88B58] focus:outline-none bg-white"
            />
            <div className="flex gap-2">
              <button
                type="submit"
                className="px-4 py-2 text-xs uppercase tracking-[0.15em] font-semibold"
                style={{ backgroundColor: GOLD, color: DEEP }}
              >
                Ajouter au pool
              </button>
              <button
                type="button"
                onClick={() => setShowIdeaForm(false)}
                className="px-4 py-2 text-xs uppercase tracking-[0.15em] text-[#6B6B6B] hover:text-[#1A1A1A]"
              >
                Annuler
              </button>
            </div>
          </form>
        )}

        {loading ? (
          <Skeleton lines={3} />
        ) : unusedIdeas.length === 0 ? (
          <EmptyState
            title="Pool vide"
            subtitle="Le prochain cron remplira automatiquement, ou ajoute une idée via le bouton ci-dessus."
          />
        ) : (
          <>
            <div className="space-y-2">
              {visibleIdeas.map((idea, idx) => (
                <IdeaCard
                  key={idea.id}
                  idea={idea}
                  rank={idx + 1}
                  loading={generating === idea.id}
                  disabled={generating !== null}
                  onGenerate={() => generateNow(idea.id)}
                  onDelete={() => ideaDelete(idea.id, idea.topic)}
                />
              ))}
            </div>
            {unusedIdeas.length > 6 && (
              <button
                onClick={() => setIdeasExpanded((v) => !v)}
                className="mt-3 text-xs uppercase tracking-[0.15em] hover:underline"
                style={{ color: GOLD }}
              >
                {ideasExpanded
                  ? "Réduire"
                  : `Voir les ${unusedIdeas.length - 6} idées restantes →`}
              </button>
            )}
          </>
        )}
      </section>

      {/* ============ ARTICLES ============ */}
      <section
        className="bg-white border border-[#E8E4DF] p-6 lg:p-8"
        style={{ borderRadius: 6 }}
      >
        <div className="flex items-start justify-between mb-5 flex-wrap gap-3">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h2 className="font-serif text-xl text-[#1A1A1A]">Articles</h2>
              <span className="text-[10px] uppercase tracking-[0.15em] text-[#9A8C7A]">
                {articles.length} au total · {draftCount} draft · {publishedCount} publiés
              </span>
            </div>
            <p className="text-xs text-[#6B6B6B]">
              Drafts (badge ambre) à relire avant publication. Publiés (vert) sont visibles
              publiquement. Génère un post GMB ou LinkedIn en un clic depuis un article publié.
            </p>
          </div>
          <div className="flex gap-1">
            {(["all", "draft", "published"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className="px-3 py-1.5 text-[10px] uppercase tracking-[0.15em] border transition-all"
                style={{
                  borderColor: statusFilter === s ? DEEP : "#E8E4DF",
                  backgroundColor: statusFilter === s ? DEEP : "white",
                  color: statusFilter === s ? "white" : "#6B6B6B",
                }}
              >
                {s === "all" ? "Tous" : s === "draft" ? `Drafts (${draftCount})` : `Publiés (${publishedCount})`}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <Skeleton lines={4} />
        ) : filteredArticles.length === 0 ? (
          <EmptyState
            title="Aucun article dans ce filtre"
            subtitle="Génère ton premier draft via la création éclair ou le pool d'idées ci-dessus."
          />
        ) : (
          <div className="space-y-3">
            {filteredArticles.map((a) =>
              editingSlug === a.slug ? (
                <ArticleEditor
                  key={a.slug}
                  article={a}
                  editData={editData}
                  setEditData={setEditData}
                  onSave={saveEdit}
                  onCancel={() => {
                    setEditingSlug(null);
                    setEditData({});
                  }}
                />
              ) : (
                <ArticleCard
                  key={a.slug}
                  article={a}
                  onEdit={() => startEdit(a)}
                  onPublish={() => articleAction(a.slug, "article_publish")}
                  onUnpublish={() => articleAction(a.slug, "article_unpublish")}
                  onDelete={() => {
                    if (confirm(`Supprimer définitivement « ${a.title.slice(0, 60)}… » ?`)) {
                      articleAction(a.slug, "article_delete");
                    }
                  }}
                  onGMB={() => openSocial(a.slug, "gmb")}
                  onLinkedIn={() => openSocial(a.slug, "linkedin")}
                  socialLoading={socialLoading}
                />
              ),
            )}
          </div>
        )}
      </section>

      {socialDraft && (
        <SocialDraftModal
          draft={socialDraft}
          loading={socialLoading !== null}
          error={socialError}
          onClose={() => {
            setSocialDraft(null);
            setSocialError(null);
          }}
          onCopy={copyToClipboard}
        />
      )}
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <div>
      <div
        className="font-serif text-2xl lg:text-3xl"
        style={{ color: accent ? GOLD : "white" }}
      >
        {value}
      </div>
      <div className="text-[10px] uppercase tracking-[0.15em] text-white/50 mt-1">{label}</div>
    </div>
  );
}

function Skeleton({ lines }: { lines: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="h-16 bg-[#FAFAF8] border border-[#E8E4DF] animate-pulse"
          style={{ borderRadius: 4 }}
        />
      ))}
    </div>
  );
}

function EmptyState({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div
      className="text-center py-10 border border-dashed border-[#E8E4DF]"
      style={{ borderRadius: 4 }}
    >
      <p className="font-serif text-base text-[#1A1A1A] mb-1">{title}</p>
      <p className="text-xs text-[#6B6B6B] max-w-md mx-auto leading-relaxed">{subtitle}</p>
    </div>
  );
}

function IdeaCard({
  idea,
  rank,
  loading,
  disabled,
  onGenerate,
  onDelete,
}: {
  idea: Idea;
  rank: number;
  loading: boolean;
  disabled: boolean;
  onGenerate: () => void;
  onDelete: () => void;
}) {
  return (
    <div
      className="group flex items-start gap-4 p-4 bg-white border border-[#E8E4DF] hover:border-[#B88B58]/60 transition-all"
      style={{ borderRadius: 4 }}
    >
      <div
        className="flex-shrink-0 w-10 h-10 flex flex-col items-center justify-center text-[10px] font-mono"
        style={{ backgroundColor: `${GOLD}10`, color: GOLD, borderRadius: 4 }}
      >
        <div className="text-[8px] uppercase tracking-wider opacity-60">#{rank}</div>
        <div className="text-xs font-semibold">{idea.priority_score}</div>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-[#1A1A1A] font-medium leading-snug">{idea.topic}</p>
        <p className="text-xs text-[#6B6B6B] mt-1 leading-relaxed line-clamp-2">{idea.angle}</p>
        {idea.target_keywords.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {idea.target_keywords.slice(0, 4).map((kw) => (
              <span
                key={kw}
                className="text-[10px] px-2 py-0.5 text-[#9A8C7A]"
                style={{ backgroundColor: "#FAFAF8", borderRadius: 2 }}
              >
                {kw}
              </span>
            ))}
          </div>
        )}
      </div>
      <div className="flex flex-col gap-1 flex-shrink-0">
        <button
          onClick={onGenerate}
          disabled={disabled}
          className="px-3 py-1.5 text-[10px] uppercase tracking-[0.15em] font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          style={{
            backgroundColor: loading ? "#6B6B6B" : "transparent",
            color: loading ? "white" : GOLD,
            border: `1px solid ${GOLD}`,
          }}
          onMouseEnter={(e) => {
            if (!disabled) {
              e.currentTarget.style.backgroundColor = GOLD;
              e.currentTarget.style.color = "white";
            }
          }}
          onMouseLeave={(e) => {
            if (!disabled && !loading) {
              e.currentTarget.style.backgroundColor = "transparent";
              e.currentTarget.style.color = GOLD;
            }
          }}
        >
          {loading ? "..." : "Générer"}
        </button>
        <button
          onClick={onDelete}
          className="px-3 py-1 text-[10px] text-[#9A8C7A] hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          Supprimer
        </button>
      </div>
    </div>
  );
}

function ArticleCard({
  article,
  onEdit,
  onPublish,
  onUnpublish,
  onDelete,
  onGMB,
  onLinkedIn,
  socialLoading,
}: {
  article: Article;
  onEdit: () => void;
  onPublish: () => void;
  onUnpublish: () => void;
  onDelete: () => void;
  onGMB: () => void;
  onLinkedIn: () => void;
  socialLoading: string | null;
}) {
  const isDraft = (article.status || "published") === "draft";
  const gmbLoading = socialLoading === `${article.slug}-gmb`;
  const liLoading = socialLoading === `${article.slug}-linkedin`;

  return (
    <div
      className="group bg-white border border-[#E8E4DF] hover:border-[#B88B58]/40 hover:shadow-sm transition-all"
      style={{ borderRadius: 4 }}
    >
      <div className="flex">
        <div
          className="w-28 h-28 flex-shrink-0 bg-cover bg-center"
          style={{
            backgroundImage: article.image ? `url('${article.image}')` : "none",
            backgroundColor: "#E8E4DF",
          }}
        />
        <div className="flex-1 min-w-0 p-4">
          <div className="flex items-start justify-between gap-3 mb-2">
            <div className="min-w-0">
              <h3 className="font-serif text-base text-[#1A1A1A] leading-snug line-clamp-1">
                {article.title}
              </h3>
              <p className="text-xs text-[#6B6B6B] mt-1 line-clamp-2 leading-relaxed">
                {article.excerpt}
              </p>
            </div>
            <span
              className="flex-shrink-0 px-2 py-0.5 text-[10px] uppercase tracking-[0.15em] font-semibold"
              style={
                isDraft
                  ? { backgroundColor: "#FEF3C7", color: "#92400E", borderRadius: 2 }
                  : { backgroundColor: "#D1FAE5", color: "#065F46", borderRadius: 2 }
              }
            >
              {isDraft ? "Draft" : "Publié"}
            </span>
          </div>
          <div className="flex items-center gap-2 text-[10px] text-[#9A8C7A] mb-3">
            <span>{article.category}</span>
            <span>·</span>
            <span>{article.date}</span>
            <span>·</span>
            <span>{article.readTime} min de lecture</span>
            {article.apartment_slug && (
              <>
                <span>·</span>
                <span style={{ color: GOLD }}>↳ {article.apartment_slug}</span>
              </>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={onEdit}
              className="px-3 py-1.5 text-[10px] uppercase tracking-[0.15em] border transition-all"
              style={{ borderColor: GOLD, color: GOLD }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = GOLD;
                e.currentTarget.style.color = "white";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "transparent";
                e.currentTarget.style.color = GOLD;
              }}
            >
              Modifier
            </button>
            {isDraft ? (
              <button
                onClick={onPublish}
                className="px-3 py-1.5 text-[10px] uppercase tracking-[0.15em] font-semibold text-white bg-emerald-600 hover:bg-emerald-700"
              >
                ✓ Publier
              </button>
            ) : (
              <>
                <a
                  href={`/blog/${article.slug}`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1.5 text-[10px] uppercase tracking-[0.15em] border border-[#E8E4DF] text-[#6B6B6B] hover:border-[#B88B58] hover:text-[#B88B58]"
                >
                  Voir live
                </a>
                <button
                  onClick={onUnpublish}
                  className="px-3 py-1.5 text-[10px] uppercase tracking-[0.15em] text-amber-700 hover:text-amber-900"
                >
                  Dépublier
                </button>
                <button
                  onClick={onGMB}
                  disabled={gmbLoading}
                  className="px-3 py-1.5 text-[10px] uppercase tracking-[0.15em] font-semibold transition-all disabled:opacity-60"
                  style={{ backgroundColor: gmbLoading ? "#6B6B6B" : DEEP, color: "white" }}
                  onMouseEnter={(e) => {
                    if (!gmbLoading) {
                      e.currentTarget.style.backgroundColor = GOLD;
                      e.currentTarget.style.color = DEEP;
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!gmbLoading) {
                      e.currentTarget.style.backgroundColor = DEEP;
                      e.currentTarget.style.color = "white";
                    }
                  }}
                  title="Générer un post Google Business Profile"
                >
                  {gmbLoading ? "..." : "Post GMB"}
                </button>
                <button
                  onClick={onLinkedIn}
                  disabled={liLoading}
                  className="px-3 py-1.5 text-[10px] uppercase tracking-[0.15em] font-semibold text-white transition-all disabled:opacity-60"
                  style={{ backgroundColor: liLoading ? "#6B6B6B" : "#0A66C2" }}
                  title="Générer un post LinkedIn"
                >
                  {liLoading ? "..." : "Post LinkedIn"}
                </button>
              </>
            )}
            <button
              onClick={onDelete}
              className="ml-auto px-3 py-1.5 text-[10px] uppercase tracking-[0.15em] text-[#9A8C7A] hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              Supprimer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ArticleEditor({
  article,
  editData,
  setEditData,
  onSave,
  onCancel,
}: {
  article: Article;
  editData: Partial<Article>;
  setEditData: React.Dispatch<React.SetStateAction<Partial<Article>>>;
  onSave: () => void;
  onCancel: () => void;
}) {
  const contentText = JSON.stringify(editData.content || [], null, 2);
  return (
    <div
      className="border-2 p-6 space-y-4"
      style={{ borderColor: GOLD, backgroundColor: "#FAFAF8", borderRadius: 4 }}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-[0.15em] text-[#9A8C7A]">Édition</p>
          <h3 className="font-serif text-lg text-[#1A1A1A]">{article.title}</h3>
        </div>
        <button onClick={onCancel} className="text-[#6B6B6B] text-sm hover:text-rose-500">
          Fermer sans enregistrer
        </button>
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <label className="block text-[10px] uppercase tracking-[0.15em] text-[#6B6B6B] mb-1">Titre</label>
          <input
            value={editData.title || ""}
            onChange={(e) => setEditData({ ...editData, title: e.target.value })}
            className="w-full px-3 py-2 border border-[#E8E4DF] text-sm focus:border-[#B88B58] focus:outline-none bg-white"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-[10px] uppercase tracking-[0.15em] text-[#6B6B6B] mb-1">Excerpt</label>
          <textarea
            rows={2}
            value={editData.excerpt || ""}
            onChange={(e) => setEditData({ ...editData, excerpt: e.target.value })}
            className="w-full px-3 py-2 border border-[#E8E4DF] text-sm focus:border-[#B88B58] focus:outline-none bg-white resize-y"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-[10px] uppercase tracking-[0.15em] text-[#6B6B6B] mb-1">
            Meta description SEO ({(editData.metaDescription || "").length} / 160)
          </label>
          <input
            value={editData.metaDescription || ""}
            onChange={(e) => setEditData({ ...editData, metaDescription: e.target.value })}
            className="w-full px-3 py-2 border border-[#E8E4DF] text-sm focus:border-[#B88B58] focus:outline-none bg-white"
          />
        </div>
        <div>
          <label className="block text-[10px] uppercase tracking-[0.15em] text-[#6B6B6B] mb-1">Category</label>
          <input
            value={editData.category || ""}
            onChange={(e) => setEditData({ ...editData, category: e.target.value })}
            className="w-full px-3 py-2 border border-[#E8E4DF] text-sm focus:border-[#B88B58] focus:outline-none bg-white"
          />
        </div>
        <div>
          <label className="block text-[10px] uppercase tracking-[0.15em] text-[#6B6B6B] mb-1">Read time (min)</label>
          <input
            type="number"
            value={editData.readTime || 0}
            onChange={(e) => setEditData({ ...editData, readTime: parseInt(e.target.value) })}
            className="w-full px-3 py-2 border border-[#E8E4DF] text-sm focus:border-[#B88B58] focus:outline-none bg-white"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-[10px] uppercase tracking-[0.15em] text-[#6B6B6B] mb-1">Tags (séparés par virgules)</label>
          <input
            value={(editData.tags || []).join(", ")}
            onChange={(e) =>
              setEditData({
                ...editData,
                tags: e.target.value.split(",").map((s) => s.trim()).filter(Boolean),
              })
            }
            className="w-full px-3 py-2 border border-[#E8E4DF] text-sm focus:border-[#B88B58] focus:outline-none bg-white"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-[10px] uppercase tracking-[0.15em] text-[#6B6B6B] mb-1">Image cover</label>
          <input
            value={editData.image || ""}
            onChange={(e) => setEditData({ ...editData, image: e.target.value })}
            className="w-full px-3 py-2 border border-[#E8E4DF] text-xs focus:border-[#B88B58] focus:outline-none bg-white font-mono"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-[10px] uppercase tracking-[0.15em] text-[#6B6B6B] mb-1">
            Content (JSON — blocs p / h2 / h3 / faq-q / faq-a)
          </label>
          <textarea
            rows={18}
            value={contentText}
            onChange={(e) => {
              try {
                const parsed = JSON.parse(e.target.value);
                setEditData({ ...editData, content: parsed });
              } catch {
                /* user is mid-typing, keep last valid */
              }
            }}
            className="w-full px-3 py-2 border border-[#E8E4DF] text-[11px] focus:border-[#B88B58] focus:outline-none bg-white font-mono resize-y"
          />
        </div>
      </div>
      <div className="flex gap-2 pt-2">
        <button
          onClick={onSave}
          className="px-6 py-2 text-xs uppercase tracking-[0.15em] font-semibold transition-all"
          style={{ backgroundColor: GOLD, color: DEEP }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = GOLD_LIGHT)}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = GOLD)}
        >
          Enregistrer les modifications
        </button>
        <button onClick={onCancel} className="px-4 py-2 text-xs text-[#6B6B6B] hover:text-rose-500">
          Annuler
        </button>
      </div>
    </div>
  );
}

function SocialDraftModal({
  draft,
  loading,
  error,
  onClose,
  onCopy,
}: {
  draft: SocialDraft;
  loading: boolean;
  error: string | null;
  onClose: () => void;
  onCopy: (text: string) => void;
}) {
  const isGMB = draft.post.platform === "gmb";
  const accent = isGMB ? DEEP : "#0A66C2";
  const platformLabel = isGMB ? "Google Business Profile" : "LinkedIn";

  return (
    <div
      className="fixed inset-0 bg-black/70 z-[100] flex items-start justify-center p-4 overflow-y-auto"
      onClick={onClose}
      style={{ backdropFilter: "blur(4px)" }}
    >
      <div
        className="bg-white max-w-2xl w-full my-8 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        style={{ borderRadius: 6 }}
      >
        <div
          className="p-6 flex items-center justify-between sticky top-0 z-10 text-white"
          style={{ backgroundColor: accent, borderRadius: "6px 6px 0 0" }}
        >
          <div>
            <p className="text-[10px] uppercase tracking-[0.3em] opacity-70">Post pour {platformLabel}</p>
            <h3 className="font-serif text-xl mt-1">
              {loading ? "Génération en cours…" : draft.article.title || "Brouillon"}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-3xl leading-none opacity-70 hover:opacity-100 transition-opacity"
          >
            ×
          </button>
        </div>

        {loading ? (
          <div className="p-10 text-center">
            <div
              className="inline-block w-8 h-8 border-2 border-t-transparent rounded-full animate-spin"
              style={{ borderColor: accent, borderTopColor: "transparent" }}
            />
            <p className="text-sm text-[#6B6B6B] mt-4">
              Claude réécrit l&apos;article pour {platformLabel} — environ 5-10 secondes.
            </p>
          </div>
        ) : error ? (
          <div className="p-8 text-center">
            <p className="text-rose-600 font-medium mb-2">Échec de génération</p>
            <p className="text-sm text-[#6B6B6B]">{error}</p>
            <button
              onClick={onClose}
              className="mt-6 px-5 py-2 text-xs uppercase tracking-[0.15em] border border-[#E8E4DF]"
            >
              Fermer
            </button>
          </div>
        ) : (
          <div className="p-6 space-y-5">
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-[10px] uppercase tracking-[0.15em] text-[#6B6B6B]">Texte à coller</h4>
                <span className="text-[10px] text-[#9A8C7A]">
                  {draft.post.char_count} / {draft.post.char_max} chars
                  {draft.post.source === "template" && " · template fallback"}
                </span>
              </div>
              <textarea
                readOnly
                rows={isGMB ? 9 : 14}
                value={draft.post.text}
                className="w-full px-4 py-3 border border-[#E8E4DF] text-sm font-sans whitespace-pre-wrap focus:border-[#B88B58] focus:outline-none bg-[#FAFAF8] leading-relaxed"
              />
              <div className="flex flex-wrap gap-2 mt-3">
                <button
                  onClick={() => onCopy(draft.post.text)}
                  className="px-4 py-2 text-xs uppercase tracking-[0.15em] font-semibold text-white transition-all"
                  style={{ backgroundColor: accent }}
                >
                  Copier le texte
                </button>
                {draft.post.image_url && (
                  <a
                    href={draft.post.image_url}
                    download
                    target="_blank"
                    rel="noreferrer"
                    className="px-4 py-2 text-xs uppercase tracking-[0.15em] border border-[#E8E4DF] text-[#1A1A1A] hover:border-[#B88B58]"
                  >
                    Télécharger l&apos;image
                  </a>
                )}
                <a
                  href={draft.interface_url}
                  target="_blank"
                  rel="noreferrer"
                  className="ml-auto px-4 py-2 text-xs uppercase tracking-[0.15em] font-semibold text-white transition-all"
                  style={{ backgroundColor: accent }}
                >
                  Ouvrir {isGMB ? "GMB" : "LinkedIn"} →
                </a>
              </div>
            </div>
            <div className="border-t border-[#E8E4DF] pt-4">
              <h4 className="text-[10px] uppercase tracking-[0.15em] text-[#6B6B6B] mb-2">CTA</h4>
              <p className="text-sm">
                <strong>{draft.post.cta.label}</strong>{" "}
                <a
                  href={draft.post.cta.url}
                  target="_blank"
                  rel="noreferrer"
                  className="underline ml-1"
                  style={{ color: GOLD }}
                >
                  {draft.post.cta.url}
                </a>
              </p>
            </div>
            <div className="border-t border-[#E8E4DF] pt-4">
              <h4 className="text-[10px] uppercase tracking-[0.15em] text-[#6B6B6B] mb-2">Instructions</h4>
              <ol className="text-xs text-[#6B6B6B] space-y-1.5 list-decimal list-inside leading-relaxed">
                {draft.instructions.map((line, i) => (
                  <li key={i}>{line.replace(/^\d+\.\s*/, "")}</li>
                ))}
              </ol>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
