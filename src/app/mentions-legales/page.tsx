import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageHero from "@/components/PageHero";
import { getMessages } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { messages } = await getMessages();
  return {
    title: messages.legal.mentionsTitle + " | Move in Paris",
    description: messages.legal.contentNotice,
    robots: { index: true, follow: true },
  };
}

export default async function MentionsLegales() {
  const { messages, locale } = await getMessages();
  return (
    <>
      <Header />
      <main>
        <PageHero
          title={messages.legal.mentionsTitle}
          subtitle="Conformément aux dispositions de la loi n° 2004-575 du 21 juin 2004 pour la confiance en l'économie numérique."
          breadcrumb={messages.legal.mentionsBreadcrumb}
        />

        <section className="bg-blanc py-20">
          <div className="max-w-4xl mx-auto px-6 lg:px-12">
            {locale === "en" && (
              <div className="mb-10 p-6 border border-gris-clair/50 bg-blanc-chaud" style={{ borderRadius: 12 }}>
                <p className="text-sm text-gris font-light leading-relaxed">
                  {messages.legal.contentNotice}
                </p>
              </div>
            )}

            {/* 1. Éditeur du site */}
            <div className="mb-14">
              <h2 className="font-serif text-2xl text-noir mb-6 pb-4 border-b border-gris-clair">
                1. Éditeur du site
              </h2>
              <p className="text-gris font-light leading-relaxed mb-4">
                Le site <strong className="text-noir font-normal">www.move-in-paris.com</strong> est édité par la société Move in Paris, dont les coordonnées sont les suivantes :
              </p>
              <div className="bg-blanc-chaud border border-gris-clair p-6 space-y-2">
                <p className="text-gris font-light"><span className="text-noir font-normal">Raison sociale :</span> Move in Paris</p>
                <p className="text-gris font-light"><span className="text-noir font-normal">Forme juridique :</span> Société par actions simplifiée (SAS)</p>
                <p className="text-gris font-light"><span className="text-noir font-normal">Siège social :</span> 26, rue de l&apos;Étoile, 75017 Paris</p>
                <p className="text-gris font-light"><span className="text-noir font-normal">Téléphone :</span> +33 1 45 20 06 03</p>
                <p className="text-gris font-light"><span className="text-noir font-normal">Email :</span> contact@move-in-paris.com</p>
                <p className="text-gris font-light"><span className="text-noir font-normal">Site internet :</span> www.move-in-paris.com</p>
              </div>
            </div>

            {/* 2. Directeur de la publication */}
            <div className="mb-14">
              <h2 className="font-serif text-2xl text-noir mb-6 pb-4 border-b border-gris-clair">
                2. Directeur de la publication
              </h2>
              <p className="text-gris font-light leading-relaxed">
                Le directeur de la publication du site www.move-in-paris.com est le représentant légal de la société Move in Paris, joignable à l&apos;adresse email suivante : <strong className="text-noir font-normal">contact@move-in-paris.com</strong>.
              </p>
            </div>

            {/* 3. Hébergeur */}
            <div className="mb-14">
              <h2 className="font-serif text-2xl text-noir mb-6 pb-4 border-b border-gris-clair">
                3. Hébergeur du site
              </h2>
              <p className="text-gris font-light leading-relaxed mb-4">
                Le site www.move-in-paris.com est hébergé par la société Vercel Inc., dont les coordonnées sont les suivantes :
              </p>
              <div className="bg-blanc-chaud border border-gris-clair p-6 space-y-2">
                <p className="text-gris font-light"><span className="text-noir font-normal">Société :</span> Vercel Inc.</p>
                <p className="text-gris font-light"><span className="text-noir font-normal">Adresse :</span> 340 Pine Street, Suite 701, San Francisco, CA 94104, États-Unis</p>
                <p className="text-gris font-light"><span className="text-noir font-normal">Site :</span> www.vercel.com</p>
              </div>
            </div>

            {/* 4. Propriété intellectuelle */}
            <div className="mb-14">
              <h2 className="font-serif text-2xl text-noir mb-6 pb-4 border-b border-gris-clair">
                4. Propriété intellectuelle
              </h2>
              <p className="text-gris font-light leading-relaxed mb-4">
                L&apos;ensemble des éléments constituant le site www.move-in-paris.com (textes, graphismes, logiciels, photographies, images, sons, plans, noms, logos, marques, créations et œuvres protégeables diverses, bases de données, etc.) ainsi que le site lui-même, relèvent de la législation française et internationale sur le droit d&apos;auteur et la propriété intellectuelle.
              </p>
              <p className="text-gris font-light leading-relaxed mb-4">
                Ces éléments sont la propriété exclusive de Move in Paris. Toute reproduction, représentation, utilisation ou adaptation, sous quelque forme que ce soit, de tout ou partie de ces éléments, y compris les applications informatiques, sans l&apos;accord préalable et écrit de Move in Paris, est strictement interdite.
              </p>
              <p className="text-gris font-light leading-relaxed">
                Le fait pour Move in Paris de ne pas engager de procédure dès la prise de connaissance de ces utilisations non autorisées ne vaut pas acceptation desdites utilisations et renonciation aux poursuites. La marque Move in Paris, ainsi que les logos figurant sur le site, sont des marques déposées. Toute reproduction totale ou partielle de ces marques ou de ces logos effectuée à partir des éléments du site sans l&apos;autorisation expresse de Move in Paris est donc prohibée au sens des articles L. 713-2 et suivants du Code de la propriété intellectuelle.
              </p>
            </div>

            {/* 5. Liens hypertextes */}
            <div className="mb-14">
              <h2 className="font-serif text-2xl text-noir mb-6 pb-4 border-b border-gris-clair">
                5. Liens hypertextes
              </h2>

              <h3 className="font-serif text-xl text-noir mb-3">5.1 Liens vers des sites tiers</h3>
              <p className="text-gris font-light leading-relaxed mb-6">
                Le site www.move-in-paris.com peut contenir des liens hypertextes vers d&apos;autres sites internet. Ces liens sont fournis à titre d&apos;information uniquement. Move in Paris n&apos;exerce aucun contrôle sur ces sites et décline toute responsabilité quant à leur contenu, leurs pratiques en matière de protection des données ou toute autre condition les régissant.
              </p>

              <h3 className="font-serif text-xl text-noir mb-3">5.2 Liens vers notre site</h3>
              <p className="text-gris font-light leading-relaxed">
                Tout site internet peut créer un lien hypertexte vers le site www.move-in-paris.com sans autorisation préalable, sous réserve que ce lien ouvre une nouvelle fenêtre de navigateur et pointe vers la page d&apos;accueil du site, et qu&apos;il ne soit pas présenté de manière mensongère, fallacieuse ou susceptible de nuire à la réputation de Move in Paris.
              </p>
            </div>

            {/* 6. Responsabilité */}
            <div className="mb-14">
              <h2 className="font-serif text-2xl text-noir mb-6 pb-4 border-b border-gris-clair">
                6. Limitation de responsabilité
              </h2>
              <p className="text-gris font-light leading-relaxed mb-4">
                Move in Paris s&apos;efforce d&apos;assurer l&apos;exactitude et la mise à jour des informations diffusées sur ce site, dont elle se réserve le droit de corriger, à tout moment et sans préavis, le contenu. Toutefois, Move in Paris ne peut garantir l&apos;exactitude, la précision ou l&apos;exhaustivité des informations mises à disposition sur ce site.
              </p>
              <p className="text-gris font-light leading-relaxed mb-4">
                Move in Paris décline toute responsabilité pour toute imprécision, inexactitude ou omission portant sur des informations disponibles sur ce site, ainsi que pour tout dommage résultant d&apos;une intrusion frauduleuse d&apos;un tiers ayant entraîné une modification des informations mises à disposition sur ce site.
              </p>
              <p className="text-gris font-light leading-relaxed">
                Move in Paris ne pourra être tenue responsable des dommages directs ou indirects résultant de l&apos;accès au site ou de l&apos;impossibilité d&apos;y accéder, de l&apos;utilisation du site ou des informations, textes, images, sons ou vidéos y figurant, notamment de tout préjudice financier ou commercial, perte de programme ou de données dans votre système d&apos;information.
              </p>
            </div>

            {/* 7. Données personnelles */}
            <div className="mb-14">
              <h2 className="font-serif text-2xl text-noir mb-6 pb-4 border-b border-gris-clair">
                7. Données personnelles
              </h2>
              <p className="text-gris font-light leading-relaxed">
                Move in Paris attache une grande importance à la protection de vos données personnelles. Pour toute information relative au traitement de vos données personnelles, nous vous invitons à consulter notre{" "}
                <a href="/politique-de-confidentialite" className="text-gold hover:underline">Politique de confidentialité</a>.
              </p>
            </div>

            {/* 8. Cookies */}
            <div className="mb-14">
              <h2 className="font-serif text-2xl text-noir mb-6 pb-4 border-b border-gris-clair">
                8. Cookies
              </h2>
              <p className="text-gris font-light leading-relaxed">
                Le site www.move-in-paris.com est susceptible d&apos;utiliser des cookies pour améliorer l&apos;expérience utilisateur et analyser la fréquentation du site. Pour en savoir plus sur l&apos;utilisation des cookies et sur vos droits, veuillez consulter notre{" "}
                <a href="/politique-de-confidentialite" className="text-gold hover:underline">Politique de confidentialité</a>.
              </p>
            </div>

            {/* 9. Droit applicable */}
            <div className="mb-14">
              <h2 className="font-serif text-2xl text-noir mb-6 pb-4 border-b border-gris-clair">
                9. Droit applicable et juridiction compétente
              </h2>
              <p className="text-gris font-light leading-relaxed">
                Les présentes mentions légales sont régies par le droit français. En cas de litige et à défaut de résolution amiable, les tribunaux français seront seuls compétents, et notamment le Tribunal de Commerce de Paris.
              </p>
            </div>

            {/* Mise à jour */}
            <div className="pt-8 border-t border-gris-clair">
              <p className="text-gris font-light text-sm">
                Dernière mise à jour : avril 2026
              </p>
            </div>

          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
