import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageHero from "@/components/PageHero";
import SEOLanding, { buildFaqLd, type SEOLandingFAQ } from "@/components/SEOLanding";

export const metadata: Metadata = {
  title: "Bail mobilité à Paris — Tout comprendre + appartements meublés | Move in Paris",
  description: "Le bail mobilité (loi ELAN 2018) permet de louer un meublé à Paris de 1 à 10 mois sans dépôt de garantie. Conditions, durée, modèle, et notre sélection d'appartements éligibles.",
  alternates: { canonical: "https://www.move-in-paris.com/bail-mobilite-paris" },
  openGraph: {
    title: "Bail mobilité à Paris — Move in Paris",
    description: "Tout savoir sur le bail mobilité (loi ELAN 2018) à Paris : durée 1-10 mois, sans dépôt de garantie.",
    url: "https://www.move-in-paris.com/bail-mobilite-paris",
  },
};

const faqs: SEOLandingFAQ[] = [
  {
    q: "Qu'est-ce que le bail mobilité ?",
    a: "Le bail mobilité est un contrat de location meublée créé par la loi ELAN du 23 novembre 2018 (article L632-1 du Code de la construction et de l'habitation). Il s'adresse à un locataire en situation de mobilité professionnelle ou de formation : étudiant, alternant, stagiaire, professionnel en mission temporaire, mutation, formation professionnelle. Il dure de 1 à 10 mois, ne peut être renouvelé, et n'exige aucun dépôt de garantie.",
  },
  {
    q: "Qui peut signer un bail mobilité ?",
    a: "Le locataire doit justifier au moment de la signature d'une des situations suivantes : formation professionnelle, études supérieures, contrat d'apprentissage, stage, engagement volontaire dans le cadre du service civique, mutation professionnelle, mission temporaire dans le cadre de son activité professionnelle. Un justificatif est annexé au bail (attestation employeur, certificat de scolarité, etc.).",
  },
  {
    q: "Quelle durée pour un bail mobilité à Paris ?",
    a: "Le bail mobilité dure de 1 mois minimum à 10 mois maximum. La durée est ferme et ne peut être renouvelée. Le locataire peut résilier à tout moment avec un préavis d'un mois (réduit). Le propriétaire ne peut pas mettre fin au contrat avant son terme. À l'échéance, le bail s'éteint sans tacite reconduction — il faut signer un nouveau contrat (autre type) si le locataire souhaite rester.",
  },
  {
    q: "Faut-il un dépôt de garantie pour un bail mobilité ?",
    a: "Non, le dépôt de garantie est strictement interdit par la loi pour un bail mobilité (article 25-13 de la loi du 6 juillet 1989). En revanche, un garant peut être demandé. La garantie Visale d'Action Logement est gratuite et acceptée par la plupart des bailleurs pour ce type de bail.",
  },
  {
    q: "Quelle différence entre bail mobilité et bail meublé classique ?",
    a: "Le bail meublé classique (loi 1989) dure 1 an minimum (9 mois pour étudiant), avec dépôt de garantie 2 mois max et possibilité de renouvellement automatique. Le bail mobilité dure 1-10 mois, sans dépôt de garantie, sans renouvellement, mais réservé aux situations de mobilité justifiées. Le bail mobilité est encadré par la loi 1989 modifiée — différent du bail Code Civil utilisé en location corporate.",
  },
  {
    q: "Le loyer d'un bail mobilité est-il encadré à Paris ?",
    a: "Oui, à Paris l'encadrement des loyers s'applique aussi au bail mobilité (zone tendue depuis 2019). Le loyer ne peut excéder de plus de 20 % le loyer de référence majoré publié par la préfecture pour la catégorie du bien (nombre de pièces, époque de construction, meublé/vide). Move in Paris vérifie systématiquement la conformité de chaque appartement à l'encadrement.",
  },
  {
    q: "Move in Paris propose-t-il du bail mobilité ?",
    a: "Oui, plusieurs de nos appartements sont éligibles au bail mobilité — particulièrement adaptés aux étudiants en mastère parisien (HEC, ESSEC, ESCP, Sciences Po), aux alternants en grande entreprise, ou aux professionnels en mission de 3-9 mois. Contactez-nous pour une sélection adaptée à votre situation.",
  },
];

const faqLd = buildFaqLd(faqs);

