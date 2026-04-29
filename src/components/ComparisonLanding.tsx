import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageHero from "@/components/PageHero";
import TrustStripB2B from "@/components/TrustStripB2B";

export type ComparisonRow = {
  criterion: string;
  mip: string;
  competitor: string;
  winner?: "mip" | "competitor" | "tie";
};

export type ComparisonConfig = {
  slug: string; // e.g. "vs-paris-attitude"
  competitorName: string; // e.g. "Paris Attitude"
  competitorTagline: string; // short positioning summary
  pageTitle: string;
  metaDescription: string;
  heroSubtitle: string;
  heroImage: string;
  intro: string;
  competitorPositioning: string;
  mipPositioning: string;
  rows: ComparisonRow[];
  whenToChooseMip: string[];
  whenToChooseCompetitor: string[];
  conclusion: string;
};

const SITE_URL = "https://www.move-in-paris.com";

export default function ComparisonLanding({ config }: { config: ComparisonConfig }) {
  const url = `${SITE_URL}/move-in-paris-${config.slug}`;

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Accueil", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: `Move in Paris vs ${config.competitorName}`, item: url },
    ],
  };

  return (
    <>
      <Header />
      <main>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
        />
        <PageHero
          title={`Move in Paris vs ${config.competitorName}`}
          subtitle={config.heroSubtitle}
          breadcrumb={`vs ${config.competitorName}`}
          image={config.heroImage}
        />
        <TrustStripB2B />

        <section className="bg-blanc py-20">
          <div className="max-w-4xl mx-auto px-6 lg:px-12">
            <p className="text-gold uppercase text-xs tracking-[0.25em] mb-4">Comparatif honnête</p>
            <p className="text-gris text-lg md:text-xl font-light leading-relaxed mb-12">{config.intro}</p>

            <div className="grid md:grid-cols-2 gap-6 mb-16">
              <div className="p-6 border border-gold/40 bg-blanc-chaud">
                <h3 className="font-serif text-xl text-noir mb-3">Move in Paris</h3>
                <p className="text-gris text-sm font-light leading-relaxed">{config.mipPositioning}</p>
              </div>
              <div className="p-6 border border-gris-clair/50 bg-blanc-chaud">
                <h3 className="font-serif text-xl text-noir mb-3">{config.competitorName}</h3>
                <p className="text-gris text-sm font-light leading-relaxed">{config.competitorPositioning}</p>
              </div>
            </div>

            <h2 className="font-serif text-2xl md:text-3xl text-noir mb-4">
              Comparatif point par point
            </h2>
            <div className="h-px w-12 bg-gold mb-6" />

            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto rounded-sm border border-gris-clair/60 mb-12">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-noir-deep text-blanc">
                    <th className="text-left p-4 font-medium uppercase text-xs tracking-wider w-1/4">Critère</th>
                    <th className="text-left p-4 font-medium uppercase text-xs tracking-wider bg-gold/95 text-noir-deep">Move in Paris</th>
                    <th className="text-left p-4 font-medium uppercase text-xs tracking-wider">{config.competitorName}</th>
                  </tr>
                </thead>
                <tbody>
                  {config.rows.map((r, i) => (
                    <tr key={r.criterion} className={i % 2 === 0 ? "bg-blanc" : "bg-blanc-chaud"}>
                      <td className="p-4 font-medium text-noir border-t border-gris-clair/50 align-top">{r.criterion}</td>
                      <td className={`p-4 border-t border-gris-clair/50 align-top ${r.winner === "mip" ? "bg-gold/10 font-medium text-noir" : "text-noir"}`}>
                        {r.winner === "mip" && <span className="text-gold mr-2">✓</span>}{r.mip}
                      </td>
                      <td className={`p-4 border-t border-gris-clair/50 align-top ${r.winner === "competitor" ? "font-medium text-noir" : "text-gris"}`}>
                        {r.winner === "competitor" && <span className="text-gris mr-2">✓</span>}{r.competitor}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile stacked */}
            <div className="md:hidden space-y-6 mb-12">
              {config.rows.map((r) => (
                <div key={r.criterion} className="border border-gris-clair/60 rounded-sm overflow-hidden">
                  <div className="bg-noir-deep text-blanc px-4 py-2 font-medium text-xs uppercase tracking-wider">
                    {r.criterion}
                  </div>
                  <div className={`px-4 py-3 border-b border-gris-clair/50 ${r.winner === "mip" ? "bg-gold/10" : "bg-blanc"}`}>
                    <div className="text-xs uppercase tracking-wider text-gold mb-1">
                      {r.winner === "mip" && "✓ "}Move in Paris
                    </div>
                    <div className="text-sm text-noir">{r.mip}</div>
                  </div>
                  <div className="px-4 py-3 bg-blanc-chaud">
                    <div className="text-xs uppercase tracking-wider text-gris mb-1">
                      {r.winner === "competitor" && "✓ "}{config.competitorName}
                    </div>
                    <div className="text-sm text-noir">{r.competitor}</div>
                  </div>
                </div>
              ))}
            </div>

            <h2 className="font-serif text-2xl md:text-3xl text-noir mb-4">
              Quand choisir Move in Paris
            </h2>
            <div className="h-px w-12 bg-gold mb-6" />
            <ul className="text-gris font-light space-y-3 mb-12 [&>li]:flex [&>li]:gap-3 [&_strong]:text-noir">
              {config.whenToChooseMip.map((item, i) => (
                <li key={i}>
                  <span className="text-gold flex-shrink-0">◆</span>
                  <span dangerouslySetInnerHTML={{ __html: item }} />
                </li>
              ))}
            </ul>

            <h2 className="font-serif text-2xl md:text-3xl text-noir mb-4">
              Quand choisir {config.competitorName}
            </h2>
            <div className="h-px w-12 bg-gold mb-6" />
            <ul className="text-gris font-light space-y-3 mb-12 [&>li]:flex [&>li]:gap-3 [&_strong]:text-noir">
              {config.whenToChooseCompetitor.map((item, i) => (
                <li key={i}>
                  <span className="text-gris flex-shrink-0">◆</span>
                  <span dangerouslySetInnerHTML={{ __html: item }} />
                </li>
              ))}
            </ul>

            <h2 className="font-serif text-2xl md:text-3xl text-noir mb-4">Notre recommandation</h2>
            <div className="h-px w-12 bg-gold mb-6" />
            <p className="text-gris font-light leading-relaxed mb-12">{config.conclusion}</p>
          </div>
        </section>

        <section className="bg-noir-deep py-16">
          <div className="max-w-3xl mx-auto px-6 text-center">
            <h2 className="font-serif text-3xl md:text-4xl text-blanc mb-4">
              Comparez par vous-même : demandez un devis
            </h2>
            <p className="text-blanc/70 mb-8 font-light">
              Nous vous établissons une short-list d&apos;appartements adaptés à votre besoin sous 24h. Sans engagement, sans frais pour le propriétaire. Vous comparez les offres et vous décidez.
            </p>
            <Link
              href="/contact"
              className="inline-block px-8 py-3 bg-gold text-noir-deep font-medium tracking-wider uppercase text-sm hover:bg-gold-light transition-all duration-300"
            >
              Demander un devis société
            </Link>
          </div>
        </section>

        <section className="bg-blanc-chaud py-12">
          <div className="max-w-4xl mx-auto px-6 lg:px-12">
            <p className="text-gold uppercase text-xs tracking-[0.25em] mb-4">Pour aller plus loin</p>
            <div className="flex flex-wrap gap-3">
              <Link href="/location-meublee-entreprise" className="inline-block px-5 py-2.5 border border-noir-deep/15 text-noir text-sm hover:border-gold hover:text-gold transition-colors">
                Location meublée société à Paris
              </Link>
              <Link href="/nos-appartements" className="inline-block px-5 py-2.5 border border-noir-deep/15 text-noir text-sm hover:border-gold hover:text-gold transition-colors">
                Voir nos 50 appartements
              </Link>
              <Link href="/blog/guide-bail-societe-paris-2026" className="inline-block px-5 py-2.5 border border-noir-deep/15 text-noir text-sm hover:border-gold hover:text-gold transition-colors">
                Guide complet du bail société 2026
              </Link>
              <Link href="/a-propos" className="inline-block px-5 py-2.5 border border-noir-deep/15 text-noir text-sm hover:border-gold hover:text-gold transition-colors">
                À propos de Move in Paris
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
