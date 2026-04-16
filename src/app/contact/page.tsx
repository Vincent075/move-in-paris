import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageHero from "@/components/PageHero";
import Contact from "@/components/Contact";

export const metadata: Metadata = {
  title: "Contact — Move in Paris | Agence Location Meublée Paris 17",
  description:
    "Contactez Move in Paris au 01 45 20 06 03 ou via notre formulaire. Agence située 26 rue de l'Étoile, Paris 17e. Location meublée corporate et expatriés.",
  keywords: "contact move in paris, agence location meublée paris 17, téléphone move in paris",
  openGraph: {
    title: "Contactez Move in Paris",
    description: "Agence de location meublée corporate, 26 rue de l'Étoile, Paris 17e.",
  },
};

export default function ContactPage() {
  return (
    <>
      <Header />
      <main>
        <PageHero
          title="Contactez-nous"
          subtitle="Notre équipe est à votre écoute pour répondre à toutes vos questions."
          breadcrumb="Contact"
        />
        <Contact />
      </main>
      <Footer />
    </>
  );
}
