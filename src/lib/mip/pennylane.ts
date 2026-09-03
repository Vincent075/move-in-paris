// Client Pennylane (API externe v2) commun aux routes de facturation (03/09/2026).
//
// Pourquoi un client à part : la clé Pennylane de Vercel est la même pour toutes les
// routes, et Pennylane limite à 25 requêtes par 5 secondes PAR JETON. Une émission
// consomme 3 à 6 appels, un avoir 6 à 8, le cron pennylane-sync balaie tout le stock
// chaque heure : aucun code lu à ce jour ne lit « ratelimit-remaining » ni ne respecte
// « retry-after », et un 429 se traduisait par une facture « non émise » sans raison
// lisible. Ici, chaque appel lit les en-têtes de débit, se met en pause quand la
// fenêtre est épuisée, et rejoue trois fois sur 429 / 5xx. Les 4xx métier (422 champ
// refusé, 404) sortent immédiatement : réessayer n'y changerait rien.
//
// Règles d'usage tenues ici, pour que les appelants n'aient pas à s'en souvenir :
//   - `?use_2026_api_changes=true` sur TOUS les appels (guide de migration 2026) ;
//   - tous les montants sont des CHAÎNES (« 40.000000 »), jamais des nombres ;
//   - la clé de Vercel n'a PAS le scope « templates » : on ne liste jamais les modèles,
//     les deux identifiants d'IBAN sont en dur (mêmes valeurs qu'AUTO-16 / AUTO-04A).

const PL_URL = "https://app.pennylane.com/api/external/v2";
const PL_KEY = () => process.env.PENNYLANE_API_KEY_FACTURATION || process.env.PENNYLANE_API_KEY || "";
const ENTREPRISE = "22414705"; // identifiant de Move in Paris dans les liens de l'application

// Modèle de facture Pennylane = IBAN imprimé sur le PDF.
export const TEMPLATE_IBAN: Record<string, number> = { "IBAN 1": 5040390144, "IBAN 2": 5039919104 };
export const TEMPLATE_DEFAUT = 5040390144;

export type PlDict = Record<string, unknown>;

export type PlLigneEntree = {
  label: string; quantity: number; unit: string;
  raw_currency_unit_price: string; vat_rate: string; description?: string;
};
export type PlFactureEntree = {
  customer_id: number; date: string; deadline: string; draft: boolean; currency: "EUR";
  customer_invoice_template_id?: number; special_mention?: string; external_reference: string;
  pdf_invoice_subject?: string; language?: "fr_FR" | "en_GB"; invoice_lines: PlLigneEntree[];
};
export type PlFacture = {
  id: number; invoice_number: string; status: string; draft: boolean; date: string | null;
  deadline: string | null; currency_amount: string; currency_amount_before_tax: string;
  remaining_amount_with_tax: string | null; public_file_url: string | null; filename: string | null;
  language: string; external_reference: string; special_mention: string | null; label: string | null;
  customer: { id: number } | null; customer_invoice_template: { id: number } | null;
  credited_invoice: { id: number } | null; created_at: string;
};
export type PlLigne = {
  id: number; label: string; unit: string | null; quantity: string; vat_rate: string;
  raw_currency_unit_price: string; currency_amount_before_tax: string; description: string;
};
export type PlClient = {
  id: number; name: string; customer_type?: string; emails: string[]; first_name?: string; last_name?: string;
  billing_address: { address: string; postal_code: string; city: string; country_alpha2: string };
  billing_language?: string;
};
export type PlAdresse = { address: string; postal_code: string; city: string; country_alpha2: string };

export class PennylaneError extends Error {
  status: number; corps: string;
  constructor(message: string, status: number, corps: string) { super(message); this.status = status; this.corps = corps; }
}

const attendre = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Fenêtre de débit partagée par tous les appels de la même exécution : quand Pennylane
// annonce qu'il ne reste plus qu'une requête, on attend la remise à zéro plutôt que de
// provoquer le 429. Réinitialisée à chaque fonction serverless froide, ce qui est sans
// conséquence : au pire on prend un 429, que la boucle ci-dessous absorbe.
let pauseJusqua = 0;

