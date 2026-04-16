import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageHero from "@/components/PageHero";
import ApartmentsList from "./ApartmentsList";

export const metadata: Metadata = {
  title: "Nos Appartements Meublés à Paris | Move in Paris",
  description:
    "Découvrez notre sélection d'appartements meublés haut de gamme à Paris. Location corporate et expatriés, du studio au 4 pièces dans les meilleurs quartiers parisiens.",
  keywords: "appartement meublé paris, location meublée corporate, location expatrié paris, studio meublé paris, appartement meublé 75017",
  openGraph: {
    title: "Nos Appartements Meublés à Paris | Move in Paris",
    description: "Sélection d'appartements meublés haut de gamme pour entreprises et expatriés à Paris.",
  },
};

export default function NosAppartements() {
  return (
    <>
      <Header />
      <main>
        <PageHero
          title="Nos appartements"
          subtitle="Découvrez notre sélection d'appartements meublés haut de gamme dans les meilleurs quartiers de Paris et sa proche banlieue."
          breadcrumb="Nos appartements"
        />
        <ApartmentsList />
      </main>
      <Footer />
    </>
  );
}
