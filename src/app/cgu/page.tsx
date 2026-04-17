import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageHero from "@/components/PageHero";
import { getMessages } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { messages } = await getMessages();
  return {
    title: messages.legal.cguTitle + " | Move in Paris",
    description: messages.legal.cguSubtitle,
    robots: { index: true, follow: true },
  };
}

type Section = {
  title: string;
  paragraphs?: string[];
  subsections?: { title: string; text: string }[];
};

export default async function CGU() {
  const { messages } = await getMessages();
  const L = messages.legal;
  const sections = L.cguSections as Section[];
  return (
    <>
      <Header />
      <main>
        <PageHero
          title={L.cguTitle}
          subtitle={L.cguSubtitle}
          breadcrumb={L.cguBreadcrumb}
        />

        <section className="bg-blanc py-20">
          <div className="max-w-4xl mx-auto px-6 lg:px-12">
            <div className="mb-14">
              <h2 className="font-serif text-2xl text-noir mb-6 pb-4 border-b border-gris-clair">
                {L.cguPreambule}
              </h2>
              <p className="text-gris font-light leading-relaxed mb-4">{L.cguPreambuleP1}</p>
              <p className="text-gris font-light leading-relaxed">{L.cguPreambuleP2}</p>
            </div>

            {sections.map((section, i) => (
              <div key={i} className="mb-14">
                <h2 className="font-serif text-2xl text-noir mb-6 pb-4 border-b border-gris-clair">
                  {section.title}
                </h2>
                {section.paragraphs?.map((p, j) => (
                  <p key={j} className={`text-gris font-light leading-relaxed ${j < section.paragraphs!.length - 1 ? "mb-4" : ""}`}>
                    {p}
                  </p>
                ))}
                {section.subsections?.map((sub, j) => (
                  <div key={j} className={j < section.subsections!.length - 1 ? "mb-6" : ""}>
                    <h3 className="font-serif text-xl text-noir mb-3">{sub.title}</h3>
                    <p className="text-gris font-light leading-relaxed">{sub.text}</p>
                  </div>
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
