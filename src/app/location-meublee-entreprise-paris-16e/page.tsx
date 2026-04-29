import type { Metadata } from "next";
import QuartierLanding, { type QuartierConfig } from "@/components/QuartierLanding";

export const metadata: Metadata = {
  title: "Location meublée société Paris 16e — Trocadéro, Passy, Auteuil | Move in Paris",
  description: "Location meublée société Paris 16e (Trocadéro, Passy, Auteuil). Idéal familles d'expatriés. Bail société, propriétaire 100 % gratuit. +200 clients corporate.",
  alternates: { canonical: "https://www.move-in-paris.com/location-meublee-entreprise-paris-16e" },
  openGraph: {
    title: "Location meublée société Paris 16e | Move in Paris",
    description: "Location meublée pour société dans le 16e : Trocadéro, Passy, Auteuil. Bail au nom de votre entreprise, idéal expatriés et familles.",
    url: "https://www.move-in-paris.com/location-meublee-entreprise-paris-16e",
  },
};

const config: QuartierConfig = {
  slug: "paris-16e",
  name: "Paris 16e",
  shortName: "Paris 16e",
  postalCode: "75016",
  pageTitle: "Location meublée société Paris 16e",
  metaDescription: "Location meublée société dans le 16e arrondissement : Trocadéro, Passy, Auteuil, Foch. Bail société, facture entreprise.",
  heroTitle: "Location meublée société à Paris 16e",
  heroSubtitle: "Appartements meublés résidentiels à Trocadéro, Passy, Auteuil, Foch et Boulainvilliers. Quartier privilégié des familles d'expatriés et dirigeants — bail au nom de votre société, gestion clé en main.",
  heroImage: "/apartments/salon-orange.jpg",
  intro: "Le 16e arrondissement est le quartier résidentiel haut de gamme par excellence à Paris : immeubles haussmanniens et art déco, vue sur la Tour Eiffel, écoles internationales (lycée Janson de Sailly, EIB Victor-Hugo, écoles américaine et britannique à proximité), espaces verts (Bois de Boulogne, jardins du Ranelagh, Trocadéro). Move in Paris y propose des appartements meublés familiaux et executive, loués au nom de votre société, idéaux pour expatriés en mutation longue ou dirigeants en logement de fonction.",
  positioning: "Trocadéro, Passy, Auteuil, Foch, Boulainvilliers, Muette",
  characteristics: "Le 16e attire historiquement les familles d'expatriés (Anglo-saxons, Asiatiques, Moyen-Orient) grâce à la proximité immédiate de l'EIB Victor-Hugo, du Lycée International, de l'École américaine et de l'École britannique. Les rues Raynouard, Boulainvilliers, Mozart et Pompe concentrent les plus beaux immeubles haussmanniens. Le quartier est calme, sécurisé, avec un commerce de qualité (rue de Passy, place Victor-Hugo).",
  businessReason: "C'est le choix prioritaire pour les entreprises mutant un collaborateur avec famille : conjoint(e) et enfants y trouvent immédiatement écoles, médecins, commerces internationaux. La proximité de La Défense (RER C, métro 9) et du 8e (métro 9, RER) en fait aussi une option pour un binôme \"famille à Passy + bureau Champs-Élysées ou La Défense\". Les sièges Saint-Gobain, Bouygues, EDF Trading sont à proximité.",
  typicalProfile: "Mutations longues d'expatriés (1 à 3 ans) avec famille, dirigeants en logement de fonction permanent, partners de cabinets de conseil avec scolarisation enfants en école internationale. Profils typiques : Country Manager + famille, Partner cabinet d'audit, Banker senior anglo-saxon, Diplomate, Cadre dirigeant Moyen-Orient.",
  faqs: [
    {
      q: "Quelles sont les meilleures adresses du 16e pour un expatrié avec famille ?",
      a: "Trocadéro et Passy (Trocadéro - Boulainvilliers - Muette) sont les plus prisés pour les familles internationales : proximité immédiate de l'EIB Victor-Hugo, du Lycée Janson de Sailly et de l'École britannique. Auteuil (Mozart, Jasmin) offre un cadre plus calme et des prix légèrement inférieurs. Foch et Iéna sont privilégiés pour les profils diplomatiques.",
    },
    {
      q: "Quel budget pour louer un 3-4 pièces familial dans le 16e ?",
      a: "Comptez 4 500 à 7 500 €/mois pour un 3 pièces (70-95 m²) selon l'adresse, 6 500 à 11 000 €/mois pour un 4-5 pièces (100-150 m²) familial. Les loyers les plus élevés concernent Trocadéro et Foch ; Auteuil et Boulainvilliers offrent un meilleur rapport surface/prix tout en restant dans les écoles internationales.",
    },
    {
      q: "Vos appartements du 16e sont-ils proches des écoles internationales ?",
      a: "Oui — la majorité de notre parc 16e est à moins de 15 minutes à pied (ou 5 minutes en bus) du Lycée Janson de Sailly, de l'EIB Victor-Hugo et du Lycée International de Saint-Germain (RER A). Pour les familles d'expatriés américains, l'École américaine de Paris à Saint-Cloud est à 15-20 minutes en voiture.",
    },
    {
      q: "La famille du collaborateur peut-elle vivre dans l'appartement loué par l'entreprise ?",
      a: "Bien sûr — c'est même le cas standard pour les mutations familiales. Le bail société désigne nominativement l'occupant principal (le collaborateur muté) et son foyer (conjoint, enfants). Aucun avantage en nature n'est constitué si le logement est strictement de fonction et que le collaborateur conserve sa résidence principale ailleurs ou est en mutation temporaire.",
    },
    {
      q: "Le 16e est-il bien connecté à La Défense et aux Champs-Élysées ?",
      a: "Oui — la ligne 9 du métro relie Trocadéro à Franklin-Roosevelt (Champs-Élysées) en 6 minutes et au RER A à Auber pour rejoindre La Défense en 15 minutes au total. Le RER C dessert directement le 16e (Boulainvilliers, Avenue du Président Kennedy) vers Versailles et Saint-Quentin-en-Yvelines.",
    },
  ],
};

export default function Page() {
  return <QuartierLanding config={config} />;
}
