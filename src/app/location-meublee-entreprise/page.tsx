import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageHero from "@/components/PageHero";
import SEOLanding, { buildFaqLd, type SEOLandingFAQ } from "@/components/SEOLanding";
import TrustStripB2B from "@/components/TrustStripB2B";
import BailComparisonTable from "@/components/BailComparisonTable";
import BailDureesTable from "@/components/BailDureesTable";

export const metadata: Metadata = {
  title: "Location meublée société & entreprise Paris — Bail société | Move in Paris",
  description: "Location meublée société à Paris : appartement meublé au nom de votre société (SAS, SARL, SCI). Bail société, facture entreprise, gestion 100% déléguée.",
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
    q: "Quels sont les frais d'agence pour une location société chez Move in Paris ?",
    a: "Pour les baux courts et moyen terme (1 à 12 mois), notre service est 100 % gratuit pour les deux parties — propriétaire et entreprise locataire. Aucun honoraire d'agence, aucune commission. Pour les baux longue durée (plus de 12 mois, en bail société), seule l'entreprise locataire règle des honoraires de 12,5 % HT du loyer annuel. Le propriétaire reste 100 % gratuit, quelle que soit la durée du bail.",
  },
  {
    q: "Faut-il un dépôt de garantie pour une location société ?",
    a: "Pour les baux courts et moyen terme (jusqu'à 12 mois), aucun dépôt de garantie n'est exigé : la solidité de l'entreprise locataire suffit. Pour les baux longue durée (plus de 12 mois), un dépôt de 2 mois de loyer est demandé à l'entreprise et reversé intégralement au propriétaire bailleur, conformément à la pratique standard du bail société. Cette flexibilité préserve la trésorerie de votre entreprise sur les missions courtes tout en sécurisant durablement le propriétaire sur les engagements longs.",
  },
  {
    q: "Move in Paris propose-t-il du long terme ou seulement du court séjour ?",
    a: "Les deux. Nous gérons aussi bien les missions courtes (consultants Big Four, audits, intégrations M&A, due diligence — 1 à 6 mois) que les mutations longues (expatriés en relocation 1 à 3 ans, dirigeants en logement de fonction permanent). Le bail société s'adapte à toutes ces durées : c'est le même cadre juridique souple, dont seuls les frais et le dépôt de garantie diffèrent selon que le séjour est inférieur ou supérieur à 12 mois.",
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

const breadcrumbLd = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Accueil", item: "https://www.move-in-paris.com" },
    { "@type": "ListItem", position: 2, name: "Location meublée société", item: "https://www.move-in-paris.com/location-meublee-entreprise" },
  ],
};

const serviceLd = {
  "@context": "https://schema.org",
  "@type": "Service",
  serviceType: "Location meublée société et entreprise",
  name: "Location meublée société à Paris",
  description: "Location d'appartements meublés haut de gamme à Paris au nom d'une société (SAS, SARL, SCI, association, organisme international) avec bail société, facturation entreprise et gestion 100 % déléguée.",
  provider: {
    "@type": "RealEstateAgent",
    name: "Move in Paris",
    url: "https://www.move-in-paris.com",
    address: { "@type": "PostalAddress", streetAddress: "26 rue de l'Étoile", postalCode: "75017", addressLocality: "Paris", addressCountry: "FR" },
    telephone: "+33145200603",
  },
  areaServed: { "@type": "City", name: "Paris" },
  audience: { "@type": "BusinessAudience", audienceType: "Entreprises, sociétés, organismes internationaux" },
  url: "https://www.move-in-paris.com/location-meublee-entreprise",
  offers: {
    "@type": "Offer",
    description: "Bail société clé en main, gestion 100 % déléguée, ménage hebdomadaire inclus, facture mensuelle au nom de la société.",
    availability: "https://schema.org/InStock",
  },
};

