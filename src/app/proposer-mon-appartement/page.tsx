import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageHero from "@/components/PageHero";
import SubmitForm from "./SubmitForm";
import { getMessages } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { messages } = await getMessages();
  return {
    title: messages.submitPage.metaTitle,
    description: messages.submitPage.metaDescription,
  };
}

export default async function ProposerAppartement() {
  const { messages } = await getMessages();
  return (
    <>
      <Header />
      <main>
        <PageHero
          title={messages.submitPage.heroTitle}
          subtitle={messages.submitPage.heroSubtitle}
          breadcrumb={messages.submitPage.breadcrumb}
        />
        <SubmitForm />
      </main>
      <Footer />
    </>
  );
}
