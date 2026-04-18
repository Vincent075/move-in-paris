import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageHero from "@/components/PageHero";
import SEOLanding, { buildFaqLd, type SEOLandingFAQ } from "@/components/SEOLanding";

export const metadata: Metadata = {
  title: "Bail location meublée Code Civil — Articles 1714 à 1762 | Move in Paris",
  description: "Le bail de location meublée Code Civil (articles 1714 à 1762) permet de louer un logement de fonction à une entreprise hors du cadre rigide de la loi du 6 juillet 1989. Cadre, conditions, avantages et différences expliquées par les experts Move in Paris.",
  alternates: { canonical: "https://www.move-in-paris.com/code-civil-bail-meuble" },
  openGraph: {
    title: "Bail location meublée Code Civil | Move in Paris",
    description: "Tout savoir sur le bail meublé soumis aux articles 1714 à 1762 du Code Civil.",
    url: "https://www.move-in-paris.com/code-civil-bail-meuble",
  },
};

const faqs: SEOLandingFAQ[] = [
  {
    q: "Qu'est-ce qu'un bail de location meublée régi par le Code Civil ?",
    a: "C'est un contrat de louage de choses soumis exclusivement aux articles 1714 à 1762 du Code Civil, par opposition aux baux d'habitation soumis à la loi du 6 juillet 1989. Il est utilisé principalement pour les logements de fonction loués par une entreprise au profit de son salarié, ou pour des locations meublées qui ne constituent pas la résidence principale du locataire (résidence secondaire, pied-à-terre).",
  },
  {
    q: "Quels articles du Code Civil régissent ce bail ?",
    a: "Les articles 1714 à 1762 du Code Civil. L'article 1714 définit la nature du contrat (louage de choses). Les articles 1719 et suivants précisent les obligations du bailleur (délivrance, entretien, jouissance paisible). Les articles 1728 et suivants précisent les obligations du locataire (paiement, jouissance raisonnable, restitution). Les articles 1736 à 1762 traitent de la durée et de la résiliation.",
  },
  {
    q: "Quelle différence avec un bail loi du 6 juillet 1989 ?",
    a: "La loi du 6 juillet 1989 protège le locataire personne physique qui a son logement principal dans le bien — elle impose une durée minimale (1 an meublé, 3 ans nu), un dépôt de garantie plafonné, un préavis encadré, un loyer souvent encadré (zones tendues), un état des lieux contradictoire, etc. Le Code Civil n'impose aucune de ces contraintes : durée libre, loyer libre, résiliation libre — d'où sa pertinence pour la location corporate qui n'est pas la résidence principale du locataire (souvent un occupant de passage).",
  },
  {
    q: "Quand est-il légal d'utiliser un bail Code Civil au lieu d'un bail loi 1989 ?",
    a: "Trois cas principaux : 1) Le locataire est une personne morale (entreprise, SCI, association) — la loi 1989 ne s'applique qu'aux personnes physiques louant pour leur résidence principale. 2) Le logement est mis à disposition d'un salarié dans le cadre d'un logement de fonction (par contrat de travail ou convention collective). 3) Le logement n'est pas la résidence principale du locataire (résidence secondaire, pied-à-terre, location saisonnière de courte durée).",
  },
  {
    q: "Le bail Code Civil est-il sécurisé juridiquement ?",
    a: "Oui, parfaitement. Le Code Civil français définit le contrat de louage depuis 1804 ; sa jurisprudence est massive et stable. Pour la location de logement de fonction à une entreprise, c'est même le cadre le plus adapté : sécurité maximale (responsabilité solidaire de l'entreprise), exécution rapide, recours efficaces en cas de manquement. Les juridictions civiles et commerciales appliquent ce régime sans difficulté.",
  },
  {
    q: "Y a-t-il un dépôt de garantie obligatoire ?",
    a: "Non, le Code Civil ne prévoit aucun plafond ni obligation. Le montant est librement négocié entre les parties. Chez Move in Paris, pour les baux corporate de moins de 9 mois, aucun dépôt n'est demandé — la garantie corporate de l'entreprise locataire suffit. Pour les baux d'un an ou plus, un dépôt équivalent à 2 mois de loyer charges comprises peut être demandé selon le profil.",
  },
  {
    q: "Quel préavis pour résilier un bail Code Civil ?",
    a: "Le préavis est librement fixé par les parties au contrat. Les usages prévoient en général 15 jours à 1 mois pour le locataire, 1 à 2 mois pour le bailleur. Move in Paris pratique un préavis de 15 jours pour le locataire entreprise, ce qui offre une grande souplesse en cas de fin de mission ou de mutation imprévue.",
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
          title="Bail location meublée Code Civil"
          subtitle="Articles 1714 à 1762 : le cadre juridique de référence pour la location de logement de fonction à une entreprise. Souplesse, sécurité, expertise Move in Paris depuis 2018."
          breadcrumb="Bail Code Civil"
          image="/apartments/salon-bibliotheque.jpg"
        />
        <SEOLanding
          eyebrow="Bail location meublée — Code Civil"
          intro="Le bail de location meublée régi par le Code Civil (articles 1714 à 1762) est le contrat de référence pour louer un appartement parisien à une entreprise dans le cadre d'un logement de fonction. À la différence du bail d'habitation loi du 6 juillet 1989, il offre une grande liberté contractuelle (durée, loyer, résiliation), tout en bénéficiant d'une sécurité juridique éprouvée. Move in Paris utilise ce cadre depuis 2018 pour l'ensemble de ses baux corporate avec entreprises clientes."
          highlights={[
            { title: "Liberté de durée", text: "Aucun minimum imposé : 1 mois, 6 mois, 2 ans, à votre convenance." },
            { title: "Liberté de loyer", text: "Pas d'encadrement de loyer (qui ne s'applique qu'aux baux loi 1989 résidence principale)." },
            { title: "Résiliation rapide", text: "Préavis 15 jours pour le locataire entreprise — flexibilité maximale en cas de fin de mission." },
          ]}
          sections={[
            {
              title: "Le cadre juridique : articles 1714 à 1762 du Code Civil",
              body: (
                <>
                  <p>
                    Le Code Civil français définit le contrat de louage de choses depuis sa promulgation en 1804. Les articles 1714 à 1762 forment le socle juridique des contrats de location de tous biens immobiliers — sauf pour les locations qui constituent la résidence principale du locataire personne physique, qui sont depuis 1989 régies par la loi spéciale du 6 juillet 1989.
                  </p>
                  <h3>Articles clés à connaître</h3>
                  <ul>
                    <li><strong>Article 1714</strong> : définition générale du contrat de louage de choses</li>
                    <li><strong>Article 1719</strong> : obligation du bailleur de délivrer la chose louée et d'en assurer la jouissance paisible</li>
                    <li><strong>Article 1720</strong> : obligation d'entretien des lieux par le bailleur</li>
                    <li><strong>Article 1728</strong> : obligation du locataire d'user de la chose en bon père de famille</li>
                    <li><strong>Article 1730</strong> : état des lieux d'entrée et de sortie</li>
                    <li><strong>Article 1736</strong> : durée et résiliation à durée indéterminée</li>
                    <li><strong>Article 1737</strong> : durée à durée déterminée et reconduction tacite</li>
                  </ul>
                </>
              ),
            },
            {
              title: "Pourquoi ce cadre est idéal pour la location corporate à Paris",
              body: (
                <>
                  <p>
                    La <a href="/location-corporate-paris">location corporate à Paris</a> consiste à mettre à disposition d'un collaborateur d'entreprise un appartement meublé pour une durée intermédiaire (1 à 12 mois en général). Cette situation présente plusieurs caractéristiques qui rendent le bail Code Civil parfaitement adapté :
                  </p>
                  <ul>
                    <li>Le <strong>locataire est une personne morale</strong> (l'entreprise) — exclusion automatique du champ de la loi 1989</li>
                    <li>Le <strong>logement n'est pas la résidence principale du collaborateur</strong> qui occupe — il est de passage, en mission, en mutation</li>
                    <li>La <strong>durée doit être flexible</strong> pour s'adapter aux missions, projets, mutations</li>
                    <li>Le <strong>loyer doit être facturable</strong> en compte de charges de l'entreprise</li>
                  </ul>
                  <p>
                    Le bail Code Civil cumule tous les avantages : sécurité juridique inattaquable, jurisprudence stable, opposabilité aux tiers, exécution rapide en cas de litige, simplicité administrative.
                  </p>
                </>
              ),
            },
            {
              title: "Différences avec les autres types de baux meublés",
              body: (
                <>
                  <h3>Vs bail meublé loi 1989 (résidence principale)</h3>
                  <p>
                    Le bail loi 1989 résidence principale meublée impose : durée minimum 1 an (9 mois pour étudiants), dépôt de garantie 2 mois max, préavis 1 mois locataire / 3 mois bailleur, encadrement des loyers à Paris, état des lieux contradictoire obligatoire, formulaire-type imposé. Le Code Civil n'impose rien de tout cela.
                  </p>
                  <h3>Vs <a href="/bail-mobilite-paris">bail mobilité (loi ELAN)</a></h3>
                  <p>
                    Le bail mobilité dure 1-10 mois, sans dépôt, mais réservé à des publics précis (étudiants, alternants, mutations) et non renouvelable. Le bail Code Civil n'impose aucune restriction de profil et permet le renouvellement libre.
                  </p>
                  <h3>Vs bail commercial (3-6-9)</h3>
                  <p>
                    Le bail commercial régit l'usage professionnel d'un local (boutique, bureau). Il est inadapté à un logement, même utilisé par une entreprise pour son collaborateur — le bail Code Civil est le bon véhicule.
                  </p>
                </>
              ),
            },
          ]}
          faqs={faqs}
          ctaTitle="Une question juridique sur votre projet de location corporate ?"
          ctaText="Notre équipe juridique vous accompagne dans la rédaction et la signature de vos baux corporate. Consultation gratuite."
          ctaHref="/contact"
          ctaLabel="Échanger avec un expert"
          relatedLinks={[
            { href: "/location-corporate-paris", label: "Location corporate à Paris" },
            { href: "/location-meublee-entreprise", label: "Location meublée pour entreprise" },
            { href: "/bail-mobilite-paris", label: "Bail mobilité Paris" },
            { href: "/proprietaires", label: "Vous êtes propriétaire ?" },
            { href: "/faq", label: "Toutes nos FAQ" },
          ]}
        />
      </main>
      <Footer />
    </>
  );
}
