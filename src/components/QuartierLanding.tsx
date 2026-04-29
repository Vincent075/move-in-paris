import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageHero from "@/components/PageHero";
import SEOLanding, { buildFaqLd, type SEOLandingFAQ } from "@/components/SEOLanding";
import TrustStripB2B from "@/components/TrustStripB2B";
import BailComparisonTable from "@/components/BailComparisonTable";
import BailDureesTable from "@/components/BailDureesTable";

export type QuartierConfig = {
  slug: string;
  name: string;
  shortName: string;
  postalCode?: string;
  pageTitle: string;
  metaDescription: string;
  heroTitle: string;
  heroSubtitle: string;
  heroImage: string;
  intro: string;
  positioning: string;
  characteristics: string;
  businessReason: string;
  typicalProfile: string;
  faqs: SEOLandingFAQ[];
};

const SITE_URL = "https://www.move-in-paris.com";

export default function QuartierLanding({ config }: { config: QuartierConfig }) {
  const url = `${SITE_URL}/location-meublee-entreprise-${config.slug}`;
  const faqLd = buildFaqLd(config.faqs);

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Accueil", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: "Location meublée société", item: `${SITE_URL}/location-meublee-entreprise` },
      { "@type": "ListItem", position: 3, name: config.shortName, item: url },
    ],
  };

  const serviceLd = {
    "@context": "https://schema.org",
    "@type": "Service",
    serviceType: "Location meublée société et entreprise",
    name: `Location meublée société à ${config.name}`,
    description: config.metaDescription,
    provider: {
      "@type": "RealEstateAgent",
      name: "Move in Paris",
      url: SITE_URL,
      address: { "@type": "PostalAddress", streetAddress: "26 rue de l'Étoile", postalCode: "75017", addressLocality: "Paris", addressCountry: "FR" },
      telephone: "+33145200603",
    },
    areaServed: { "@type": "Place", name: config.name },
    audience: { "@type": "BusinessAudience", audienceType: "Entreprises, sociétés, organismes internationaux" },
    url,
  };

  return (
    <>
      <Header />
      <main>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceLd) }} />
        <PageHero
          title={config.heroTitle}
          subtitle={config.heroSubtitle}
          breadcrumb={config.shortName}
          image={config.heroImage}
        />
        <TrustStripB2B />
        <SEOLanding
          eyebrow={`Location meublée société · ${config.shortName}`}
          intro={config.intro}
          highlights={[
            { title: "Court, moyen et long terme", text: "Missions de 1 mois ou mutations de 3 ans : un cadre juridique unique, le bail société. 100 % gratuit pour le propriétaire." },
            { title: "Facture entreprise", text: "Facture mensuelle au nom de la société, déductible IS, intégrable directement en comptabilité." },
            { title: `Localisation ${config.shortName}`, text: config.positioning },
          ]}
          sections={[
            {
              title: `Pourquoi choisir ${config.name} pour loger vos collaborateurs ?`,
              body: (
                <>
                  <p>{config.characteristics}</p>
                  <p>{config.businessReason}</p>
                  <h3>Profil de séjour typique</h3>
                  <p>{config.typicalProfile}</p>
                </>
              ),
            },
            {
              title: `Court, moyen ou long terme à ${config.name}`,
              body: (
                <>
                  <p>
                    Move in Paris loge à {config.name} aussi bien des collaborateurs en mission courte (audits, intégrations, due diligence) que des cadres expatriés en mutation longue (1 à 3 ans). Le cadre juridique est le même — un <strong>bail société</strong> souscrit au nom de votre personne morale — mais les frais et le dépôt de garantie diffèrent selon la durée.
                  </p>
                  <BailDureesTable />
                  <p>
                    Notre service est <strong>100 % gratuit pour le propriétaire bailleur</strong>, quelle que soit la durée du bail. Côté entreprise locataire : zéro frais sur les missions courtes et moyennes, 12,5 % HT du loyer annuel uniquement sur les baux longue durée (plus de 12 mois), avec un dépôt de garantie de 2 mois reversé intégralement au propriétaire.
                  </p>
                </>
              ),
            },
            {
              title: "Bail société, bail mobilité, bail Code civil : quelle différence ?",
              body: (
                <>
                  <p>
                    Trois cadres juridiques existent pour loger un collaborateur à {config.name}. Le choix dépend de la nature du locataire (personne morale ou physique), de la durée du séjour et de l&apos;usage du bien.
                  </p>
                  <BailComparisonTable />
                  <p>
                    Pour les entreprises qui logent un collaborateur à {config.name}, <strong>le bail société est notre format par défaut</strong> — il offre la liberté contractuelle maximale, une déductibilité IS totale et une facturation directe au nom de la société.
                  </p>
                </>
              ),
            },
            {
              title: "Le service Move in Paris à " + config.name,
              body: (
                <>
                  <p>
                    Notre offre <Link href="/location-meublee-entreprise">location meublée société</Link> couvre tous les arrondissements de Paris intra-muros et la première couronne d&apos;affaires (La Défense, Neuilly, Levallois). Chaque appartement est inspecté, équipé selon nos standards corporate (literie 5*, wifi fibre 1 Gb, vaisselle complète, ménage hebdomadaire inclus), et mis à disposition sous 7 à 14 jours après signature.
                  </p>
                  <ul>
                    <li><strong>Service 100 % gratuit pour le propriétaire</strong> — quelle que soit la durée du bail</li>
                    <li><strong>Honoraires entreprise locataire</strong> : 0 € en court/moyen terme, 12,5 % HT du loyer annuel en long terme</li>
                    <li><strong>Assistance technique 7j/7 incluse</strong> — bénéficie aussi indirectement au propriétaire (zéro gestion opérationnelle)</li>
                    <li><strong>Bail société signé en 5 minutes</strong> via DocuSign</li>
                    <li><strong>Account manager dédié</strong> pour les entreprises gérant 5+ appartements simultanés</li>
                  </ul>
                  <p>
                    Découvrez nos <Link href="/nos-appartements">50+ appartements parisiens</Link> ou consultez le détail du <Link href="/code-civil-bail-meuble">bail Code civil</Link> et du <Link href="/bail-mobilite-paris">bail mobilité</Link>.
                  </p>
                </>
              ),
            },
          ]}
          faqs={config.faqs}
          ctaTitle={`Besoin d'un appartement à ${config.name} pour votre société ?`}
          ctaText="Décrivez-nous votre besoin (durée, nombre de collaborateurs, dates). Notre équipe corporate vous répond sous 24h avec une short-list d'appartements disponibles."
          ctaHref="/contact"
          ctaLabel="Demander un devis société"
          relatedLinks={[
            { href: "/location-meublee-entreprise", label: "Location meublée société (toutes zones)" },
            { href: "/nos-appartements", label: "Voir nos appartements" },
            { href: "/location-corporate-paris", label: "Location corporate à Paris" },
            { href: "/location-meublee-expatrie-paris", label: "Location pour expatriés" },
          ]}
        />
      </main>
      <Footer />
    </>
  );
}
