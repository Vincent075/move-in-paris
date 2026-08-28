import { NextResponse } from "next/server";

// Sync Pennylane → Airtable — toutes les heures.
//
// Pourquoi (28/08/2026, demande de Vincent : « très important qu'à chaque création
// de facture ça envoie immédiatement la notif à Airtable qui l'ajoute à la liste ») :
// les factures d'occupants naissent dans Airtable et montent vers Pennylane, mais
// les honoraires, ventes et autres factures SANS occupant se créent directement
// dans Pennylane — et n'existaient nulle part côté pilotage. De l'argent invisible
// des tableaux de bord.
//
// CE QUE FAIT CE CRON :
//   1) IMPORT AU FIL DE L'EAU — les factures Pennylane créées dans les dernières
//      48 h qui ne sont pas dans Airtable y sont créées (catégorie « Autre », sans
//      réservation). 48 h de fenêtre pour survivre à une panne d'un week-end ;
//      l'idempotence vient du lien Pennylane (une facture déjà connue est ignorée).
//   2) ÉTAT DU STOCK HISTORIQUE, une fois par jour à 8h Paris — on COMPTE les
//      factures Pennylane d'avant la fenêtre qui manquent à Airtable, sans les
//      importer : ce rattrapage-là est une décision de Vincent (dossier
//      « FACTURATION 2026.xlsx », en attente), pas un automatisme.
//
// CE QUE CE CRON NE FAIT JAMAIS :
//   - importer un BROUILLON (une facture non finalisée n'est pas une créance) ;
//   - importer un AVOIR (AUTO-17 s'en charge déjà chaque matin — doublon garanti sinon) ;
//   - importer une facture portant « Résa RES-… » ou « Extension » dans son libellé :
//     c'est une facture née de NOS workflows dont le lien Airtable arrive quelques
//     secondes plus tard — ceinture en plus de l'heure de grâce ci-dessous ;
//   - toucher une ligne Airtable existante.
//
// COURSE ÉVITÉE : nos workflows créent la facture Pennylane PUIS écrivent le lien
// dans Airtable. Entre les deux, elle paraît orpheline. D'où une heure de grâce :
// on n'importe qu'une facture créée il y a plus d'une heure.

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const PL_KEY = process.env.PENNYLANE_API_KEY || "";
const PL_URL = "https://app.pennylane.com/api/external/v2";
const AT_BASE = process.env.AIRTABLE_BASE_ID || "";
const AT_TOKEN = process.env.AIRTABLE_WATCHDOG_TOKEN || "";
const SLACK_TOKEN = process.env.SLACK_BOT_TOKEN_MIP || "";
const CANAL_FACTURATION = "C0BCH7N4W90";
const CANAL_ERREURS = "C0BC1NZGWRM";
const T_FACTURES = "tblC97ei6ZPWhWUwe";
const T_MONITORING = "tblDEkjIyKoKJG5Yj";
const MISE_EN_SERVICE = "2026-07-01";
const FENETRE_H = 48;
const GRACE_MS = 3600_000;

type Dict = Record<string, unknown>;
const texte = (v: unknown) => (typeof v === "string" ? v : v == null ? "" : String(v));
const montant = (v: unknown) => {
  const n = parseFloat(String(v ?? "0"));
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : 0;
};

async function pennylane(path: string): Promise<Dict> {
  const r = await fetch(`${PL_URL}${path}`, {
    headers: { Authorization: `Bearer ${PL_KEY}` }, cache: "no-store",
  });
  if (!r.ok) throw new Error(`Pennylane ${path.split("?")[0]} : HTTP ${r.status}`);
  return r.json();
}

// Pagination par CURSEUR — sondée le 28/08 sur l'API réelle : `per_page` et `page`
// sont ignorés (la liste rend 20 items quoi qu'il arrive), la taille se règle par
// `limit` (100 max) et la suite se suit via `has_more`/`next_cursor`. Borne à 40
// tours (4 000 factures) pour ne jamais boucler si le contrat change.
async function listePennylane(params: string): Promise<Dict[]> {
  const out: Dict[] = [];
  let cursor = "";
  for (let i = 0; i < 40; i++) {
    const d = await pennylane(`/customer_invoices?limit=100${params}${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""}`);
    out.push(...(((d.items as Dict[]) ?? [])));
    if (d.has_more !== true || !d.next_cursor) break;
    cursor = texte(d.next_cursor);
  }
  return out;
}

