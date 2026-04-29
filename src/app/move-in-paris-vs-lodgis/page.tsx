import type { Metadata } from "next";
import ComparisonLanding, { type ComparisonConfig } from "@/components/ComparisonLanding";

export const metadata: Metadata = {
  title: "Move in Paris vs Lodgis — Comparatif location meublée société | Move in Paris",
  description: "Comparatif honnête entre Move in Paris et Lodgis pour louer un appartement meublé société à Paris : frais, références, qualité, juridique. Choisissez en connaissance de cause.",
  alternates: { canonical: "https://www.move-in-paris.com/move-in-paris-vs-lodgis" },
  openGraph: {
    title: "Move in Paris vs Lodgis | Comparatif location société",
    description: "Comparatif détaillé pour entreprises B2B à Paris : tarifs, références clients, services, bail société.",
    url: "https://www.move-in-paris.com/move-in-paris-vs-lodgis",
  },
};

const config: ComparisonConfig = {
  slug: "vs-lodgis",
  competitorName: "Lodgis",
  competitorTagline: "Agence parisienne fondée en 1999",
  pageTitle: "Move in Paris vs Lodgis",
  metaDescription: "Comparatif Move in Paris vs Lodgis pour la location meublée société à Paris.",
  heroSubtitle: "Lodgis est l'un des leaders historiques du meublé moyen-long séjour à Paris. Voici un comparatif transparent avec Move in Paris : catalogue, frais, juridique, services et profils clients.",
  heroImage: "/apartments/salon-orange.jpg",
  intro: "Lodgis est probablement le concurrent le plus connu du marché parisien de la location meublée corporate. Fondé en 1999, le groupe a bâti une autorité massive sur le segment moyen et long séjour. Move in Paris, plus jeune (2018), est positionné sur un cœur de cible plus étroit : les grandes entreprises et leurs cadres en mobilité, avec un service 100 % gratuit pour le propriétaire et pour le locataire en court/moyen terme.",
  competitorPositioning: "Acteur historique fondé en 1999, Lodgis revendique des milliers d'appartements meublés à Paris et présence dans les principaux arrondissements. Catalogue très large, plateforme de réservation en ligne, équipe multilingue. Cible mixte (entreprises + particuliers + expatriés). Modèle de marketplace partenaires + agence en propre.",
  mipPositioning: "Agence boutique fondée en 2018, focalisée exclusivement sur la clientèle B2B premium parisienne (CAC 40, banques d'affaires, Big Four). Catalogue de 50+ appartements curés à la main dans le 8e, 16e, 17e, La Défense et Neuilly. Service 100 % gratuit propriétaire, 0 € locataire en court/moyen terme.",
  rows: [
    { criterion: "Année de création", mip: "2018", competitor: "1999", winner: "competitor" },
    { criterion: "Catalogue appartements", mip: "50+ (curés à la main, qualité premium)", competitor: "Plusieurs milliers (qualité variable, marketplace + propriétaires partenaires)", winner: "competitor" },
    { criterion: "Note Google", mip: "4,8 / 5 sur 61 avis", competitor: "Note variable selon source", winner: "tie" },
    { criterion: "Logos clients corporate affichés", mip: "L'Oréal, LVMH, AXA, Sanofi, Goldman Sachs, BNP, Deloitte, EY", competitor: "Témoignages anonymisés majoritaires", winner: "mip" },
    { criterion: "Frais d'agence propriétaire", mip: "0 € — toujours, toutes durées confondues", competitor: "Honoraires de gestion appliqués (variable)", winner: "mip" },
    { criterion: "Frais d'agence locataire (court/moyen terme)", mip: "0 € (≤ 12 mois)", competitor: "Honoraires d'agence systématiques", winner: "mip" },
    { criterion: "Frais d'agence locataire (long terme)", mip: "12,5 % HT du loyer annuel (> 12 mois)", competitor: "Honoraires variables selon offre", winner: "tie" },
    { criterion: "Dépôt de garantie (court/moyen)", mip: "Non requis", competitor: "1-2 mois requis selon contrat", winner: "mip" },
    { criterion: "Dépôt de garantie (long terme)", mip: "2 mois reversés intégralement au propriétaire", competitor: "Dépôt standard reversé au propriétaire", winner: "tie" },
    { criterion: "Précision juridique du bail", mip: "Bail société Code civil 1714-1762 documenté", competitor: "Bail meublé classique majoritaire (parfois bail société)", winner: "mip" },
    { criterion: "Curation des appartements", mip: "Inspection physique, équipement homogène standardisé", competitor: "Validation à distance pour la majorité du catalogue", winner: "mip" },
    { criterion: "Niveau de personnalisation client", mip: "Account manager dédié pour 5+ apparts simultanés", competitor: "Service à grande échelle, contacts variables", winner: "mip" },
    { criterion: "Présence internationale", mip: "Paris uniquement", competitor: "Paris + autres villes (extension partielle)", winner: "competitor" },
    { criterion: "Cœur de cible", mip: "Grandes entreprises B2B premium", competitor: "Marché grand public + entreprises", winner: "tie" },
    { criterion: "Profil de séjour", mip: "Court (1-3 mois), moyen (3-12 mois), long (1-3 ans)", competitor: "Moyen et long séjour majoritaire", winner: "mip" },
  ],
  whenToChooseMip: [
    "Vous gérez un <strong>portefeuille d'appartements pour cadres expatriés</strong> dans une grande entreprise (CAC 40, banque, conseil) et voulez la qualité de service utilisée par L'Oréal, LVMH, Goldman Sachs.",
    "Vous voulez <strong>zéro honoraires</strong> sur les missions courtes (audits Big Four, intégrations, consultants) — ce qui se chiffre vite en milliers d'euros sur l'année.",
    "Vous êtes <strong>propriétaire</strong> dans le 8e, 16e, 17e, à Neuilly ou Levallois et ne voulez payer aucun honoraire d'agence.",
    "Vous voulez un <strong>contrat juridiquement précis</strong> (bail société Code civil 1714-1762) plutôt qu'un bail standard ALUR plus contraignant.",
    "Vous préférez un <strong>parc d'appartements curés à la main</strong> avec qualité homogène garantie, plutôt qu'une marketplace.",
  ],
  whenToChooseCompetitor: [
    "Vous cherchez le <strong>catalogue le plus large possible</strong> (plusieurs milliers de biens) — par exemple un quartier hors de notre zone (11e, 12e, 19e, 20e, Pantin, Vincennes).",
    "Vous voulez une <strong>plateforme de réservation en ligne</strong> avec disponibilités en temps réel et booking direct sans validation humaine.",
    "Votre <strong>budget est très contraint</strong> et vous cherchez les biens les plus économiques (le low-end de Lodgis est plus accessible que notre standard).",
    "Vous avez besoin d'un <strong>acteur très établi</strong> avec 25 ans d'historique et une notoriété internationale.",
  ],
  conclusion: "Lodgis est un acteur de marché de masse historique. Move in Paris est une agence boutique focalisée sur le segment haut de gamme corporate parisien. Si votre entreprise est dans le top 100 français ou international, Move in Paris vous traitera avec la qualité de service que vos pairs (L'Oréal, AXA, Goldman) reconnaissent depuis 2018. Si vous cherchez le plus grand choix sans contrainte de quartier ni de standing, Lodgis aura plus de stocks à proposer. Demandez un devis Move in Paris : si nos appartements correspondent à votre besoin, vous aurez la meilleure offre. Sinon, nous serons honnêtes sur nos limites.",
};

export default function Page() {
  return <ComparisonLanding config={config} />;
}
