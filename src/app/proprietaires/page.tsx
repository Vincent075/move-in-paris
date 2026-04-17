import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageHero from "@/components/PageHero";
import CTABanner from "@/components/CTABanner";
import ProprietairesContent from "./ProprietairesContent";

export const metadata: Metadata = {
  title: "Propriétaires — Gestion Locative Meublée Paris | Move in Paris",
  description:
    "Confiez votre appartement à Move in Paris. Gestion locative complète, clientèle corporate sélectionnée, rentabilité optimisée. Service clés en main pour propriétaires parisiens.",
  keywords: "gestion locative paris, gestion locative meublée, rentabilité location meublée, confier appartement gestion paris",
  openGraph: {
    title: "Propriétaires — Gestion Locative Meublée | Move in Paris",
    description: "Gestion locative complète pour votre appartement meublé à Paris. Rentabilité optimisée.",
  },
};

export default function Proprietaires() {
  return (
    <>
      <Header />
      <main>
        <PageHero
          title="Propriétaires"
          subtitle="Confiez-nous votre bien et profitez d'une gestion locative complète, sans aucun souci."
          breadcrumb="Propriétaires"
        />
        <ProprietairesContent />
        <CTABanner
          title="Prêt à nous confier votre bien ?"
          subtitle="Remplissez notre formulaire et nous vous recontactons sous 24h pour une estimation gratuite."
          buttonText="Proposer mon appartement"
          buttonHref="/proposer-mon-appartement"
          secondaryText="Nous appeler"
          secondaryHref="/contact"
        />
      </main>
      <Footer />
    </>
  );
}
