import type { Metadata } from "next";
import QuartierLanding, { type QuartierConfig } from "@/components/QuartierLanding";

export const metadata: Metadata = {
  title: "Location meublée société Paris 8e — Champs-Élysées, Madeleine | Move in Paris",
  description: "Location meublée société Paris 8e (Champs-Élysées, Madeleine). Bail société court, moyen ou long terme. Propriétaire 100 % gratuit. +200 clients corporate.",
  alternates: { canonical: "https://www.move-in-paris.com/location-meublee-entreprise-paris-8e" },
  openGraph: {
    title: "Location meublée société Paris 8e | Move in Paris",
    description: "Location meublée société dans le 8e arrondissement de Paris : Champs-Élysées, Madeleine, Saint-Lazare. Bail au nom de votre entreprise.",
    url: "https://www.move-in-paris.com/location-meublee-entreprise-paris-8e",
  },
};

const config: QuartierConfig = {
  slug: "paris-8e",
  name: "Paris 8e",
  shortName: "Paris 8e",
  postalCode: "75008",
  pageTitle: "Location meublée société Paris 8e",
  metaDescription: "Location meublée société dans le 8e arrondissement de Paris : Champs-Élysées, Madeleine, Saint-Lazare. Bail société, facture entreprise.",
  heroTitle: "Location meublée société à Paris 8e",
  heroSubtitle: "Appartements meublés haut de gamme près des Champs-Élysées, Saint-Lazare, Madeleine et du Faubourg Saint-Honoré. Louez au nom de votre société : bail entreprise, facture déductible, gestion 100 % déléguée.",
  heroImage: "/apartments/salon-haussmann.jpg",
  intro: "Le 8e arrondissement est le quartier d'affaires premium de Paris : sièges sociaux du CAC 40, banques d'investissement, cabinets de conseil internationaux, ambassades. Move in Paris y dispose d'un parc d'appartements meublés haut de gamme — du studio executive au 4 pièces familial — tous signés au nom de votre société pour loger collaborateurs en mission, dirigeants en déplacement ou cadres expatriés.",
  positioning: "Champs-Élysées, Madeleine, Saint-Lazare, Faubourg Saint-Honoré, Parc Monceau",
  characteristics: "Le 8e concentre la plus forte densité de sièges sociaux d'Île-de-France : LVMH, L'Oréal, Sanofi, Publicis, ainsi que les grandes banques (BNP Paribas Investment, Société Générale CIB, Goldman Sachs, JPMorgan). Les rues Tronchet, Madeleine, Royale et l'avenue Hoche forment un triangle d'or pour les cadres en mission.",
  businessReason: "Loger un collaborateur dans le 8e signifie zéro temps de transport vers le bureau pour la majorité des sièges parisiens, un cadre prestigieux pour recevoir clients internationaux, et une accessibilité immédiate aux gares Saint-Lazare (Normandie, banlieue ouest) et au RER A. Pour les entreprises ayant des bureaux à La Défense, le RER A relie le 8e en 12 minutes.",
  typicalProfile: "Missions courtes (2 semaines à 3 mois) pour cadres et dirigeants, mutations longues pour expatriés (6 mois à 2 ans), logement de fonction permanent pour membres de comités exécutifs. Profils typiques : VP Finance, Country Manager, Partner conseil, Banquier d'affaires, Chef de cabinet d'ambassade.",
  faqs: [
    {
      q: "Quels quartiers du 8e privilégier pour un collaborateur en mission ?",
      a: "La zone Madeleine - Saint-Augustin - Hoche est la plus proche des sièges sociaux et offre un excellent cadre. La rue du Faubourg-Saint-Honoré et les abords du Parc Monceau sont privilégiés pour les profils familiaux. La zone Champs-Élysées - George V est plus animée mais idéale pour les profils corporate-clients. Notre équipe vous oriente selon le profil du collaborateur et l'adresse du bureau.",
    },
    {
      q: "Quel budget mensuel pour une location meublée société dans le 8e ?",
      a: "Comptez 2 200 à 3 500 €/mois pour un studio meublé corporate (25-35 m²), 3 000 à 5 500 €/mois pour un 2-3 pièces (45-70 m²), et 5 500 à 9 000 €/mois pour un 4 pièces familial dans une adresse prestigieuse. Les loyers sont charges comprises (sauf utilities) et facturés au nom de la société.",
    },
    {
      q: "Le 8e est-il bien desservi pour rejoindre La Défense ?",
      a: "Oui — le RER A relie Charles-de-Gaulle-Étoile (8e) à La Défense en 7 minutes, et la gare Saint-Lazare propose la ligne L+J vers la même destination en 10 minutes. C'est le quartier le mieux placé pour un collaborateur travaillant à La Défense mais voulant vivre dans Paris intra-muros.",
    },
    {
      q: "Vos appartements du 8e sont-ils disponibles pour des missions de 2 à 4 semaines ?",
      a: "Absolument. Nos baux société peuvent démarrer à partir d'1 mois et inclure une clause de prolongation tacite. Pour les missions très courtes (1 à 4 semaines), nous proposons un format \"corporate flexible\" avec ménage hebdomadaire et préavis 15 jours. Idéal pour due diligences, intégration M&A, ou audits clients.",
    },
    {
      q: "Mes clients étrangers peuvent-ils être logés sous le bail de ma société ?",
      a: "Oui. Le bail société identifie l'entreprise comme locataire et désigne nominativement les occupants — qui peuvent être collaborateurs, prestataires, clients VIP ou intervenants externes en mission longue. Cette flexibilité est particulièrement utile pour les cabinets de conseil et banques d'affaires recevant des dirigeants étrangers en mission de plusieurs semaines.",
    },
  ],
};

export default function Page() {
  return <QuartierLanding config={config} />;
}
