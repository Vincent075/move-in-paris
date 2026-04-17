import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageHero from "@/components/PageHero";
import { getMessages } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { messages } = await getMessages();
  return {
    title: messages.legal.privacyTitle + " | Move in Paris",
    description: messages.legal.privacySubtitle,
    robots: { index: true, follow: true },
  };
}

type Section = {
  title: string;
  paragraphs: string[];
};

export default async function PolitiqueDeConfidentialite() {
  const { messages } = await getMessages();
  const L = messages.legal;
  const sections = L.privacySections as Section[];
  return (
    <>
      <Header />
      <main>
        <PageHero
          title={L.privacyTitle}
          subtitle={L.privacySubtitle}
          breadcrumb={L.privacyBreadcrumb}
        />

        <section className="bg-blanc py-20">
          <div className="max-w-4xl mx-auto px-6 lg:px-12">
            <div className="mb-14">
              <h2 className="font-serif text-2xl text-noir mb-6 pb-4 border-b border-gris-clair">
                {L.privacyPreambule}
              </h2>
              <p className="text-gris font-light leading-relaxed mb-4">{L.privacyPreambuleP1}</p>
              <p className="text-gris font-light leading-relaxed">{L.privacyPreambuleP2}</p>
            </div>

            {sections.map((section, i) => (
              <div key={i} className="mb-14">
                <h2 className="font-serif text-2xl text-noir mb-6 pb-4 border-b border-gris-clair">
                  {section.title}
                </h2>
                {section.paragraphs.map((p, j) => (
                  <p key={j} className={`text-gris font-light leading-relaxed ${j < section.paragraphs.length - 1 ? "mb-4" : ""}`}>
                    {p}
                  </p>
                ))}
              </div>
            ))}

            <div className="pt-8 border-t border-gris-clair">
              <p className="text-gris font-light text-sm">{L.lastUpdate}</p>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
