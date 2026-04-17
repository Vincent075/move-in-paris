import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageHero from "@/components/PageHero";
import articlesData from "@/data/articles.json";

export const metadata: Metadata = {
  title: "Blog — Location meublée, LMNP & fiscalité | Move in Paris",
  description:
    "Toute l'actualité de la location meublée corporate, du statut LMNP et de la fiscalité immobilière à Paris. Conseils pratiques, réglementation, optimisation fiscale.",
  keywords:
    "blog location meublée, LMNP Paris, fiscalité immobilière, bail mobilité, encadrement loyers Paris, amortissement LMNP, propriétaires Paris",
  openGraph: {
    title: "Blog Move in Paris — Location meublée & fiscalité",
    description:
      "Articles d'experts sur la location meublée corporate à Paris, le régime LMNP et la fiscalité immobilière.",
    type: "website",
  },
  alternates: { canonical: "/blog" },
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
};

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default function BlogListPage() {
  const articles = (articlesData as Article[])
    .slice()
    .sort((a, b) => (a.date < b.date ? 1 : -1));

  const [featured, ...rest] = articles;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Blog",
    name: "Blog Move in Paris",
    description:
      "Articles d'experts sur la location meublée corporate, le statut LMNP et la fiscalité immobilière à Paris.",
    publisher: {
      "@type": "Organization",
      name: "Move in Paris",
      url: "https://move-in-paris.vercel.app",
    },
    blogPost: articles.map((a) => ({
      "@type": "BlogPosting",
      headline: a.title,
      description: a.excerpt,
      datePublished: a.date,
      url: `https://move-in-paris.vercel.app/blog/${a.slug}`,
      author: { "@type": "Organization", name: a.author },
    })),
  };

  return (
    <>
      <Header />
      <main>
        <PageHero
          title="Le Blog Move in Paris"
          subtitle="Location meublée, LMNP, fiscalité : décryptages, actualités et conseils d'experts pour propriétaires et entreprises."
          breadcrumb="Blog"
        />

        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />

        <section className="py-20 bg-blanc">
          <div className="max-w-7xl mx-auto px-6 lg:px-12">
            {/* Featured article */}
            {featured && (
              <Link
                href={`/blog/${featured.slug}`}
                className="group grid lg:grid-cols-2 gap-8 mb-20 bg-blanc-chaud overflow-hidden hover:shadow-xl hover:shadow-noir-deep/5 transition-all duration-500"
                style={{ borderRadius: 10 }}
              >
                <div className="relative aspect-[4/3] lg:aspect-auto overflow-hidden">
                  <Image
                    src={featured.image}
                    alt={featured.title}
                    fill
                    priority
                    className="object-cover group-hover:scale-105 transition-transform duration-700"
                  />
                  <div className="absolute top-4 left-4 bg-gold text-noir-deep text-[10px] tracking-wider uppercase px-3 py-1 font-semibold">
                    À la une
                  </div>
                </div>
                <div className="p-10 lg:p-12 flex flex-col justify-center">
                  <div className="flex items-center gap-3 text-[11px] uppercase tracking-[0.15em] text-gris mb-4">
                    <span className="text-gold">{featured.category}</span>
                    <span>•</span>
                    <span>{formatDate(featured.date)}</span>
                    <span>•</span>
                    <span>{featured.readTime} min</span>
                  </div>
                  <h2 className="font-serif text-3xl md:text-4xl text-noir mb-4 group-hover:text-gold transition-colors">
                    {featured.title}
                  </h2>
                  <p className="text-gris font-light leading-relaxed mb-6">
                    {featured.excerpt}
                  </p>
                  <span className="text-gold text-sm uppercase tracking-wider font-medium group-hover:underline">
                    Lire l&apos;article →
                  </span>
                </div>
              </Link>
            )}

            {/* Articles grid */}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {rest.map((a) => (
                <Link
                  key={a.slug}
                  href={`/blog/${a.slug}`}
                  className="group bg-blanc-chaud overflow-hidden hover:shadow-lg hover:shadow-noir-deep/5 transition-all duration-500 flex flex-col"
                  style={{ borderRadius: 10 }}
                >
                  <div className="relative aspect-[16/10] overflow-hidden">
                    <Image
                      src={a.image}
                      alt={a.title}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-700"
                    />
                    <div className="absolute top-3 left-3 bg-noir-deep/80 text-blanc text-[10px] tracking-wider uppercase px-3 py-1">
                      {a.category}
                    </div>
                  </div>
                  <div className="p-6 flex-1 flex flex-col">
                    <div className="flex items-center gap-2 text-[11px] text-gris mb-3">
                      <span>{formatDate(a.date)}</span>
                      <span>•</span>
                      <span>{a.readTime} min</span>
                    </div>
                    <h3 className="font-serif text-xl text-noir mb-3 group-hover:text-gold transition-colors leading-snug">
                      {a.title}
                    </h3>
                    <p className="text-gris font-light text-sm leading-relaxed flex-1">
                      {a.excerpt}
                    </p>
                    <div className="mt-5 text-gold text-xs uppercase tracking-wider font-medium group-hover:underline">
                      Lire la suite →
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
