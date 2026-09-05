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
// 05/09/2026 : remontée du 1er juillet au 1er août. Vincent : « on est à 100 % sur la
// plateforme depuis le 1er août ». Le seuil de juillet laissait revenir, à chaque passage,
// les factures de juillet issues de l'ancien système (tests Santa Fé, Agence de Djamel) :
// supprimées à la main, réimportées à l'heure suivante.
const MISE_EN_SERVICE = "2026-08-01";
const FENETRE_H = 48;
const GRACE_MS = 3600_000;
// Au-delà, on suspend au lieu d'importer : un déversement de masse est un signal, pas une routine.
const PLAFOND_IMPORT = 20;

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
// Une facture ou un avoir émis par la route facture-emettre (03/09/2026) porte son
// numéro Airtable en external_reference (« FAC-2026-0198 », « AVOIR-FAC-2026-0177 »).
// Un honoraire ou un dommage sans « Résa RES- » dans le libellé serait sinon réimporté
// en « Autre » si l'écriture du lien avait échoué au-delà de l'heure de grâce.
const estEmiseParLaRoute = (inv: Dict) => /^(FAC|AVOIR)-/.test(texte(inv.external_reference));


// ── Identification automatique ───────────────────────────────────────────────
// Une facture née chez Pennylane arrive nue : ni période, ni occupant, ni séjour.
// Pennylane sait pourtant beaucoup de choses — la ligne porte « Loyer du 01/09/26 au
// 01/11/26 », et le client est une personne physique nommée. On remplit donc tout ce
// qui se DÉDUIT, et rien de ce qui se devine : un homonyme, deux séjours possibles,
// un libellé illisible, et on laisse le champ vide. Une case vide se voit et se
// corrige ; une case fausse se propage dans la finance sans que personne ne la relise.

const T_OCCUPANTS = "tblgcFnDwxjqVJy8L";
const T_CLIENT_FINAL = "tblIzSOniHXHCLWQJ";
const T_AGENCES = "tblINIOlKNzndfDRX";
const T_RESAS = "tbl5uN32egP4YCvUi";

// Comparaison insensible aux accents, à la casse et à la ponctuation.
const clef = (v: unknown) =>
  texte(v).normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toUpperCase().replace(/[^A-Z0-9]+/g, " ").trim();

async function toutesLesLignes(table: string, champs: string[]): Promise<Dict[]> {
  const out: Dict[] = [];
  let offset = "";
  do {
    const q = new URLSearchParams({ pageSize: "100" });
    for (const c of champs) q.append("fields[]", c);
    if (offset) q.set("offset", offset);
    const d = await airtable("GET", `${table}?${q}`);
    out.push(...((d.records as Dict[]) ?? []));
    offset = texte(d.offset);
  } while (offset);
  return out;
}

// « 01/09/26 » → « 2026-09-01 ». Deux ou quatre chiffres d'année acceptés.
function isoDepuisFr(v: string): string | null {
  const m = v.match(/^(\d{2})\/(\d{2})\/(\d{2}|\d{4})$/);
  if (!m) return null;
  const an = m[3].length === 2 ? `20${m[3]}` : m[3];
  const iso = `${an}-${m[2]}-${m[1]}`;
  return Number.isNaN(Date.parse(iso)) ? null : iso;
}

// Un seul candidat = une certitude. Zéro ou plusieurs = on n'écrit pas.
function unique(candidats: Dict[]): Dict | null {
  return candidats.length === 1 ? candidats[0] : null;
}

