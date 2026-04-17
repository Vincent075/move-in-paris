import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageHero from "@/components/PageHero";
import { getMessages } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { messages } = await getMessages();
  return {
    title: messages.legal.cguTitle + " | Move in Paris",
    description: messages.legal.contentNotice,
    robots: { index: true, follow: true },
  };
}

export default async function CGU() {
  const { messages, locale } = await getMessages();
  return (
    <>
      <Header />
      <main>
        <PageHero
          title={messages.legal.cguTitle}
          subtitle="Les présentes conditions définissent les modalités et conditions d'utilisation du site www.move-in-paris.com."
          breadcrumb={messages.legal.cguBreadcrumb}
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

            {/* Préambule */}
            <div className="mb-14">
              <p className="text-gris font-light leading-relaxed mb-4">
                Les présentes Conditions Générales d&apos;Utilisation (ci-après « CGU ») ont pour objet de définir les modalités et conditions dans lesquelles Move in Paris, société éditrice du site www.move-in-paris.com, met à disposition ses services en ligne, ainsi que les droits et obligations de toute personne accédant au site (ci-après « l&apos;Utilisateur »).
              </p>
              <p className="text-gris font-light leading-relaxed">
                L&apos;accès et l&apos;utilisation du site impliquent l&apos;acceptation pleine et entière des présentes CGU. Move in Paris se réserve le droit de modifier les présentes CGU à tout moment. Les conditions applicables sont celles en vigueur au moment de la navigation sur le site.
              </p>
            </div>

            {/* 1. Objet */}
            <div className="mb-14">
              <h2 className="font-serif text-2xl text-noir mb-6 pb-4 border-b border-gris-clair">
                Article 1 — Objet
              </h2>
              <p className="text-gris font-light leading-relaxed mb-4">
                Le site www.move-in-paris.com est un site vitrine et de mise en relation ayant pour objet de présenter les services de l&apos;agence Move in Paris, spécialisée dans la location d&apos;appartements meublés à Paris à destination des entreprises, des cadres en mobilité professionnelle et des expatriés.
              </p>
              <p className="text-gris font-light leading-relaxed">
                Le site permet notamment aux utilisateurs de consulter les appartements disponibles, de soumettre des demandes de renseignements via les formulaires de contact, et de prendre connaissance des services proposés par l&apos;agence.
              </p>
            </div>

            {/* 2. Accès au site */}
            <div className="mb-14">
              <h2 className="font-serif text-2xl text-noir mb-6 pb-4 border-b border-gris-clair">
                Article 2 — Accès au site
              </h2>

              <h3 className="font-serif text-xl text-noir mb-3">2.1 Conditions d&apos;accès</h3>
              <p className="text-gris font-light leading-relaxed mb-6">
                Le site www.move-in-paris.com est accessible gratuitement à tout utilisateur disposant d&apos;un accès à Internet. Tous les frais supportés par l&apos;Utilisateur pour accéder au service (matériel informatique, logiciels, connexion Internet, etc.) sont à sa charge exclusive.
              </p>

              <h3 className="font-serif text-xl text-noir mb-3">2.2 Disponibilité du site</h3>
              <p className="text-gris font-light leading-relaxed mb-6">
                Move in Paris met en œuvre les moyens nécessaires pour assurer la continuité de l&apos;accès au site. Toutefois, Move in Paris ne peut garantir une disponibilité continue du site et se réserve le droit de le suspendre temporairement pour des raisons de maintenance, de mise à jour, de sécurité ou pour tout autre motif technique ou commercial, sans que cette interruption ouvre droit à une quelconque indemnité pour l&apos;Utilisateur.
              </p>

              <h3 className="font-serif text-xl text-noir mb-3">2.3 Comportement de l&apos;Utilisateur</h3>
              <p className="text-gris font-light leading-relaxed">
                L&apos;Utilisateur s&apos;engage à utiliser le site de manière loyale, conformément à son objet et aux dispositions légales et réglementaires en vigueur. Il s&apos;engage notamment à ne pas utiliser le site à des fins illicites, à ne pas tenter d&apos;en perturber le fonctionnement et à ne pas collecter ou stocker des données personnelles concernant d&apos;autres utilisateurs.
              </p>
            </div>

            {/* 3. Propriété intellectuelle */}
            <div className="mb-14">
              <h2 className="font-serif text-2xl text-noir mb-6 pb-4 border-b border-gris-clair">
                Article 3 — Propriété intellectuelle
              </h2>
              <p className="text-gris font-light leading-relaxed mb-4">
                L&apos;ensemble des contenus présents sur le site www.move-in-paris.com (textes, images, photographies, vidéos, sons, logos, icônes, mise en forme graphique, base de données, architecture du site, etc.) est protégé par le droit d&apos;auteur, le droit des marques et plus généralement par la législation française et internationale relative à la propriété intellectuelle.
              </p>
              <p className="text-gris font-light leading-relaxed mb-4">
                Ces contenus sont la propriété exclusive de Move in Paris ou font l&apos;objet de licences accordées à Move in Paris par leurs propriétaires respectifs. Toute reproduction, modification, publication, adaptation de tout ou partie des éléments du site, quel que soit le moyen ou le procédé utilisé, est interdite, sauf autorisation écrite préalable de Move in Paris.
              </p>
              <p className="text-gris font-light leading-relaxed">
                Tout manquement à cette disposition constituera une contrefaçon susceptible d&apos;entraîner des poursuites civiles et pénales conformément aux dispositions du Code de la propriété intellectuelle.
              </p>
            </div>

            {/* 4. Données personnelles */}
            <div className="mb-14">
              <h2 className="font-serif text-2xl text-noir mb-6 pb-4 border-b border-gris-clair">
                Article 4 — Données personnelles
              </h2>
              <p className="text-gris font-light leading-relaxed mb-4">
                Dans le cadre de l&apos;utilisation du site, Move in Paris est amenée à collecter des données personnelles vous concernant, notamment lorsque vous remplissez un formulaire de contact ou de demande d&apos;information.
              </p>
              <p className="text-gris font-light leading-relaxed">
                Move in Paris traite ces données personnelles en qualité de responsable de traitement, dans le respect du Règlement Général sur la Protection des Données (RGPD) n° 2016/679 du 27 avril 2016 et de la loi n° 78-17 du 6 janvier 1978 relative à l&apos;informatique, aux fichiers et aux libertés. Pour toute information sur le traitement de vos données personnelles, veuillez consulter notre{" "}
                <a href="/politique-de-confidentialite" className="text-gold hover:underline">Politique de confidentialité</a>.
              </p>
            </div>

            {/* 5. Cookies */}
            <div className="mb-14">
              <h2 className="font-serif text-2xl text-noir mb-6 pb-4 border-b border-gris-clair">
                Article 5 — Cookies
              </h2>
              <p className="text-gris font-light leading-relaxed mb-4">
                Le site www.move-in-paris.com est susceptible d&apos;utiliser des cookies ou technologies similaires pour améliorer l&apos;expérience de navigation de l&apos;Utilisateur, réaliser des statistiques de visites et analyser l&apos;audience du site.
              </p>
              <p className="text-gris font-light leading-relaxed mb-4">
                Un cookie est un petit fichier texte stocké sur le terminal de l&apos;Utilisateur lors de la visite d&apos;un site internet. Il permet au site de mémoriser des informations sur la visite (pages consultées, durée de visite, préférences de l&apos;utilisateur, etc.).
              </p>
              <p className="text-gris font-light leading-relaxed">
                Conformément à la réglementation applicable, les cookies non strictement nécessaires au fonctionnement du site ne sont déposés qu&apos;avec votre consentement. Vous pouvez paramétrer votre navigateur pour refuser les cookies ou pour être alerté lors de leur dépôt. Pour plus d&apos;informations, consultez notre{" "}
                <a href="/politique-de-confidentialite" className="text-gold hover:underline">Politique de confidentialité</a>.
              </p>
            </div>

            {/* 6. Responsabilité */}
            <div className="mb-14">
              <h2 className="font-serif text-2xl text-noir mb-6 pb-4 border-b border-gris-clair">
                Article 6 — Limitation de responsabilité
              </h2>

              <h3 className="font-serif text-xl text-noir mb-3">6.1 Contenu du site</h3>
              <p className="text-gris font-light leading-relaxed mb-6">
                Move in Paris s&apos;efforce d&apos;assurer l&apos;exactitude et la mise à jour des informations publiées sur le site. Toutefois, les informations diffusées sur ce site sont présentées à titre indicatif et non exhaustif. Move in Paris ne peut garantir leur exhaustivité, leur exactitude ni leur mise à jour et décline toute responsabilité pour toute imprécision, inexactitude ou omission.
              </p>

              <h3 className="font-serif text-xl text-noir mb-3">6.2 Disponibilité du site et des informations</h3>
              <p className="text-gris font-light leading-relaxed mb-6">
                Move in Paris ne saurait être tenue responsable des dommages directs ou indirects, quelles qu&apos;en soient les causes, origines, nature ou conséquences, résultant de l&apos;accès au site ou de l&apos;impossibilité d&apos;y accéder, de l&apos;utilisation du site ou de l&apos;utilisation qui en est faite par des tiers.
              </p>

              <h3 className="font-serif text-xl text-noir mb-3">6.3 Sites tiers</h3>
              <p className="text-gris font-light leading-relaxed">
                Le site peut contenir des liens hypertextes vers des sites tiers. Move in Paris décline toute responsabilité quant au contenu de ces sites, qui ne sont pas sous son contrôle, et ne saurait être tenue responsable des dommages directs ou indirects résultant de l&apos;accès à ces sites.
              </p>
            </div>

            {/* 7. Droit applicable */}
            <div className="mb-14">
              <h2 className="font-serif text-2xl text-noir mb-6 pb-4 border-b border-gris-clair">
                Article 7 — Droit applicable et règlement des litiges
              </h2>
              <p className="text-gris font-light leading-relaxed mb-4">
                Les présentes CGU sont régies, interprétées et appliquées conformément au droit français, à l&apos;exclusion de tout autre système juridique.
              </p>
              <p className="text-gris font-light leading-relaxed mb-4">
                En cas de litige relatif à l&apos;interprétation ou à l&apos;exécution des présentes CGU, les parties s&apos;engagent à tenter de régler leur différend à l&apos;amiable avant tout recours judiciaire.
              </p>
              <p className="text-gris font-light leading-relaxed">
                À défaut de résolution amiable, tout litige sera soumis à la compétence exclusive des tribunaux français compétents, et notamment du Tribunal de Commerce de Paris.
              </p>
            </div>

            {/* 8. Modification des CGU */}
            <div className="mb-14">
              <h2 className="font-serif text-2xl text-noir mb-6 pb-4 border-b border-gris-clair">
                Article 8 — Modification des CGU
              </h2>
              <p className="text-gris font-light leading-relaxed mb-4">
                Move in Paris se réserve le droit de modifier à tout moment les présentes CGU sans préavis. Les modifications entrent en vigueur dès leur mise en ligne sur le site. Il appartient à l&apos;Utilisateur de consulter régulièrement les CGU afin de prendre connaissance des éventuelles modifications.
              </p>
              <p className="text-gris font-light leading-relaxed">
                La poursuite de l&apos;utilisation du site par l&apos;Utilisateur après toute modification des CGU vaut acceptation de ces modifications.
              </p>
            </div>

            {/* 9. Contact */}
            <div className="mb-14">
              <h2 className="font-serif text-2xl text-noir mb-6 pb-4 border-b border-gris-clair">
                Article 9 — Contact
              </h2>
              <p className="text-gris font-light leading-relaxed">
                Pour toute question relative aux présentes CGU ou à l&apos;utilisation du site, vous pouvez contacter Move in Paris par email à l&apos;adresse{" "}
                <a href="mailto:contact@move-in-paris.com" className="text-gold hover:underline">contact@move-in-paris.com</a>
                {" "}ou par courrier à l&apos;adresse suivante : Move in Paris, 26, rue de l&apos;Étoile, 75017 Paris.
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
