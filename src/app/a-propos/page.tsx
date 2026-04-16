import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageHero from "@/components/PageHero";
import CTABanner from "@/components/CTABanner";
import AboutContent from "./AboutContent";

export const metadata: Metadata = {
  title: "À Propos — Move in Paris | Location Meublée Corporate Paris",
  description:
    "Depuis 2005, Move in Paris propose une solution locative clés en main pour entreprises et expatriés. Découvrez nos 6 engagements et notre approche sur-mesure.",
  keywords: "agence location meublée paris, gestion locative corporate, expatrié paris logement, Move in Paris",
  openGraph: {
    title: "À Propos — Move in Paris",
    description: "Solution locative clés en main pour entreprises et expatriés à Paris depuis 2005.",
  },
};

export default function APropos() {
  return (
    <>
      <Header />
      <main>
        <PageHero
          title="A propos"
          subtitle="Une solution locative clés en main pour les entreprises et les expatriés depuis 2005."
          breadcrumb="A propos"
        />
        <AboutContent />
        <CTABanner
          title="Vous cherchez un appartement ?"
          subtitle="Découvrez notre sélection d'appartements meublés haut de gamme dans tout Paris."
          buttonText="Voir nos appartements"
          buttonHref="/nos-appartements"
          secondaryText="Nous contacter"
          secondaryHref="/contact"
        />
      </main>
      <Footer />
    </>
  );
}