async function identifier(inv: Dict): Promise<{ champs: Dict; trouve: string[] }> {
  const champs: Dict = {};
  const trouve: string[] = [];

  // 1. La ligne de facture porte la nature de la prestation et la période.
  let libelleLigne = "";
  try {
    const l = await pennylane(`/customer_invoices/${texte(inv.id)}/invoice_lines`);
    libelleLigne = texte(((l.items as Dict[]) ?? [])[0]?.label);
  } catch { /* sans ligne lisible on se contente du reste */ }

  if (/^\s*loyer\b/i.test(libelleLigne)) { champs["Catégorie"] = "Loyer"; trouve.push("catégorie"); }
  const per = libelleLigne.match(/du\s+(\d{2}\/\d{2}\/\d{2,4})\s+au\s+(\d{2}\/\d{2}\/\d{2,4})/i);
  const debut = per ? isoDepuisFr(per[1]) : null;
  const fin = per ? isoDepuisFr(per[2]) : null;
  if (debut && fin && debut < fin) {
    champs["Période facturée début"] = debut;
    champs["Période facturée fin"] = fin;
    trouve.push("période");
  }

  // 2. Le client Pennylane désigne le payeur. Personne physique → occupant ;
  //    personne morale → client final, puis agence.
  const refClient = (inv.customer as Dict | undefined)?.id;
  if (!refClient) return { champs, trouve };
  let cli: Dict;
  try { cli = await pennylane(`/customers/${texte(refClient)}`); }
  catch { return { champs, trouve }; }

  const physique = texte(cli.customer_type) === "individual";
  let occupant: Dict | null = null;

  if (physique) {
    const nom = clef(cli.last_name), prenom = clef(cli.first_name);
    if (nom) {
      const occs = await toutesLesLignes(T_OCCUPANTS, ["Nom", "Prénom", "Pennylane customer ID"]);
      occupant = unique(occs.filter((o) => {
        const f = o.fields as Dict;
        return clef(f["Nom"]) === nom && (!prenom || clef(f["Prénom"]) === prenom);
      }));
      if (occupant) {
        champs["Occupant lié"] = [texte(occupant.id)];
        trouve.push("occupant");
        // L'identifiant client Pennylane devient réutilisable pour une facture
        // émise depuis Airtable : on le range s'il manque.
        if (!(occupant.fields as Dict)["Pennylane customer ID"]) {
          await airtable("PATCH", T_OCCUPANTS, { records: [{ id: texte(occupant.id),
            fields: { "Pennylane customer ID": Number(refClient) } }] }).catch(() => {});
        }
      }
    }
  } else {
    const nom = clef(cli.name);
    if (nom) {
      const cfs = await toutesLesLignes(T_CLIENT_FINAL, ["Nom client final"]);
      const cf = unique(cfs.filter((c) => clef((c.fields as Dict)["Nom client final"]) === nom));
      if (cf) { champs["Client final liée"] = [texte(cf.id)]; trouve.push("client final"); }
      else {
        const ags = await toutesLesLignes(T_AGENCES, ["Nom agence"]);
        const ag = unique(ags.filter((a) => clef((a.fields as Dict)["Nom agence"]) === nom));
        if (ag) {
          champs["Agence liée"] = [texte(ag.id)];
          trouve.push(`agence (${texte((ag.fields as Dict)["Nom agence"])})`);
        }
      }
    }
  }

  // 3. Le séjour, seulement si l'occupant est identifié ET qu'un seul de ses
  //    séjours recouvre la période facturée. Deux séjours qui se chevauchent :
  //    on ne tranche pas à sa place.
  if (occupant && debut && fin) {
    // Noms réels des champs sur Réservations : « Date d'arrivée »/« Date de départ »
    // n'existent pas et faisaient répondre 422 à Airtable — toute l'identification
    // automatique du séjour était perdue.
    const resas = await toutesLesLignes(T_RESAS, ["Code réservation", "Date d'entrée", "Date de sortie", "Occupant"]);
    const oid = texte(occupant.id);
    const candidates = resas.filter((r) => {
      const f = r.fields as Dict;
      const lien = (f["Occupant"] as string[] | undefined) ?? [];
      if (!lien.includes(oid)) return false;
      const a = texte(f["Date d'entrée"]).slice(0, 10), d = texte(f["Date de sortie"]).slice(0, 10);
      return !!a && !!d && a <= fin && d >= debut;
    });
    const resa = unique(candidates);
    if (resa) { champs["Réservation liée"] = [texte(resa.id)]; trouve.push("réservation"); }
  }

  return { champs, trouve };
}


