import type { Metadata } from "next";
import QuartierLanding, { type QuartierConfig } from "@/components/QuartierLanding";

export const metadata: Metadata = {
  title: "Location meublée société La Défense — Appartements meublés entreprise | Move in Paris",
  description: "Location meublée société à La Défense : appartements meublés à Puteaux, Courbevoie, Neuilly et Paris ouest pour vos collaborateurs. Bail société, facture entreprise, gestion clé en main.",
  alternates: { canonical: "https://www.move-in-paris.com/location-meublee-entreprise-la-defense" },
  openGraph: {
    title: "Location meublée société La Défense | Move in Paris",
    description: "Logez vos collaborateurs à La Défense : appartements meublés société, bail entreprise, gestion 100 % déléguée.",
    url: "https://www.move-in-paris.com/location-meublee-entreprise-la-defense",
  },
};

const config: QuartierConfig = {
  slug: "la-defense",
  name: "La Défense",
  shortName: "La Défense",
  pageTitle: "Location meublée société La Défense",
  metaDescription: "Location meublée société à La Défense : appartements meublés Puteaux, Courbevoie, Neuilly. Bail société pour collaborateurs des tours.",
  heroTitle: "Location meublée société à La Défense",
  heroSubtitle: "Logez vos collaborateurs travaillant dans les tours La Défense — Total Energies, BNP Paribas, Société Générale, EY, Deloitte, Engie. Appartements meublés à Puteaux, Courbevoie, Neuilly et 17e Paris (RER A direct), au nom de votre société.",
  heroImage: "/apartments/salon-haussmann.jpg",
  intro: "La Défense est le premier quartier d'affaires d'Europe : 180 000 salariés, 500 entreprises, 70 tours dont la majorité des sièges du CAC 40 (Total Energies, BNP Paribas, Société Générale, AXA, Engie, Saint-Gobain, Schneider Electric, Vinci) et les Big Four (EY, Deloitte, KPMG, PwC). Move in Paris propose une offre dédiée location meublée société à La Défense avec un parc d'appartements situés dans un rayon de 15 minutes maximum des tours : Puteaux, Courbevoie, Neuilly-sur-Seine et Paris 17e (RER A direct vers Charles-de-Gaulle-Étoile en 7 minutes, et la station La Défense en 12 minutes).",
  positioning: "Puteaux, Courbevoie, Neuilly, Paris 17e (RER A), Levallois",
  characteristics: "La zone La Défense - Neuilly - Courbevoie - Puteaux concentre une demande locative corporate exceptionnelle : audits annuels Big Four, missions M&A des banques d'affaires, intégration post-acquisition, cabinets de conseil en mission longue, expatriés en mutation 1 à 3 ans. Le quartier moderne (Esplanade, Faubourg de l'Arche) offre tour services pratiques (Westfield Les 4 Temps, restaurants), tandis que Neuilly et le 17e Pereire offrent un cadre résidentiel plus haussmannien.",
  businessReason: "Loger vos collaborateurs à 5-15 minutes de la tour permet de récupérer 1 à 2 heures par jour vs un hébergement Paris Est ou Sud — c'est l'arbitrage économique le plus favorable pour les missions intensives (M&A, audit annuel, projets de transformation). Pour une mission de 3 mois et un consultant à 600 €/jour, l'économie de temps représente 12 000 à 24 000 € de productivité récupérée par collaborateur — sans compter la qualité de vie.",
  typicalProfile: "Auditeurs Big Four en mission annuelle (3 à 6 mois), consultants senior en transformation digitale, banquiers d'affaires en M&A, ingénieurs IT/SAP des intégrations post-acquisition, expatriés en mutation longue dans les sièges du CAC 40. Profils typiques : Senior Auditor PwC, Manager McKinsey, Vice President M&A Société Générale, Lead Consultant Capgemini.",
  faqs: [
    {
      q: "Où loger précisément vos collaborateurs travaillant à La Défense ?",
      a: "Quatre options selon le profil et le budget : 1) Puteaux ou Courbevoie pieds dans la dalle, 5 minutes à pied des tours — option la plus pratique mais cadre moderne sans charme parisien ; 2) Neuilly-sur-Seine, 10 minutes en métro 1 — résidentiel chic, idéal familles ; 3) Paris 17e (Pereire, Wagram), 12 minutes en RER A — meilleur compromis lifestyle/transport ; 4) Levallois-Perret, 15 minutes en bus/T2 — bon rapport qualité/prix. Notre équipe oriente selon le profil du collaborateur (junior solo, manager, family expat).",
    },
    {
      q: "Quel temps de trajet pour rejoindre les tours La Défense ?",
      a: "Puteaux/Courbevoie pieds dans la dalle : 0 à 8 minutes à pied. Neuilly Pont de Levallois : 8-12 minutes (métro 1). Paris 17e Pereire : 12 minutes (RER A direct). Paris 17e Étoile : 7 minutes (RER A direct). Paris 8e Madeleine : 15 minutes (RER A + métro). Levallois : 12-18 minutes (T2 + correspondance ou bus).",
    },
    {
      q: "Quel budget mensuel pour loger un collaborateur sur la zone La Défense ?",
      a: "Studio (25-35 m²) : 1 600 à 2 200 €/mois à Puteaux/Courbevoie ; 1 800 à 2 600 €/mois à Neuilly ; 1 700 à 2 500 €/mois à Paris 17e. 2 pièces (45-55 m²) : 2 100 à 2 900 €/mois à Puteaux ; 2 600 à 3 800 €/mois à Neuilly ; 2 200 à 3 200 €/mois à Paris 17e. Format familial 3-4 pièces : 3 500 à 6 500 €/mois selon zone et standing.",
    },
    {
      q: "Vos appartements La Défense conviennent-ils pour des missions courtes (1-3 mois) ?",
      a: "Oui, absolument — c'est notre cas d'usage le plus fréquent sur cette zone. Format \"corporate flexible\" : bail société à partir d'1 mois renouvelable, ménage hebdomadaire inclus, préavis 15 jours, équipement complet (literie 5*, wifi fibre, vaisselle, ustensiles). Idéal pour audits annuels Big Four, missions M&A, intégrations post-fusion, consultants senior en transformation IT.",
    },
    {
      q: "Pouvez-vous loger plusieurs collaborateurs simultanément (équipe de mission) ?",
      a: "Oui — c'est même un cas typique pour les cabinets d'audit et de conseil en mission longue. Nous proposons régulièrement des packages \"mission équipe\" : 5 à 15 appartements gérés via un account manager unique, facturation consolidée mensuelle au nom de la société, reporting unique. Plusieurs Big Four et cabinets de conseil utilisent ce format pour leurs audits annuels La Défense.",
    },
  ],
};

export default function Page() {
  return <QuartierLanding config={config} />;
}
