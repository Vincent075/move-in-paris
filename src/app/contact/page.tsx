import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageHero from "@/components/PageHero";
import Contact from "@/components/Contact";
import { getMessages } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { messages } = await getMessages();
  return {
    title: messages.contactPage.metaTitle,
    description: messages.contactPage.metaDescription,
  };
}

export default async function ContactPage() {
  const { messages } = await getMessages();
  return (
    <>
      <Header />
      <main>
        <PageHero
          title={messages.contactPage.heroTitle}
          subtitle={messages.contactPage.heroSubtitle}
          breadcrumb={messages.contactPage.breadcrumb}
        />
        <Contact />
      </main>
      <Footer />
    </>
  );
}