// Rattrapage : les factures déjà importées à nu (avant l'identification automatique,
// ou parce que Pennylane n'en disait pas assez à l'époque) sont repassées à la
// moulinette. On ne touche QUE les champs vides — jamais une saisie de Vincent.
async function rattraper(simulation: boolean) {
  const q = new URLSearchParams({ pageSize: "100" });
  q.set("filterByFormula",
    "AND(FIND('sync auto', {Notes}), {Occupant lié}=BLANK(), {Client final liée}=BLANK(), {Agence liée}=BLANK())");
  const nues = ((await airtable("GET", `${T_FACTURES}?${q}`)).records as Dict[]) ?? [];
  const faits: string[] = [];
  for (const f of nues) {
    const champsFac = f.fields as Dict;
    const num = texte(champsFac["Numéro facture"]);
    const plId = /invoice_id=(\d+)/.exec(texte(champsFac["Lien Pennylane"]))?.[1];
    if (!plId) { faits.push(`${num} — pas de lien Pennylane exploitable`); continue; }
    try {
      const inv = await pennylane(`/customer_invoices/${plId}`);
      const { champs, trouve } = await identifier(inv);
      if (!trouve.length) { faits.push(`${num} — rien d'identifiable`); continue; }
      // Ne combler que les cases vides : une valeur saisie à la main fait foi, même
      // si notre déduction tombe juste. Réécrire par-dessus, c'est prendre le risque
      // d'effacer une correction sans que personne ne s'en aperçoive.
      const aEcrire: Dict = {};
      for (const [k, v] of Object.entries(champs)) {
        const actuel = champsFac[k];
        const vide = actuel == null || actuel === "" || (Array.isArray(actuel) && actuel.length === 0);
        if (vide) aEcrire[k] = v;
      }
      if (!Object.keys(aEcrire).length) { faits.push(`${num} — déjà renseigné, rien à ajouter`); continue; }
      if (!simulation) await airtable("PATCH", T_FACTURES, { records: [{ id: texte(f.id), fields: aEcrire }] });
      faits.push(`${num} — ${Object.keys(aEcrire).join(", ")}`);
    } catch (e) {
      faits.push(`${num} — échec : ${e instanceof Error ? e.message : e}`);
    }
  }
  return faits;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const force = url.searchParams.get("force") === "1";
  // Le contrôle du jeton vient AVANT tout mode : « ?rattraper=1 » lit Pennylane avec la
  // clé de Vercel et écrit dans Airtable, il ne doit jamais être joignable sans CRON_SECRET.
  const auth = request.headers.get("authorization");
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (url.searchParams.get("rattraper")) {
    const faits = await rattraper(url.searchParams.get("rattraper") === "simulation");
    return NextResponse.json({ ok: true, rattrapage: faits });
  }
  if (!PL_KEY) {
    await monitoring("ALERTE", "PENNYLANE_API_KEY absente : la sync ne tourne pas.");
    return NextResponse.json({ ok: false, erreur: "PENNYLANE_API_KEY absente" }, { status: 500 });
  }

  try {
    const connus = await idsConnus();
    const depuis = new Date(Date.now() - FENETRE_H * 3600_000).toISOString().slice(0, 19);
    const recentes = await listePennylane(`&created_after=${encodeURIComponent(depuis)}`);

    const ignorees = { brouillons: 0, avoirs: 0, internes: 0, grace: 0, anterieures: 0, vides: 0 };
    const aImporter: Dict[] = [];
    for (const inv of recentes) {
      const id = texte(inv.id);
      if (!id || connus.has(id)) continue;
      const label = texte(inv.label);
      if (texte(inv.status) === "draft" || inv.draft === true) { ignorees.brouillons++; continue; }
      // Sondé le 28/08 sur l'API réelle : un avoir se signale par status="credit_note",
      // et son montant peut être POSITIF — le seul test du signe le laissait passer.
      if (texte(inv.status) === "credit_note" || texte(inv.invoice_type) === "credit_note" || montant(inv.currency_amount ?? inv.amount) < 0) { ignorees.avoirs++; continue; }
      if (estInterne(label) || estEmiseParLaRoute(inv)) { ignorees.internes++; continue; }
      // SANS NUMÉRO ET À 0 € : un artefact de Pennylane, jamais une vraie facture.
      // Trois d'entre elles (28/08) polluaient la table sans montant ni client ; elles
      // passent tous les autres filtres parce qu'elles sont récentes et finalisées.
      if (!texte(inv.invoice_number) && montant(inv.currency_amount ?? inv.amount) === 0) { ignorees.vides++; continue; }
      // ANTÉRIEURES À LA MISE EN SERVICE : jamais. Le paramètre created_after étant
      // ignoré par l'API v2, ce cron balaie en réalité TOUT l'historique Pennylane à
      // chaque passage. Le 28/08 il a donc importé 531 factures de 2025 — un exercice
      // clos, sans réservation ni client rattachés, qui n'a rien à faire dans l'outil
      // de pilotage. Elles ont été supprimées le 29/08 ; ce filtre est ce qui les
      // empêche de revenir au passage suivant. On se fie à la date de la FACTURE,
      // pas à sa date de création chez Pennylane : une facture de 2025 saisie
      // tardivement reste une facture de 2025.
      if (texte(inv.date) < MISE_EN_SERVICE) { ignorees.anterieures++; continue; }
      const cree = Date.parse(texte(inv.created_at) || texte(inv.date));
      // « force » : lever l'heure de grâce pour une facture créée À LA MAIN dans
      // Pennylane, qui n'attend aucun lien Airtable et n'a donc aucune raison de
      // patienter. À n'utiliser que manuellement — automatisé, il réintroduirait
      // exactement les doublons que la grâce évite.
      if (!force && Number.isFinite(cree) && Date.now() - cree < GRACE_MS) { ignorees.grace++; continue; }
      aImporter.push(inv);
    }

    // Garde-fou de volume : un import normal, c'est quelques factures par heure. Au-delà,
    // quelque chose a changé côté Pennylane et on préfère alerter que déverser en masse.
    if (aImporter.length > PLAFOND_IMPORT) {
      await slack(CANAL_ERREURS,
        `*Sync Pennylane suspendue* — ${aImporter.length} factures à importer d'un coup ` +
        `(plafond ${PLAFOND_IMPORT}). Rien n'a été écrit : à regarder avant de débloquer.`);
      await monitoring("ALERTE", `${aImporter.length} factures à importer d'un coup — import suspendu.`);
      return NextResponse.json({ ok: false, suspendu: aImporter.length });
    }

    const importees: string[] = [];
    for (const inv of aImporter) {
      const id = texte(inv.id);
      const client = texte((inv.customer as Dict)?.name) || texte((inv.customer as Dict)?.company_name);
      const num = texte(inv.invoice_number);
      const paye = texte(inv.status) === "paid" || inv.paid === true;
      // Ce qui peut être identifié l'est ; une identification qui échoue n'empêche
      // jamais l'import — mieux vaut une facture nue qu'une facture absente.
      let devine: { champs: Dict; trouve: string[] } = { champs: {}, trouve: [] };
      try { devine = await identifier(inv); } catch { /* import quand même */ }
      await airtable("POST", T_FACTURES, {
        records: [{ fields: {
          "Catégorie": "Autre",
          ...devine.champs,
          Type: "Facture",
          Statut: paye ? "Payée" : "Envoyée",
          "Montant total HT": montant(inv.currency_amount_before_tax ?? inv.amount ?? inv.currency_amount),
          "Date d'envoi": texte(inv.date) || new Date().toISOString().slice(0, 10),
          "Lien Pennylane": `https://app.pennylane.com/companies/22414705/clients/customer_invoices?invoice_id=${id}&subtab=all`,
          Notes: `Importée de Pennylane (sync auto) — ${num || "sans numéro"} — ${texte(inv.label).slice(0, 140)}${client ? ` — client : ${client}` : ""}`,
        }}],
        typecast: true,
      });
      importees.push(`• ${num || id} — ${montant(inv.currency_amount ?? inv.amount).toLocaleString("fr-FR")} €${client ? ` — ${client}` : ""}`
        + (devine.trouve.length ? `\n   ↳ reconnu : ${devine.trouve.join(", ")}` : "\n   ↳ rien reconnu — à compléter à la main"));
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
        if (estEmiseParLaRoute(inv)) return false;
        if (!texte(inv.invoice_number) && montant(inv.currency_amount ?? inv.amount) === 0) return false;
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
        `${ignorees.brouillons} brouillon(s), ${ignorees.avoirs} avoir(s), ${ignorees.internes} interne(s), ` +
        `${ignorees.anterieures} antérieure(s) à la mise en service, ${ignorees.vides} vide(s), `+
        `${ignorees.grace} en grâce.`);
    }

    return NextResponse.json({ ok: true, importees: importees.length, ignorees, backlog });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await monitoring("ALERTE", `Sync en échec : ${msg}`);
    await slack(CANAL_ERREURS, `:rotating_light: *Sync Pennylane → Airtable en échec*\n${msg}`);
    return NextResponse.json({ ok: false, erreur: msg }, { status: 500 });
  }
}
