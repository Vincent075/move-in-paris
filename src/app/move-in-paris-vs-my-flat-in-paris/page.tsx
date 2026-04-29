import type { Metadata } from "next";
import ComparisonLanding, { type ComparisonConfig } from "@/components/ComparisonLanding";

export const metadata: Metadata = {
  title: "Move in Paris vs My Flat in Paris — Comparatif location société | Move in Paris",
  description: "Comparatif honnête entre Move in Paris et My Flat in Paris pour louer un appartement meublé société à Paris : frais, références, qualité, juridique. Pour entreprises B2B.",
  alternates: { canonical: "https://www.move-in-paris.com/move-in-paris-vs-my-flat-in-paris" },
  openGraph: {
    title: "Move in Paris vs My Flat in Paris | Comparatif location société",
    description: "Comparatif point par point pour entreprises B2B à Paris : tarifs, services, références.",
    url: "https://www.move-in-paris.com/move-in-paris-vs-my-flat-in-paris",
  },
};

const config: ComparisonConfig = {
  slug: "vs-my-flat-in-paris",
  competitorName: "My Flat in Paris",
  competitorTagline: "Agence corporate housing fondée en 2002",
  pageTitle: "Move in Paris vs My Flat in Paris",
  metaDescription: "Comparatif Move in Paris vs My Flat in Paris pour la location meublée société à Paris.",
  heroSubtitle: "Deux agences parisiennes positionnées corporate. Catalogue, transparence des frais, juridique, services : voici un comparatif factuel pour choisir l'agence qui correspond à votre besoin B2B.",
  heroImage: "/apartments/salon-bibliotheque.jpg",
  intro: "My Flat in Paris (MFP) est une agence corporate housing parisienne fondée en 2002, avec un catalogue d'environ 150 appartements. Move in Paris est positionné sur le même créneau B2B, plus jeune (2018), plus boutique (50+ appartements), avec un modèle économique transparent et des références blue-chip (L'Oréal, LVMH, Goldman Sachs).",
  competitorPositioning: "Acteur établi depuis 2002 (label Cercle Magellan), 150 appartements en gestion, segmentation par profil (Junior / Corporate / Senior / Family), focus grands groupes internationaux. Pas de logos clients ni d'avis publics affichés sur le site. Site bilingue FR/EN.",
  mipPositioning: "Agence parisienne fondée en 2018, focus B2B premium (CAC 40, banques d'affaires, Big Four). 50+ appartements curés à la main dans le 8e, 16e, 17e, La Défense, Neuilly. Service 100 % gratuit propriétaire toujours, 0 € locataire en court/moyen terme, 12,5 % HT en long terme. 4,8 / 5 sur 61 avis Google publics.",
  rows: [
    { criterion: "Année de création", mip: "2018", competitor: "2002", winner: "competitor" },
    { criterion: "Catalogue appartements", mip: "50+ (curés à la main, qualité homogène)", competitor: "150 (qualité homogène)", winner: "competitor" },
    { criterion: "Note Google publique", mip: "4,8 / 5 sur 61 avis (visibles)", competitor: "Aucune note Google affichée publiquement", winner: "mip" },
    { criterion: "Logos clients corporate", mip: "L'Oréal, LVMH, AXA, Sanofi, Goldman, BNP, Deloitte, EY (affichés)", competitor: "\"35 grands comptes internationaux\" mentionné, aucun nom", winner: "mip" },
    { criterion: "Témoignages clients nominaux", mip: "Affichés (avec photos)", competitor: "Absents du site", winner: "mip" },
    { criterion: "Frais d'agence propriétaire", mip: "0 € — toujours, toutes durées", competitor: "Modèle non public, sur devis", winner: "mip" },
    { criterion: "Frais d'agence locataire (court/moyen ≤ 12 mois)", mip: "0 €", competitor: "\"Sans frais d'agence\" annoncé (sans précision durée)", winner: "tie" },
    { criterion: "Frais d'agence locataire (long terme > 12 mois)", mip: "12,5 % HT du loyer annuel — explicite", competitor: "Honoraires non publics", winner: "mip" },
    { criterion: "Dépôt de garantie (court/moyen)", mip: "Non requis — explicite", competitor: "\"Sans caution\" annoncé", winner: "tie" },
    { criterion: "Dépôt de garantie (long terme)", mip: "2 mois reversés au propriétaire — explicite", competitor: "Non précisé publiquement", winner: "mip" },
    { criterion: "Précision juridique du bail", mip: "Bail société Code civil 1714-1762 documenté en page dédiée", competitor: "\"Contrat unique\" mentionné, pas de cadre juridique précisé", winner: "mip" },
    { criterion: "Multi-langue", mip: "FR + EN", competitor: "FR + EN", winner: "tie" },
    { criterion: "URLs indexables (estimation)", mip: "~90 (avec extension EN)", competitor: "~465", winner: "competitor" },
    { criterion: "Schema.org / SEO technique", mip: "FAQPage + Service + BreadcrumbList + AggregateRating + RealEstateAgent", competitor: "Quasi vide (aucun JSON-LD détecté)", winner: "mip" },
    { criterion: "Pages quartier dédiées société", mip: "8e, 16e, 17e, La Défense, Neuilly (pages SEO complètes)", competitor: "Pas de pages quartier dédiées", winner: "mip" },
    { criterion: "Segmentation par profil", mip: "Par durée (court/moyen/long terme) + par quartier", competitor: "Par profil collaborateur (Junior/Corporate/Senior/Family)", winner: "tie" },
    { criterion: "Label corporate housing", mip: "Aucun label affiché", competitor: "Label Cercle Magellan", winner: "competitor" },
    { criterion: "Avis Google embarqué sur site", mip: "Widget avis live", competitor: "Absent", winner: "mip" },
  ],
  whenToChooseMip: [
    "Vous voulez voir <strong>les avis clients en transparence</strong> avant de signer (4,8 / 5 sur 61 avis Google publics).",
    "Vous êtes une <strong>grande entreprise corporate</strong> (CAC 40, banque, conseil) et cherchez le standard qualité utilisé par vos pairs L'Oréal, LVMH, Goldman.",
    "Vous voulez <strong>une grille de coûts limpide et publique</strong> : 0 € propriétaire toujours, 0 € locataire court/moyen, 12,5 % HT long terme. Pas de boîte noire.",
    "Vous cherchez un appartement dans le <strong>8e, 16e, 17e, à La Défense ou à Neuilly</strong> — quartiers où nous concentrons notre catalogue premium.",
    "Vous voulez un <strong>cadre juridique explicite</strong> (bail société Code civil 1714-1762 documenté) plutôt qu'un \"contrat unique\" sans précisions.",
  ],
  whenToChooseCompetitor: [
    "Vous attachez de l'importance au <strong>label Cercle Magellan</strong> (label de mobilité internationale) que My Flat in Paris affiche.",
    "Vous cherchez la <strong>segmentation par profil collaborateur</strong> (Junior/Senior/Family/Corporate) plutôt que par durée ou par quartier.",
    "Vous avez besoin d'un <strong>catalogue plus large</strong> (150 vs 50+) avec plus d'options dans des arrondissements moins desservis par notre parc.",
    "Vous privilégiez un acteur avec <strong>plus d'ancienneté</strong> (2002 vs 2018).",
  ],
  conclusion: "Sur un comparatif factuel, Move in Paris l'emporte sur la transparence (avis publics, logos clients, grille tarifaire claire), la précision juridique (bail société Code civil documenté), la profondeur SEO (pages quartier dédiées, schemas complets), et la qualité du contenu corporate. My Flat in Paris a l'avantage de l'ancienneté (23 ans), du catalogue plus large (150 vs 50+) et du label Cercle Magellan. Si vous voulez voir avant de choisir, demandez-nous un devis : nous vous établissons une short-list adaptée à votre besoin sous 24 heures, sans engagement.",
};

export default function Page() {
  return <ComparisonLanding config={config} />;
}