async function airtable(method: string, path: string, body?: unknown): Promise<Dict> {
  const r = await fetch(`https://api.airtable.com/v0/${AT_BASE}/${path}`, {
    method,
    headers: { Authorization: `Bearer ${AT_TOKEN}`, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });
  if (!r.ok) throw new Error(`Airtable ${path.split("?")[0]} : HTTP ${r.status} — ${(await r.text()).slice(0, 200)}`);
  return r.json();
}

async function idsConnus(): Promise<Set<string>> {
  // Tous les identifiants Pennylane déjà présents dans Airtable, extraits du lien.
  // Même lecture qu'AUTO-17/18 : invoice_id= d'abord, longue suite de chiffres en
  // repli (le « page=1 » des liens récents ne fait pas 7 chiffres).
  const ids = new Set<string>();
  let offset = "";
  do {
    const d = await airtable("GET",
      `${T_FACTURES}?pageSize=100&fields%5B%5D=Lien%20Pennylane${offset ? `&offset=${offset}` : ""}`);
    for (const rec of (d.records as Dict[]) ?? []) {
      const lien = texte((rec.fields as Dict)?.["Lien Pennylane"]);
      const m = /invoice_id=(\d+)/.exec(lien) ?? /(\d{7,})\D*$/.exec(lien);
      if (m) ids.add(m[1]);
    }
    offset = texte(d.offset);
  } while (offset);
  return ids;
}

async function slack(canal: string, text: string) {
  if (!SLACK_TOKEN) return;
  try {
    await fetch("https://slack.com/api/chat.postMessage", {
      method: "POST",
      headers: { Authorization: `Bearer ${SLACK_TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify({ channel: canal, text }),
    });
  } catch { /* une notification perdue ne doit pas faire échouer l'import */ }
}

async function monitoring(statut: string, detail: string) {
  const nom = "Sync factures Pennylane → Airtable";
  try {
    const d = await airtable("GET", `${T_MONITORING}?pageSize=100`);
    const row = ((d.records as Dict[]) ?? []).find((r) => texte((r.fields as Dict)?.["Contrôle"]) === nom);
    const fields = { "Contrôle": nom, Statut: statut, "Détail": detail, "Dernière vérification": new Date().toISOString() };
    if (row) await airtable("PATCH", `${T_MONITORING}/${row.id}`, { fields, typecast: true });
    else await airtable("POST", T_MONITORING, { records: [{ fields }], typecast: true });
  } catch { /* le tableau de bord ne conditionne pas l'import */ }
}

const heureParis = () =>
  parseInt(new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", hour: "2-digit", hour12: false }).format(new Date()), 10);

// Une facture née de NOS workflows porte toujours la réservation dans son libellé.
const estInterne = (label: string) => /—\s*(Extension\s*—\s*)?Résa\s+RES-/i.test(label) || /\bRésa\s+RES-\d{4}/i.test(label);

export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!PL_KEY) {
    await monitoring("ALERTE", "PENNYLANE_API_KEY absente : la sync ne tourne pas.");
    return NextResponse.json({ ok: false, erreur: "PENNYLANE_API_KEY absente" }, { status: 500 });
  }

  try {
    const connus = await idsConnus();
    const depuis = new Date(Date.now() - FENETRE_H * 3600_000).toISOString().slice(0, 19);
    const recentes = await listePennylane(`&created_after=${encodeURIComponent(depuis)}`);

    const ignorees = { brouillons: 0, avoirs: 0, internes: 0, grace: 0 };
    const aImporter: Dict[] = [];
    for (const inv of recentes) {
      const id = texte(inv.id);
      if (!id || connus.has(id)) continue;
      const label = texte(inv.label);
      if (texte(inv.status) === "draft" || inv.draft === true) { ignorees.brouillons++; continue; }
      // Sondé le 28/08 sur l'API réelle : un avoir se signale par status="credit_note",
      // et son montant peut être POSITIF — le seul test du signe le laissait passer.
      if (texte(inv.status) === "credit_note" || texte(inv.invoice_type) === "credit_note" || montant(inv.currency_amount ?? inv.amount) < 0) { ignorees.avoirs++; continue; }
      if (estInterne(label)) { ignorees.internes++; continue; }
      const cree = Date.parse(texte(inv.created_at) || texte(inv.date));
      if (Number.isFinite(cree) && Date.now() - cree < GRACE_MS) { ignorees.grace++; continue; }
      aImporter.push(inv);
    }

    const importees: string[] = [];
    for (const inv of aImporter) {
      const id = texte(inv.id);
      const client = texte((inv.customer as Dict)?.name) || texte((inv.customer as Dict)?.company_name);
      const num = texte(inv.invoice_number);
      const paye = texte(inv.status) === "paid" || inv.paid === true;
      await airtable("POST", T_FACTURES, {
        records: [{ fields: {
          "Catégorie": "Autre",
          Type: "Facture",
          Statut: paye ? "Payée" : "Envoyée",
          "Montant total HT": montant(inv.currency_amount_before_tax ?? inv.amount ?? inv.currency_amount),
          "Date d'envoi": texte(inv.date) || new Date().toISOString().slice(0, 10),
          "Lien Pennylane": `https://app.pennylane.com/companies/22414705/clients/customer_invoices?invoice_id=${id}&subtab=all`,
          Notes: `Importée de Pennylane (sync auto) — ${num || "sans numéro"} — ${texte(inv.label).slice(0, 140)}${client ? ` — client : ${client}` : ""}`,
        }}],
        typecast: true,
      });
      importees.push(`• ${num || id} — ${montant(inv.currency_amount ?? inv.amount).toLocaleString("fr-FR")} €${client ? ` — ${client}` : ""}`);
    }

    if (importees.length) {
      await slack(CANAL_FACTURATION,
        `:inbox_tray: *Sync Pennylane → Airtable — ${importees.length} facture(s) importée(s)*\n` +
        importees.join("\n") +
        `\n_Créées directement dans Pennylane (honoraires, ventes…), ajoutées à la liste Factures en catégorie « Autre »._`);
    }

    // ── Stock historique, une fois par jour à 8h Paris ──────────────────────
    let backlog = -1;
    if (heureParis() === 8) {
      const toutes = await listePennylane("");
      const manquantes = toutes.filter((inv) => {
        const id = texte(inv.id);
        if (!id || connus.has(id)) return false;
        if (texte(inv.status) === "draft" || inv.draft === true) return false;
        if (texte(inv.status) === "credit_note" || texte(inv.invoice_type) === "credit_note" || montant(inv.currency_amount ?? inv.amount) < 0) return false;
        return texte(inv.date) >= MISE_EN_SERVICE;
      });
      backlog = manquantes.length;
      if (backlog > 0) {
        const total = manquantes.reduce((s, x) => s + montant(x.currency_amount ?? x.amount), 0);
        await monitoring("OK",
          `Import au fil de l'eau actif. Stock historique : ${backlog} facture(s) Pennylane hors Airtable ` +
          `depuis juillet (${total.toLocaleString("fr-FR")} €) — rattrapage à décider avec le dossier FACTURATION 2026.`);
      }
    }
    if (backlog <= 0) {
      await monitoring("OK", `Sync horaire OK — ${importees.length} importée(s), ` +
        `${ignorees.brouillons} brouillon(s), ${ignorees.avoirs} avoir(s), ${ignorees.internes} interne(s), ${ignorees.grace} en grâce.`);
    }

    return NextResponse.json({ ok: true, importees: importees.length, ignorees, backlog });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await monitoring("ALERTE", `Sync en échec : ${msg}`);
    await slack(CANAL_ERREURS, `:rotating_light: *Sync Pennylane → Airtable en échec*\n${msg}`);
    return NextResponse.json({ ok: false, erreur: msg }, { status: 500 });
  }
}