export default function Page() {
  return (
    <>
      <Header />
      <main>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceLd) }}
        />
        <PageHero
          title="Location meublée société & entreprise à Paris"
          subtitle="Louez un ou plusieurs appartements meublés au nom de votre société. Bail société simplifié, loyer tout inclus, gestion 100 % déléguée — votre service RH n'a plus rien à faire."
          breadcrumb="Location société"
          image="/apartments/salon-bibliotheque.jpg"
        />
        <TrustStripB2B />
        <SEOLanding
          eyebrow="Location meublée société"
          intro="La location meublée société à Paris est notre cœur de métier. Louer un appartement meublé au nom d'une société ou d'une entreprise demande un cadre juridique adapté, des garanties spécifiques et une gestion administrative efficace. Move in Paris propose depuis 2018 une solution dédiée aux personnes morales (SAS, SARL, SA, SCI, associations, organismes internationaux) — pour des séjours courts (missions, audits, consultants), moyens (intégrations, expatriés) ou longs (mutations 1 à 3 ans, logement de fonction). Notre service est 100 % gratuit pour le propriétaire bailleur, quelle que soit la durée du bail."
          highlights={[
            { title: "Court, moyen et long terme", text: "Bail société flexible : missions de 1 mois à mutations de 3 ans. Honoraires uniquement sur le long terme côté locataire (12,5 % HT du loyer annuel)." },
            { title: "100 % gratuit propriétaire", text: "Aucun frais d'agence pour le propriétaire, jamais. Assistance technique 7j/7 incluse, dépôt de garantie reversé intégralement sur les longs baux." },
            { title: "Multi-sites possible", text: "5 ou 50 appartements gérés via un account manager unique et un reporting consolidé mensuel." },
          ]}
          sections={[
            {
              title: "Court, moyen ou long terme — Move in Paris couvre toutes les durées",
              body: (
                <>
                  <p>
                    Beaucoup d&apos;agences parisiennes se concentrent uniquement sur les baux longue durée. Move in Paris fait le choix de servir aussi les <strong>missions courtes et moyennes</strong> (audits Big Four, intégrations post-acquisition, consultants, due diligence, expatriés en mobilité courte) <strong>autant que les mutations longues</strong> (relocation 1 à 3 ans, logement de fonction permanent).
                  </p>
                  <p>
                    Le cadre juridique est le même — un <strong>bail société</strong> souscrit au nom de la personne morale (SAS, SARL, SCI, association, organisme international). Ce qui change selon la durée : les honoraires d&apos;agence et le dépôt de garantie. Notre service reste <strong>100 % gratuit pour le propriétaire</strong>, quelle que soit la durée du séjour.
                  </p>
                  <BailDureesTable />
                  <p>
                    <strong>Concrètement</strong> : pour une mission de 3 mois d&apos;un consultant à Paris, vous payez le loyer mensuel et rien de plus. Pour une mutation de 18 mois d&apos;un cadre expatrié, vous réglez en plus 12,5 % HT du loyer annuel et un dépôt de garantie de 2 mois — intégralement reversé au propriétaire bailleur. Aucun frais caché, aucune surprise en cours de bail.
                  </p>
                </>
              ),
            },
            {
              title: "Le propriétaire bailleur : 100 % gratuit, indépendamment de la durée",
              body: (
                <>
                  <p>
                    Move in Paris ne facture <strong>jamais</strong> de frais au propriétaire qui nous confie un appartement, qu&apos;il soit loué à une entreprise pour un mois ou pour trois ans. Notre rémunération vient exclusivement du locataire — et uniquement sur le segment longue durée.
                  </p>
                  <p>
                    Le propriétaire bénéficie en outre, et sans frais supplémentaire, de l&apos;<strong>assistance technique 7j/7</strong> que nous apportons à l&apos;occupant : intervention plomberie, chauffage, électroménager, internet, ménage. Toutes les interventions courantes sont prises en charge par notre équipe et notre réseau d&apos;artisans, ce qui décharge le propriétaire de la gestion opérationnelle au quotidien.
                  </p>
                  <p>
                    Pour les baux longue durée, le <strong>dépôt de garantie de 2 mois</strong> versé par l&apos;entreprise locataire est intégralement reversé au propriétaire et reste à sa disposition pendant toute la durée du contrat — Move in Paris ne le conserve pas.
                  </p>
                </>
              ),
            },
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
              title: "Bail société, bail mobilité, bail Code civil : quelle différence ?",
              body: (
                <>
                  <p>
                    Trois cadres juridiques existent en France pour louer un appartement meublé à une entreprise ou pour un usage corporate. Le choix dépend de la nature du locataire (personne morale ou physique), de la durée du séjour et de l'usage du bien.
                  </p>
                  <BailComparisonTable />
                  <p>
                    Chez Move in Paris, <strong>le bail société est notre format par défaut</strong> pour toute entreprise qui souhaite loger un ou plusieurs collaborateurs à Paris : il offre la liberté contractuelle maximale, une déductibilité IS totale et une facturation directe au nom de la société. Le bail mobilité est réservé aux locataires physiques (étudiants, mutations courtes), et le bail Code civil s'applique à des situations de logement de fonction ou d'usage mixte.
                  </p>
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
            { href: "/location-meublee-entreprise-paris-8e", label: "Location société Paris 8e" },
            { href: "/location-meublee-entreprise-paris-16e", label: "Location société Paris 16e" },
            { href: "/location-meublee-entreprise-paris-17e", label: "Location société Paris 17e" },
            { href: "/location-meublee-entreprise-la-defense", label: "Location société La Défense" },
            { href: "/location-meublee-entreprise-neuilly", label: "Location société Neuilly" },
            { href: "/blog/guide-bail-societe-paris-2026", label: "Guide complet du bail société 2026" },
            { href: "/nos-appartements", label: "Voir nos appartements" },
            { href: "/location-corporate-paris", label: "Location corporate à Paris" },
            { href: "/code-civil-bail-meuble", label: "Le bail Code Civil expliqué" },
            { href: "/bail-mobilite-paris", label: "Bail mobilité à Paris" },
          ]}
        />
      </main>
      <Footer />
    </>
  );
}
