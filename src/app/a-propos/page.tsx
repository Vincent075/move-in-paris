import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageHero from "@/components/PageHero";
import CTABanner from "@/components/CTABanner";
import AboutContent from "./AboutContent";
import { getMessages } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { messages } = await getMessages();
  return {
    title: messages.about.metaTitle,
    description: messages.about.metaDescription,
  };
}

export default async function APropos() {
  const { messages } = await getMessages();
  return (
    <>
      <Header />
      <main>
        <PageHero
          title={messages.about.heroTitle}
          subtitle={messages.about.heroSubtitle}
          breadcrumb={messages.about.breadcrumb}
          image="/apartments/salon-haussmann.jpg"
        />
        <AboutContent />
        <CTABanner
          title={messages.about.ctaTitle}
          subtitle={messages.about.ctaSubtitle}
          buttonText={messages.about.ctaButton}
          buttonHref="/nos-appartements"
          secondaryText={messages.about.ctaSecondary}
          secondaryHref="/contact"
        />
      </main>
      <Footer />
    </>
  );
}
