import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import articlesData from "@/data/articles.json";
import { getMessages } from "@/i18n/server";

type Block = { type: "p" | "h2" | "h3"; text: string };
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
};

const articles = articlesData as Article[];

export async function generateStaticParams() {
  return articles.map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const a = articles.find((x) => x.slug === slug);
  if (!a) return {};
  return {
    title: `${a.title} | Move in Paris`,
    description: a.metaDescription,
    keywords: a.tags.join(", "),
    openGraph: {
      title: a.title,
      description: a.metaDescription,
      type: "article",
      publishedTime: a.date,
      authors: [a.author],
      images: [a.image],
    },
    alternates: { canonical: `/blog/${a.slug}` },
  };
}

function formatDate(iso: string, locale: string) {
  const d = new Date(iso);
  return d.toLocaleDateString(locale === "en" ? "en-US" : "fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default async function ArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const article = articles.find((a) => a.slug === slug);
  if (!article) notFound();
  const { messages, locale } = await getMessages();

  const related = articles
    .filter((a) => a.slug !== article.slug)
    .filter((a) => a.tags.some((t) => article.tags.includes(t)))
    .slice(0, 3);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: article.title,
    description: article.metaDescription,
    image: `https://move-in-paris.vercel.app${article.image}`,
    datePublished: article.date,
    dateModified: article.date,
    author: { "@type": "Organization", name: article.author },
    publisher: {
      "@type": "Organization",
      name: "Move in Paris",
      logo: {
        "@type": "ImageObject",
        url: "https://move-in-paris.vercel.app/Logo-gold.png",
      },
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `https://move-in-paris.vercel.app/blog/${article.slug}`,
    },
    keywords: article.tags.join(", "),
  };

  return (
    <>
      <Header />
      <main>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />

        {/* Hero image */}
        <section className="relative h-[50vh] md:h-[60vh] overflow-hidden">
          <Image
            src={article.image}
            alt={article.title}
            fill
            priority
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-noir-deep/70 via-noir-deep/30 to-noir-deep/90" />
          <div className="absolute inset-0 flex items-end pb-16 md:pb-24">
            <div className="max-w-4xl mx-auto w-full px-6 lg:px-12">
              <nav className="text-blanc/70 text-xs tracking-wider uppercase mb-6">
                <Link href="/" className="hover:text-gold transition-colors">
                  {messages.apartment.breadcrumbHome}
                </Link>
                <span className="mx-2">/</span>
                <Link href="/blog" className="hover:text-gold transition-colors">
                  {messages.blogPage.breadcrumb}
                </Link>
              </nav>
              <div className="flex items-center gap-3 text-xs uppercase tracking-[0.15em] text-gold mb-4">
                <span>{article.category}</span>
                <span className="text-blanc/40">•</span>
                <span className="text-blanc/70">{formatDate(article.date, locale)}</span>
                <span className="text-blanc/40">•</span>
                <span className="text-blanc/70">{article.readTime} {messages.blogPage.readingTimeMin}</span>
              </div>
              <h1 className="font-serif text-3xl md:text-5xl lg:text-6xl text-blanc leading-tight max-w-3xl">
                {article.title}
              </h1>
            </div>
          </div>
        </section>

        {/* Article body */}
        <article className="py-16 md:py-20 bg-blanc">
          <div className="max-w-3xl mx-auto px-6 lg:px-12">
            {locale === "en" && (
              <div className="mb-10 p-5 border border-gris-clair/50 bg-blanc-chaud text-sm text-gris leading-relaxed" style={{ borderRadius: 12 }}>
                {messages.blogPage.contentNotice}
              </div>
            )}
            <p className="font-serif text-xl md:text-2xl text-noir leading-relaxed mb-12 pb-12 border-b border-gris-clair/40">
              {article.excerpt}
            </p>

            <div className="space-y-6">
              {article.content.map((block, i) => {
                if (block.type === "h2") {
                  return (
                    <h2
                      key={i}
                      className="font-serif text-2xl md:text-3xl text-noir mt-10 mb-2"
                    >
                      {block.text}
                    </h2>
                  );
                }
                if (block.type === "h3") {
                  return (
                    <h3
                      key={i}
                      className="font-serif text-xl md:text-2xl text-noir mt-8 mb-2"
                    >
                      {block.text}
                    </h3>
                  );
                }
                return (
                  <p
                    key={i}
                    className="text-gris text-lg font-light leading-relaxed"
                  >
                    {block.text}
                  </p>
                );
              })}
            </div>

            {/* Tags */}
            <div className="mt-14 pt-8 border-t border-gris-clair/40 flex flex-wrap gap-3">
              {article.tags.map((t) => (
                <span
                  key={t}
                  className="text-xs uppercase tracking-wider px-4 py-2 bg-blanc-chaud text-gris border border-gris-clair/40"
                  style={{ borderRadius: 10 }}
                >
                  {t}
                </span>
              ))}
            </div>
          </div>
        </article>

        {/* CTA — Proposez votre bien */}
        <section className="py-16 md:py-20 bg-noir-deep relative overflow-hidden">
          <div
            className="absolute inset-0 opacity-10"
            style={{
              backgroundImage:
                "radial-gradient(circle at 1px 1px, rgba(197,160,89,0.6) 1px, transparent 0)",
              backgroundSize: "40px 40px",
            }}
          />
          <div className="relative max-w-4xl mx-auto px-6 lg:px-12 text-center">
            <span className="text-gold text-xs tracking-[0.3em] uppercase">
              Vous êtes propriétaire ?
            </span>
            <h2 className="font-serif text-3xl md:text-5xl text-blanc mt-4 mb-6">
              Proposez votre bien à Move in Paris
            </h2>
            <p className="text-blanc/70 font-light leading-relaxed max-w-2xl mx-auto mb-10">
              Location meublée corporate, loyers garantis par l&apos;employeur, +30 % de revenus
              en moyenne vs location classique. Nos équipes s&apos;occupent de tout — état des lieux,
              entretien, gestion complète.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link
                href="/proposer-mon-appartement"
                className="inline-block px-10 py-4 bg-gradient-to-r from-gold to-gold-light text-noir-deep font-semibold tracking-wider uppercase text-sm hover:shadow-lg hover:shadow-gold/30 transition-all duration-300 hover:scale-105"
                style={{ borderRadius: 10 }}
              >
                Proposer mon bien →
              </Link>
              <Link
                href="/proprietaires"
                className="inline-block px-10 py-4 border border-blanc/30 text-blanc text-sm tracking-wider uppercase hover:border-gold hover:text-gold transition-all duration-300"
                style={{ borderRadius: 10 }}
              >
                En savoir plus
              </Link>
            </div>
          </div>
        </section>

        {/* Related articles */}
        {related.length > 0 && (
          <section className="py-16 md:py-20 bg-blanc-chaud">
            <div className="max-w-7xl mx-auto px-6 lg:px-12">
              <div className="text-center mb-12">
                <span className="text-gold text-xs tracking-[0.3em] uppercase">
                  À lire aussi
                </span>
                <h2 className="font-serif text-3xl md:text-4xl text-noir mt-3">
                  Articles liés
                </h2>
              </div>
              <div className="grid md:grid-cols-3 gap-8">
                {related.map((a) => (
                  <Link
                    key={a.slug}
                    href={`/blog/${a.slug}`}
                    className="group bg-blanc overflow-hidden hover:shadow-lg hover:shadow-noir-deep/5 transition-all duration-500 flex flex-col"
                    style={{ borderRadius: 10 }}
                  >
                    <div className="relative aspect-[16/10] overflow-hidden">
                      <Image
                        src={a.image}
                        alt={a.title}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-700"
                      />
                    </div>
                    <div className="p-6 flex-1">
                      <div className="text-[11px] uppercase tracking-wider text-gold mb-2">
                        {a.category}
                      </div>
                      <h3 className="font-serif text-lg text-noir group-hover:text-gold transition-colors leading-snug">
                        {a.title}
                      </h3>
                    </div>
                  </Link>
                ))}
              </div>
              <div className="text-center mt-12">
                <Link
                  href="/blog"
                  className="inline-block px-8 py-3 border border-noir/20 text-noir text-sm tracking-wider uppercase hover:border-gold hover:text-gold transition-all duration-300"
                  style={{ borderRadius: 10 }}
                >
                  Voir tous les articles
                </Link>
              </div>
            </div>
          </section>
        )}
      </main>
      <Footer />
    </>
  );
}
