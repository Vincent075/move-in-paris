import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageHero from "@/components/PageHero";
import CTABanner from "@/components/CTABanner";
import ProprietairesContent from "./ProprietairesContent";
import { getMessages } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { messages } = await getMessages();
  return {
    title: messages.owners.metaTitle,
    description: messages.owners.metaDescription,
    alternates: { canonical: "https://www.move-in-paris.com/proprietaires" },
  };
}

export default async function Proprietaires() {
  const { messages } = await getMessages();
  return (
    <>
      <Header />
      <main>
        <PageHero
          title={messages.owners.heroTitle}
          subtitle={messages.owners.heroSubtitle}
          breadcrumb={messages.owners.breadcrumb}
          image="/apartments/vue-paris.jpg"
        />
        <ProprietairesContent />
        <CTABanner
          title={messages.owners.ctaTitle}
          subtitle={messages.owners.ctaSubtitle}
          buttonText={messages.owners.ctaButton}
          buttonHref="/proposer-mon-appartement"
          secondaryText={messages.owners.ctaSecondary}
          secondaryHref="/contact"
        />
      </main>
      <Footer />
    </>
  );
}
