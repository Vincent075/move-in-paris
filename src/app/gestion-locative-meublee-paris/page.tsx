import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import LandingContent from "./LandingContent";

const TITLE =
  "Gestion locative meublée à Paris — +30 % de revenus, 0 € de frais | Move in Paris";
const DESCRIPTION =
  "Confiez votre appartement meublé à l'agence parisienne spécialisée en location corporate. Clientèle premium (L'Oréal, LVMH, AXA, Sanofi), service 100 % gratuit, taux d'occupation +95 %. Estimation gratuite en 30 secondes.";
const URL = "https://www.move-in-paris.com/gestion-locative-meublee-paris";
const COVER = "https://www.move-in-paris.com/apartments/hero-salon.jpg";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  keywords:
    "gestion locative meublée Paris, location meublée corporate, confier appartement agence Paris, bail mobilité entreprise, LMNP Paris, location expatrié, agence location meublée haut de gamme Paris, gestion locative haut de gamme, location courte durée entreprise Paris, louer mon appartement Paris",
  alternates: { canonical: URL },
  openGraph: {
    type: "website",
    url: URL,
    siteName: "Move in Paris",
    locale: "fr_FR",
    title: TITLE,
    description: DESCRIPTION,
    images: [{ url: COVER, width: 1200, height: 630, alt: "Move in Paris — location meublée corporate" }],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: [COVER],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large" },
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "RealEstateAgent",
      "@id": `${URL}#agency`,
      name: "Move in Paris",
      image: "https://www.move-in-paris.com/Logo-gold.png",
      url: "https://www.move-in-paris.com",
      telephone: "+33145200603",
      email: "contact@move-in-paris.com",
      address: {
        "@type": "PostalAddress",
        streetAddress: "26, rue de l'Étoile",
        postalCode: "75017",
        addressLocality: "Paris",
        addressCountry: "FR",
      },
      areaServed: { "@type": "City", name: "Paris" },
      priceRange: "€€€",
      sameAs: [
        "https://www.linkedin.com/company/move-in-paris",
        "https://www.instagram.com/moveinparis",
      ],
    },
    {
      "@type": "WebPage",
      "@id": URL,
      url: URL,
      name: TITLE,
      description: DESCRIPTION,
      inLanguage: "fr-FR",
      isPartOf: { "@id": "https://www.move-in-paris.com/#website" },
      primaryImageOfPage: COVER,
    },
    {
      "@type": "Service",
      "@id": `${URL}#service`,
      serviceType: "Gestion locative meublée haut de gamme",
      provider: { "@id": `${URL}#agency` },
      areaServed: { "@type": "City", name: "Paris" },
      offers: {
        "@type": "Offer",
        description: "Service 100 % gratuit pour les propriétaires — zéro frais de gestion.",
        priceCurrency: "EUR",
        price: "0",
      },
    },
    {
      "@type": "FAQPage",
      "@id": `${URL}#faq`,
      mainEntity: [
        {
          "@type": "Question",
          name: "Combien coûte la gestion locative Move in Paris ?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Notre service est 100 % gratuit pour les propriétaires : aucun frais de gestion, aucune commission. Nous nous rémunérons exclusivement sur la marge réalisée auprès de notre clientèle corporate.",
          },
        },
        {
          "@type": "Question",
          name: "Quel type de bail signez-vous ?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Un bail Code Civil (articles 1714 à 1762) signé directement avec l'entreprise locataire (L'Oréal, LVMH, AXA, Sanofi…). Le loyer est payé par l'employeur, ce qui élimine le risque d'impayé.",
          },
        },
        {
          "@type": "Question",
          name: "En combien de temps mon appartement est-il loué ?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "La plupart de nos biens trouvent preneur en moins de 15 jours. Notre clientèle corporate exprime des besoins en continu : directeurs en mission, expatriés, cadres en relocation.",
          },
        },
        {
          "@type": "Question",
          name: "Mon appartement est-il assuré pendant la location ?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Oui. Une assurance habitation multirisque couvre intégralement le bien pendant toute la durée de la location. Le locataire corporate est également couvert par son employeur.",
          },
        },
        {
          "@type": "Question",
          name: "Puis-je confier un bien que je ne veux pas meubler entièrement ?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Oui. Nous accompagnons aussi l'ameublement : évaluation sur place, liste de mobilier, partenariats avec des décorateurs et des distributeurs. La clientèle corporate attend un niveau d'équipement premium, nous le calibrons avec vous.",
          },
        },
        {
          "@type": "Question",
          name: "Quelle rentabilité supplémentaire vs. une location nue ?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "En moyenne +30 % de revenus par rapport à une location nue classique, jusqu'à +55 €/m² sur les segments corporate du 8e, 16e et 17e arrondissement, avec le régime fiscal LMNP qui optimise l'imposition des revenus locatifs.",
          },
        },
        {
          "@type": "Question",
          name: "Quels quartiers Move in Paris couvre-t-il ?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Paris intra-muros en priorité — Triangle d'or (8e), 16e (Passy, Trocadéro, Auteuil, Porte Dauphine), 17e (Batignolles, Monceau, Ternes), 7e, 1er-4e. Également Neuilly-sur-Seine, Levallois-Perret et Boulogne-Billancourt.",
          },
        },
      ],
    },
  ],
};

export default function OwnerLandingPage() {
  return (
    <>
      <script
        type="application/ld+json"
        // JSON-LD is injected as a string; React escapes keys safely but the payload is static.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Header />
      <main>
        <LandingContent />
      </main>
      <Footer />
    </>
  );
}
