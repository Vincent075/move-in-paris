// Couche de données de l'espace propriétaire.
// Deux implémentations derrière le même contrat :
//   - "mock"     : données de démonstration (phase de test, avant livraison TT)
//   - "airtable" : lecture seule de la base Tech Tribe, champs whitelistés
// Bascule via PORTAL_DATA_SOURCE=mock|airtable (Vercel). Aucun autre changement
// de code n'est nécessaire au go-live.
// Server-only.

import { DEMO_DATA, type PortalData, type PortalStay } from "./mock";

export type PortalOwner = {
  id: string;
  email: string;
  /** "Monsieur de Vasselot" pour la salutation */
  greetingName: string;
  /** "M. Philippe de Vasselot" pour le chip header */
  chipName: string;
};

const SOURCE = () => (process.env.PORTAL_DATA_SOURCE === "airtable" ? "airtable" : "mock");

/* ================================================================
   MOCK (phase de test)
   ================================================================ */

function testEmails(): string[] {
  return (process.env.PORTAL_TEST_EMAILS || "vincent@move-in-paris.com")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

async function mockResolveOwner(email: string): Promise<PortalOwner | null> {
  if (!testEmails().includes(email.toLowerCase())) return null;
  return {
    id: "test-owner",
    email: email.toLowerCase(),
    greetingName: "Monsieur de Vasselot",
    chipName: "M. Philippe de Vasselot",
  };
}

async function mockGetData(): Promise<PortalData> {
  return DEMO_DATA;
}

/* ================================================================
   AIRTABLE (base Tech Tribe, lecture seule)
   ================================================================
   RGPD : whitelist stricte de champs. On ne lit JAMAIS sur Occupants :
   date/lieu de naissance, numéro/scan de passeport, nationalité, téléphone.
   ⚠️ À vérifier au go-live du 17/07 (recette) : valeurs exactes des
   single-selects Statut (Réservations, Ménages, Interventions) : les
   constantes STATUTS_* ci-dessous sont à ajuster si TT a changé les libellés.
*/

const AT_BASE = () => process.env.AIRTABLE_PORTAL_BASE || "appcLt70GQiR1FAbT";
const AT_PAT = () => {
  const p = process.env.AIRTABLE_PORTAL_PAT;
  if (!p) throw new Error("AIRTABLE_PORTAL_PAT manquant (PAT lecture seule à définir sur Vercel au go-live).");
  return p;
};

// Valeurs de statut à confirmer en recette (17/07)
const STATUTS_RESA_ANNULEE = ["Annulée", "Annulé"];

type ATRecord = { id: string; fields: Record<string, unknown> };

async function atList(
  table: string,
  params: { filterByFormula?: string; fields?: string[]; sort?: { field: string; direction: "asc" | "desc" }[] },
): Promise<ATRecord[]> {
  const url = new URL(`https://api.airtable.com/v0/${AT_BASE()}/${encodeURIComponent(table)}`);
  if (params.filterByFormula) url.searchParams.set("filterByFormula", params.filterByFormula);
  for (const f of params.fields || []) url.searchParams.append("fields[]", f);
  (params.sort || []).forEach((s, i) => {
    url.searchParams.set(`sort[${i}][field]`, s.field);
    url.searchParams.set(`sort[${i}][direction]`, s.direction);
  });

  const records: ATRecord[] = [];
  let offset: string | undefined;
  do {
    if (offset) url.searchParams.set("offset", offset);
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${AT_PAT()}` },
      // données opérationnelles : pas de cache long
      next: { revalidate: 60 },
    });
    if (!res.ok) throw new Error(`Airtable ${table} : HTTP ${res.status}`);
    const json = (await res.json()) as { records: ATRecord[]; offset?: string };
    records.push(...json.records);
    offset = json.offset;
  } while (offset);
  return records;
}

const esc = (s: string) => s.replace(/'/g, "\\'");

const FR_MONTHS = [
  "janvier", "février", "mars", "avril", "mai", "juin",
  "juillet", "août", "septembre", "octobre", "novembre", "décembre",
];

function frDate(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  const day = d === 1 ? "1ᵉʳ" : String(d);
  return `${day} ${FR_MONTHS[m - 1]} ${y}`;
}

async function airtableResolveOwner(email: string): Promise<PortalOwner | null> {
  const recs = await atList("Propriétaires", {
    filterByFormula: `LOWER({Email}) = '${esc(email.toLowerCase())}'`,
    fields: ["Nom", "Prénom", "Nom complet", "Email"],
  });
  const r = recs[0];
  if (!r) return null;
  const nom = String(r.fields["Nom"] || "");
  const prenom = String(r.fields["Prénom"] || "");
  const complet = String(r.fields["Nom complet"] || `${prenom} ${nom}`.trim());
  return {
    id: r.id,
    email: email.toLowerCase(),
    greetingName: nom ? `Monsieur ${nom}` : complet, // civilité à affiner si champ dédié en recette
    chipName: `M. ${complet}`,
  };
}

async function airtableGetData(owner: PortalOwner): Promise<PortalData> {
  // 1. Appartements du propriétaire (via lookup Email propriétaire, whitelist)
  const apts = await atList("Appartements", {
    filterByFormula: `LOWER(ARRAYJOIN({Email propriétaire})) = '${esc(owner.email)}'`,
    fields: ["Code appartement", "Nom / Référence", "adresse complète", "Adresse", "Ville", "Photo de l'appartement"],
  });
  if (apts.length === 0) {
    return { ...DEMO_DATA, ownerName: owner.greetingName, apartments: [], stays: [], timeline: [], documents: [], interventions: [] };
  }
  const apt = apts[0]; // V1 : premier appartement ; le switcher multi-apparts s'active en V1.1
  const aptName = String(apt.fields["adresse complète"] || apt.fields["Adresse"] || apt.fields["Nom / Référence"]);

  // 2. Réservations de cet appartement (whitelist stricte)
  const resas = await atList("Réservations", {
    filterByFormula: `FIND('${esc(String(apt.fields["Code appartement"] || ""))}', ARRAYJOIN({Appartement}))`,
    fields: ["Code réservation", "Date d'entrée", "Date de sortie", "Nb nuits", "Statut", "Occupant"],
    sort: [{ field: "Date d'entrée", direction: "desc" }],
  });
  const valid = resas.filter((r) => !STATUTS_RESA_ANNULEE.includes(String(r.fields["Statut"] || "")));

  const today = new Date().toISOString().slice(0, 10);
  const stays: PortalStay[] = valid
    .filter((r) => r.fields["Date d'entrée"] && r.fields["Date de sortie"])
    .map((r) => {
      const arrival = String(r.fields["Date d'entrée"]).slice(0, 10);
      const departure = String(r.fields["Date de sortie"]).slice(0, 10);
      return {
        ref: String(r.fields["Code réservation"] || r.id),
        arrival,
        departure,
        arrivalLabel: frDate(arrival),
        departureLabel: frDate(departure),
        nights: Number(r.fields["Nb nuits"] || 0),
        occupants: Array.isArray(r.fields["Occupant"]) ? (r.fields["Occupant"] as unknown[]).length : 1,
        current: arrival <= today && today <= departure,
      };
    });

  // 3. Nom de l'occupant du séjour EN COURS uniquement (RGPD : Civilité + Nom complet, rien d'autre)
  const current = stays.find((s) => s.current);
  if (current) {
    const resaCourante = valid.find((r) => String(r.fields["Code réservation"]) === current.ref);
    const occIds = (resaCourante?.fields["Occupant"] as string[] | undefined) || [];
    if (occIds[0]) {
      const occs = await atList("Occupants", {
        filterByFormula: `RECORD_ID() = '${esc(occIds[0])}'`,
        fields: ["Civilité", "Nom complet"], // ⚠️ whitelist RGPD : ne JAMAIS étendre sans revue
      });
      if (occs[0]) {
        current.occupantName = `${String(occs[0].fields["Civilité"] || "")} ${String(occs[0].fields["Nom complet"] || "")}`.trim();
      }
    }
  }

  // 4. Ménages, Interventions, Documents (whitelist)
  const aptRef = `FIND('${esc(String(apt.fields["Code appartement"] || ""))}', ARRAYJOIN({Appartement}))`;
  const [menages, interventions, documents] = await Promise.all([
    atList("Ménages", {
      filterByFormula: aptRef,
      fields: ["Date prévue", "Type", "Statut"],
    }),
    atList("Interventions", {
      filterByFormula: `FIND('${esc(String(apt.fields["Code appartement"] || ""))}', ARRAYJOIN({Appartement}))`,
      fields: ["Code intervention", "Type d'intervention", "Statut", "Date de signalement", "Date résolution", "Facturable à", "Montant artisan (€)", "Description du problème"],
      sort: [{ field: "Date de signalement", direction: "desc" }],
    }),
    atList("Documents", {
      filterByFormula: `FIND('${esc(owner.id)}', ARRAYJOIN({Propriétaire lié}))`,
      fields: ["Nom document", "Type", "Statut", "Dernière modification"],
      sort: [{ field: "Dernière modification", direction: "desc" }],
    }),
  ]);

  const cleaningDays = menages
    .map((m) => String(m.fields["Date prévue"] || "").slice(0, 10))
    .filter(Boolean);

  const next = stays.filter((s) => s.arrival > today).sort((a, b) => (a.arrival < b.arrival ? -1 : 1))[0];
  const openInterventions = interventions.filter((i) => String(i.fields["Statut"]) !== "Terminée" && !i.fields["Date résolution"]);
  const nightsList = stays.filter((s) => s.nights > 0).map((s) => s.nights);
  const avg = nightsList.length ? Math.round(nightsList.reduce((a, b) => a + b, 0) / nightsList.length) : 0;
  const year = today.slice(0, 4);

  return {
    ownerName: owner.greetingName,
    apartments: apts.map((a) => {
      const attachments = a.fields["Photo de l'appartement"] as
        | { url?: string; thumbnails?: { large?: { url?: string } } }[]
        | undefined;
      return {
        id: a.id,
        ref: String(a.fields["Code appartement"] || a.fields["Nom / Référence"] || ""),
        shortAddress: String(a.fields["adresse complète"] || a.fields["Adresse"] || ""),
        photo: attachments?.[0]?.thumbnails?.large?.url || attachments?.[0]?.url,
      };
    }),
    glance: [
      {
        k: "Occupation actuelle",
        v: current ? `Occupé jusqu’au ${current.departureLabel}` : "Libre actuellement",
        s: current ? `Séjour professionnel · ${current.occupants} occupant${current.occupants > 1 ? "s" : ""}` : "Aucun séjour en cours",
      },
      {
        k: "Prochaine arrivée",
        v: next ? next.arrivalLabel : "Aucune confirmée",
        s: next ? `Séjour de ${next.nights} nuits confirmé` : "Nous y travaillons",
      },
      {
        k: "Prochain ménage complet",
        v: current ? `Après le départ du ${current.departureLabel}` : "À planifier",
        s: "Ménage de départ · toujours inclus",
      },
      {
        k: "Interventions en cours",
        v: openInterventions.length === 0 ? "Aucune" : String(openInterventions.length),
        s: openInterventions.length === 0 ? "Votre bien est en parfait état" : "Suivies par notre équipe",
      },
    ],
    stays,
    cleaningDays,
    calendarNote: current
      ? `Séjour en cours jusqu’au ${current.departureLabel} · le ménage complet de départ est toujours inclus.`
      : "Le calendrier reflète les réservations confirmées.",
    timeline: [], // V1.1 : union chronologique Réservations + Ménages + Interventions + Documents
    stats: {
      avgStay: `${avg} nuits`,
      staysSince2024: stays.length,
      cleanings2026: menages.filter((m) => String(m.fields["Date prévue"] || "").startsWith(year)).length,
      interventions2026: interventions.filter((i) => String(i.fields["Date de signalement"] || "").startsWith(year)).length,
    },
    documents: documents.map((d) => ({
      name: String(d.fields["Nom document"] || "Document"),
      meta: [String(d.fields["Type"] || ""), String(d.fields["Dernière modification"] || "").slice(0, 10)]
        .filter(Boolean)
        .join(" · "),
    })),
    interventions: interventions.slice(0, 10).map((i) => ({
      ref: String(i.fields["Code intervention"] || i.id),
      dateLabel: i.fields["Date de signalement"] ? frDate(String(i.fields["Date de signalement"])) : "",
      nature: [String(i.fields["Type d'intervention"] || ""), String(i.fields["Description du problème"] || "").slice(0, 80)]
        .filter(Boolean)
        .join(" · "),
      provider: "Prestataire Move in Paris", // nom prestataire : lookup Externe en V1.1
      status: (String(i.fields["Statut"]) === "Terminée" ? "Terminée" : "En cours") as "Terminée" | "En cours",
    })),
  };
}

/* ================================================================
   Contrat public
   ================================================================ */

export async function resolveOwnerByEmail(email: string): Promise<PortalOwner | null> {
  return SOURCE() === "airtable" ? airtableResolveOwner(email) : mockResolveOwner(email);
}

export async function getPortalData(owner: PortalOwner): Promise<PortalData> {
  return SOURCE() === "airtable" ? airtableGetData(owner) : mockGetData();
}

export function dataSourceLabel(): "mock" | "airtable" {
  return SOURCE();
}
