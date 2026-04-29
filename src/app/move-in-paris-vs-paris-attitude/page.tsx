import type { Metadata } from "next";
import ComparisonLanding, { type ComparisonConfig } from "@/components/ComparisonLanding";

export const metadata: Metadata = {
  title: "Move in Paris vs Paris Attitude — Comparatif location meublée société | Move in Paris",
  description: "Comparatif honnête entre Move in Paris et Paris Attitude pour louer un appartement meublé société à Paris : frais d'agence, références clients, services, durée des baux. Choisissez en connaissance de cause.",
  alternates: { canonical: "https://www.move-in-paris.com/move-in-paris-vs-paris-attitude" },
  openGraph: {
    title: "Move in Paris vs Paris Attitude | Comparatif location société",
    description: "Comparatif détaillé : frais, références, bail société, services. Pour entreprises B2B à Paris.",
    url: "https://www.move-in-paris.com/move-in-paris-vs-paris-attitude",
  },
};

const config: ComparisonConfig = {
  slug: "vs-paris-attitude",
  competitorName: "Paris Attitude",
  competitorTagline: "Agence parisienne historique, fondée en 2001",
  pageTitle: "Move in Paris vs Paris Attitude",
  metaDescription: "Comparatif Move in Paris vs Paris Attitude pour la location meublée société à Paris.",
  heroSubtitle: "Deux acteurs parisiens du logement meublé corporate. Catalogue, frais, références, juridique : voici une comparaison transparente pour choisir l'agence adaptée à votre besoin.",
  heroImage: "/apartments/salon-haussmann.jpg",
  intro: "Paris Attitude et Move in Paris s'adressent toutes deux aux entreprises et aux expatriés qui cherchent un appartement meublé à Paris. Mais les deux agences ont des modèles, des catalogues et des grilles tarifaires différents. Voici un comparatif factuel pour vous aider à choisir, sans parti pris commercial.",
  competitorPositioning: "Acteur historique fondé en 2001, Paris Attitude est l'une des plus grandes agences de location meublée moyenne durée à Paris. Catalogue de plus de 4 000 appartements, présence sur les 20 arrondissements et la petite couronne, équipe internationale (6 langues), assurance habitation AXA incluse pour le locataire.",
  mipPositioning: "Agence parisienne fondée en 2018, spécialisée corporate premium. Catalogue de 50+ appartements curés à la main, focus exclusif sur la clientèle B2B (CAC 40 et banques d'affaires : L'Oréal, LVMH, AXA, Sanofi, Goldman Sachs, BNP, Deloitte, EY). Service 100 % gratuit pour le propriétaire et pour l'entreprise sur les baux courts/moyens.",
  rows: [
    { criterion: "Année de création", mip: "2018", competitor: "2001", winner: "competitor" },
    { criterion: "Catalogue appartements", mip: "50+ (curés à la main, qualité homogène)", competitor: "4 000+ (qualité variable selon partenaires)", winner: "competitor" },
    { criterion: "Note Google", mip: "4,8 / 5 sur 61 avis", competitor: "Note variable selon source (Trustpilot 4 / 5 sur 2 545 avis)", winner: "tie" },
    { criterion: "Logos clients corporate affichés", mip: "L'Oréal, LVMH, AXA, Sanofi, Goldman Sachs, BNP, Deloitte, EY", competitor: "Aucun logo client visible publiquement", winner: "mip" },
    { criterion: "Frais d'agence propriétaire", mip: "0 € — toujours, quelle que soit la durée", competitor: "Honoraires de gestion variables (selon contrat)", winner: "mip" },
    { criterion: "Frais d'agence locataire (court/moyen terme ≤ 12 mois)", mip: "0 €", competitor: "Honoraires d'agence appliqués", winner: "mip" },
    { criterion: "Frais d'agence locataire (long terme > 12 mois)", mip: "12,5 % HT du loyer annuel", competitor: "Honoraires d'agence appliqués", winner: "tie" },
    { criterion: "Dépôt de garantie (court/moyen terme)", mip: "Non requis", competitor: "1 mois de loyer demandé", winner: "mip" },
    { criterion: "Dépôt de garantie (long terme)", mip: "2 mois, intégralement reversés au propriétaire", competitor: "Dépôt classique selon contrat", winner: "tie" },
    { criterion: "Précision juridique du bail", mip: "Bail société Code civil 1714-1762 explicitement mentionné", competitor: "Bail \"corporate\" générique, peu de détails juridiques publics", winner: "mip" },
    { criterion: "Multi-langue", mip: "FR + EN", competitor: "FR + EN + DE + IT + ES + PT (6 langues)", winner: "competitor" },
    { criterion: "Pages quartier dédiées société", mip: "Pages dédiées 8e, 16e, 17e, La Défense, Neuilly", competitor: "Pages quartier généralistes (pas spécifiques B2B)", winner: "mip" },
    { criterion: "Assistance technique 7j/7", mip: "Incluse, gratuite — bénéfice indirect au propriétaire", competitor: "Inclue dans le service de gestion", winner: "tie" },
    { criterion: "Assurance habitation locataire", mip: "À la charge du locataire (option proposée)", competitor: "Assurance AXA incluse gratuitement", winner: "competitor" },
    { criterion: "Court séjour (< 3 mois)", mip: "Géré couramment (audits, missions, due diligence)", competitor: "Durée minimale 30 jours, focus moyenne durée", winner: "mip" },
    { criterion: "Long séjour (1-3 ans, mutation expatrié)", mip: "Géré (avec frais 12,5 %)", competitor: "Cœur de cible, tarifs adaptés", winner: "tie" },
  ],
  whenToChooseMip: [
    "Vous êtes <strong>une grande entreprise (CAC 40, banque d'affaires, Big Four)</strong> et cherchez la même qualité de service que vos pairs L'Oréal, LVMH, Goldman Sachs.",
    "Vous voulez <strong>zéro frais d'agence</strong> sur les missions courtes et moyennes (audits, intégrations, due diligence, consultants).",
    "Vous êtes <strong>propriétaire</strong> et ne voulez pas payer d'honoraires d'agence sur la mise en location.",
    "Vous voulez un <strong>cadre juridique précis et explicite</strong> (bail société Code civil 1714-1762) plutôt qu'un \"bail corporate\" flou.",
    "Vous cherchez un appartement dans le <strong>8e, 16e, 17e, à La Défense ou à Neuilly</strong> pour loger un cadre senior — quartiers où nous concentrons notre catalogue.",
    "Vous préférez une <strong>relation directe avec un account manager dédié</strong> plutôt qu'un service standardisé à grande échelle.",
  ],
  whenToChooseCompetitor: [
    "Vous cherchez le <strong>plus large catalogue possible</strong> (4 000+ biens, vs 50+ chez nous).",
    "Vous logez un collaborateur <strong>en moyenne durée (6-12 mois)</strong> sur un quartier moins desservi par notre catalogue (par exemple 11e, 12e, 19e, 20e).",
    "Vous voulez bénéficier de <strong>l'assurance habitation AXA gratuite</strong> incluse dans le contrat.",
    "Votre interlocuteur RH est <strong>non francophone</strong> et a besoin de support multilingue (allemand, italien, espagnol, portugais).",
    "Vous privilégiez un acteur <strong>très ancien</strong> avec 24 ans d'historique et une grande équipe internationale.",
  ],
  conclusion: "Si votre besoin est récurrent et orienté grands comptes corporate (5+ appartements/an, missions courtes ou moyennes, profil CAC 40 ou banque d'affaires), Move in Paris est l'option la plus économique et la plus précise juridiquement. Si votre besoin est ponctuel sur un quartier spécifique non couvert par notre parc, ou si vous avez besoin du plus grand choix possible quitte à payer des honoraires plus élevés, Paris Attitude offre un catalogue plus large. Le mieux : nous demander un devis et voir si notre short-list correspond à votre besoin réel — c'est gratuit et sans engagement.",
};

export default function Page() {
  return <ComparisonLanding config={config} />;
}
