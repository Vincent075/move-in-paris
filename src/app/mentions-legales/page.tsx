import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageHero from "@/components/PageHero";
import { getMessages } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { messages } = await getMessages();
  return {
    title: messages.legal.mentionsTitle + " | Move in Paris",
    description: messages.legal.mentionsSubtitle,
    robots: { index: true, follow: true },
  };
}

export default async function MentionsLegales() {
  const { messages } = await getMessages();
  const L = messages.legal;
  return (
    <>
      <Header />
      <main>
        <PageHero
          title={L.mentionsTitle}
          subtitle={L.mentionsSubtitle}
          breadcrumb={L.mentionsBreadcrumb}
        />

        <section className="bg-blanc py-20">
          <div className="max-w-4xl mx-auto px-6 lg:px-12">

            <div className="mb-14">
              <h2 className="font-serif text-2xl text-noir mb-6 pb-4 border-b border-gris-clair">
                {L.mentionsEditor}
              </h2>
              <p className="text-gris font-light leading-relaxed mb-4">
                {L.mentionsEditorIntro}
              </p>
              <div className="bg-blanc-chaud border border-gris-clair p-6 space-y-2">
                <p className="text-gris font-light"><span className="text-noir font-normal">{L.mentionsEditorCompany} :</span> Move in Paris</p>
                <p className="text-gris font-light"><span className="text-noir font-normal">{L.mentionsEditorForm} :</span> {L.mentionsEditorFormValue}</p>
                <p className="text-gris font-light"><span className="text-noir font-normal">{L.mentionsEditorHQ} :</span> 26, rue de l&apos;Étoile, 75017 Paris</p>
                <p className="text-gris font-light"><span className="text-noir font-normal">{L.mentionsEditorPhone} :</span> +33 1 45 20 06 03</p>
                <p className="text-gris font-light"><span className="text-noir font-normal">{L.mentionsEditorEmail} :</span> contact@move-in-paris.com</p>
                <p className="text-gris font-light"><span className="text-noir font-normal">{L.mentionsEditorWeb} :</span> www.move-in-paris.com</p>
              </div>
            </div>

            <div className="mb-14">
              <h2 className="font-serif text-2xl text-noir mb-6 pb-4 border-b border-gris-clair">
                {L.mentionsDirector}
              </h2>
              <p className="text-gris font-light leading-relaxed">
                {L.mentionsDirectorText}
              </p>
            </div>

            <div className="mb-14">
              <h2 className="font-serif text-2xl text-noir mb-6 pb-4 border-b border-gris-clair">
                {L.mentionsHost}
              </h2>
              <p className="text-gris font-light leading-relaxed mb-4">
                {L.mentionsHostIntro}
              </p>
              <div className="bg-blanc-chaud border border-gris-clair p-6 space-y-2">
                <p className="text-gris font-light"><span className="text-noir font-normal">{L.mentionsHostCompany} :</span> Vercel Inc.</p>
                <p className="text-gris font-light"><span className="text-noir font-normal">{L.mentionsHostAddress} :</span> {L.mentionsHostAddressValue}</p>
                <p className="text-gris font-light"><span className="text-noir font-normal">{L.mentionsHostWeb} :</span> www.vercel.com</p>
              </div>
            </div>

            <div className="mb-14">
              <h2 className="font-serif text-2xl text-noir mb-6 pb-4 border-b border-gris-clair">
                {L.mentionsIP}
              </h2>
              <p className="text-gris font-light leading-relaxed mb-4">{L.mentionsIP1}</p>
              <p className="text-gris font-light leading-relaxed mb-4">{L.mentionsIP2}</p>
              <p className="text-gris font-light leading-relaxed">{L.mentionsIP3}</p>
            </div>

            <div className="mb-14">
              <h2 className="font-serif text-2xl text-noir mb-6 pb-4 border-b border-gris-clair">
                {L.mentionsLinks}
              </h2>

              <h3 className="font-serif text-xl text-noir mb-3">{L.mentionsLinks3rd}</h3>
              <p className="text-gris font-light leading-relaxed mb-6">{L.mentionsLinks3rdText}</p>

              <h3 className="font-serif text-xl text-noir mb-3">{L.mentionsLinksOwn}</h3>
              <p className="text-gris font-light leading-relaxed">{L.mentionsLinksOwnText}</p>
            </div>

            <div className="mb-14">
              <h2 className="font-serif text-2xl text-noir mb-6 pb-4 border-b border-gris-clair">
                {L.mentionsLiability}
              </h2>
              <p className="text-gris font-light leading-relaxed mb-4">{L.mentionsLiability1}</p>
              <p className="text-gris font-light leading-relaxed mb-4">{L.mentionsLiability2}</p>
              <p className="text-gris font-light leading-relaxed">{L.mentionsLiability3}</p>
            </div>

            <div className="mb-14">
              <h2 className="font-serif text-2xl text-noir mb-6 pb-4 border-b border-gris-clair">
                {L.mentionsData}
              </h2>
              <p className="text-gris font-light leading-relaxed">
                {L.mentionsDataText}{" "}
                <a href="/politique-de-confidentialite" className="text-gold hover:underline">{L.mentionsDataLink}</a>.
              </p>
            </div>

            <div className="mb-14">
              <h2 className="font-serif text-2xl text-noir mb-6 pb-4 border-b border-gris-clair">
                {L.mentionsCookies}
              </h2>
              <p className="text-gris font-light leading-relaxed">
                {L.mentionsCookiesText}{" "}
                <a href="/politique-de-confidentialite" className="text-gold hover:underline">{L.mentionsDataLink}</a>.
              </p>
            </div>

            <div className="mb-14">
              <h2 className="font-serif text-2xl text-noir mb-6 pb-4 border-b border-gris-clair">
                {L.mentionsLaw}
              </h2>
              <p className="text-gris font-light leading-relaxed">{L.mentionsLawText}</p>
            </div>

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
