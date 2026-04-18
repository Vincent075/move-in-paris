import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageHero from "@/components/PageHero";
import ApartmentsList from "./ApartmentsList";
import { getMessages } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { messages, locale } = await getMessages();
  const canonical = "https://www.move-in-paris.com/nos-appartements";
  if (locale === "en") {
    return {
      title: "Furnished apartments in Paris — Corporate & expat rentals | Move in Paris",
      description: "High-end furnished rentals in Paris for corporates and expats. Studios to 3-bedroom apartments in the finest neighborhoods, fully managed and move-in ready.",
      alternates: { canonical },
      openGraph: { title: "Furnished apartments in Paris | Move in Paris", description: "High-end furnished rentals for corporates and expats.", url: canonical },
    };
  }
  return {
    title: "Location meublée à Paris — Appartements meublés haut de gamme | Move in Paris",
    description: "Location meublée à Paris pour entreprises et expatriés. Appartements meublés haut de gamme dans les meilleurs quartiers (16e, 17e, 8e…), gestion clé en main.",
    alternates: { canonical },
    openGraph: { title: "Location meublée à Paris | Move in Paris", description: messages.apartmentsPage.subtitle, url: canonical },
  };
}

export default async function NosAppartements() {
  const { messages } = await getMessages();
  return (
    <>
      <Header />
      <main>
        <PageHero
          title={messages.apartmentsPage.title}
          subtitle={messages.apartmentsPage.subtitle}
          breadcrumb={messages.apartmentsPage.breadcrumbCurrent}
        />
        <ApartmentsList />
      </main>
      <Footer />
    </>
  );
}
