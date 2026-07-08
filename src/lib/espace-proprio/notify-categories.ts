// Catégories de signalement propriétaire (partagées front / API).
export const NOTIFY_CATEGORIES = [
  "Changement de code d'accès",
  "Coupure d'eau ou d'électricité",
  "Intervention prévue dans l'immeuble",
  "Travaux en copropriété",
  "Autre",
] as const;

export type NotifyCategory = (typeof NOTIFY_CATEGORIES)[number];
