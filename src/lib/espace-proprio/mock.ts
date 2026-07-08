// Données de DÉMONSTRATION de l'espace propriétaire (aucune donnée réelle).
// La forme des types reflète la future réponse de l'API Airtable en lecture
// seule (champs whitelistés uniquement, jamais de select * sur Occupants) :
// le branchement remplacera la source de données, pas les composants.

export type PortalApartment = {
  id: string;
  ref: string; // Code appartement (MIP-XXXX-XXX)
  shortAddress: string; // "6, rue de Paradis · Paris 10ᵉ"
  photo?: string; // futur : Appartements."Photo de l'appartement" (1ʳᵉ pièce jointe)
};

export type PortalStay = {
  ref: string; // Code réservation (RES-XXXX-XXX)
  arrival: string; // ISO
  departure: string; // ISO
  arrivalLabel: string;
  departureLabel: string;
  nights: number; // futur : Réservations."Nb nuits" (formule Airtable)
  occupants: number;
  occupantName?: string; // affiché uniquement pour le séjour EN COURS (RGPD)
  current?: boolean;
};

export type PortalCleaningDay = string; // ISO — futur : Ménages."Date prévue"

export type PortalIntervention = {
  ref: string; // Code intervention (INT-XXXX-XXX)
  dateLabel: string;
  nature: string;
  provider: string;
  status: "Terminée" | "En cours";
};

export type PortalDocument = {
  name: string;
  meta: string;
  isNew?: boolean;
  transmittable?: boolean;
};

export type PortalTimelineEvent = {
  dateLabel: string;
  title: string;
  desc: string;
  ref?: string; // référence entité pour l'email contextuel pré-rempli
};

export type PortalStats = {
  avgStay: string;
  staysSince2024: number;
  cleanings2026: number;
  interventions2026: number;
};

export type PortalData = {
  ownerName: string;
  apartments: PortalApartment[];
  glance: { k: string; v: string; s: string }[];
  stays: PortalStay[]; // en cours + à venir + historique (source du calendrier)
  cleaningDays: PortalCleaningDay[];
  calendarNote: string;
  timeline: PortalTimelineEvent[];
  stats: PortalStats;
  documents: PortalDocument[];
  interventions: PortalIntervention[];
};

