import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageHero from "@/components/PageHero";
import SubmitForm from "./SubmitForm";

export const metadata: Metadata = {
  title: "Proposer Mon Appartement | Move in Paris — Gestion Locative Paris",
  description:
    "Proposez votre appartement meublé à la location corporate avec Move in Paris. Formulaire simple, estimation gratuite, réponse sous 24h.",
  keywords: "proposer appartement location meublée, gestion locative paris, louer appartement corporate paris",
  openGraph: {
    title: "Proposer Mon Appartement | Move in Paris",
    description: "Confiez votre appartement à Move in Paris pour une gestion locative complète.",
  },
};

export default function ProposerAppartement() {
  return (
    <>
      <Header />
      <main>
        <PageHero
          title="Proposer votre appartement"
          subtitle="Remplissez ce formulaire et nous vous recontactons sous 24h pour une estimation gratuite."
          breadcrumb="Proposer mon appartement"
        />
        <SubmitForm />
      </main>
      <Footer />
    </>
  );
}
