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

export default function BlogTab({ password }: { password: string }) {
  const [articles, setArticles] = useState<Article[]>([]);
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [editingSlug, setEditingSlug] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<Article>>({});
  const [showIdeaForm, setShowIdeaForm] = useState(false);
  const [newIdea, setNewIdea] = useState({ topic: "", angle: "", keywords: "" });
  const [socialDraft, setSocialDraft] = useState<SocialDraft | null>(null);
  const [socialLoading, setSocialLoading] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<"all" | "draft" | "published">("all");

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [aRes, iRes] = await Promise.all([
        fetch(`/api/blog-action?password=${encodeURIComponent(password)}&type=articles`),
        fetch(`/api/blog-action?password=${encodeURIComponent(password)}&type=ideas`),
      ]);
      const [aData, iData] = await Promise.all([aRes.json(), iRes.json()]);
      if (aData.articles) setArticles(aData.articles);
      else if (aData.error) setMessage({ type: "err", text: `Articles: ${aData.error}` });
      if (iData.ideas) setIdeas(iData.ideas);
      else if (iData.error) setMessage({ type: "err", text: `Idées: ${iData.error}` });
    } catch (err) {
      const m = err instanceof Error ? err.message : String(err);
      setMessage({ type: "err", text: `Erreur de connexion: ${m}` });
    }
    setLoading(false);
  }, [password]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  async function generateNow(ideaId?: string) {
    const label = ideaId || "top-priority";
    setGenerating(label);
    setMessage(null);
    try {
      const res = await fetch("/api/blog-generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password, idea_id: ideaId }),
      });
      const data = await res.json();
      if (data.success) {
        setMessage({
          type: "ok",
          text: `Article généré : "${data.article.title}" — appartement utilisé : ${data.used_apartment.title}. Status: draft, à relire avant publication.`,
        });
        fetchAll();
      } else {
        setMessage({ type: "err", text: data.error || "Échec génération" });
      }
    } catch (err) {
      const m = err instanceof Error ? err.message : String(err);
      setMessage({ type: "err", text: m });
    }
    setGenerating(null);
  }

  async function ideaCreate(e: React.FormEvent) {
    e.preventDefault();
    if (newIdea.topic.trim().length < 5) {
      setMessage({ type: "err", text: "Topic trop court (5 chars min)" });
      return;
    }
    const keywords = newIdea.keywords
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    try {
      const res = await fetch("/api/blog-action", {
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
      const data = await res.json();
      if (data.success) {
        setMessage({ type: "ok", text: "Idée ajoutée au pool." });
        setNewIdea({ topic: "", angle: "", keywords: "" });
        setShowIdeaForm(false);
        fetchAll();
      } else {
        setMessage({ type: "err", text: data.error });
      }
    } catch (err) {
      const m = err instanceof Error ? err.message : String(err);
      setMessage({ type: "err", text: m });
    }
  }

  async function ideaDelete(id: string, topic: string) {
    if (!confirm(`Supprimer l'idée "${topic.slice(0, 50)}…" ?`)) return;
    try {
      const res = await fetch("/api/blog-action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password, action: "idea_delete", idea_id: id }),
      });
      const data = await res.json();
      if (data.success) {
        setMessage({ type: "ok", text: "Idée supprimée." });
        fetchAll();
      } else {
        setMessage({ type: "err", text: data.error });
      }
    } catch (err) {
      const m = err instanceof Error ? err.message : String(err);
      setMessage({ type: "err", text: m });
    }
  }

  async function articleAction(slug: string, action: string, extra?: Record<string, unknown>) {
    try {
      const res = await fetch("/api/blog-action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password, action, slug, ...extra }),
      });
      const data = await res.json();
      if (data.success) {
        setMessage({ type: "ok", text: `Action "${action}" OK. Vercel redéploie dans ~2 min.` });
        fetchAll();
        return true;
      }
      setMessage({ type: "err", text: data.error });
      return false;
    } catch (err) {
      const m = err instanceof Error ? err.message : String(err);
      setMessage({ type: "err", text: m });
      return false;
    }
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
    try {
      const res = await fetch("/api/blog-social-draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password, slug, platform }),
      });
      const data = await res.json();
      if (data.success) {
        setSocialDraft(data);
      } else {
        setMessage({ type: "err", text: data.error });
      }
    } catch (err) {
      const m = err instanceof Error ? err.message : String(err);
      setMessage({ type: "err", text: m });
    }
    setSocialLoading(null);
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text).then(
      () => setMessage({ type: "ok", text: "Copié dans le presse-papier." }),
      () => setMessage({ type: "err", text: "Impossible de copier." }),
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

  return (
    <div className="space-y-8">
      {message && (
        <div
          className={`p-3 text-sm rounded ${message.type === "ok" ? "bg-green-50 border border-green-200 text-green-800" : "bg-red-50 border border-red-200 text-red-800"}`}
        >
          {message.text}
          <button onClick={() => setMessage(null)} className="float-right text-lg leading-none">
            ×
          </button>
        </div>
      )}

      {/* ============ POOL D'IDÉES ============ */}
      <section className="bg-white border border-[#E8E4DF] p-6">
        <div className="flex items-start justify-between mb-4 flex-wrap gap-3">
          <div>
            <h2 className="font-serif text-xl text-[#1A1A1A]">
              Pool d&apos;idées ({unusedIdeas.length} disponibles)
            </h2>
            <p className="text-xs text-[#6B6B6B] mt-1">
              L&apos;agent IA pioche dans cette liste 2 × par semaine (mardi + vendredi 9h).
              Tu peux aussi générer un article à la demande depuis une idée précise.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowIdeaForm((v) => !v)}
              className="px-4 py-2 text-xs uppercase tracking-wider border border-[#B88B58] text-[#B88B58] hover:bg-[#B88B58] hover:text-white"
            >
              + Nouvelle idée
            </button>
            <button
              onClick={() => generateNow()}
              disabled={generating !== null || unusedIdeas.length === 0}
              className={`px-4 py-2 text-xs uppercase tracking-wider font-semibold ${
                generating
                  ? "bg-[#6B6B6B] text-white cursor-wait"
                  : "bg-[#B88B58] text-[#0D0D0D] hover:bg-[#D4AF7A]"
              }`}
            >
              {generating === "top-priority" ? "Génération…" : "🤖 Générer maintenant"}
            </button>
          </div>
        </div>

        {showIdeaForm && (
          <form onSubmit={ideaCreate} className="mb-6 p-4 bg-[#FAFAF8] border border-[#E8E4DF] space-y-3">
            <input
              type="text"
              required
              minLength={5}
              placeholder="Topic (sujet de l'article)"
              value={newIdea.topic}
              onChange={(e) => setNewIdea({ ...newIdea, topic: e.target.value })}
              className="w-full px-3 py-2 border border-[#E8E4DF] text-sm focus:border-[#B88B58] focus:outline-none"
            />
            <textarea
              rows={2}
              placeholder="Angle éditorial (optionnel — comment traiter le sujet)"
              value={newIdea.angle}
              onChange={(e) => setNewIdea({ ...newIdea, angle: e.target.value })}
              className="w-full px-3 py-2 border border-[#E8E4DF] text-sm focus:border-[#B88B58] focus:outline-none"
            />
            <input
              type="text"
              placeholder="Mots-clés SEO séparés par virgules"
              value={newIdea.keywords}
              onChange={(e) => setNewIdea({ ...newIdea, keywords: e.target.value })}
              className="w-full px-3 py-2 border border-[#E8E4DF] text-sm focus:border-[#B88B58] focus:outline-none"
            />
            <div className="flex gap-2">
              <button type="submit" className="px-4 py-2 text-xs uppercase tracking-wider bg-[#B88B58] text-[#0D0D0D] hover:bg-[#D4AF7A]">
                Ajouter
              </button>
              <button
                type="button"
                onClick={() => setShowIdeaForm(false)}
                className="px-4 py-2 text-xs uppercase tracking-wider text-[#6B6B6B] hover:text-[#1A1A1A]"
              >
                Annuler
              </button>
            </div>
          </form>
        )}

        {loading ? (
          <p className="text-center py-8 text-[#6B6B6B] text-sm">Chargement…</p>
        ) : unusedIdeas.length === 0 ? (
          <p className="text-center py-6 text-[#6B6B6B] text-sm italic">
            Pool vide. Ajoute des idées ou attends le prochain cron.
          </p>
        ) : (
          <div className="space-y-2">
            {unusedIdeas.slice(0, 10).map((idea) => (
              <div
                key={idea.id}
                className="flex items-start gap-3 p-3 bg-[#FAFAF8] border border-[#E8E4DF] hover:border-[#B88B58]/50 transition-colors"
              >
                <div className="text-[10px] font-mono bg-[#B88B58]/10 text-[#B88B58] px-2 py-0.5 mt-0.5">
                  {idea.priority_score}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-[#1A1A1A] font-medium">{idea.topic}</p>
                  <p className="text-xs text-[#6B6B6B] mt-1 leading-relaxed">{idea.angle}</p>
                  {idea.target_keywords.length > 0 && (
                    <p className="text-[10px] text-[#9A8C7A] mt-1 italic">
                      {idea.target_keywords.join(" · ")}
                    </p>
                  )}
                </div>
                <div className="flex flex-col gap-1 flex-shrink-0">
                  <button
                    onClick={() => generateNow(idea.id)}
                    disabled={generating !== null}
                    className={`px-3 py-1 text-[10px] uppercase tracking-wider ${
                      generating === idea.id
                        ? "bg-[#6B6B6B] text-white cursor-wait"
                        : "border border-[#B88B58] text-[#B88B58] hover:bg-[#B88B58] hover:text-white"
                    }`}
                  >
                    {generating === idea.id ? "..." : "Générer"}
                  </button>
                  <button
                    onClick={() => ideaDelete(idea.id, idea.topic)}
                    className="px-3 py-1 text-[10px] text-red-400 hover:text-red-600"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
            {unusedIdeas.length > 10 && (
              <p className="text-xs text-[#6B6B6B] text-center pt-2">
                +{unusedIdeas.length - 10} autres idées en file (priorité plus basse)
              </p>
            )}
          </div>
        )}
      </section>

      {/* ============ ARTICLES ============ */}
      <section className="bg-white border border-[#E8E4DF] p-6">
        <div className="flex items-start justify-between mb-4 flex-wrap gap-3">
          <div>
            <h2 className="font-serif text-xl text-[#1A1A1A]">
              Articles ({articles.length} au total · {articles.filter((a) => a.status === "draft").length} draft)
            </h2>
            <p className="text-xs text-[#6B6B6B] mt-1">
              Les articles générés par l&apos;IA sont en <strong>draft</strong> par défaut. Relis avant de cliquer « Publier ».
            </p>
          </div>
          <div className="flex gap-1">
            {(["all", "draft", "published"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1 text-xs uppercase tracking-wider ${
                  statusFilter === s
                    ? "bg-[#1A1A1A] text-white"
                    : "border border-[#E8E4DF] text-[#6B6B6B] hover:border-[#1A1A1A]"
                }`}
              >
                {s === "all" ? "Tous" : s === "draft" ? "Drafts" : "Publiés"}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <p className="text-center py-8 text-[#6B6B6B] text-sm">Chargement…</p>
        ) : filteredArticles.length === 0 ? (
          <p className="text-center py-6 text-[#6B6B6B] text-sm italic">Aucun article.</p>
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
                <ArticleRow
                  key={a.slug}
                  article={a}
                  onEdit={() => startEdit(a)}
                  onPublish={() => articleAction(a.slug, "article_publish")}
                  onUnpublish={() => articleAction(a.slug, "article_unpublish")}
                  onDelete={() => {
                    if (confirm(`Supprimer définitivement "${a.title.slice(0, 60)}…" ?`)) {
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
        <SocialDraftModal draft={socialDraft} onClose={() => setSocialDraft(null)} onCopy={copyToClipboard} />
      )}
    </div>
  );
}

function ArticleRow({
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
    <div className="border border-[#E8E4DF] hover:border-[#B88B58]/50 transition-colors p-4 flex gap-4">
      <div
        className="w-20 h-20 flex-shrink-0 bg-cover bg-center"
        style={{
          backgroundImage: article.image ? `url('${article.image}')` : "none",
          backgroundColor: "#E8E4DF",
        }}
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="font-serif text-base text-[#1A1A1A] truncate">{article.title}</h3>
            <p className="text-xs text-[#6B6B6B] mt-0.5 line-clamp-2">{article.excerpt}</p>
            <div className="flex items-center gap-2 mt-2 text-[10px] text-[#9A8C7A]">
              <span>{article.category}</span>
              <span>•</span>
              <span>{article.date}</span>
              <span>•</span>
              <span>{article.readTime} min</span>
              {article.apartment_slug && (
                <>
                  <span>•</span>
                  <span className="text-[#B88B58]">→ {article.apartment_slug}</span>
                </>
              )}
            </div>
          </div>
          <span
            className={`px-2 py-0.5 text-[10px] uppercase tracking-wider flex-shrink-0 ${
              isDraft ? "bg-amber-100 text-amber-800" : "bg-green-100 text-green-800"
            }`}
          >
            {isDraft ? "Draft" : "Publié"}
          </span>
        </div>
        <div className="flex gap-2 mt-3 flex-wrap">
          <button onClick={onEdit} className="px-3 py-1 text-xs border border-[#B88B58] text-[#B88B58] hover:bg-[#B88B58] hover:text-white">
            Modifier
          </button>
          {isDraft ? (
            <button onClick={onPublish} className="px-3 py-1 text-xs bg-green-600 text-white hover:bg-green-700">
              ✓ Publier
            </button>
          ) : (
            <>
              <a
                href={`/blog/${article.slug}`}
                target="_blank"
                rel="noreferrer"
                className="px-3 py-1 text-xs border border-[#E8E4DF] text-[#6B6B6B] hover:border-[#B88B58] hover:text-[#B88B58]"
              >
                Voir
              </a>
              <button onClick={onUnpublish} className="px-3 py-1 text-xs text-amber-600 hover:text-amber-800">
                Dépublier
              </button>
              <button
                onClick={onGMB}
                disabled={gmbLoading}
                className={`px-3 py-1 text-xs uppercase tracking-wider ${
                  gmbLoading ? "bg-[#6B6B6B] text-white cursor-wait" : "bg-[#1A1A1A] text-white hover:bg-[#B88B58] hover:text-[#0D0D0D]"
                }`}
              >
                {gmbLoading ? "..." : "📍 GMB"}
              </button>
              <button
                onClick={onLinkedIn}
                disabled={liLoading}
                className={`px-3 py-1 text-xs uppercase tracking-wider ${
                  liLoading ? "bg-[#6B6B6B] text-white cursor-wait" : "bg-[#0A66C2] text-white hover:bg-[#004182]"
                }`}
              >
                {liLoading ? "..." : "in LinkedIn"}
              </button>
            </>
          )}
          <button onClick={onDelete} className="ml-auto px-3 py-1 text-xs text-red-400 hover:text-red-600">
            Supprimer
          </button>
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
    <div className="border-2 border-[#B88B58] p-6 space-y-4 bg-[#FAFAF8]">
      <div className="flex items-center justify-between">
        <h3 className="font-serif text-lg text-[#1A1A1A]">Modifier : {article.title}</h3>
        <button onClick={onCancel} className="text-[#6B6B6B] text-sm hover:text-red-500">
          Annuler
        </button>
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <label className="block text-xs text-[#6B6B6B] uppercase tracking-wider mb-1">Titre</label>
          <input
            value={editData.title || ""}
            onChange={(e) => setEditData({ ...editData, title: e.target.value })}
            className="w-full px-3 py-2 border border-[#E8E4DF] text-sm focus:border-[#B88B58] focus:outline-none"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-xs text-[#6B6B6B] uppercase tracking-wider mb-1">Excerpt</label>
          <textarea
            rows={2}
            value={editData.excerpt || ""}
            onChange={(e) => setEditData({ ...editData, excerpt: e.target.value })}
            className="w-full px-3 py-2 border border-[#E8E4DF] text-sm focus:border-[#B88B58] focus:outline-none resize-y"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-xs text-[#6B6B6B] uppercase tracking-wider mb-1">Meta description SEO</label>
          <input
            value={editData.metaDescription || ""}
            onChange={(e) => setEditData({ ...editData, metaDescription: e.target.value })}
            className="w-full px-3 py-2 border border-[#E8E4DF] text-sm focus:border-[#B88B58] focus:outline-none"
          />
          <p className="text-[10px] text-[#6B6B6B] mt-1">
            {(editData.metaDescription || "").length} / 160 chars
          </p>
        </div>
        <div>
          <label className="block text-xs text-[#6B6B6B] uppercase tracking-wider mb-1">Category</label>
          <input
            value={editData.category || ""}
            onChange={(e) => setEditData({ ...editData, category: e.target.value })}
            className="w-full px-3 py-2 border border-[#E8E4DF] text-sm focus:border-[#B88B58] focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-xs text-[#6B6B6B] uppercase tracking-wider mb-1">Read time (min)</label>
          <input
            type="number"
            value={editData.readTime || 0}
            onChange={(e) => setEditData({ ...editData, readTime: parseInt(e.target.value) })}
            className="w-full px-3 py-2 border border-[#E8E4DF] text-sm focus:border-[#B88B58] focus:outline-none"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-xs text-[#6B6B6B] uppercase tracking-wider mb-1">Tags (virgules)</label>
          <input
            value={(editData.tags || []).join(", ")}
            onChange={(e) =>
              setEditData({
                ...editData,
                tags: e.target.value.split(",").map((s) => s.trim()).filter(Boolean),
              })
            }
            className="w-full px-3 py-2 border border-[#E8E4DF] text-sm focus:border-[#B88B58] focus:outline-none"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-xs text-[#6B6B6B] uppercase tracking-wider mb-1">Image cover (path)</label>
          <input
            value={editData.image || ""}
            onChange={(e) => setEditData({ ...editData, image: e.target.value })}
            className="w-full px-3 py-2 border border-[#E8E4DF] text-sm focus:border-[#B88B58] focus:outline-none font-mono"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-xs text-[#6B6B6B] uppercase tracking-wider mb-1">
            Content (JSON, blocs typés p / h2 / h3 / faq-q / faq-a)
          </label>
          <textarea
            rows={20}
            value={contentText}
            onChange={(e) => {
              try {
                const parsed = JSON.parse(e.target.value);
                setEditData({ ...editData, content: parsed });
              } catch {
                /* invalid JSON while typing, ignore */
              }
            }}
            className="w-full px-3 py-2 border border-[#E8E4DF] text-xs focus:border-[#B88B58] focus:outline-none font-mono resize-y"
          />
          <p className="text-[10px] text-[#6B6B6B] mt-1">
            Modifs textuelles seulement. Pour la structure, garde le format JSON.
          </p>
        </div>
      </div>
      <div className="flex gap-2 pt-2">
        <button
          onClick={onSave}
          className="px-6 py-2 text-sm bg-[#B88B58] text-[#0D0D0D] hover:bg-[#D4AF7A] uppercase tracking-wider font-semibold"
        >
          Enregistrer
        </button>
        <button onClick={onCancel} className="px-4 py-2 text-sm text-[#6B6B6B] hover:text-red-500">
          Annuler
        </button>
      </div>
    </div>
  );
}

function SocialDraftModal({
  draft,
  onClose,
  onCopy,
}: {
  draft: SocialDraft;
  onClose: () => void;
  onCopy: (text: string) => void;
}) {
  const isGMB = draft.post.platform === "gmb";
  const accent = isGMB ? "#1A1A1A" : "#0A66C2";
  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-[#E8E4DF] flex items-center justify-between sticky top-0 bg-white">
          <div>
            <h3 className="font-serif text-xl text-[#1A1A1A]">
              {isGMB ? "📍 Post Google Business Profile" : "in Post LinkedIn"}
            </h3>
            <p className="text-xs text-[#6B6B6B] mt-1">
              Source : {draft.post.source === "claude" ? "généré par Claude" : "template fallback"} · {draft.post.char_count} / {draft.post.char_max} chars
            </p>
          </div>
          <button onClick={onClose} className="text-2xl text-[#6B6B6B] hover:text-[#1A1A1A]">
            ×
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <h4 className="text-xs uppercase tracking-wider text-[#6B6B6B] mb-2">Texte à coller</h4>
            <textarea
              readOnly
              rows={isGMB ? 10 : 16}
              value={draft.post.text}
              className="w-full px-3 py-3 border border-[#E8E4DF] text-sm font-sans whitespace-pre-wrap focus:border-[#B88B58] focus:outline-none"
            />
            <div className="flex gap-2 mt-2">
              <button
                onClick={() => onCopy(draft.post.text)}
                className="px-4 py-2 text-xs uppercase tracking-wider text-white"
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
                  className="px-4 py-2 text-xs uppercase tracking-wider border border-[#E8E4DF] text-[#1A1A1A] hover:border-[#B88B58]"
                >
                  Télécharger l&apos;image cover
                </a>
              )}
              <a
                href={draft.interface_url}
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2 text-xs uppercase tracking-wider border text-white ml-auto"
                style={{ backgroundColor: accent, borderColor: accent }}
              >
                Ouvrir {isGMB ? "GMB" : "LinkedIn"} →
              </a>
            </div>
          </div>
          <div>
            <h4 className="text-xs uppercase tracking-wider text-[#6B6B6B] mb-2">CTA</h4>
            <p className="text-sm">
              <strong>{draft.post.cta.label}</strong> →{" "}
              <a href={draft.post.cta.url} target="_blank" rel="noreferrer" className="text-[#B88B58] underline">
                {draft.post.cta.url}
              </a>
            </p>
          </div>
          <div>
            <h4 className="text-xs uppercase tracking-wider text-[#6B6B6B] mb-2">Instructions</h4>
            <ol className="text-sm text-[#6B6B6B] space-y-1 list-decimal list-inside">
              {draft.instructions.map((line, i) => (
                <li key={i}>{line.replace(/^\d+\.\s*/, "")}</li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}
