import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageHero from "@/components/PageHero";
import ApartmentsList from "./ApartmentsList";
import { getMessages } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { messages, locale } = await getMessages();
  if (locale === "en") {
    return {
      title: "Our furnished apartments in Paris | Move in Paris",
      description: "Discover our selection of high-end furnished apartments in Paris. Corporate and expat rentals, from studios to 3-bedroom flats in the finest Paris neighborhoods.",
    };
  }
  return {
    title: "Nos Appartements Meublés à Paris | Move in Paris",
    description: messages.apartmentsPage.subtitle,
    keywords: "appartement meublé paris, location meublée corporate, location expatrié paris, studio meublé paris, appartement meublé 75017",
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