export default function Page() {
  return (
    <>
      <Header />
      <main>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }}
        />
        <PageHero
          title="Bail mobilité à Paris"
          subtitle="Le bail mobilité (loi ELAN 2018) permet de louer un meublé à Paris pour 1 à 10 mois, sans dépôt de garantie. Tout ce qu'il faut savoir + nos appartements éligibles."
          breadcrumb="Bail mobilité"
          image="/apartments/vue-paris.jpg"
        />
        <SEOLanding
          eyebrow="Bail mobilité — Loi ELAN 2018"
          intro="Créé par la loi ELAN du 23 novembre 2018, le bail mobilité est devenu en quelques années un outil incontournable pour les étudiants, alternants, jeunes professionnels en mission et cadres en mutation cherchant un logement meublé à Paris pour quelques mois. Court (1 à 10 mois), sans dépôt de garantie, à la durée ferme, il offre un cadre clair et sécurisé tant pour le locataire que pour le propriétaire. Move in Paris propose une sélection d'appartements parisiens éligibles au bail mobilité."
          highlights={[
            { title: "Durée 1 à 10 mois", text: "Idéal pour stages, alternances, mutations, missions temporaires, formations longues." },
            { title: "Zéro dépôt de garantie", text: "Interdit par la loi pour le bail mobilité — trésorerie locataire préservée." },
            { title: "Garantie Visale acceptée", text: "Garantie gratuite Action Logement, disponible pour tous les profils éligibles." },
          ]}
          sections={[
            {
              title: "Qu'est-ce que le bail mobilité ?",
              body: (
                <>
                  <p>
                    Le <strong>bail mobilité</strong> est un contrat de location meublée d'une durée comprise entre <strong>1 et 10 mois</strong>, créé par l'article 107 de la loi ELAN du 23 novembre 2018 et codifié à l'article 25-12 et suivants de la loi du 6 juillet 1989.
                  </p>
                  <p>
                    Il a été conçu pour répondre à un besoin spécifique du marché parisien : permettre à des publics en <strong>situation de mobilité professionnelle ou de formation</strong> de se loger rapidement, sans avancer plusieurs mois de loyer en dépôt de garantie, et sans s'engager sur la durée d'un bail meublé classique d'un an.
                  </p>
                  <h3>Conditions cumulatives à respecter</h3>
                  <ul>
                    <li>Le logement doit être <strong>meublé</strong> conformément à la liste de l'arrêté du 31 juillet 2015</li>
                    <li>Le locataire doit justifier d'une <strong>situation de mobilité éligible</strong> à la signature</li>
                    <li>La <strong>durée est de 1 à 10 mois maximum</strong>, ferme, non renouvelable</li>
                    <li><strong>Aucun dépôt de garantie</strong> ne peut être demandé</li>
                    <li>Le locataire peut <strong>résilier à tout moment avec un préavis d'un mois</strong></li>
                  </ul>
                </>
              ),
            },
            {
              title: "Qui peut bénéficier d'un bail mobilité à Paris ?",
              body: (
                <>
                  <p>L'article L632-1 du CCH liste les six situations qui rendent éligible :</p>
                  <ul>
                    <li><strong>Études supérieures</strong> — étudiant en master, MBA, MS, mastère, doctorat</li>
                    <li><strong>Formation professionnelle</strong> — formation continue, CIF, reconversion</li>
                    <li><strong>Apprentissage</strong> — contrat d'apprentissage en alternance</li>
                    <li><strong>Stage</strong> — convention de stage en entreprise</li>
                    <li><strong>Service civique</strong> — engagement volontaire dans le cadre du service civique</li>
                    <li><strong>Mutation ou mission temporaire</strong> dans le cadre d'une activité professionnelle</li>
                  </ul>
                  <p>
                    Un <strong>justificatif</strong> doit être annexé au bail à la signature : certificat de scolarité, contrat d'apprentissage, convention de stage, attestation de l'employeur, ordre de mission, etc.
                  </p>
                </>
              ),
            },
            {
              title: "Comparatif : bail mobilité vs bail meublé classique vs bail Code Civil",
              body: (
                <>
                  <h3>Bail mobilité (loi ELAN)</h3>
                  <ul>
                    <li>Durée : 1 à 10 mois (ferme)</li>
                    <li>Dépôt de garantie : interdit</li>
                    <li>Public : justifié (mobilité)</li>
                    <li>Renouvellement : impossible</li>
                  </ul>
                  <h3>Bail meublé classique (loi 1989)</h3>
                  <ul>
                    <li>Durée : 1 an minimum (9 mois étudiants)</li>
                    <li>Dépôt de garantie : 2 mois max</li>
                    <li>Public : tout type de locataire personne physique</li>
                    <li>Renouvellement : tacite reconduction</li>
                  </ul>
                  <h3>Bail logement de fonction (Code Civil)</h3>
                  <ul>
                    <li>Durée : libre (1 mois à plusieurs années)</li>
                    <li>Dépôt de garantie : libre, généralement aucun pour les baux courts</li>
                    <li>Public : entreprise locataire pour son collaborateur</li>
                    <li>Renouvellement : libre</li>
                  </ul>
                  <p>
                    Pour comprendre le <a href="/code-civil-bail-meuble">bail Code Civil</a> utilisé en location corporate, consultez notre dossier dédié.
                  </p>
                </>
              ),
            },
          ]}
          faqs={faqs}
          ctaTitle="Vous cherchez un appartement en bail mobilité à Paris ?"
          ctaText="Décrivez-nous votre situation et la durée souhaitée. Nous vous proposons une sélection adaptée sous 24h."
          ctaHref="/contact"
          ctaLabel="Trouver mon appartement"
          relatedLinks={[
            { href: "/nos-appartements", label: "Voir nos appartements" },
            { href: "/location-corporate-paris", label: "Location corporate Paris" },
            { href: "/code-civil-bail-meuble", label: "Bail Code Civil" },
            { href: "/location-meublee-expatrie-paris", label: "Location expatrié Paris" },
            { href: "/faq", label: "Toutes nos FAQ" },
          ]}
        />
      </main>
      <Footer />
    </>
  );
}
