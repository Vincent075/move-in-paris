import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageHero from "@/components/PageHero";
import SEOLanding, { buildFaqLd, type SEOLandingFAQ } from "@/components/SEOLanding";

export const metadata: Metadata = {
  title: "Location corporate à Paris — Appartements meublés pour entreprises | Move in Paris",
  description: "Spécialiste de la location corporate à Paris : appartements meublés haut de gamme pour vos collaborateurs en mission, mutation ou expatriation. Bail flexible, gestion clé en main, loyer tout inclus.",
  alternates: { canonical: "https://www.move-in-paris.com/location-corporate-paris" },
  openGraph: {
    title: "Location corporate Paris — Move in Paris",
    description: "Appartements meublés haut de gamme pour entreprises à Paris. Bail flexible, gestion clé en main.",
    url: "https://www.move-in-paris.com/location-corporate-paris",
  },
};

const faqs: SEOLandingFAQ[] = [
  {
    q: "Qu'est-ce que la location corporate à Paris ?",
    a: "La location corporate désigne la mise à disposition d'appartements meublés tout équipés à des entreprises pour héberger leurs collaborateurs (cadres en mission, expatriés, mutations, missions longues). Elle se distingue de la location classique par sa flexibilité (durées de 1 à 12 mois), son loyer tout inclus (charges, internet, ménage hebdomadaire), et l'absence de bail loi 1989 — le contrat est un logement de fonction soumis aux articles 1714 à 1762 du Code Civil.",
  },
  {
    q: "Quelle est la durée minimum d'une location corporate ?",
    a: "Chez Move in Paris, nos locations corporate démarrent à partir d'un mois, avec une durée idéale de 3 à 12 mois. Les contrats sont reconductibles et la résiliation à l'initiative de l'entreprise est toujours possible avec un préavis de 15 jours.",
  },
  {
    q: "Qu'est-ce qui est inclus dans le loyer corporate ?",
    a: "Tout : appartement meublé entièrement équipé, wifi haut débit, TV avec Canal+, électricité, gaz, chauffage, eau, charges d'immeuble, taxe d'enlèvement des ordures ménagères, assurance multirisques habitation, ménage hebdomadaire et changement de linge, assistance technique 5j/7. Aucun frais caché, aucun dépôt de garantie pour les baux de moins de 9 mois.",
  },
  {
    q: "Quels quartiers à Paris pour une location corporate ?",
    a: "Nous proposons des appartements dans les quartiers les plus prisés des cadres internationaux : Paris 16e (Trocadéro, Chaillot, Passy), 17e (Batignolles, Monceau), 8e (Champs-Élysées, Madeleine), 7e (Invalides, Tour Eiffel), ainsi que Neuilly-sur-Seine, Levallois-Perret et Boulogne-Billancourt pour la proximité avec La Défense.",
  },
  {
    q: "Combien coûte une location corporate à Paris ?",
    a: "Les loyers varient selon le quartier, la surface et le standing. Comptez en moyenne 2 500 à 4 000 €/mois pour un studio ou 2 pièces dans le 16e/17e, 3 500 à 6 000 €/mois pour un 2-3 pièces familial, et au-delà de 6 000 €/mois pour les biens d'exception. Le loyer est tout inclus — pas de surprise sur la facture finale.",
  },
  {
    q: "Comment se passe la signature d'un contrat corporate ?",
    a: "Une fois l'appartement sélectionné, le contrat est signé électroniquement entre l'entreprise locataire (ou via une assistante RH/mobilité internationale) et Move in Paris. Le règlement s'effectue à terme à échoir par virement. Remise des clés en main propre ou par boîte à clés sécurisée selon les disponibilités du collaborateur.",
  },
  {
    q: "Quel cadre juridique pour le bail corporate ?",
    a: "Nos contrats sont des baux de logement de fonction soumis aux articles 1714 à 1762 du Code Civil — exclus de la loi du 6 juillet 1989. Ce cadre offre une grande flexibilité (durée libre, loyer libre, résiliation rapide) tout en restant juridiquement sécurisé pour les deux parties. Convient parfaitement aux besoins corporate ponctuels ou récurrents.",
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
          title="Location corporate à Paris"
          subtitle="Appartements meublés haut de gamme pour entreprises et leurs collaborateurs internationaux. Flexibilité, gestion clé en main, loyer tout inclus."
          breadcrumb="Location corporate"
          image="/apartments/salon-haussmann.jpg"
        />
        <SEOLanding
          eyebrow="Location meublée corporate à Paris"
          intro="Move in Paris est l'agence de référence pour la location corporate à Paris : nous mettons à disposition des entreprises (CAC 40, ETI, institutions internationales, cabinets de conseil) un parc d'appartements meublés haut de gamme dédiés exclusivement à leurs collaborateurs en mission, mutation ou expatriation. Notre modèle repose sur trois engagements : appartements parisiens d'exception, contrat juridiquement sécurisé, gestion opérationnelle 100 % prise en charge."
          highlights={[
            { title: "Bail corporate flexible", text: "Durée 1 à 12 mois (renouvelable), résiliation 15 jours, sans dépôt de garantie pour les baux courts." },
            { title: "Loyer tout inclus", text: "Charges, internet, électricité, ménage hebdo, assurance — aucune facture surprise pour votre service RH." },
            { title: "Gestion clé en main", text: "Move in Paris gère tout : check-in/check-out, maintenance, état des lieux. L'entreprise n'a qu'un contact." },
          ]}
          sections={[
            {
              title: "Qu'est-ce que la location corporate à Paris ?",
              body: (
                <>
                  <p>
                    La location corporate (ou <strong>corporate housing</strong>) désigne la location d'appartements meublés et entièrement équipés à des entreprises plutôt qu'à des particuliers. Elle s'adresse à toute structure qui doit loger un collaborateur à Paris pour une durée intermédiaire entre l'hôtel longue durée (trop coûteux et impersonnel) et la location classique loi 1989 (trop rigide, dépôt de garantie élevé, démarches lourdes).
                  </p>
                  <p>
                    En pratique, la location corporate est massivement utilisée par les <strong>directions de la mobilité internationale, services RH et sociétés de relocation</strong> pour héberger : nouveaux cadres en période d'essai, expatriés en mission de 3 à 12 mois, dirigeants en mutation, consultants sur projets longs, équipes projet, ou collaborateurs entre deux logements lors d'un déménagement.
                  </p>
                  <h3>Différence avec la location meublée classique</h3>
                  <ul>
                    <li><strong>Le locataire est l'entreprise</strong>, pas la personne physique — sécurisation du loyer par la garantie corporate</li>
                    <li><strong>Bail Code Civil (articles 1714 à 1762)</strong>, pas loi 1989 — flexibilité de durée et de loyer</li>
                    <li><strong>Loyer 100 % charges comprises</strong>, ménage et internet inclus — coût total prévisible et facturable</li>
                    <li><strong>Pas de dépôt de garantie</strong> pour les baux corporate courts — trésorerie préservée</li>
                  </ul>
                </>
              ),
            },
            {
              title: "Pourquoi choisir Move in Paris pour votre location corporate",
              body: (
                <>
                  <h3>Un parc d'appartements parisiens d'exception</h3>
                  <p>
                    Notre sélection couvre les arrondissements les plus prisés des cadres internationaux : <strong>Paris 16e</strong> (Trocadéro, Chaillot, Passy, Auteuil), <strong>17e</strong> (Batignolles, Plaine Monceau, Ternes), <strong>8e</strong> (Champs-Élysées, Madeleine, Faubourg Saint-Honoré), <strong>7e</strong> (Invalides, Champ de Mars, Saint-Germain), ainsi que la proche banlieue ouest (<strong>Neuilly-sur-Seine, Levallois-Perret, Boulogne-Billancourt</strong>) à proximité immédiate de La Défense.
                  </p>
                  <h3>Un service de gestion intégral</h3>
                  <p>
                    Une fois le contrat signé, vous n'avez plus à gérer aucun aspect opérationnel. Move in Paris se charge de :
                  </p>
                  <ul>
                    <li>Check-in et remise des clés (en main propre ou boîte à clés sécurisée 24/7)</li>
                    <li>Inspection photographique d'entrée et de sortie</li>
                    <li>Ménage hebdomadaire avec changement de linge</li>
                    <li>Maintenance technique (assistance 5j/7, astreinte urgences 24/7)</li>
                    <li>Régularisation des charges, factures, taxes</li>
                    <li>Reporting trimestriel pour les comptes corporate récurrents</li>
                  </ul>
                  <h3>Un contact unique pour vos services RH</h3>
                  <p>
                    Vos équipes mobilité internationale ne traitent qu'avec un seul interlocuteur Move in Paris pour l'ensemble de leurs collaborateurs hébergés. Un account manager dédié pour les comptes corporate à volume.
                  </p>
                </>
              ),
            },
            {
              title: "Comment fonctionne notre location corporate ?",
              body: (
                <>
                  <p>Le processus est conçu pour être <strong>rapide</strong> (jusqu'à 48h en cas d'urgence) et 100 % à distance pour les expatriés à l'étranger.</p>
                  <ul>
                    <li><strong>1. Brief</strong> — Vous nous transmettez les critères (quartier, surface, budget, dates d'arrivée/départ, profil du collaborateur)</li>
                    <li><strong>2. Sélection</strong> — Nous vous envoyons sous 24h une short-list adaptée avec photos HD, descriptifs, plans</li>
                    <li><strong>3. Visite</strong> — Physique ou virtuelle (visio HD avec un de nos agents sur place pour les expatriés à l'étranger)</li>
                    <li><strong>4. Contractualisation</strong> — Signature électronique du bail corporate, virement du premier loyer</li>
                    <li><strong>5. Check-in</strong> — Remise des clés et présentation du logement au collaborateur dès son arrivée</li>
                    <li><strong>6. Vie locative</strong> — Move in Paris gère tout, vous n'êtes contacté que pour les décisions importantes</li>
                  </ul>
                </>
              ),
            },
          ]}
          faqs={faqs}
          ctaTitle="Vous cherchez un appartement corporate à Paris ?"
          ctaText="Décrivez-nous votre besoin, nous vous proposons une sélection sous 24h."
          ctaHref="/contact"
          ctaLabel="Demander une sélection"
          relatedLinks={[
            { href: "/nos-appartements", label: "Voir nos appartements" },
            { href: "/location-meublee-entreprise", label: "Location meublée pour entreprise" },
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
