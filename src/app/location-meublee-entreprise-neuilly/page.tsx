import type { Metadata } from "next";
import QuartierLanding, { type QuartierConfig } from "@/components/QuartierLanding";

export const metadata: Metadata = {
  title: "Location meublée société Neuilly-sur-Seine — Appartements meublés entreprise | Move in Paris",
  description: "Location meublée société à Neuilly-sur-Seine : appartements meublés haut de gamme pour collaborateurs et familles d'expatriés. Bail société, facture entreprise, gestion 100% déléguée.",
  alternates: { canonical: "https://www.move-in-paris.com/location-meublee-entreprise-neuilly" },
  openGraph: {
    title: "Location meublée société Neuilly | Move in Paris",
    description: "Appartements meublés société à Neuilly-sur-Seine : familles d'expatriés, dirigeants, cadres La Défense. Bail au nom de votre entreprise.",
    url: "https://www.move-in-paris.com/location-meublee-entreprise-neuilly",
  },
};

const config: QuartierConfig = {
  slug: "neuilly",
  name: "Neuilly-sur-Seine",
  shortName: "Neuilly",
  pageTitle: "Location meublée société Neuilly-sur-Seine",
  metaDescription: "Location meublée société à Neuilly-sur-Seine : appartements meublés familles expatriés et dirigeants, proche La Défense.",
  heroTitle: "Location meublée société à Neuilly-sur-Seine",
  heroSubtitle: "Appartements meublés haut de gamme à Neuilly-sur-Seine — frontière immédiate du 16e et 17e Paris, accès direct La Défense (métro 1, RER A). Cadre résidentiel chic prisé par familles d'expatriés et dirigeants. Bail au nom de votre société.",
  heroImage: "/apartments/salon-orange.jpg",
  intro: "Neuilly-sur-Seine est l'extension naturelle ouest de Paris : 60 000 habitants, taux d'imposition local optimisé, écoles internationales à proximité immédiate (American School of Paris à Saint-Cloud, EIB Victor-Hugo dans le 16e adjacent), avenues commerçantes haut de gamme (avenue Charles-de-Gaulle, avenue du Roule, boulevard Bineau). Move in Paris propose une sélection d'appartements meublés société à Neuilly pour les entreprises souhaitant offrir à leurs collaborateurs un cadre résidentiel premium — particulièrement adapté aux mutations familiales d'expatriés.",
  positioning: "Neuilly Centre, Sablons, Saint-James, Bineau, Pont de Neuilly",
  characteristics: "Neuilly combine la qualité de vie d'une ville résidentielle à la connectivité immédiate de Paris : la ligne 1 du métro relie Pont de Neuilly à Concorde en 12 minutes et à La Défense en 4 minutes. Les rues Sablons, Saint-James et avenue de Madrid concentrent les plus belles adresses (immeubles bourgeois fin XIXe, hôtels particuliers). La zone Pont de Neuilly - Sablons est privilégiée par la communauté d'affaires américaine et asiatique pour la proximité des écoles internationales et de La Défense.",
  businessReason: "Pour les entreprises mutant un cadre senior avec famille travaillant à La Défense ou dans le triangle d'or parisien, Neuilly est souvent l'option n°1 : 4 minutes de métro vers les tours, 12 minutes vers les Champs-Élysées, environnement résidentiel calme et sécurisé, écoles internationales à 10 minutes, services premium (médecins anglophones, supermarchés internationaux, conciergeries). C'est aussi un choix stratégique pour les diplomates et représentations internationales.",
  typicalProfile: "Mutations familiales d'expatriés (1 à 3 ans), Country Managers et VP de groupes anglo-saxons, partners de cabinets de conseil avec famille, dirigeants en logement de fonction. Profils typiques : Country Manager US/UK/JP, Senior Partner Big Four, Diplomate, VP CAC 40, Banker senior à La Défense.",
  faqs: [
    {
      q: "Pourquoi choisir Neuilly plutôt que le 16e Paris pour un expatrié ?",
      a: "Neuilly et le 16e sont les deux options premium pour les familles d'expatriés. Différences principales : Neuilly offre des immeubles plus modernes (années 1960-2000) avec parkings, plus de calme, et une fiscalité locale légèrement plus avantageuse. Le 16e (Trocadéro, Passy) offre un cadre haussmannien plus prestigieux mais des immeubles anciens parfois moins fonctionnels. Le choix dépend du goût du collaborateur — moderne et calme (Neuilly) vs prestige haussmannien (16e).",
    },
    {
      q: "Quelles écoles internationales sont accessibles depuis Neuilly ?",
      a: "American School of Paris (Saint-Cloud) : 15-20 minutes en voiture. British School of Paris (Croissy-sur-Seine) : 25 minutes. EIB Victor-Hugo (16e) : 10 minutes. Lycée International (Saint-Germain-en-Laye) : 25 minutes en RER A. École Active Bilingue Jeannine Manuel (15e) : 25 minutes. La proximité des écoles internationales est l'argument n°1 des familles d'expatriés pour choisir Neuilly.",
    },
    {
      q: "Quel budget mensuel pour louer un appartement société à Neuilly ?",
      a: "Studio (30-40 m²) : 1 800 à 2 600 €/mois. 2 pièces (50-65 m²) : 2 600 à 3 800 €/mois. 3 pièces familial (75-95 m²) : 3 800 à 5 500 €/mois. 4-5 pièces (110-160 m²) : 5 500 à 9 000 €/mois selon adresse. Les prix les plus élevés concernent Saint-James et Sablons ; Neuilly Centre et secteur Bineau offrent un meilleur rapport surface/prix.",
    },
    {
      q: "Combien de temps pour rejoindre La Défense ou les Champs-Élysées depuis Neuilly ?",
      a: "Métro ligne 1 depuis Pont de Neuilly : 4 minutes vers La Défense Grande Arche, 12 minutes vers Charles-de-Gaulle-Étoile (Champs-Élysées), 17 minutes vers Concorde. Bus 73 et 174 : alternatives directes vers la Madeleine et Pont d'Asnières. Pour un cadre travaillant à La Défense ou dans le 8e, Neuilly est l'une des meilleures options de la première couronne en termes de temps de trajet.",
    },
    {
      q: "Vos appartements de Neuilly sont-ils tous éligibles au bail société ?",
      a: "Oui — l'intégralité de notre parc Neuilly est destinée à la location meublée corporate, avec bail au nom de la société. Cela inclut les conditions standards Move in Paris : ménage hebdomadaire inclus, équipement haut de gamme (literie 5*, wifi fibre 1 Gb, vaisselle complète), assistance technique 7j/7, facture mensuelle au nom de la société. Préavis 15 jours pour l'entreprise, signature électronique, pas de dépôt de garantie pour les baux < 9 mois.",
    },
  ],
};

export default function Page() {
  return <QuartierLanding config={config} />;
}
