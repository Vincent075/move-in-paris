import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageHero from "@/components/PageHero";
import CTABanner from "@/components/CTABanner";
import FAQContent from "./FAQContent";
import { getMessages } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { messages } = await getMessages();
  return {
    title: messages.faqPage.metaTitle,
    description: messages.faqPage.metaDescription,
  };
}

export default async function FAQ() {
  const { messages } = await getMessages();
  return (
    <>
      <Header />
      <main>
        <PageHero
          title={messages.faqPage.heroTitle}
          subtitle={messages.faqPage.heroSubtitle}
          breadcrumb={messages.faqPage.breadcrumb}
        />
        <FAQContent />
        <CTABanner
          title={messages.faqPage.ctaTitle}
          subtitle={messages.faqPage.ctaSubtitle}
          buttonText={messages.faqPage.ctaButton}
          buttonHref="/contact"
        />
      </main>
      <Footer />
    </>
  );
}
