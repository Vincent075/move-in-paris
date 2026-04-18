import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageHero from "@/components/PageHero";
import CTABanner from "@/components/CTABanner";
import FAQContent from "./FAQContent";
import { getMessages } from "@/i18n/server";
import { faqs } from "@/data/faqs";

export async function generateMetadata(): Promise<Metadata> {
  const { messages } = await getMessages();
  return {
    title: messages.faqPage.metaTitle,
    description: messages.faqPage.metaDescription,
    alternates: { canonical: "https://www.move-in-paris.com/faq" },
  };
}

const faqPageLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqs.flatMap((cat) =>
    cat.questions.map((q) => ({
      "@type": "Question",
      name: q.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: q.a,
      },
    })),
  ),
};

export default async function FAQ() {
  const { messages } = await getMessages();
  return (
    <>
      <Header />
      <main>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqPageLd) }}
        />
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