export const DEMO_DATA: PortalData = {
  ownerName: "Monsieur de Vasselot",
  apartments: [
    {
      id: "apt1",
      ref: "MIP-2026-004",
      shortAddress: "6, rue de Paradis · Paris 10ᵉ",
      // Vraie photo vitrine du champ Airtable "Photo de l'appartement" (APT-077),
      // copiée en local pour la démo (les URLs de PJ Airtable expirent).
      photo: "/espace-proprio/demo-vitrine-paradis.jpg",
    },
    {
      id: "apt2",
      ref: "MIP-2026-011",
      shortAddress: "33, rue de Chazelles · Paris 17ᵉ",
      photo: "/apartments/2-pieces-courcelles-paris-17e/01.jpg",
    },
  ],
  glance: [
    { k: "Occupation actuelle", v: "Occupé jusqu’au 31 août 2026", s: "Séjour professionnel · 2 occupants" },
    { k: "Prochaine arrivée", v: "3 septembre 2026", s: "Séjour de 3 mois confirmé" },
    { k: "Prochain ménage complet", v: "1ᵉʳ septembre 2026", s: "Ménage de départ · toujours inclus" },
    { k: "Interventions en cours", v: "Aucune", s: "Dernière intervention close le 12 juin" },
  ],
  stays: [
    {
      ref: "RES-2025-118",
      arrival: "2025-09-01", departure: "2025-12-20",
      arrivalLabel: "1ᵉʳ septembre 2025", departureLabel: "20 décembre 2025",
      nights: 110, occupants: 1,
    },
    {
      ref: "RES-2026-032",
      arrival: "2026-02-03", departure: "2026-04-30",
      arrivalLabel: "3 février 2026", departureLabel: "30 avril 2026",
      nights: 86, occupants: 2,
    },
    {
      ref: "RES-2026-061",
      arrival: "2026-05-12", departure: "2026-06-28",
      arrivalLabel: "12 mai 2026", departureLabel: "28 juin 2026",
      nights: 47, occupants: 1,
    },
    {
      ref: "RES-2026-084",
      arrival: "2026-07-01", departure: "2026-08-31",
      arrivalLabel: "1ᵉʳ juillet 2026", departureLabel: "31 août 2026",
      nights: 61, occupants: 2,
      occupantName: "Mme Kaja BINGHAM", current: true,
    },
    {
      ref: "RES-2026-097",
      arrival: "2026-09-03", departure: "2026-11-30",
      arrivalLabel: "3 septembre 2026", departureLabel: "30 novembre 2026",
      nights: 88, occupants: 1,
    },
  ],
  cleaningDays: ["2025-12-22", "2026-01-30", "2026-05-02", "2026-06-30", "2026-09-01"],
  calendarNote:
    "Séjour en cours jusqu’au 31 août · ménage complet le 1ᵉʳ septembre · appartement libre le 2 · nouvelle arrivée le 3 septembre pour 3 mois.",
  timeline: [
    {
      dateLabel: "1ᵉʳ juillet 2026",
      title: "Arrivée des occupants",
      desc: "Accueil réalisé par notre équipe, remise des clés à 15 h 00. Tout s’est parfaitement déroulé.",
      ref: "RES-2026-084",
    },
    {
      dateLabel: "30 juin 2026",
      title: "Ménage complet effectué",
      desc: "Préparation du logement avant l’arrivée : ménage en profondeur, linge de maison, vérification des équipements.",
      ref: "MEN-2026-112",
    },
    {
      dateLabel: "28 juin 2026",
      title: "Départ des occupants précédents",
      desc: "État des lieux de sortie réalisé : aucune remarque, le logement est en parfait état.",
      ref: "RES-2026-061",
    },
    {
      dateLabel: "12 juin 2026",
      title: "Intervention close · plomberie",
      desc: "Remplacement du mitigeur de la salle de bain par notre prestataire. Contrôle effectué, aucune suite à prévoir.",
      ref: "INT-2026-031",
    },
    {
      dateLabel: "5 juin 2026",
      title: "Document ajouté",
      desc: "L’attestation d’assurance 2026 a été déposée dans vos documents.",
    },
  ],
  stats: {
    avgStay: "76 nuits",
    staysSince2024: 9,
    cleanings2026: 12,
    interventions2026: 3,
  },
  documents: [
    {
      name: "Attestation d’assurance 2026",
      meta: "PDF · déposé le 5 juin 2026",
      isNew: true,
      transmittable: true,
    },
    {
      name: "Reporting annuel 2025",
      meta: "Excel · déposé le 5 janvier 2026 · prêt pour votre déclaration fiscale",
      transmittable: true,
    },
    {
      name: "Contrat propriétaire · signé",
      meta: "PDF · signé électroniquement le 14 mars 2026",
    },
    {
      name: "Facture · remplacement mitigeur (INT-2026-031)",
      meta: "PDF · 245,00 € TTC · à votre charge · réglée le 20 juin 2026",
      transmittable: true,
    },
    {
      name: "Facture · vérification électrique (INT-2026-017)",
      meta: "PDF · 180,00 € TTC · à votre charge · réglée le 12 avril 2026",
      transmittable: true,
    },
  ],
  interventions: [
    {
      ref: "INT-2026-031",
      dateLabel: "12 juin 2026",
      nature: "Plomberie · remplacement mitigeur salle de bain",
      provider: "Ets Moreau",
      status: "Terminée",
    },
    {
      ref: "INT-2026-017",
      dateLabel: "4 avril 2026",
      nature: "Électricité · vérification tableau et prise cuisine",
      provider: "Élec’Paris",
      status: "Terminée",
    },
    {
      ref: "INT-2026-009",
      dateLabel: "18 février 2026",
      nature: "Serrurerie · entretien serrure porte palière",
      provider: "Ets Moreau",
      status: "Terminée",
    },
    {
      ref: "INT-2025-044",
      dateLabel: "9 décembre 2025",
      nature: "Chauffage · entretien annuel de la chaudière",
      provider: "Ets Moreau",
      status: "Terminée",
    },
    {
      ref: "INT-2025-021",
      dateLabel: "3 juin 2025",
      nature: "Peinture · rafraîchissement du couloir d'entrée",
      provider: "Atelier Blanc",
      status: "Terminée",
    },
  ],
};
