import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageHero from "@/components/PageHero";
import SEOLanding, { buildFaqLd, type SEOLandingFAQ } from "@/components/SEOLanding";

export const metadata: Metadata = {
  title: "Location meublée pour expatriés à Paris — Service clé en main | Move in Paris",
  description: "Spécialiste de la location meublée pour expatriés et cadres internationaux à Paris : visite virtuelle, signature à distance, loyer tout inclus, accompagnement bilingue dès l'arrivée.",
  alternates: { canonical: "https://www.move-in-paris.com/location-meublee-expatrie-paris" },
  openGraph: {
    title: "Location pour expatriés à Paris | Move in Paris",
    description: "Service clé en main pour expatriés : visite virtuelle, signature à distance, accompagnement bilingue.",
    url: "https://www.move-in-paris.com/location-meublee-expatrie-paris",
  },
};

const faqs: SEOLandingFAQ[] = [
  {
    q: "Comment trouver un appartement meublé à Paris depuis l'étranger ?",
    a: "Move in Paris est spécialisé dans la location à distance. Vous nous transmettez vos critères (quartier, surface, budget, dates), nous vous envoyons une short-list sous 24h avec photos HD, plans, descriptifs en français et anglais. Les visites se font en visio HD avec un de nos agents physiquement sur place — vous voyez l'appartement comme si vous y étiez. Signature électronique du bail, virement du premier loyer, remise des clés à votre arrivée à Paris.",
  },
  {
    q: "Quels quartiers de Paris recommandez-vous aux expatriés ?",
    a: "Cela dépend de votre situation : familles avec enfants scolarisés en école internationale (American School, British School, Lycée International, École Bilingue) → 16e (Auteuil, Passy), Neuilly-sur-Seine. Cadres travaillant à La Défense → 17e (Levallois), Neuilly. Cadres en quartier d'affaires central → 8e, 9e, 16e (Trocadéro). Profils plus créatifs/jeunes → 11e, 4e, 6e. Notre équipe vous oriente selon votre profil et vos contraintes.",
  },
  {
    q: "Combien de temps à l'avance dois-je commencer ma recherche ?",
    a: "L'idéal est de commencer 4 à 8 semaines avant votre date d'arrivée. Cela laisse le temps de comparer plusieurs options, organiser des visites virtuelles, sécuriser un appartement avant qu'il ne soit pris. Pour les arrivées urgentes (sous 1-2 semaines), nous pouvons proposer une sélection accélérée — comptez sur notre disponibilité 7j/7.",
  },
  {
    q: "Quels documents fournir pour signer en tant qu'expatrié ?",
    a: "Si la location est au nom de votre entreprise (corporate), seuls les documents de la société sont demandés (Kbis ou équivalent étranger, identité du signataire mandataire). Si la location est à votre nom personnel : pièce d'identité, contrat de travail ou lettre de mission, justificatif de revenus. Pas besoin de garant français, pas besoin d'attestation Visale — la garantie est portée par votre employeur ou votre relocation company.",
  },
  {
    q: "Quels services sont inclus pour faciliter mon installation ?",
    a: "Au-delà du loyer tout inclus (charges, internet, ménage hebdomadaire), nous offrons : remise des clés à votre arrivée (jusqu'à 22h), guide d'utilisation de l'appartement bilingue, recommandations quartier (boulangerie, supermarché, métro le plus proche), assistance technique 5j/7 par email/téléphone bilingue (FR/EN), aide pour démarches courantes (carte de transport, médecin, école si besoin). Notre équipe a vu passer plus de 1300 collaborateurs internationaux depuis 2018.",
  },
  {
    q: "Acceptez-vous les paiements depuis l'étranger ?",
    a: "Oui — nous acceptons les virements internationaux SEPA et SWIFT en EUR depuis n'importe quel pays. Pour les paiements en USD, GBP ou autres devises, nous travaillons avec Wise (ex-TransferWise) pour optimiser les frais de change. Une seule facture mensuelle au nom de l'entreprise ou du collaborateur, conforme aux exigences comptables internationales.",
  },
  {
    q: "Qu'est-ce qui distingue Move in Paris des autres agences pour expatriés ?",
    a: "Trois éléments : 1) Spécialisation 100 % corporate/expat depuis 2018 — pas de mélange avec de la location étudiante ou touristique. 2) Service intégral inclus dans le loyer (ménage, internet, assistance) — pas de surprise sur la facture finale. 3) Équipe bilingue et joignable 7j/7 pour les urgences — un vrai partenaire d'installation, pas seulement un loueur d'appartement.",
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
          title="Location meublée pour expatriés à Paris"
          subtitle="Visite virtuelle, signature à distance, accompagnement bilingue dès votre arrivée. Plus de 1300 cadres internationaux installés à Paris depuis 2018."
          breadcrumb="Location expatrié"
          image="/apartments/salon-haussmann.jpg"
        />
        <SEOLanding
          eyebrow="Location meublée expatrié & cadre international"
          intro="Vous êtes cadre international, expatrié, en mutation à Paris pour quelques mois ou plusieurs années ? Move in Paris est l'agence parisienne dédiée à votre installation. Notre approche : sélection sur-mesure d'appartements parisiens haut de gamme dans les meilleurs quartiers (16e, 17e, 8e, Neuilly), service 100 % bilingue à distance (visite virtuelle, signature électronique, paiement international), accompagnement humain à votre arrivée."
          highlights={[
            { title: "Visite virtuelle HD", text: "Un agent Move in Paris physiquement sur place vous fait visiter en visio — vous voyez tout en détail." },
            { title: "Signature 100 % à distance", text: "Bail signé électroniquement, paiement par virement international, clés remises à votre arrivée." },
            { title: "Accompagnement bilingue", text: "Équipe FR/EN disponible 7j/7 pour vous aider à vous installer, démarches, recommandations quartier." },
          ]}
          sections={[
            {
              title: "Nos solutions pour les expatriés et cadres internationaux",
              body: (
                <>
                  <p>
                    Que vous arriviez à Paris pour une mission de 3 mois ou une expatriation de plusieurs années, Move in Paris adapte sa solution à votre durée et votre profil.
                  </p>
                  <h3>Pour les missions courtes (1-12 mois)</h3>
                  <p>
                    <a href="/location-corporate-paris">Bail corporate (Code Civil)</a> au nom de votre entreprise — le plus flexible, sans dépôt de garantie, résiliation 15 jours. Idéal pour cadres en mission, consultants, dirigeants en mutation, équipes projet.
                  </p>
                  <h3>Pour les expatriations longues (1-3 ans)</h3>
                  <p>
                    Bail meublé classique (loi 1989) à votre nom personnel ou bail Code Civil au nom de votre employeur — selon votre préférence et le contexte de votre mission. Notre équipe vous conseille sur la formule la plus adaptée.
                  </p>
                  <h3>Pour les jeunes professionnels et étudiants</h3>
                  <p>
                    <a href="/bail-mobilite-paris">Bail mobilité (loi ELAN)</a> de 1 à 10 mois, sans dépôt de garantie, idéal pour stages, MBA, missions de fin d'études, formation professionnelle.
                  </p>
                </>
              ),
            },
            {
              title: "Quels quartiers choisir à Paris pour un expatrié ?",
              body: (
                <>
                  <p>
                    Le choix du quartier dépend de votre situation familiale, votre lieu de travail et votre style de vie. Voici nos recommandations par profil.
                  </p>
                  <h3>Familles avec enfants scolarisés en école internationale</h3>
                  <ul>
                    <li><strong>Paris 16e (Auteuil, Passy, Trocadéro)</strong> — proximité American School, École Active Bilingue, École Bilingue Lennen, écoles publiques internationales</li>
                    <li><strong>Neuilly-sur-Seine</strong> — proximité American School of Paris, calme résidentiel, espaces verts</li>
                    <li><strong>Saint-Germain-en-Laye</strong> — Lycée International, idéal pour familles cherchant un cadre presque suburbain</li>
                  </ul>
                  <h3>Cadres travaillant à La Défense</h3>
                  <ul>
                    <li><strong>Neuilly-sur-Seine</strong> — métro 1 direct, à 10 min</li>
                    <li><strong>Paris 17e (Ternes, Plaine Monceau, Levallois)</strong> — RER A et métro direct</li>
                    <li><strong>Paris 16e (Porte Dauphine, Victor Hugo)</strong> — RER A direct</li>
                  </ul>
                  <h3>Cadres travaillant dans le Triangle d'Or / Champs-Élysées</h3>
                  <ul>
                    <li><strong>Paris 8e</strong> — au cœur du quartier d'affaires international</li>
                    <li><strong>Paris 16e (Trocadéro, Chaillot, Iéna)</strong> — élégance haussmannienne, métro direct</li>
                    <li><strong>Paris 17e (Monceau, Wagram)</strong> — calme résidentiel à 5 min</li>
                  </ul>
                </>
              ),
            },
            {
              title: "Notre processus 100 % à distance pour expatriés",
              body: (
                <>
                  <p>
                    Conçu pour vous permettre d'arriver à Paris avec votre logement déjà sécurisé, sans avoir à venir préalablement.
                  </p>
                  <ul>
                    <li><strong>Échange initial (jour 0)</strong> — par email ou Zoom, en français ou anglais — nous comprenons votre situation, vos besoins, vos contraintes</li>
                    <li><strong>Sélection sous 24h</strong> — short-list de 3-6 appartements adaptés, avec photos HD, vidéos, plans, descriptifs bilingues</li>
                    <li><strong>Visites virtuelles HD (jour 1-3)</strong> — un de nos agents physiquement sur place vous fait visiter en visio (Zoom, Teams, Google Meet, WhatsApp)</li>
                    <li><strong>Signature à distance (jour 3-5)</strong> — bail envoyé par DocuSign, signature électronique en 5 minutes</li>
                    <li><strong>Paiement international</strong> — virement SEPA ou SWIFT en EUR, ou Wise pour autres devises</li>
                    <li><strong>Remise des clés à votre arrivée</strong> — un agent vous accueille à l'appartement, vous remet les clés et fait un tour complet du logement</li>
                  </ul>
                </>
              ),
            },
          ]}
          faqs={faqs}
          ctaTitle="Vous arrivez à Paris en tant qu'expatrié ?"
          ctaText="Présentez-nous votre projet d'installation — nous vous accompagnons depuis l'étranger jusqu'à votre arrivée."
          ctaHref="/contact"
          ctaLabel="Lancer ma recherche"
          relatedLinks={[
            { href: "/nos-appartements", label: "Voir nos appartements" },
            { href: "/location-corporate-paris", label: "Location corporate Paris" },
            { href: "/location-meublee-entreprise", label: "Location au nom de l'entreprise" },
            { href: "/bail-mobilite-paris", label: "Bail mobilité (étudiants, missions)" },
            { href: "/code-civil-bail-meuble", label: "Le bail Code Civil expliqué" },
          ]}
        />
      </main>
      <Footer />
    </>
  );
}