// Appel générique. `method` GET/POST/PUT/DELETE ; `chemin` commence par « / » et peut
// porter sa propre query ; le paramètre 2026 est ajouté s'il manque. Renvoie le JSON
// (ou {} sur 204). Trois tentatives sur 429 et 5xx, avec « retry-after » quand il existe.
export async function pennylane<T = PlDict>(method: string, chemin: string, body?: unknown): Promise<T> {
  if (!PL_KEY()) throw new PennylaneError("PENNYLANE_API_KEY absente", 0, "");
  const url = `${PL_URL}${chemin}${chemin.includes("?") ? "&" : "?"}use_2026_api_changes=true`;
  let derniere: PennylaneError | null = null;
  for (let tentative = 1; tentative <= 3; tentative++) {
    const reste = pauseJusqua - Date.now();
    if (reste > 0) await attendre(Math.min(reste, 6000));
    const r = await fetch(url, {
      method,
      headers: { Authorization: `Bearer ${PL_KEY()}`, "Content-Type": "application/json", Accept: "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: "no-store",
    });
    const restant = Number(r.headers.get("ratelimit-remaining") ?? "99");
    const reset = Number(r.headers.get("ratelimit-reset") ?? "0");
    if (Number.isFinite(restant) && restant <= 1 && reset > 0) pauseJusqua = reset * 1000 + 200;
    const t = await r.text();
    if (r.ok) return (t ? JSON.parse(t) : {}) as T;
    derniere = new PennylaneError(`Pennylane ${method} ${chemin.split("?")[0]} -> ${r.status} ${t.slice(0, 300)}`, r.status, t);
    if (r.status !== 429 && r.status < 500) break;
    const retryAfter = Number(r.headers.get("retry-after") ?? "0");
    await attendre(retryAfter > 0 ? retryAfter * 1000 + 200 : 1500 * tentative);
  }
  throw derniere ?? new PennylaneError("Pennylane : échec inconnu", 0, "");
}

// ── Factures ────────────────────────────────────────────────────────────────
export const getFacture = (id: string | number) => pennylane<PlFacture>("GET", `/customer_invoices/${id}`);

export async function getLignes(id: string | number): Promise<PlLigne[]> {
  const out: PlLigne[] = [];
  let cursor = "";
  for (let i = 0; i < 10; i++) {
    const d = await pennylane<{ items: PlLigne[]; has_more: boolean; next_cursor: string | null }>(
      "GET", `/customer_invoices/${id}/invoice_lines?limit=100&sort=id${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""}`);
    out.push(...(d.items ?? []));
    if (d.has_more !== true || !d.next_cursor) break;
    cursor = d.next_cursor;
  }
  return out;
}

// Une facture déjà créée sous cette référence (POST parti, écriture Airtable échouée)
// est retrouvée ici et ADOPTÉE par l'appelant : jamais deux documents pour une ligne.
export async function chercherParReference(reference: string): Promise<PlFacture | null> {
  const filtre = encodeURIComponent(JSON.stringify([{ field: "external_reference", operator: "eq", value: reference }]));
  const d = await pennylane<{ items: PlFacture[] }>("GET", `/customer_invoices?limit=5&filter=${filtre}`);
  return (d.items ?? [])[0] ?? null;
}

// Factures d'un client datées d'aujourd'hui ou après : sert à retrouver un document créé
// par la chaîne AUTO-16 (qui ne pose pas d'external_reference) quand elle a planté entre
// « Creer Invoice Pennylane » et « MAJ Facture Lien Pennylane » — le seul moyen de ne
// pas en créer un second au clic suivant.
export async function listerFacturesClientDepuis(customerId: number, dateISO: string): Promise<PlFacture[]> {
  const filtre = encodeURIComponent(JSON.stringify([
    { field: "customer_id", operator: "eq", value: customerId },
    { field: "date", operator: "gteq", value: dateISO },
  ]));
  const d = await pennylane<{ items: PlFacture[] }>("GET", `/customer_invoices?limit=50&filter=${filtre}`);
  return d.items ?? [];
}

export const creerFacture = (corps: PlFactureEntree) => pennylane<PlFacture>("POST", "/customer_invoices", corps);
export const finaliser = (id: string | number) => pennylane<PlFacture>("PUT", `/customer_invoices/${id}/finalize`);
export const lierAvoir = (origineId: string | number, avoirId: number) =>
  pennylane<PlFacture>("POST", `/customer_invoices/${origineId}/link_credit_note`, { credit_note_id: avoirId });
// DELETE n'est documenté que pour un brouillon : l'appelant vérifie `draft` avant.
export const supprimerBrouillon = (id: string | number) => pennylane<PlDict>("DELETE", `/customer_invoices/${id}`);

// ── Clients ─────────────────────────────────────────────────────────────────
export async function chercherClientParEmail(email: string): Promise<PlClient | null> {
  const e = email.trim().toLowerCase();
  if (!e) return null;
  const filtre = encodeURIComponent(JSON.stringify([{ field: "emails", operator: "in", value: [e] }]));
  const d = await pennylane<{ items: PlClient[] }>("GET", `/customers?limit=5&filter=${filtre}`);
  // Le filtre « in » est insensible à la casse côté Pennylane, mais on revérifie : un
  // client adopté par erreur recevrait les factures de quelqu'un d'autre.
  return (d.items ?? []).find((c) => (c.emails ?? []).some((x) => String(x).trim().toLowerCase() === e)) ?? null;
}

export const creerClientParticulier = (corps: {
  first_name: string; last_name: string; emails: string[]; billing_address: PlAdresse; billing_language?: string; phone?: string;
}) => pennylane<PlClient>("POST", "/individual_customers", corps);

export const creerClientSociete = (corps: {
  name: string; emails: string[]; billing_address: PlAdresse; billing_language?: string; phone?: string; recipient?: string;
}) => pennylane<PlClient>("POST", "/company_customers", corps);

// ── PDF ─────────────────────────────────────────────────────────────────────
// Le PDF est généré de façon asynchrone : `public_file_url` peut être nul juste après
// la création (ou la finalisation). On relit toutes les 3 s pendant 60 s au plus. L'URL
// rendue expire au bout de 30 minutes : à consommer tout de suite.
export async function urlPdf(id: string | number, deja?: string | null, maxMs = 60_000): Promise<string | null> {
  if (deja) return deja;
  const fin = Date.now() + maxMs;
  while (Date.now() < fin) {
    await attendre(3000);
    try {
      const f = await getFacture(id);
      if (f.public_file_url) return f.public_file_url;
    } catch { /* on retente jusqu'à l'échéance */ }
  }
  return null;
}

export async function telechargerPdf(url: string): Promise<Buffer | null> {
  try {
    const r = await fetch(url, { cache: "no-store" });
    if (!r.ok) return null;
    const b = Buffer.from(await r.arrayBuffer());
    // Un vrai PDF commence par « %PDF » ; une page d'erreur HTML n'en est pas un.
    return b.length > 200 && b.subarray(0, 4).toString("latin1") === "%PDF" ? b : null;
  } catch { return null; }
}

// ── Liens ───────────────────────────────────────────────────────────────────
// Même lecture qu'AUTO-17/18, pennylane-sync et le watchdog : « invoice_id= » d'abord,
// longue suite de chiffres en repli pour les liens à l'ancien format.
export const idDepuisLien = (lien: unknown): string | null => {
  const s = typeof lien === "string" ? lien : "";
  return /invoice_id=(\d+)/.exec(s)?.[1] ?? /(\d{7,})\D*$/.exec(s)?.[1] ?? null;
};
export const lienPennylane = (id: string | number) =>
  `https://app.pennylane.com/companies/${ENTREPRISE}/clients/customer_invoices?invoice_id=${id}&subtab=all`;
