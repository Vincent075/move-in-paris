import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageHero from "@/components/PageHero";
import EstimationForm from "./EstimationForm";

export const metadata: Metadata = {
  title: "Estimation gratuite de votre loyer meublé | Move in Paris",
  description:
    "Estimez gratuitement en 30 secondes le loyer mensuel que Move in Paris peut vous garantir pour votre appartement parisien. Basé sur l'encadrement des loyers 2025 + marge corporate.",
  keywords:
    "estimation loyer paris, prix location meublée paris, encadrement loyer paris, estimation gratuite, rentabilité location meublée",
  openGraph: {
    title: "Estimez votre loyer avec Move in Paris",
    description:
      "Estimation gratuite et instantanée du loyer corporate que vous pouvez percevoir avec Move in Paris.",
  },
  alternates: { canonical: "/estimation" },
};

export default function EstimationPage() {
  return (
    <>
      <Header />
      <main>
        <PageHero
          title="Estimation de votre loyer"
          subtitle="En 30 secondes, découvrez le loyer auquel Move in Paris peut louer votre appartement à ses clients corporate — basé sur les barèmes officiels de l'encadrement des loyers parisien 2025."
          breadcrumb="Estimation"
        />
        <EstimationForm />
      </main>
      <Footer />
    </>
  );
}
