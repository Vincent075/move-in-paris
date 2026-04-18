import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageHero from "@/components/PageHero";
import EstimationForm from "./EstimationForm";
import { getMessages } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { messages } = await getMessages();
  return {
    title: messages.estimationPage.metaTitle,
    description: messages.estimationPage.metaDescription,
    alternates: { canonical: "/estimation" },
  };
}

export default async function EstimationPage() {
  const { messages } = await getMessages();
  return (
    <>
      <Header />
      <main>
        <PageHero
          title={messages.estimationPage.heroTitle}
          subtitle={messages.estimationPage.heroSubtitle}
          breadcrumb={messages.estimationPage.breadcrumb}
          image="/apartments/salon-bibliotheque.jpg"
        />
        <EstimationForm />
      </main>
      <Footer />
    </>
  );
}
