import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageHero from "@/components/PageHero";
import SEOLanding, { buildFaqLd, type SEOLandingFAQ } from "@/components/SEOLanding";

export const metadata: Metadata = {
  title: "Location meublée société & entreprise Paris — Bail société | Move in Paris",
  description: "Location meublée société à Paris : louez un appartement meublé au nom de votre société (SAS, SARL, SCI…) avec bail société, facturation entreprise et gestion 100 % déléguée. Solution clé en main pour entreprises et organisations.",
  alternates: { canonical: "https://www.move-in-paris.com/location-meublee-entreprise" },
  openGraph: {
    title: "Location meublée société & entreprise à Paris | Move in Paris",
    description: "Louez un appartement meublé à Paris au nom de votre société : bail société, facture entreprise, gestion clé en main.",
    url: "https://www.move-in-paris.com/location-meublee-entreprise",
  },
};

const faqs: SEOLandingFAQ[] = [
  {
    q: "Comment louer un appartement meublé au nom de mon entreprise ?",
    a: "La procédure est très simple chez Move in Paris : vous nous transmettez les coordonnées de l'entreprise (raison sociale, SIREN, adresse du siège, signataire), nous établissons le bail société qui désigne l'entreprise comme locataire et le ou les collaborateurs comme occupants. Le contrat est signé électroniquement, le règlement s'effectue par virement à terme à échoir.",
  },
  {
    q: "Quel statut juridique pour le locataire entreprise ?",
    a: "N'importe quelle structure peut louer chez nous : SAS, SARL, SA, SCI familiale, association loi 1901, EURL, organisme international, ambassade, etc. Le bail est souscrit au nom de la personne morale, qui est juridiquement responsable du paiement et de la bonne tenue des lieux. Les collaborateurs occupants sont nommément désignés au contrat.",
  },
  {
    q: "Quels avantages fiscaux pour louer en tant qu'entreprise ?",
    a: "Le loyer payé par l'entreprise pour loger un salarié dans le cadre de ses fonctions est intégralement déductible du résultat fiscal (charge externe). Si l'appartement sert également à recevoir des clients ou à organiser des réunions, certains pro-rata d'usage mixte peuvent s'appliquer. Consultez votre expert-comptable pour optimiser le traitement TVA et IS selon votre situation.",
  },
  {
    q: "Faut-il un dépôt de garantie pour une location société ?",
    a: "Non, aucun dépôt de garantie n'est exigé pour nos baux corporate de moins de 9 mois — la garantie corporate de l'entreprise locataire suffit. Pour les locations d'un an ou plus, un dépôt équivalent à 2 mois de loyer charges comprises peut être demandé selon le profil. Cette flexibilité préserve votre trésorerie.",
  },
  {
    q: "Mon entreprise peut-elle louer plusieurs appartements en même temps ?",
    a: "Absolument — c'est même notre cœur de métier. De nombreuses entreprises clientes (cabinets d'audit, cabinets de conseil, ESN, sociétés de relocation, banques d'investissement) gèrent un portefeuille de 5 à 50 appartements simultanément avec Move in Paris. Un account manager dédié coordonne l'ensemble et un reporting consolidé est fourni mensuellement.",
  },
  {
    q: "L'entreprise est-elle facturée en TTC ou en HT ?",
    a: "La location de logement nu ou meublé est en principe exonérée de TVA (article 261 D du CGI). Vous recevez donc une facture HT = TTC, sans TVA récupérable. Cas particulier : prestations para-hôtelières (avec petit-déjeuner, accueil, ménage quotidien) qui basculent en TVA à 10 %. Notre offre standard (ménage hebdomadaire) reste hors champ TVA.",
  },
  {
    q: "Que se passe-t-il si le collaborateur quitte l'entreprise ?",
    a: "Le bail étant signé entre Move in Paris et la personne morale, l'entreprise reste seule responsable jusqu'à la résiliation effective. Notre préavis standard de 15 jours permet de libérer rapidement le logement si le besoin disparaît. Vous pouvez aussi conserver le bail et y loger un autre collaborateur — un simple avenant désigne le nouvel occupant.",
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
          title="Location meublée société & entreprise à Paris"
          subtitle="Louez un ou plusieurs appartements meublés au nom de votre société. Bail société simplifié, loyer tout inclus, gestion 100 % déléguée — votre service RH n'a plus rien à faire."
          breadcrumb="Location société"
          image="/apartments/salon-bibliotheque.jpg"
        />
        <SEOLanding
          eyebrow="Location meublée société"
          intro="La location meublée société à Paris est notre cœur de métier. Louer un appartement meublé au nom d'une société ou d'une entreprise demande un cadre juridique adapté, des garanties spécifiques et une gestion administrative efficace. Move in Paris propose depuis 2018 une solution dédiée aux personnes morales (SAS, SARL, SA, SCI, associations, organismes internationaux) : un parc d'appartements parisiens haut de gamme, un bail société sécurisé, un loyer 100 % charges comprises facturable au nom de la société, et une gestion opérationnelle entièrement déléguée."
          highlights={[
            { title: "Bail au nom de la société", text: "L'entreprise est juridiquement locataire. Sécurité maximale pour les deux parties, simplicité comptable totale." },
            { title: "Facturation entreprise", text: "Facture mensuelle au nom de la société, déductible IS, intégrable directement en comptabilité." },
            { title: "Multi-sites possible", text: "5 ou 50 appartements gérés via un account manager unique et un reporting consolidé mensuel." },
          ]}
          sections={[
            {
              title: "Pourquoi louer un appartement meublé au nom de votre société ou entreprise ?",
              body: (
                <>
                  <p>
                    De nombreuses raisons motivent une entreprise à louer un appartement parisien plutôt que de payer une note d'hôtel longue durée à un collaborateur ou de demander à celui-ci de louer en son nom propre :
                  </p>
                  <h3>Avantages financiers et fiscaux</h3>
                  <ul>
                    <li><strong>Coût mensuel 30 à 60 % inférieur</strong> à un hôtel 4-5* équivalent en localisation</li>
                    <li><strong>Loyer intégralement déductible</strong> du résultat fiscal de l'entreprise</li>
                    <li><strong>Pas de constitution d'avantage en nature</strong> imposable pour le salarié si le logement est strictement de fonction</li>
                    <li><strong>Pas d'avance de trésorerie</strong> pour le collaborateur (qui sinon devrait louer puis se faire rembourser)</li>
                  </ul>
                  <h3>Avantages humains et opérationnels</h3>
                  <ul>
                    <li><strong>Confort et bien-être</strong> du collaborateur dans un vrai appartement plutôt qu'une chambre d'hôtel</li>
                    <li><strong>Image professionnelle</strong> pour recevoir clients ou prospects dans un cadre haut de gamme</li>
                    <li><strong>Flexibilité de durée</strong> adaptée aux missions, projets, mutations</li>
                    <li><strong>Possibilité de loger plusieurs collaborateurs successifs</strong> sans renégocier le bail</li>
                  </ul>
                </>
              ),
            },
            {
              title: "Cadre juridique de la location meublée société",
              body: (
                <>
                  <p>
                    Nos contrats de location pour entreprises sont des <strong>baux de logement de fonction</strong> soumis aux articles 1714 à 1762 du Code Civil. Ce régime offre trois avantages décisifs par rapport à un bail loi 1989 :
                  </p>
                  <ul>
                    <li><strong>Liberté contractuelle</strong> sur la durée (1 mois à plusieurs années) et le loyer (sans encadrement)</li>
                    <li><strong>Résiliation rapide</strong> à l'initiative de l'entreprise (préavis 15 jours)</li>
                    <li><strong>Sécurité juridique totale</strong> : le bail est juridiquement opposable, l'entreprise est solidairement responsable</li>
                  </ul>
                  <p>
                    Pour aller plus loin sur le cadre juridique, consultez notre dossier <a href="/code-civil-bail-meuble">bail location meublée Code Civil</a>.
                  </p>
                </>
              ),
            },
            {
              title: "Comment se passe la signature et la facturation",
              body: (
                <>
                  <p>
                    Tout est conçu pour s'intégrer naturellement dans les processus achats et comptabilité d'une entreprise.
                  </p>
                  <h3>Signature</h3>
                  <ul>
                    <li>Bail société établi par Move in Paris (modèle standardisé, validation juridique préalable)</li>
                    <li>Signature électronique (DocuSign / similaire) — pas de paperasse, signature en 5 minutes</li>
                    <li>Pièces requises : Kbis (moins de 3 mois), pièce d'identité du signataire mandataire</li>
                  </ul>
                  <h3>Facturation et règlement</h3>
                  <ul>
                    <li>Facture mensuelle au nom de la société, envoyée le 1er de chaque mois</li>
                    <li>Règlement par virement SEPA à terme à échoir (pas de prélèvement automatique imposé)</li>
                    <li>Mention SIRET, numéro TVA, devise EUR — compatible tous logiciels comptables (Sage, Cegid, Pennylane, Quickbooks)</li>
                    <li>Récapitulatif annuel pour la clôture des comptes</li>
                  </ul>
                </>
              ),
            },
          ]}
          faqs={faqs}
          ctaTitle="Besoin d'un appartement au nom de votre société ?"
          ctaText="Décrivez-nous votre besoin de location meublée société (1 ou plusieurs appartements). Notre équipe corporate vous répond sous 24h."
          ctaHref="/contact"
          ctaLabel="Demander un devis société"
          relatedLinks={[
            { href: "/nos-appartements", label: "Voir nos appartements" },
            { href: "/location-corporate-paris", label: "Location corporate à Paris" },
            { href: "/location-meublee-expatrie-paris", label: "Location pour expatriés" },
            { href: "/code-civil-bail-meuble", label: "Le bail Code Civil expliqué" },
            { href: "/bail-mobilite-paris", label: "Bail mobilité à Paris" },
          ]}
        />
      </main>
      <Footer />
    </>
  );
}
