import { NextResponse } from "next/server";

// Le cockpit, remis en phase avec la réalité.
//
// Pourquoi (29/08/2026) : les indicateurs du cockpit sont des rollups qui passent par
// trois champs de lien — « Toutes les Réservations », « Toutes les Factures », « Tous
// les Leads ». Ces liens étaient posés à la main à la création des enregistrements, et
// ça s'est arrêté le 21 juillet à 15h27. Depuis, le cockpit n'agrégeait plus qu'un
// sous-ensemble figé : 7 réservations actives affichées contre 35, 258 659 € de CA
// manquant, 13 interventions ouvertes invisibles. Toute décision prise en le regardant
// portait sur un cinquième de l'activité.
//
// Ce endpoint ne change aucun calcul : il garantit simplement que les liens couvrent
// tout ce qu'ils doivent couvrir. Les rollups et les écrans existants continuent de
// fonctionner tels quels.
//
// UN CHOIX ASSUMÉ SUR LE CA. Le rollup « CA annuel » additionne toutes les factures
// liées, sans filtre de date. Or la table contient depuis le 28/08 quelque 539
// factures de 2025, importées de Pennylane. Tout lier afficherait un cumul toutes
// années sous une étiquette « annuel ». On ne lie donc que les factures de l'ANNÉE
// CIVILE EN COURS, hors avoirs et hors factures annulées — mêmes exclusions que le
// calcul de la finance mensuelle, pour que les deux chiffres racontent la même chose.
//
// IDEMPOTENCE : on ne réécrit un champ que si la liste change réellement. Sans ça,
// chaque passage modifierait les trois tables liées, repinguerait les webhooks, et
// relancerait le calcul — la boucle qui a produit 1 754 ménages dans l'après-midi.
//
// ?simulation=1 calcule et compare sans rien écrire.

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const AT_BASE = process.env.AIRTABLE_BASE_ID || "";
const AT_TOKEN = process.env.AIRTABLE_WATCHDOG_TOKEN || "";
const T_COCKPIT = "tblZLtMI0CKZL4xfi";
const T_RESAS = "tbl5uN32egP4YCvUi";
const T_FACTURES = "tblC97ei6ZPWhWUwe";
const T_LEADS = "tblUxEm8sB4eHyNG1";
const T_MONITORING = "tblDEkjIyKoKJG5Yj";

type Dict = Record<string, unknown>;
type Rec = { id: string; fields: Dict };
const texte = (v: unknown) => (typeof v === "string" ? v : v == null ? "" : String(v));
const liens = (v: unknown): string[] => (Array.isArray(v) ? (v as string[]) : []);

async function airtable(method: string, path: string, body?: unknown): Promise<Dict> {
  const r = await fetch(`https://api.airtable.com/v0/${AT_BASE}/${path}`, {
    method,
    headers: { Authorization: `Bearer ${AT_TOKEN}`, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });
  if (!r.ok) throw new Error(`Airtable ${method} ${path.slice(0, 30)} : HTTP ${r.status}`);
  return r.json();
}

async function lireTable(tableId: string): Promise<Rec[]> {
  const out: Rec[] = [];
  let offset: string | undefined;
  do {
    const url = new URL(`https://api.airtable.com/v0/${AT_BASE}/${tableId}`);
    url.searchParams.set("pageSize", "100");
    if (offset) url.searchParams.set("offset", offset);
    const r = await fetch(url.toString(), { headers: { Authorization: `Bearer ${AT_TOKEN}` }, cache: "no-store" });
    if (!r.ok) throw new Error(`lecture ${tableId} : HTTP ${r.status}`);
    const j = (await r.json()) as { records?: Rec[]; offset?: string };
    out.push(...(j.records || []));
    offset = j.offset;
  } while (offset);
  return out;
}

async function monitoring(statut: string, detail: string) {
  const nom = "Cockpit KPI (liens à jour)";
  try {
    const d = await airtable("GET", `${T_MONITORING}?pageSize=100`);
    const row = ((d.records as Dict[]) ?? []).find((r) => texte((r.fields as Dict)?.["Contrôle"]) === nom);
    const fields = { "Contrôle": nom, Statut: statut, "Détail": detail, "Dernière vérification": new Date().toISOString() };
    if (row) await airtable("PATCH", `${T_MONITORING}/${row.id}`, { fields, typecast: true });
    else await airtable("POST", T_MONITORING, { records: [{ fields }], typecast: true });
  } catch { /* le tableau de bord ne conditionne pas la mise à jour */ }
}

const memeListe = (a: string[], b: string[]) =>
  a.length === b.length && [...a].sort().join() === [...b].sort().join();

export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const simulation = new URL(request.url).searchParams.get("simulation") === "1";
  const debut = Date.now();

  try {
    const [cockpits, resas, factures, leads] = await Promise.all([
      lireTable(T_COCKPIT), lireTable(T_RESAS), lireTable(T_FACTURES), lireTable(T_LEADS),
    ]);
    if (!cockpits.length) throw new Error("aucune ligne dans Cockpit KPI");
    const ligne = cockpits[0];
    const annee = new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", year: "numeric" }).format(new Date());

    // Réservations et leads : tout, les rollups font eux-mêmes le tri par statut.
    const idsResas = resas.map((r) => r.id);
    const idsLeads = leads.map((r) => r.id);

    // Factures : année en cours, vraies factures, ni avoir ni annulation.
    const idsFactures = factures.filter((f) => {
      const c = f.fields;
      if (texte(c["Type"]) === "Avoir" || texte(c["Statut"]) === "Avoir") return false;
      if (liens(c["From field: Avoir associé"]).length) return false;
      const d = texte(c["Date d'envoi"]).slice(0, 4) || texte(c["Période facturée début"]).slice(0, 4);
      return d === annee;
    }).map((f) => f.id);

    const avant = {
      resas: liens(ligne.fields["Toutes les Réservations"]),
      factures: liens(ligne.fields["Toutes les Factures"]),
      leads: liens(ligne.fields["Tous les Leads"]),
    };
    const fields: Dict = {};
    if (!memeListe(avant.resas, idsResas)) fields["Toutes les Réservations"] = idsResas;
    if (!memeListe(avant.factures, idsFactures)) fields["Toutes les Factures"] = idsFactures;
    if (!memeListe(avant.leads, idsLeads)) fields["Tous les Leads"] = idsLeads;

    const bilan = {
      reservations: { avant: avant.resas.length, apres: idsResas.length },
      factures: { avant: avant.factures.length, apres: idsFactures.length, annee },
      leads: { avant: avant.leads.length, apres: idsLeads.length },
      champs_a_ecrire: Object.keys(fields),
    };

    if (simulation || !Object.keys(fields).length) {
      if (!simulation) await monitoring("OK", "Cockpit déjà à jour, aucune écriture.");
      return NextResponse.json({ ok: true, simulation, ...bilan, duree_ms: Date.now() - debut });
    }

    await airtable("PATCH", `${T_COCKPIT}/${ligne.id}`, { fields, typecast: true });
    const detail = `Réservations ${avant.resas.length}→${idsResas.length} · ` +
      `factures ${annee} ${avant.factures.length}→${idsFactures.length} · ` +
      `leads ${avant.leads.length}→${idsLeads.length}.`;
    await monitoring("OK", detail);
    return NextResponse.json({ ok: true, ...bilan, duree_ms: Date.now() - debut });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await monitoring("ALERTE", `Mise à jour du cockpit en échec : ${msg}`);
    return NextResponse.json({ ok: false, erreur: msg }, { status: 500 });
  }
}
