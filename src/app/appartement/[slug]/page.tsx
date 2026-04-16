import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ApartmentDetail from "./ApartmentDetail";

const apartments: Record<string, {
  title: string;
  address: string;
  district: string;
  surface: number;
  rooms: number;
  bedrooms: number;
  bathrooms: number;
  floor: string;
  status: string;
  description: string;
  features: string[];
  images: string[];
  nearby: { type: string; name: string; distance: string }[];
}> = {
  "rue-de-bassano-paris-16": {
    title: "Rue de Bassano",
    address: "Rue de Bassano, Paris 16e",
    district: "Paris 16e",
    surface: 62,
    rooms: 2,
    bedrooms: 1,
    bathrooms: 1,
    floor: "3e étage avec ascenseur",
    status: "À louer",
    description:
      "2 pièces d'environ 62 m², entièrement rénové, situé au 3e étage avec ascenseur d'un immeuble haussmannien. L'appartement comprend un lumineux séjour avec canapé 3 places, table basse et TV écran plat, une cuisine américaine ouverte équipée (lave-vaisselle, micro-ondes, plaques de cuisson, réfrigérateur, machine Nespresso), un lave-linge séchant, une chambre queen-size, une salle de bain avec douche et des toilettes séparées. Chauffage électrique individuel et eau chaude.",
    features: [
      "Wifi",
      "Télévision 4K",
      "Lave-vaisselle",
      "Lave-linge séchant",
      "Cuisine américaine ouverte",
      "Machine Nespresso",
      "Micro-ondes",
      "Aspirateur",
      "Fer à repasser",
      "Chauffage électrique individuel",
      "Ascenseur",
      "Toilettes séparées",
    ],
    images: [
      "/bassano/salon-1.jpg",
      "/bassano/salon-2.jpg",
      "/bassano/salon-3.jpg",
      "/bassano/salon-4.jpg",
      "/bassano/cuisine-1.jpg",
      "/bassano/cuisine-2.jpg",
      "/bassano/cuisine-3.jpg",
      "/bassano/chambre-1.jpg",
      "/bassano/chambre-2.jpg",
      "/bassano/sdb.jpg",
      "/bassano/vue-1.jpg",
      "/bassano/vue-2.jpg",
    ],
    nearby: [
      { type: "Métro", name: "George V (ligne 9)", distance: "3 min" },
      { type: "Métro", name: "Iéna (ligne 2)", distance: "5 min" },
      { type: "RER / Métro", name: "Charles de Gaulle Étoile (RER A, lignes 1, 2, 6)", distance: "8 min" },
      { type: "Commerce", name: "Champs-Élysées", distance: "4 min" },
      { type: "Restaurant", name: "Quartier Trocadéro", distance: "5 min" },
    ],
  },
  "boulevard-malesherbes-paris-17": {
    title: "Boulevard Malesherbes",
    address: "Boulevard Malesherbes, Paris 17e",
    district: "Paris 17e",
    surface: 85,
    rooms: 3,
    bedrooms: 2,
    bathrooms: 1,
    floor: "4e étage avec ascenseur",
    status: "Disponible",
    description:
      "Superbe 3 pièces de 85 m² au 4e étage d'un bel immeuble haussmannien avec ascenseur. Grand séjour lumineux avec parquet en point de Hongrie, deux chambres confortables, cuisine séparée entièrement équipée, salle de bain et toilettes séparées. Cave incluse. À deux pas du Parc Monceau.",
    features: [
      "Wifi haut débit",
      "Parquet point de Hongrie",
      "Balcon",
      "Cave",
      "Cuisine équipée",
      "Lave-vaisselle",
      "Lave-linge",
      "Chauffage collectif",
      "Ascenseur",
      "Gardien",
      "Digicode",
      "Interphone",
    ],
    images: [
      "/apartments/salon-haussmann.jpg",
      "/apartments/chambre.jpg",
      "/apartments/cuisine-entree.jpg",
      "/apartments/salle-de-bain.jpg",
      "/apartments/salon-bibliotheque.jpg",
      "/apartments/vue-paris.jpg",
    ],
    nearby: [
      { type: "Métro", name: "Malesherbes (ligne 3)", distance: "2 min" },
      { type: "Métro", name: "Villiers (lignes 2, 3)", distance: "5 min" },
      { type: "Parc", name: "Parc Monceau", distance: "3 min" },
      { type: "Commerce", name: "Rue de Lévis (marché)", distance: "5 min" },
    ],
  },
};

export async function generateStaticParams() {
  return Object.keys(apartments).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const apt = apartments[slug];
  if (!apt) return { title: "Appartement non trouvé" };
  return {
    title: `${apt.title} — ${apt.surface}m² ${apt.district} | Move in Paris`,
    description: `Location meublée corporate : ${apt.title}, ${apt.surface}m², ${apt.bedrooms} chambre(s), ${apt.district}. ${apt.description.slice(0, 150)}...`,
    keywords: `location meublée ${apt.district}, appartement meublé ${apt.address}, location corporate paris`,
  };
}

export default async function ApartmentPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const apt = apartments[slug];

  if (!apt) {
    return (
      <>
        <Header />
        <main className="pt-32 pb-20 text-center">
          <h1 className="font-serif text-3xl text-noir">Appartement non trouvé</h1>
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Header />
      <main>
        <ApartmentDetail apartment={apt} />
      </main>
      <Footer />
    </>
  );
}
