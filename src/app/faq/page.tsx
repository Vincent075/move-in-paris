import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageHero from "@/components/PageHero";
import CTABanner from "@/components/CTABanner";
import FAQContent from "./FAQContent";

export const metadata: Metadata = {
  title: "FAQ — Questions Fréquentes | Move in Paris Location Meublée",
  description:
    "Retrouvez les réponses aux questions les plus fréquentes sur la location meublée corporate à Paris : durée de bail, services inclus, processus de réservation.",
  keywords: "FAQ location meublée paris, questions location corporate, bail meublé durée, location expatrié questions",
  openGraph: {
    title: "FAQ — Move in Paris",
    description: "Réponses aux questions fréquentes sur la location meublée corporate à Paris.",
  },
};

export default function FAQ() {
  return (
    <>
      <Header />
      <main>
        <PageHero
          title="Questions frequentes"
          subtitle="Tout ce que vous devez savoir sur nos services de location meublée."
          breadcrumb="FAQ"
        />
        <FAQContent />
        <CTABanner
          title="Vous avez une autre question ?"
          subtitle="Notre équipe est disponible pour répondre à toutes vos interrogations."
          buttonText="Nous contacter"
          buttonHref="/contact"
        />
      </main>
      <Footer />
    </>
  );
}
