import { NextResponse } from "next/server";

// Pilotage financier mois par mois — alimente deux tables Airtable, chaque nuit.
//
//   « Finance mensuelle »               : 1 ligne par mois, la vue direction.
//   « Loyers propriétaires à verser »   : 1 ligne par appartement et par mois, le suivi des virements.
//
// RÈGLE DU CA (validée avec Vincent le 22/08/2026) — chaque montant est rattaché aux mois
// qu'il COUVRE, jamais à sa date d'émission :
//
//     CA du mois = Σ factures couvrant ces jours  +  prix nuitée × jours NON encore facturés
//
// Le calcul se fait au jour près : une facture qui ne couvre qu'une partie du mois ne doit pas
// annuler le reste du séjour. Les factures partent le 28 avec un cycle M+1 ou M+2, donc en cours
// de mois une bonne part du CA n'est pas encore facturée : la part estimée comble le trou et se
// réduit toute seule à mesure que la facturation rattrape. Le champ « % facturé » dit à quel point
// la ligne est certaine.
//
// RÈGLE DU LOYER PROPRIÉTAIRE — reprise à l'identique du workflow n8n « 6.2 Récap mensuel paiements
// propriétaires » de Tech Tribe, pour que les deux chemins de calcul se contrôlent mutuellement :
//
//     Montant à virer = Loyer propriétaire / mois × nuitées occupées ÷ jours du mois
//
// Le loyer suit l'occupation : pas de réservation sur un appartement, rien de dû. Et quand deux
// réservations se chevauchent sur le même appartement, les intervalles sont FUSIONNÉS avant calcul,
// pour ne jamais payer deux fois la même nuit.
//
// STATUT ET DATE DE PAIEMENT (règles revues le 28/08/2026, GO Vincent — « bloc A ») :
// « Statut » appartient à Vincent, avec trois automatismes précis et rien d'autre :
//   1. « En attente » devient « À payer » quand le mois arrive (bascule historique) ;
//   2. un mois PASSÉ non payé devient « Rattrapage » et remonte dans le lot en cours
//      via « Mois de règlement » — le champ « Mois », vérité comptable, ne bouge jamais ;
//   3. quand Vincent passe une ligne à « Payé », la « Date de paiement » se remplit au
//      premier passage du cron (heure suivante) si elle est vide, puis n'est plus jamais
//      touchée, et « Mois de règlement » se fige sur le mois du paiement.
// « Payé » lui-même n'est JAMAIS écrit par le cron.

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const AT_BASE = process.env.AIRTABLE_BASE_ID || "";
const AT_TOKEN = process.env.AIRTABLE_WATCHDOG_TOKEN || "";
const SLACK_TOKEN = process.env.SLACK_BOT_TOKEN_MIP || "";
const SLACK_CHANNEL = "C0BC1NZGWRM"; // #automatisations_failures — les erreurs
const SLACK_LOYERS = "C0BCF50TN78"; // #propriétaires — le récap mensuel des virements

const T_APPARTEMENTS = "tbltFlpzQWXjoWg88";
const T_RESERVATIONS = "tbl5uN32egP4YCvUi";
const T_FACTURES = "tblC97ei6ZPWhWUwe";
const T_FINANCE = "tbleTNIQZjch1WQ6O";
const T_LOYERS = "tblLnbrAH1AfVvTb7";
const T_CHARGES = "tble8Op6dPxj0N94t";
const T_ANNEE = "tblTOg5qWyjdlRvy9";
const T_INTERVENTIONS = "tblUjK6taP6ti0kGa";
const T_MONITORING = "tblDEkjIyKoKJG5Yj";

// Réservations qui engagent un loyer propriétaire et génèrent du CA.
const STATUTS_RESA = ["Contrat signé", "En cours", "Check-out", "Clôturée"];
// Appartements pour lesquels MIP est engagé auprès du propriétaire.
const STATUTS_PARC = ["Actif", "Contrat signé"];

// Ces charges sont DÉJÀ COMPRISES dans « Loyer propriétaire / mois » (confirmé par Vincent
// le 22/08/2026 : « le propriétaire reçoit par exemple 2800 € qui inclut toutes les charges »).
// Preuve dans la donnée : sur 44 appartements sur 46, « Loyer propriétaire / mois » moins
// « Loyer propriétaire HC (€) » vaut exactement la somme de ces champs. Elles ne sont donc
// JAMAIS ajoutées au virement ni retranchées de la marge : on ne les calcule que pour dire
// quelle part du loyer versé couvre les charges.
const CHAMPS_CHARGES = [
  "Charges électriques",
  "Charges gaz",
  "Charges TOEM",
  "Charges immeuble",
  "Charges internet",
  "Abonnement canal",
  "Entretien chaudière",
];

// Fenêtre de calcul. En arrière, on ne descend jamais avant la mise en service : les mois
// antérieurs ne contenaient que trois ou quatre baux longs et donnaient une image fausse.
// L'histoire d'avant vient des liasses fiscales, saisie à la main dans « Finance annuelle ».
// En avant, trois mois : au-delà, un montant n'est plus une prévision mais un maximum
// contractuel — les baux longs sont résiliables avec un mois de préavis.
const MOIS_APRES = 3;

// Premier mois calculé. C'était « 2026-07 », la mise en service de la facturation dans
// Airtable : avant, seuls les baux longs y étaient saisis, et lire ces mois-là comme une
// performance n'aurait eu aucun sens.
//
// Ramené à janvier le 29/08/2026 : les 488 factures du fichier FACTURATION 2026, émises
// hors plateforme de janvier à septembre, ont été importées. L'année est donc complète,
// et la borne de juillet amputait le CA des six premiers mois — la table n'affichait que
// 5 mois couverts. Ne pas remonter au-delà de janvier 2026 : 2025 relève d'un exercice
// clos, dont les factures ont été volontairement sorties d'Airtable.
const MISE_EN_SERVICE = "2026-01";
// Valeur du champ « Source » de Finance mensuelle portée par les lignes historiques (registre 2025-2026).
const HISTORIQUE_REGISTRE = "Historique registre 2025-2026";
// Premier mois entièrement facturé sur la plateforme. Avant, le registre de facturation
// (table « Historique factures ») fait foi : son CA du mois est écrit dans « CA facturé
// (registre) » et remplace le calcul plateforme, qui ne voyait qu'une poignée de factures.
const PLATEFORME_COMPLETE = "2026-09";

const NOMS_MOIS = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];

type Rec = { id: string; fields: Record<string, unknown> };

const first = (v: unknown): unknown => (Array.isArray(v) ? v[0] : v);
const nombre = (v: unknown): number => (typeof v === "number" ? v : 0);
const texte = (v: unknown): string => {
  const x = first(v);
  return typeof x === "string" ? x : "";
};
const liens = (v: unknown): string[] => (Array.isArray(v) ? (v as string[]) : []);
const arrondi = (n: number, d = 2) => Math.round(n * 10 ** d) / 10 ** d;

// Date calendaire de Paris : un virement se date au jour de Vincent, jamais en UTC.
// Seule limite assumée : un statut passé à « Payé » entre 23h31 et minuit sera daté
// du lendemain par le passage suivant du cron.
const aujourdhuiParis = (): string => {
  const p = new Intl.DateTimeFormat("fr-FR", {
    timeZone: "Europe/Paris", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(new Date());
  const g = Object.fromEntries(p.map((x) => [x.type, x.value]));
  return `${g.year}-${g.month}-${g.day}`;
};
const heureParis = (): number =>
  parseInt(new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", hour: "2-digit", hour12: false })
    .format(new Date()), 10);

// ── Écritures sélectives (28/08/2026) ────────────────────────────────────────
// Le cron passe désormais toutes les heures : réécrire les ~160 lignes de loyers
// et les 5 mois à chaque passage multiplierait par 24 des écritures qui ne
// changent rien, pollueraient l'historique de révision Airtable et rapprocheraient
// du quota API. On ne PATCHe une ligne que si un champ UTILE a changé —
// « Dernier calcul » n'est pas un champ utile, c'est un horodatage : il ne
// justifie jamais une écriture à lui seul.
const memeValeur = (a: unknown, b: unknown): boolean => {
  const vide = (x: unknown) =>
    x === null || x === undefined || x === "" || x === false || (Array.isArray(x) && x.length === 0);
  if (vide(a) && vide(b)) return true;
  if (Array.isArray(a) || Array.isArray(b)) return JSON.stringify(a ?? []) === JSON.stringify(b ?? []);
  if (typeof a === "number" || typeof b === "number") return Math.abs(Number(a ?? 0) - Number(b ?? 0)) < 0.005;
  return String(a) === String(b);
};
const champsChangent = (
  exist: Record<string, unknown>, fields: Record<string, unknown>, ignorer: string[] = ["Dernier calcul"],
): boolean => {
  for (const k of Object.keys(fields)) {
    if (ignorer.includes(k)) continue;
    if (!memeValeur(exist[k], fields[k])) return true;
  }
  return false;
};

async function slack(text: string, canal: string = SLACK_CHANNEL) {
  if (!SLACK_TOKEN) return;
  try {
    await fetch("https://slack.com/api/chat.postMessage", {
      method: "POST",
      headers: { Authorization: `Bearer ${SLACK_TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify({ channel: canal, text }),
    });
  } catch {
    /* une alerte qui échoue ne doit pas faire tomber le calcul */
  }
}

async function lireTable(tableId: string): Promise<Rec[]> {
  const out: Rec[] = [];
  let offset: string | undefined;
  do {
    const url = new URL(`https://api.airtable.com/v0/${AT_BASE}/${tableId}`);
    url.searchParams.set("pageSize", "100");
    if (offset) url.searchParams.set("offset", offset);
    const r = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${AT_TOKEN}` },
      cache: "no-store",
    });
    if (!r.ok) throw new Error(`lecture ${tableId} : HTTP ${r.status}`);
    const j = (await r.json()) as { records?: Rec[]; offset?: string };
    out.push(...(j.records || []));
    offset = j.offset;
  } while (offset);
  return out;
}

async function ecrire(tableId: string, method: "POST" | "PATCH", records: unknown[]) {
  for (let i = 0; i < records.length; i += 10) {
    const lot = records.slice(i, i + 10);
    const r = await fetch(`https://api.airtable.com/v0/${AT_BASE}/${tableId}`, {
      method,
      headers: { Authorization: `Bearer ${AT_TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify({ records: lot, typecast: true }),
    });
    if (!r.ok) {
      const detail = await r.text();
      throw new Error(`écriture ${tableId} : HTTP ${r.status} — ${detail.slice(0, 300)}`);
    }
  }
}

// ---------------------------------------------------------------- verrou
// Le webhook Airtable réveille ce calcul à CHAQUE modification d'une table finance
// (voir /api/airtable-webhook). Le 01/09/2026, six modifications en cent secondes ont
// lancé six calculs concurrents : chacun a lu les loyers encore « En attente », les a
// basculés à « À payer » et a posté le récap mensuel. Vincent a reçu six fois le même
// message dans #propriétaires. Même remède que la projection des ménages : un seul
// passage à la fois. Ce n'est pas un mutex parfait — Airtable n'a pas d'opération
// atomique — mais les rafales de webhooks sont espacées de centaines de millisecondes.
// Le verrou expire seul : une fonction tuée en vol ne gèle pas la finance.
const VERROU = "lock:finance-mensuelle";
const VERROU_S = 240;

// Deux passages simultanés qui ne trouvent pas encore la ligne la CRÉENT tous les deux,
// et le verrou ne vaut plus rien : chacun lit la sienne. On tranche donc toujours sur la
// même ligne, celle dont l'identifiant est le plus petit — un critère stable, sur lequel
// tous les passages tombent d'accord sans se parler. Les doublons éventuels sont inertes.
async function ligneVerrou(): Promise<Rec | undefined> {
  const rows = (await lireTable(T_MONITORING))
    .filter((r) => texte(r.fields["Contrôle"]) === VERROU)
    .sort((a, b) => a.id.localeCompare(b.id));
  return rows[0];
}

async function prendreVerrou(): Promise<boolean> {
  try {
    const row = await ligneVerrou();
    const pose = Date.parse(texte(row?.fields["Détail"]).split("#")[0]);
    if (Number.isFinite(pose) && Date.now() - pose < VERROU_S * 1000) return false;
    // Chaque passage signe sa pose. Deux calculs partis dans la même fraction de seconde
    // ont tous deux vu le verrou libre : on écrit, puis on RELIT. Celui dont la signature
    // a survécu garde la main, l'autre renonce. Un simple « lire puis écrire » les
    // laissait passer tous les deux.
    const marque = `${new Date().toISOString()}#${Math.random().toString(36).slice(2, 10)}`;
    const fields = {
      "Contrôle": VERROU,
      Statut: "OK",
      "Détail": marque,
      "Dernière vérification": new Date().toISOString(),
    };
    if (row) await ecrire(T_MONITORING, "PATCH", [{ id: row.id, fields }]);
    else await ecrire(T_MONITORING, "POST", [{ fields }]);
    const ligne = await ligneVerrou();
    return texte(ligne?.fields["Détail"]) === marque;
  } catch {
    return true; // un tableau de bord en panne ne doit pas geler la finance
  }
}

async function libererVerrou() {
  try {
    const row = await ligneVerrou();
    if (row) await ecrire(T_MONITORING, "PATCH", [{ id: row.id, fields: { "Détail": "" } }]);
  } catch { /* il expirera tout seul */ }
}

// Le récap des loyers est un message MENSUEL. Le verrou empêche les rafales, mais la
// mémoire de ce qui a DÉJÀ été annoncé doit survivre au-delà d'un passage : c'est Slack
// qui la porte, on relit le canal avant de poster. En cas de doute (lecture impossible)
// on poste : un récap manquant coûte un virement oublié, un récap en double coûte un clic.
// Dernier filet, celui qui rend la garantie réelle : après publication on relit, et si
// deux calculs partis à la même milliseconde ont posté le même récap, chacun supprime
// tout sauf le plus ancien. Tous convergent sur le même survivant, Vincent en voit un.
async function dedoublonner(titre: string) {
  if (!SLACK_TOKEN) return;
  try {
    const r = await fetch(
      `https://slack.com/api/conversations.history?channel=${SLACK_LOYERS}&limit=30`,
      { headers: { Authorization: `Bearer ${SLACK_TOKEN}` }, cache: "no-store" }
    );
    const j = (await r.json()) as { ok?: boolean; messages?: { ts?: string; text?: string }[] };
    if (!j.ok) return;
    const memes = (j.messages ?? [])
      .filter((m) => (m.text ?? "").startsWith(titre) && m.ts)
      .map((m) => m.ts as string)
      .sort(); // ts croissant : le premier est le plus ancien, c'est lui qu'on garde
    for (const ts of memes.slice(1)) {
      await fetch("https://slack.com/api/chat.delete", {
        method: "POST",
        headers: { Authorization: `Bearer ${SLACK_TOKEN}`, "Content-Type": "application/json" },
        body: JSON.stringify({ channel: SLACK_LOYERS, ts }),
      });
    }
  } catch { /* un doublon visible vaut mieux qu'un calcul qui tombe */ }
}

async function dejaAnnonce(titre: string): Promise<boolean> {
  if (!SLACK_TOKEN) return false;
  try {
    const r = await fetch(
      `https://slack.com/api/conversations.history?channel=${SLACK_LOYERS}&limit=60`,
      { headers: { Authorization: `Bearer ${SLACK_TOKEN}` }, cache: "no-store" }
    );
    const j = (await r.json()) as { ok?: boolean; messages?: { text?: string }[] };
    if (!j.ok) return false;
    return (j.messages ?? []).some((m) => (m.text ?? "").startsWith(titre));
  } catch {
    return false;
  }
}

async function supprimer(tableId: string, ids: string[]) {
  for (let i = 0; i < ids.length; i += 10) {
    const url = new URL(`https://api.airtable.com/v0/${AT_BASE}/${tableId}`);
    for (const id of ids.slice(i, i + 10)) url.searchParams.append("records[]", id);
    const r = await fetch(url.toString(), { method: "DELETE", headers: { Authorization: `Bearer ${AT_TOKEN}` } });
    if (!r.ok) throw new Error(`suppression ${tableId} : HTTP ${r.status}`);
  }
}

// ---------------------------------------------------------------- dates
// Tout se calcule en dates civiles pures (midi UTC) : pas de piège d'heure d'été.
const jour = (s: string) => new Date(`${s.slice(0, 10)}T12:00:00Z`);
const iso = (d: Date) => d.toISOString().slice(0, 10);
const ajouteJours = (d: Date, n: number) => new Date(d.getTime() + n * 86400000);
const ecartJours = (a: Date, b: Date) => Math.round((b.getTime() - a.getTime()) / 86400000);
const debutMois = (a: number, m: number) => new Date(Date.UTC(a, m, 1, 12));
const cle = (a: number, m: number) => `${a}-${String(m + 1).padStart(2, "0")}`;
const jjmm = (d: Date) => `${String(d.getUTCDate()).padStart(2, "0")}/${String(d.getUTCMonth() + 1).padStart(2, "0")}`;

export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const debut = Date.now();

  // Un seul calcul à la fois : voir VERROU plus haut. Le passage refusé ne perd rien,
  // le filet horaire et le prochain webhook repasseront.
  if (!(await prendreVerrou())) {
    return NextResponse.json({ ok: true, ignore: "un calcul est déjà en cours" });
  }

  try {
    const [appartements, reservations, factures, financeExistant, loyersExistants, chargesFixes] =
      await Promise.all([
        lireTable(T_APPARTEMENTS),
        lireTable(T_RESERVATIONS),
        lireTable(T_FACTURES),
        lireTable(T_FINANCE),
        lireTable(T_LOYERS),
        lireTable(T_CHARGES),
      ]);
    const interventions = await lireTable(T_INTERVENTIONS);
    const anneesExistantes = await lireTable(T_ANNEE);

    const parAppartement = new Map(appartements.map((a) => [a.id, a]));
    const maintenant = new Date();
    const moisCourant = { a: maintenant.getUTCFullYear(), m: maintenant.getUTCMonth() };

    // ------------------------------------------------------------ factures
    // Chaque facture est ventilée sur les mois de sa période facturée, au prorata des jours,
    // en gardant trace des JOURS couverts : c'est ce qui permet de ne pas doubler le CA plus bas.
    type Ventil = { montant: number; jours: Set<string> };
    const factParResa = new Map<string, Map<string, Ventil>>();
    const factOrphelines = new Map<string, number>();
    const factRefs = new Map<string, Set<string>>();
    // Ce qu'on nous doit : même ventilation que le CA facturé, mais restreinte aux factures
    // non encaissées. « Envoyée » = partie chez le client, pas encore payée.
    const encoursParMois = new Map<string, number>();
    const encoursVieuxParMois = new Map<string, number>();
    const impayeesParMois = new Map<string, Set<string>>();
    const AUJOURDHUI = new Date();

    for (const f of factures) {
      const champs = f.fields;
      // Une facture annulée ne compte ni au CA ni à l'encours, et l'annulation se lit sur
      // TROIS marqueurs — les mêmes que controleNuitsDoubles du watchdog, qui les teste déjà
      // tous les trois. Ne tester que le Type laissait passer les factures neutralisées à la
      // main : celles du 24/08 et du 28/08 ont reçu Statut « Avoir » en gardant Type
      // « Facture », et gonflaient donc le CA de 3 458 € en septembre et 3 625 € sur
      // septembre-octobre.
      if (texte(champs["Type"]) === "Avoir") continue;
      if (texte(champs["Statut"]) === "Avoir") continue;
      if (liens(champs["From field: Avoir associé"]).length) continue;
      const montant = nombre(champs["Montant total HT"]);
      const d1 = texte(champs["Période facturée début"]);
      const d2 = texte(champs["Période facturée fin"]);
      const resa = liens(champs["Réservation liée"])[0];

      // Une facture « Envoyée » n'est pas encore encaissée. On date son ancienneté sur la date
      // d'envoi quand elle existe (19 factures sur 44 au 22/08), sinon sur le début de période.
      const impayee = texte(champs["Statut"]) === "Envoyée";
      const dateAge = texte(champs["Date d'envoi"]) || d1;
      const vieille =
        impayee && dateAge ? ecartJours(jour(dateAge), AUJOURDHUI) > 30 : false;
      const noteEncours = (k: string, part: number) => {
        if (!impayee) return;
        encoursParMois.set(k, (encoursParMois.get(k) || 0) + part);
        if (vieille) encoursVieuxParMois.set(k, (encoursVieuxParMois.get(k) || 0) + part);
        if (!impayeesParMois.has(k)) impayeesParMois.set(k, new Set());
        impayeesParMois.get(k)!.add(f.id);
      };

      if (d1 && d2) {
        const a = jour(d1);
        const b = jour(d2);
        const total = Math.max(1, ecartJours(a, b) + 1);
        for (let c = a; c <= b; c = ajouteJours(c, 1)) {
          const k = cle(c.getUTCFullYear(), c.getUTCMonth());
          if (!factRefs.has(k)) factRefs.set(k, new Set());
          factRefs.get(k)!.add(f.id);
          noteEncours(k, montant / total);
          if (resa) {
            if (!factParResa.has(resa)) factParResa.set(resa, new Map());
            const parMois = factParResa.get(resa)!;
            if (!parMois.has(k)) parMois.set(k, { montant: 0, jours: new Set() });
            const v = parMois.get(k)!;
            v.montant += montant / total;
            v.jours.add(iso(c));
          } else {
            factOrphelines.set(k, (factOrphelines.get(k) || 0) + montant / total);
          }
        }
      } else {
        // Transferts et interventions ponctuels : pas de période, on retient la date d'envoi.
        const envoi = texte(champs["Date d'envoi"]);
        if (!envoi) continue;
        const d = jour(envoi);
        const k = cle(d.getUTCFullYear(), d.getUTCMonth());
        factOrphelines.set(k, (factOrphelines.get(k) || 0) + montant);
        if (!factRefs.has(k)) factRefs.set(k, new Set());
        factRefs.get(k)!.add(f.id);
        noteEncours(k, montant);
      }
    }

    // ------------------------------------------------------------ fenêtre de calcul
    const moisList: { a: number; m: number; k: string }[] = [];
    for (let i = -60; i <= MOIS_APRES; i++) {
      const d = debutMois(moisCourant.a, moisCourant.m + i);
      const k = cle(d.getUTCFullYear(), d.getUTCMonth());
      if (k < MISE_EN_SERVICE) continue;
      moisList.push({ a: d.getUTCFullYear(), m: d.getUTCMonth(), k });
    }

    type Ligne = {
      k: string;
      a: number;
      m: number;
      registre?: number;
      caFacture: number;
      caHorsPerimetre: number;
      caEstime: number;
      loyers: number;
      charges: number;
      nuiteesVendues: number;
      nuiteesDispo: number;
      apptsLoues: number;
      apptsParc: number;
      refAppts: string[];
      refResas: string[];
      refFacts: string[];
      loyersDetail: {
        apptId: string;
        code: string;
        nuits: number;
        joursMois: number;
        loyerPlein: number;
        montant: number;
        charges: number;
        resas: string[];
        proprio: string[];
        periode: string;
      }[];
    };

    const lignes: Ligne[] = [];

    for (const { a, m, k } of moisList) {
      const d1 = debutMois(a, m);
      const d2 = debutMois(a, m + 1); // borne exclusive
      const joursMois = ecartJours(d1, d2);

      let caFacture = 0;
      let caEstime = 0;
      let nuiteesVendues = 0;
      const intervalles = new Map<string, [Date, Date][]>();
      const resasDuMois = new Set<string>();

      for (const r of reservations) {
        const champs = r.fields;
        if (!STATUTS_RESA.includes(texte(champs["Statut"]))) continue;
        const entreeTxt = texte(champs["Date d'entrée"]);
        if (!entreeTxt) continue;
        const entree = jour(entreeTxt);
        const sortieTxt = texte(champs["Date de sortie"]);
        const sortie = sortieTxt ? jour(sortieTxt) : d2; // bail long sans fin : borne au mois
        if (!(entree < d2 && sortie > d1)) continue;

        const a1 = entree > d1 ? entree : d1;
        const b1 = sortie < d2 ? sortie : d2;
        const nuits = ecartJours(a1, b1);
        if (nuits <= 0) continue;

        resasDuMois.add(r.id);
        nuiteesVendues += nuits;

        const ventil = factParResa.get(r.id)?.get(k);
        caFacture += ventil?.montant || 0;

        // Jours du séjour dans ce mois qu'aucune facture ne couvre encore.
        let joursNonFactures = 0;
        for (let c = a1; c < b1; c = ajouteJours(c, 1)) {
          if (!ventil?.jours.has(iso(c))) joursNonFactures++;
        }
        caEstime += joursNonFactures * nombre(champs["Prix nuitée HT"]);

        const apptId = liens(champs["Appartement"])[0];
        if (apptId) {
          if (!intervalles.has(apptId)) intervalles.set(apptId, []);
          intervalles.get(apptId)!.push([a1, b1]);
        }
      }

      // CA SANS COÛTS CONNUS. Une facture sans réservation liée n'a aucun loyer
      // propriétaire en face : ce sont les 488 factures du fichier FACTURATION 2026,
      // émises hors plateforme. Les compter dans le CA est juste — c'est du vrai
      // chiffre d'affaires — mais les compter dans la MARGE ne l'est pas : on
      // soustrairait des coûts qui ne couvrent qu'une partie du périmètre, et août
      // affichait ainsi 72 % de marge dans un métier qui en fait 17 à 29 %.
      const caHorsPerimetre = arrondi(factOrphelines.get(k) || 0);
      caFacture += caHorsPerimetre;

      // Loyers propriétaires : fusion des intervalles avant prorata.
      let loyers = 0;
      let charges = 0;
      const loyersDetail: Ligne["loyersDetail"] = [];

      for (const [apptId, brut] of intervalles) {
        const appt = parAppartement.get(apptId);
        if (!appt) continue;
        brut.sort((x, y) => x[0].getTime() - y[0].getTime());
        const fusionnes: [Date, Date][] = [];
        for (const [deb, fin] of brut) {
          const dernier = fusionnes[fusionnes.length - 1];
          if (dernier && deb <= dernier[1]) {
            if (fin > dernier[1]) dernier[1] = fin;
          } else {
            fusionnes.push([deb, fin]);
          }
        }
        const nuits = fusionnes.reduce((s, [deb, fin]) => s + ecartJours(deb, fin), 0);
        const loyerPlein = nombre(appt.fields["Loyer propriétaire / mois"]);
        const chargesPleines = CHAMPS_CHARGES.reduce((s, c) => s + nombre(appt.fields[c]), 0);
        const montant = arrondi((loyerPlein * nuits) / joursMois);
        const chargesProrata = arrondi((chargesPleines * nuits) / joursMois);
        loyers += montant;
        charges += chargesProrata;

        // Décompte hôtelier : une nuit = un coucher. Le jour du départ n'est pas une nuit.
        // Nuits = date de sortie − date d'entrée. Une résa du 01/09 au 01/10 fait donc 30 nuitées,
        // celles du 01/09 au 30/09 inclus. D'où le retrait d'un jour à l'affichage et le mot
        // « inclus » : sans lui, « du 01/07 au 31/07 (31 nuits) » se lit comme un départ le 31.
        // Un locataire encore présent le 1er août a bien dormi 31 nuits en juillet.
        // Format voulu par Vincent, volontairement court : « du 01/09 au 30/09 (30 nuits) ».
        const bornes = fusionnes
          .map(([deb, fin]) => `du ${jjmm(deb)} au ${jjmm(ajouteJours(fin, -1))} inclus`)
          .join(" et ");
        const periode = `${bornes} (${nuits} ${nuits > 1 ? "nuits" : "nuit"})`;

        loyersDetail.push({
          apptId,
          code: texte(appt.fields["Code appartement"]) || apptId,
          nuits,
          joursMois,
          loyerPlein,
          montant,
          charges: chargesProrata,
          resas: reservations
            .filter((r) => liens(r.fields["Appartement"])[0] === apptId && resasDuMois.has(r.id))
            .map((r) => r.id),
          proprio: liens(appt.fields["Propriétaire"]),
          periode,
        });
      }

      // ── Loyers garantis ─────────────────────────────────────────────────────
      // Certains propriétaires touchent le loyer PLEIN, que l'appartement soit loué ou
      // vide : c'est leur contrat, et MIP porte seul le risque de vacance. Au 02/09/2026 :
      // Nakache (Cardinet), Piaton (rue Marbeuf), Madinier (Batignolles). Le prorata sur
      // les nuitées les sous-payait de 4 958,71 € sur les seuls mois ouverts, et un mois
      // sans réservation ne produisait aucune ligne du tout — le loyer partait en banque
      // sans exister nulle part dans le suivi. La case « Loyer garanti » sur la fiche
      // appartement bascule ce calcul. Les nuitées restent les vraies : ce sont elles qui
      // mesurent l'occupation, on ne truque pas la statistique pour arranger le montant.
      for (const [apptId, appt] of parAppartement) {
        if (appt.fields["Loyer garanti"] !== true) continue;
        const debutBail = texte(appt.fields["Date début contrat"]);
        if (debutBail && jour(debutBail) >= d2) continue; // le bail n'avait pas commencé
        const loyerPlein = nombre(appt.fields["Loyer propriétaire / mois"]);
        if (loyerPlein <= 0) continue;
        const chargesPleines = CHAMPS_CHARGES.reduce((s, c) => s + nombre(appt.fields[c]), 0);
        const existante = loyersDetail.find((d) => d.apptId === apptId);
        if (existante) {
          loyers += loyerPlein - existante.montant;
          charges += chargesPleines - existante.charges;
          existante.montant = loyerPlein;
          existante.charges = chargesPleines;
          existante.periode = `${existante.periode} — loyer garanti, mois plein dû`;
        } else {
          loyers += loyerPlein;
          charges += chargesPleines;
          loyersDetail.push({
            apptId,
            code: texte(appt.fields["Code appartement"]) || apptId,
            nuits: 0,
            joursMois,
            loyerPlein,
            montant: loyerPlein,
            charges: chargesPleines,
            resas: [],
            proprio: liens(appt.fields["Propriétaire"]),
            periode: "loyer garanti, mois plein dû (aucune location ce mois-ci)",
          });
        }
      }

      // Taille du parc au 1er du mois : appartements engagés dont le contrat a commencé.
      const parc = appartements.filter((ap) => {
        if (!STATUTS_PARC.includes(texte(ap.fields["Statut pipeline"]))) return false;
        const dc = texte(ap.fields["Date début contrat"]);
        return !dc || jour(dc) < d2;
      });

      lignes.push({
        k,
        a,
        m,
        caFacture: arrondi(caFacture),
        caHorsPerimetre,
        caEstime: arrondi(caEstime),
        loyers: arrondi(loyers),
        charges: arrondi(charges),
        nuiteesVendues,
        nuiteesDispo: parc.length * joursMois,
        apptsLoues: intervalles.size,
        apptsParc: parc.length,
        refAppts: [...intervalles.keys()],
        refResas: [...resasDuMois],
        refFacts: [...(factRefs.get(k) || [])],
        loyersDetail,
      });
    }

    const horodatage = new Date().toISOString();

    // Interventions à la charge du propriétaire : elles se retiennent sur son loyer.
    // L'information vit sur l'intervention (« Facturable à = Propriétaire »), pas sur la facture :
    // quand le propriétaire paie par déduction, il n'y a pas de facture client à émettre.
    // Une intervention n'est éligible qu'une fois close et chiffrée, et tant qu'elle n'a pas
    // déjà été déduite d'un virement précédent.
    const STATUTS_INTERVENTION_CLOSE = ["Terminée", "Cloturée"];
    const TVA = 1.2;
    // Facture d'intervention rapprochée par réservation + montant, TOUS statuts confondus.
    // Sert de garde-fou : si le propriétaire a déjà réglé sa facture par virement (AUTO-17 la
    // passe alors en « Payée » depuis Pennylane), la retenir AUSSI sur son loyer le ferait
    // payer deux fois. On ne déduit donc que tant que la facture est encore « Envoyée ».
    const factureRapprochee = (interv: Rec): Rec | undefined => {
      const resa = liens(interv.fields["Réservation liée"])[0];
      if (!resa) return undefined;
      const ttc = nombre(interv.fields["Montant facturé intervention (€)"]);
      return factures.find(
        (f) =>
          texte(f.fields["Catégorie"]) === "Intervention" &&
          liens(f.fields["Réservation liée"])[0] === resa &&
          Math.abs(nombre(f.fields["Montant total HT"]) - ttc / TVA) < 1
      );
    };
    const aDeduire = interventions.filter((i) => {
      if (texte(i.fields["Facturable à"]) !== "Propriétaire") return false;
      if (!STATUTS_INTERVENTION_CLOSE.includes(texte(i.fields["Statut"]))) return false;
      if (nombre(i.fields["Montant facturé intervention (€)"]) <= 0) return false;
      if (i.fields["Déduite du loyer"] === true) return false;
      const fac = factureRapprochee(i);
      return !fac || texte(fac.fields["Statut"]) === "Envoyée";
    });
    // Une intervention ne doit être retenue qu'UNE fois. Où, c'est décidé plus bas, une
    // fois les lignes de loyer connues : voir « retenueSur ».
    const dejaAffectee = new Set<string>();

    // Une intervention à la charge du propriétaire encore ouverte, ou close mais pas encore
    // chiffrée, ne PEUT pas être retenue — on ne déduit pas un montant qu'on ne connaît pas.
    // Elle doit malgré tout se voir sur le loyer en cours : sans cela Vincent vire le loyer
    // plein sans savoir qu'il y a quelque chose à récupérer. Au 02/09/2026, onze interventions
    // étaient dans ce cas, sur onze appartements différents.
    const enAttenteChiffrage = interventions.filter((i) => {
      if (texte(i.fields["Facturable à"]) !== "Propriétaire") return false;
      if (i.fields["Déduite du loyer"] === true) return false;
      const close = STATUTS_INTERVENTION_CLOSE.includes(texte(i.fields["Statut"]));
      const chiffree = nombre(i.fields["Montant facturé intervention (€)"]) > 0;
      if (close && chiffree) return false; // celle-ci est déjà déductible, elle passe par aDeduire
      const fac = factureRapprochee(i);
      return !fac || texte(fac.fields["Statut"]) === "Envoyée";
    });
    const enAttenteParAppartement = new Map<string, Rec[]>();
    for (const i of enAttenteChiffrage) {
      const a = liens(i.fields["Appartement"])[0];
      if (a) enAttenteParAppartement.set(a, [...(enAttenteParAppartement.get(a) ?? []), i]);
    }

    // AUTO-33 émet bien une facture quand l'intervention est à la charge du propriétaire, mais
    // il n'écrit pas de lien vers l'intervention : la facture ne porte que « Réservation liée ».
    // On rapproche donc sur trois critères — catégorie Intervention, même réservation, et montant
    // cohérent (le montant de l'intervention est TTC, la facture est HT, soit un rapport de 1,20).
    const factureDeLIntervention = (interv: Rec): Rec | undefined => {
      const resa = liens(interv.fields["Réservation liée"])[0];
      if (!resa) return undefined;
      const ttc = nombre(interv.fields["Montant facturé intervention (€)"]);
      return factures.find(
        (f) =>
          texte(f.fields["Catégorie"]) === "Intervention" &&
          texte(f.fields["Statut"]) === "Envoyée" &&
          liens(f.fields["Réservation liée"])[0] === resa &&
          Math.abs(nombre(f.fields["Montant total HT"]) - ttc / TVA) < 1
      );
    };
    // Quand Vincent coche « Payé » sur un loyer, les interventions qui y étaient retenues
    // sont réputées réglées : on les marque, elles ne réapparaîtront plus sur aucun virement.
    const aSolder: { id: string; fields: Record<string, unknown> }[] = [];
    const facturesASolder: { id: string; fields: Record<string, unknown> }[] = [];

    // Charges de structure : une ligne par charge récurrente, pas par mois. Une charge compte
    // sur un mois si elle avait déjà commencé et n'était pas encore terminée. « Depuis le » vide
    // = a toujours existé ; « Jusqu au » vide = toujours en cours. Ainsi une embauche de mars
    // ne pèse pas sur janvier, et une résiliation ne réécrit pas le passé.
    const chargesDuMois = (d1: Date, d2: Date) =>
      arrondi(
        chargesFixes.reduce((somme, c) => {
          const debut = texte(c.fields["Depuis le"]);
          const fin = texte(c.fields["Jusqu au"]);
          if (debut && jour(debut) >= d2) return somme;
          if (fin && jour(fin) < d1) return somme;
          return somme + nombre(c.fields["Montant mensuel"]);
        }, 0)
      );

    // ------------------------------------------------------------ écriture « Loyers à verser »
    // L'identité d'une ligne de loyer, c'est le couple (mois, appartement) : deux données
    // qui ne bougent jamais. Elle reposait jusqu'ici sur le libellé « Référence », donc sur
    // « Code appartement » — une FORMULE Airtable. Le 29/08/2026 cette formule a gagné le nom
    // de l'appartement pour rendre les barres de recherche utiles, et « APT-093 » est devenu
    // « APT-093 · 2P Etoile 3eme ». Du jour au lendemain plus une seule ligne existante ne se
    // reconnaissait : le calcul en a recréé une par appartement et par mois à côté des
    // anciennes, sans jamais pouvoir les rapprocher. Un libellé sert à lire, jamais à
    // identifier. « Référence » reste écrite à chaque passage, comme simple étiquette.
    // Statut, Date de paiement et Sans déduction ne sont JAMAIS touchés.
    const cleLoyer = (mois: string, apptId: string) => `${mois} · ${apptId}`;
    const cleDeLaLigne = (r: Rec) => cleLoyer(texte(r.fields["Mois"]), liens(r.fields["Appartement"])[0] ?? "");

    // Plusieurs lignes peuvent porter la même clé, pour deux raisons vécues : le changement
    // de libellé ci-dessus, et la rafale du 30/08/2026 où dix calculs lancés en parallèle par
    // le webhook Airtable ont créé 4 760 lignes en une heure — la page annonçait 6,7 M€ à
    // virer au lieu de 442 k€. Le verrou empêche désormais la rafale ; ce bloc-ci répare ce
    // qu'elle a laissé et rendra inoffensif tout accident du même genre : à chaque passage,
    // une seule ligne survit par clé, les autres partent.
    const groupes = new Map<string, Rec[]>();
    for (const r of loyersExistants) {
      const k = cleDeLaLigne(r);
      groupes.set(k, [...(groupes.get(k) ?? []), r]);
    }
    // Ce que Vincent a saisi l'emporte toujours : une ligne passée « Payé » ou portant une
    // date de virement dit quelque chose que le calcul ne sait pas reproduire. À défaut, on
    // garde le calcul le plus récent, puis, à égalité, la plus ancienne — l'originale.
    const humain = (r: Rec) =>
      texte(r.fields["Statut"]) === "Payé" || texte(r.fields["Date de paiement"]) !== "" ? 1 : 0;
    const doublonsASupprimer: string[] = [];
    const loyersParCle = new Map<string, Rec>();
    const survivants: Rec[] = [];
    for (const [k, v] of groupes) {
      const classe = [...v].sort((a, b) => {
        if (humain(a) !== humain(b)) return humain(b) - humain(a);
        const c = texte(b.fields["Dernier calcul"]).localeCompare(texte(a.fields["Dernier calcul"]));
        return c !== 0 ? c : a.id.localeCompare(b.id);
      });
      loyersParCle.set(k, classe[0]);
      survivants.push(classe[0]);
      for (const r of classe.slice(1)) doublonsASupprimer.push(r.id);
    }
    // Purge plafonnée : un accident à cinquante mille lignes ne doit pas faire expirer la
    // fonction et bloquer le nettoyage pour toujours. On en enlève un paquet par passage,
    // le cron horaire finit le travail.
    const PLAFOND_PURGE = 2000;
    const purges = doublonsASupprimer.slice(0, PLAFOND_PURGE);
    if (purges.length) await supprimer(T_LOYERS, purges);
    const creerLoyers: { ref: string; mois: string; fields: Record<string, unknown> }[] = [];
    const majLoyers: { id: string; ref: string; mois: string; fields: Record<string, unknown> }[] = [];
    // Lignes qui viennent de devenir exigibles ce passage-ci : c'est ce qui déclenche
    // la notification Slack, une seule fois, le jour où le mois bascule.
    const basculees: string[] = [];
    const clesLoyersAttendues = new Set<string>();
    // Totaux par mois, pour alimenter « Finance mensuelle » juste après.
    const suivi = new Map<string, { verses: number; reste: number; nbReste: number }>();
    const cumule = (k: string, verses: number, reste: number) => {
      const e = suivi.get(k) || { verses: 0, reste: 0, nbReste: 0 };
      e.verses += verses;
      e.reste += reste;
      if (reste > 0.01) e.nbReste += 1;
      suivi.set(k, e);
    };

    // ── Sur quelle ligne se retient une intervention ──────────────────────────────
    // Règle de Vincent, 02/09/2026 : une intervention à la charge du propriétaire figure sur
    // le loyer qu'il est en train de payer, et y reste jusqu'à ce qu'elle soit soldée — par
    // le virement du propriétaire, ou par la retenue. Elle était jusqu'ici affectée au plus
    // ancien mois non payé : sur 3P Bernoulli (Tom Denoun), les 130 € de INT-2026-0069
    // dormaient sur juillet pendant que Vincent réglait septembre. Invisible là où il regarde.
    // On vise donc le mois en cours, et à défaut le mois ouvert le plus récent.
    const moisCourantCle = cle(moisCourant.a, moisCourant.m);
    const moisOuvertsParAppartement = new Map<string, { k: string; fin: Date }[]>();
    for (const l of lignes) {
      if (l.k < MISE_EN_SERVICE || l.k > moisCourantCle) continue;
      for (const d of l.loyersDetail) {
        if (d.montant <= 0 && d.charges <= 0) continue;
        const ex = loyersParCle.get(cleLoyer(l.k, d.apptId));
        // Un mois déjà payé est clos, et un mois où Vincent a coché « Sans déduction » vire
        // le loyer plein : ni l'un ni l'autre ne peut porter la retenue.
        if (texte(ex?.fields["Statut"] ?? "") === "Payé" || ex?.fields["Sans déduction"] === true) continue;
        const liste = moisOuvertsParAppartement.get(d.apptId) ?? [];
        liste.push({ k: l.k, fin: debutMois(l.a, l.m + 1) });
        moisOuvertsParAppartement.set(d.apptId, liste);
      }
    }
    const retenueSur = new Map<string, string>();
    for (const i of aDeduire) {
      const apptId = liens(i.fields["Appartement"])[0];
      if (!apptId) continue;
      // Une intervention ne se retient pas sur un mois clos avant sa résolution.
      const res = texte(i.fields["Date résolution"]);
      const ouverts = (moisOuvertsParAppartement.get(apptId) ?? []).filter((m) => !res || jour(res) < m.fin);
      if (!ouverts.length) continue;
      const courant = ouverts.find((m) => m.k === moisCourantCle);
      retenueSur.set(i.id, cleLoyer((courant ?? ouverts[ouverts.length - 1]).k, apptId));
    }

    for (const l of lignes) {
      // Avant la mise en service, seuls quelques baux longs étaient saisis et Vincent a réglé
      // ces mois-là hors Airtable. Générer des lignes « à payer » pour eux ferait apparaître
      // une dette fantôme de plus de 200 000 €. On commence donc au premier mois fiable.
      if (l.k < MISE_EN_SERVICE) continue;
      for (const d of l.loyersDetail) {
        if (d.montant <= 0 && d.charges <= 0) continue;
        const ref = `${l.k} · ${d.code}`;
        const cleL = cleLoyer(l.k, d.apptId);
        clesLoyersAttendues.add(cleL);
        const futur = l.a > moisCourant.a || (l.a === moisCourant.a && l.m > moisCourant.m);

        const fields: Record<string, unknown> = {
          "Référence": ref,
          Mois: l.k,
          "Libellé mois": `${NOMS_MOIS[l.m]} ${l.a}`,
          "Début de mois": iso(debutMois(l.a, l.m)),
          Appartement: [d.apptId],
          "Propriétaire": d.proprio,
          "Réservations": d.resas,
          "Nuitées occupées": d.nuits,
          "Période occupée": d.periode,
          "Jours du mois": d.joursMois,
          Occupation: arrondi(d.nuits / d.joursMois, 4),
          "Loyer plein": d.loyerPlein,
          "Montant à virer": d.montant,
          "Charges à virer": d.charges, // informatif : part du loyer qui couvre les charges
          "Total à virer": d.montant,
          "Détail": `Loyer ${d.periode}`,
          "Dernier calcul": horodatage,
        };
        const total = d.montant;
        const existant = loyersParCle.get(cleL);
        const dejaPaye = texte(existant?.fields["Statut"] ?? "") === "Payé";

        // Sur un mois déjà payé on ne touche plus aux déductions : elles sont figées.
        // Et si Vincent a coché « Sans déduction », il vire le loyer plein ce mois-ci :
        // les interventions ne sont pas consommées, elles repartiront sur le mois suivant.
        const sansDeduction = existant?.fields["Sans déduction"] === true;
        const finDuMois = debutMois(l.a, l.m + 1);
        const retenues = dejaPaye || sansDeduction
          ? []
          : aDeduire.filter((i) => !dejaAffectee.has(i.id) && retenueSur.get(i.id) === cleL);
        for (const i of retenues) dejaAffectee.add(i.id);

        if (dejaPaye && existant) {
          // Le propriétaire s'est acquitté de sa facture par la retenue sur son loyer :
          // elle est encaissée, même si aucun virement entrant n'apparaîtra en banque.
          for (const idFacture of liens(existant.fields["Factures à régler"])) {
            const fac = factures.find((f) => f.id === idFacture);
            if (fac && texte(fac.fields["Statut"]) === "Envoyée") {
              facturesASolder.push({
                id: idFacture,
                fields: {
                  Statut: "Payée",
                  "Date de paiement": texte(existant.fields["Date de paiement"]) || iso(new Date()),
                  Notes:
                    `${texte(fac.fields["Notes"])}\nRéglée par retenue sur le loyer ${texte(existant.fields["Référence"])}.`.trim(),
                },
              });
            }
          }
          for (const idInterv of liens(existant.fields["Interventions à déduire"])) {
            dejaAffectee.add(idInterv);
            const interv = interventions.find((x) => x.id === idInterv);
            if (interv && interv.fields["Déduite du loyer"] !== true) {
              aSolder.push({
                id: idInterv,
                fields: {
                  "Déduite du loyer": true,
                  "Déduite le": texte(existant.fields["Date de paiement"]) || iso(new Date()),
                  "Loyer de déduction": [existant.id],
                },
              });
            }
          }
        }

        const deduction = arrondi(
          retenues.reduce((somme, i) => somme + nombre(i.fields["Montant facturé intervention (€)"]), 0)
        );
        const facturesLiees = retenues
          .map((i) => factureDeLIntervention(i))
          .filter((f): f is Rec => Boolean(f));
        fields["Interventions à déduire"] = dejaPaye
          ? liens(existant?.fields["Interventions à déduire"])
          : retenues.map((i) => i.id);
        if (!dejaPaye) {
          fields["Factures à régler"] = facturesLiees.map((f) => f.id);
          fields["Montant à déduire"] = deduction;
          fields["Net à virer"] = arrondi(total - deduction);
          const ligneRetenue = (i: Rec) =>
            `${texte(i.fields["Code intervention"])} — ${texte(i.fields["Type d'intervention"])} — ${nombre(
              i.fields["Montant facturé intervention (€)"]
            ).toLocaleString("fr-FR")} € TTC${
              factureDeLIntervention(i) ? ` (${texte(factureDeLIntervention(i)!.fields["Numéro facture"])})` : ""
            }`;
          // Les interventions du propriétaire encore ouvertes ou non chiffrées ne se déduisent
          // pas — mais elles s'affichent sur le loyer en cours, pour que Vincent sache qu'il
          // reste quelque chose à récupérer avant de virer le loyer plein. Elles ne touchent
          // NI « Montant à déduire » NI « Net à virer » : on ne retient jamais un montant
          // qu'on ne connaît pas.
          const attente = l.k === moisCourantCle ? (enAttenteParAppartement.get(d.apptId) ?? []) : [];
          const ligneAttente = (i: Rec) => {
            const sig = texte(i.fields["Date de signalement"]).slice(0, 10);
            const montant = nombre(i.fields["Montant facturé intervention (€)"]);
            return `${texte(i.fields["Code intervention"])} — ${texte(i.fields["Type d'intervention"])} — ${
              montant > 0 ? `${montant.toLocaleString("fr-FR")} € TTC, ` : "à chiffrer, "
            }${texte(i.fields["Statut"]).toLowerCase() || "en cours"}${
              sig ? ` (signalée le ${sig.slice(8, 10)}/${sig.slice(5, 7)}/${sig.slice(0, 4)})` : ""
            }`;
          };
          fields["Détail des déductions"] = [
            retenues.length ? retenues.map(ligneRetenue).join("\n") : "",
            attente.length
              ? `À la charge du propriétaire, pas encore déductible :\n${attente.map(ligneAttente).join("\n")}`
              : "",
          ]
            .filter(Boolean)
            .join("\n\n");
        }

        if (existant) {
          // Statut, Date de paiement et Rattrapage appartiennent à Vincent ou au passé :
          // ils ne figurent pas dans le payload, donc ils survivent au recalcul.
          const statutActuel = texte(existant.fields["Statut"]);
          // Seule exception : une ligne créée quand son mois était encore à venir porte
          // « En attente ». Le mois arrivé, le loyer est dû et doit rejoindre les autres,
          // sinon l'onglet « À payer » raterait le mois en cours. La bascule ne concerne
          // que « En attente » : « Payé » n'est jamais touché.
          if (!futur && statutActuel === "En attente") {
            fields["Statut"] = "À payer";
            basculees.push(ref);
          }
          const paye = statutActuel === "Payé";

          // ── Rattrapages et date de paiement (28/08/2026) ──────────────────
          // Deux notions que la table confondait :
          //   « Mois » = le mois CONCERNÉ, vérité comptable, ne bouge jamais ;
          //   « Mois de règlement » = le LOT dans lequel la ligne se paie.
          // Règles de Vincent : une ligne payée reste figée dans le mois de son
          // paiement ; une ligne d'un mois passé non payée remonte dans le lot
          // en cours, marquée « Rattrapage » ; les autres restent sur leur mois.
          const moisPasse = l.a < moisCourant.a || (l.a === moisCourant.a && l.m < moisCourant.m);
          if (paye) {
            // Date de paiement automatique : posée au premier passage qui voit le
            // statut « Payé » sans date, puis plus jamais touchée. Le mois de
            // règlement se fige sur le mois de cette date.
            const datePaiement = texte(existant.fields["Date de paiement"]) || aujourdhuiParis();
            if (!texte(existant.fields["Date de paiement"])) fields["Date de paiement"] = datePaiement;
            fields["Mois de règlement"] = texte(existant.fields["Mois de règlement"]) || datePaiement.slice(0, 7);
          } else if (moisPasse) {
            fields["Mois de règlement"] = cle(moisCourant.a, moisCourant.m);
            if (statutActuel !== "Rattrapage") fields["Statut"] = "Rattrapage";
          } else {
            fields["Mois de règlement"] = l.k;
          }

          if (paye) {
            // Photographie du montant au moment du paiement. Si le montant bouge ensuite
            // (séjour prolongé, avenant), l'écart devient visible au lieu d'être perdu.
            const snapshot = nombre(existant.fields["Montant payé"]) || total;
            const ecart = arrondi(total - snapshot);
            fields["Montant payé"] = snapshot;
            fields["Écart à régulariser"] = ecart;
            fields["À régler"] = ecart > 0.01;
            cumule(l.k, snapshot, Math.max(0, ecart));
          } else {
            fields["Montant payé"] = null;
            fields["Écart à régulariser"] = null;
            fields["À régler"] = !futur;
            cumule(l.k, 0, total);
          }
          // Écriture sélective : si rien d'utile n'a changé, on ne touche pas la ligne.
          if (champsChangent(existant.fields, fields)) {
            majLoyers.push({ id: existant.id, ref, mois: l.k, fields });
          }
        } else {
          // Ligne qui naît alors que son mois a déjà commencé : réservation saisie en cours
          // de route. Elle se paiera avec le lot suivant, d'où le marqueur « Rattrapage ».
          const passe = l.a < moisCourant.a || (l.a === moisCourant.a && l.m < moisCourant.m);
          const enCours = l.a === moisCourant.a && l.m === moisCourant.m;
          creerLoyers.push({
            ref,
            mois: l.k,
            fields: {
              ...fields,
              // Un mois passé naît directement en « Rattrapage » : il se paiera
              // avec le lot en cours, jamais en remontant dans les mois clos.
              Statut: futur ? "En attente" : passe ? "Rattrapage" : "À payer",
              "Mois de règlement": passe ? cle(moisCourant.a, moisCourant.m) : l.k,
              "À régler": !futur,
              Rattrapage: passe || enCours,
            },
          });
          cumule(l.k, 0, total);
        }
      }
    }



    // Une ligne dont la réservation a disparu ne doit plus réclamer un virement.
    // On la neutralise sans la supprimer, sauf si elle est déjà payée : dans ce cas on alerte.
    // Sur les survivantes uniquement : neutraliser une ligne qu'on vient de supprimer
    // serait au mieux inutile, au pire une écriture sur un enregistrement disparu.
    const orphelines = survivants.filter(
      (r) => !clesLoyersAttendues.has(cleDeLaLigne(r)) && nombre(r.fields["Total à virer"]) > 0
    );
    const orphelinesPayees = orphelines.filter((r) => texte(r.fields["Statut"]) === "Payé");
    const orphelinesAnnulables = orphelines.filter((r) => texte(r.fields["Statut"]) !== "Payé");

    // Deux cas distincts. Une ligne dont le MOIS est sorti de la fenêtre n'a plus de raison
    // d'exister : on la supprime, sauf si elle est payée (on ne détruit jamais une trace de
    // virement). Une ligne dont le mois est toujours dans la fenêtre mais dont la réservation
    // a disparu est simplement remise à zéro, pour que l'historique reste lisible.
    const dansLaFenetre = new Set(lignes.map((l) => l.k));
    const horsFenetre = orphelinesAnnulables.filter((r) => !dansLaFenetre.has(texte(r.fields["Mois"])));
    const aNeutraliser = orphelinesAnnulables.filter((r) => dansLaFenetre.has(texte(r.fields["Mois"])));

    if (horsFenetre.length) await supprimer(T_LOYERS, horsFenetre.map((r) => r.id));

    if (aNeutraliser.length) {
      await ecrire(
        T_LOYERS,
        "PATCH",
        aNeutraliser.map((r) => ({
          id: r.id,
          fields: {
            "Montant à virer": 0,
            "Charges à virer": 0,
            "Total à virer": 0,
            "Nuitées occupées": 0,
            "À régler": false,
            "Détail": "Plus aucune réservation ne couvre ce mois pour cet appartement : rien à verser.",
            "Dernier calcul": horodatage,
          },
        }))
      );
    }

    // Le cron passe toutes les heures : cette anomalie persiste tant qu'un humain
    // n'a pas tranché, donc on ne la crie qu'une fois par jour, au passage de 8h,
    // au lieu de 24 fois. Un rappel quotidien suffit à ne pas l'oublier.
    if (orphelinesPayees.length && heureParis() === 8) {
      await slack(
        `:warning: *Finance mensuelle — ${orphelinesPayees.length} loyer(s) déjà payé(s) sans réservation en face*\n` +
          orphelinesPayees.map((r) => `• ${texte(r.fields["Référence"])} — ${nombre(r.fields["Total à virer"]).toLocaleString("fr-FR")} €`).join("\n") +
          `\n\n_La réservation a été supprimée ou son statut a changé après le virement. À vérifier._`
      );
    }

    // ------------------------------------------------------------ écriture « Finance mensuelle »
    const parCle = new Map(lignes.map((l) => [l.k, l]));
    const financeParCle = new Map(financeExistant.map((r) => [texte(r.fields["Mois"]), r]));

    // Mois d'avant la plateforme complète : le CA vient du registre de facturation (colonne
    // « CA facturé (registre) », posée le 06/09/2026 depuis la table Historique factures, où
    // les doublons registre/plateforme ont été retirés). Rien n'est estimé : le registre est
    // complet. Aucun loyer propriétaire n'est rattaché à ce CA, il reste hors périmètre de marge.
    for (const l of lignes) {
      if (l.k >= PLATEFORME_COMPLETE) continue;
      const registre = nombre(financeParCle.get(l.k)?.fields["CA facturé (registre)"]);
      if (registre <= 0) continue;
      l.registre = registre;
      l.caFacture = registre;
      l.caHorsPerimetre = registre;
      l.caEstime = 0;
    }

    const aCreer: unknown[] = [];
    const aMettreAJour: unknown[] = [];
    const idParMois = new Map<string, string>();
    type CumulAn = {
      mois: number; caFacture: number; caEstime: number; loyers: number; charges: number;
      chargesFixes: number; reste: number; encours: number; nuitees: number; dispo: number; fiable: boolean;
      moisFiables: number; caFiable: number; margeFiable: number;
    };
    const parAnnee = new Map<string, CumulAn>();

    for (const l of lignes) {
      const caTotal = arrondi(l.caFacture + l.caEstime);
      const prec = parCle.get(cle(l.a, l.m - 1));
      const precTotal = prec ? arrondi(prec.caFacture + prec.caEstime) : null;
      const precMarge = prec ? arrondi(precTotal! - prec.loyers) : null;
      // Comparer à un mois « Historique incomplet » produirait une évolution absurde
      // (+482 % en août 2026 face à un août 2025 où seuls 3 baux longs étaient saisis).
      // Tant que le N-1 n'est pas fiable, la colonne reste vide.
      const cleN1 = cle(l.a - 1, l.m);
      const n1 = cleN1 >= MISE_EN_SERVICE ? parCle.get(cleN1) : undefined;
      const n1Hist = financeParCle.get(cleN1);
      const n1Total = n1
        ? arrondi(n1.caFacture + n1.caEstime)
        : n1Hist && texte(n1Hist.fields["Source"]) === HISTORIQUE_REGISTRE
          ? nombre(n1Hist.fields["CA total"])
          : null;

      const passe = l.a < moisCourant.a || (l.a === moisCourant.a && l.m < moisCourant.m);
      const futur = l.a > moisCourant.a || (l.a === moisCourant.a && l.m > moisCourant.m);

      const avantMiseEnService = l.k < MISE_EN_SERVICE;
      const chargesFixesMois = avantMiseEnService
        ? 0
        : chargesDuMois(debutMois(l.a, l.m), debutMois(l.a, l.m + 1));
      // MARGE : uniquement sur le périmètre dont on connaît les coûts.
      // Le CA total est la vérité et reste affiché tel quel. Mais une facture sans
      // réservation liée n'a pas de loyer propriétaire en face : l'inclure dans la
      // marge revient à soustraire les coûts d'un périmètre à des recettes d'un
      // périmètre plus large. C'est ce qui affichait 72 % de marge en août.
      const caPerimetreGere = arrondi(caTotal - l.caHorsPerimetre);
      const marge = arrondi(caPerimetreGere - l.loyers);
      const margeNette = arrondi(marge - chargesFixesMois);
      // Quelle part du CA est adossée à des coûts connus. En dessous de 90 %, la marge
      // ne décrit plus le mois mais une fraction de celui-ci, et il faut le dire.
      const couverture = caTotal > 0 ? arrondi(caPerimetreGere / caTotal, 4) : 1;
      // Ce qui traîne encore sur les mois d'AVANT celui-ci : à régler avec le lot du mois
      // pour ne pas laisser filer un loyer oublié.
      const arriere = arrondi(
        [...suivi.entries()]
          .filter(([k]) => k < l.k && k >= MISE_EN_SERVICE)
          .reduce((somme, [, v]) => somme + v.reste, 0)
      );
      const partFacturee = caTotal > 0 ? l.caFacture / caTotal : 0;
      const fiabilite = couverture < 0.9
        ? "Marge partielle"
        : avantMiseEnService
        ? "Historique incomplet"
        : l.registre
          ? "Marge partielle"
          : partFacturee >= 0.95
            ? "Chiffre consolidé"
            : partFacturee > 0
              ? "Facturation en cours"
              : "Estimé sur réservations";

      const detail = [
        l.registre
          ? `CA du mois repris du registre de facturation (table Historique factures) : ${l.registre.toLocaleString("fr-FR")} €, doublons plateforme retirés. La plateforme ne portait pas encore ces factures ; aucun loyer propriétaire n'est rattaché à ce CA, la marge ci-dessous ne porte que sur les réservations saisies.`
          : "",
        avantMiseEnService
          ? "⚠️ Mois antérieur à la mise en service d'Airtable : seuls les baux longs y figurent. Le CA réel de ce mois était plus élevé, ne pas lire cette ligne comme une performance."
          : "",
        `${caTotal.toLocaleString("fr-FR")} € de CA — ${l.caFacture.toLocaleString("fr-FR")} € facturés, ${l.caEstime.toLocaleString("fr-FR")} € estimés d'après les réservations.`,
        `${l.loyers.toLocaleString("fr-FR")} € de loyers propriétaires au prorata de ${l.nuiteesVendues} nuitées occupées, dont ${l.charges.toLocaleString("fr-FR")} € de charges déjà comprises dans le loyer.`,
        l.caHorsPerimetre > 0
          ? `⚠️ ${l.caHorsPerimetre.toLocaleString("fr-FR")} € de CA sans réservation rattachée (factures émises hors plateforme) : aucun loyer propriétaire en face, donc EXCLUS du calcul de marge. La marge ci-dessous porte sur ${caPerimetreGere.toLocaleString("fr-FR")} € seulement.`
          : "",
        `Marge ${marge.toLocaleString("fr-FR")} € pour ${caPerimetreGere.toLocaleString("fr-FR")} € de CA géré, soit ${caPerimetreGere > 0 ? Math.round((marge / caPerimetreGere) * 100) : 0} % — à ne jamais rapporter au CA total, qui couvre un périmètre plus large. ${l.apptsLoues} appartement(s) loué(s), parc de ${l.apptsParc}.`,
      ]
        .filter(Boolean)
        .join("\n");

      const fields: Record<string, unknown> = {
        Mois: l.k,
        "Année": String(l.a),
        "Libellé": `${NOMS_MOIS[l.m]} ${l.a}`,
        "Début de mois": iso(debutMois(l.a, l.m)),
        "Statut du mois": passe ? "Clôturé" : futur ? "Prévisionnel" : "En cours",
        "Fiabilité": fiabilite,
        "CA facturé": l.caFacture,
        "CA estimé": l.caEstime,
        "CA total": caTotal,
        "% facturé": caTotal > 0 ? arrondi(l.caFacture / caTotal, 4) : 0,
        "Loyers propriétaires dus": l.loyers,
        "Charges dues": l.charges,
        "Total à virer": l.loyers,
        "Loyers versés": arrondi(suivi.get(l.k)?.verses || 0),
        "Reste à verser": arrondi(suivi.get(l.k)?.reste || 0),
        "Avancement des virements":
          (suivi.get(l.k)?.verses || 0) + (suivi.get(l.k)?.reste || 0) > 0
            ? arrondi((suivi.get(l.k)?.verses || 0) / ((suivi.get(l.k)?.verses || 0) + (suivi.get(l.k)?.reste || 0)), 4)
            : null,
        "CA du périmètre géré": caPerimetreGere,
        "CA hors périmètre géré": l.caHorsPerimetre,
        "Couverture des coûts": couverture,
        "Marge brute": marge,
        "Taux de marge brute": caPerimetreGere > 0 ? arrondi(marge / caPerimetreGere, 4) : 0,
        "Charges fixes": chargesFixesMois,
        "Marge nette": margeNette,
        "Taux de marge nette": caPerimetreGere > 0 ? arrondi(margeNette / caPerimetreGere, 4) : null,
        "Arriéré des mois précédents": arriere,
        "Encours client": arrondi(encoursParMois.get(l.k) || 0),
        "Factures en attente": impayeesParMois.get(l.k)?.size || 0,
        "Encours de plus de 30 jours": arrondi(encoursVieuxParMois.get(l.k) || 0),
        "Nuitées vendues": l.nuiteesVendues,
        "Nuitées disponibles": l.nuiteesDispo,
        "Taux d'occupation": l.nuiteesDispo > 0 ? arrondi(l.nuiteesVendues / l.nuiteesDispo, 4) : 0,
        "Appartements loués": l.apptsLoues,
        "Appartements sous contrat": l.apptsParc,
        "Revenu par appartement": l.apptsParc > 0 ? arrondi(caTotal / l.apptsParc) : 0,
        "Δ CA vs mois précédent": precTotal === null ? null : arrondi(caTotal - precTotal),
        "Δ CA vs mois précédent %": precTotal ? arrondi((caTotal - precTotal) / precTotal, 4) : null,
        "Δ Marge vs mois précédent": precMarge === null ? null : arrondi(marge - precMarge),
        "Δ CA vs N-1": n1Total === null ? null : arrondi(caTotal - n1Total),
        "Δ CA vs N-1 %": n1Total ? arrondi((caTotal - n1Total) / n1Total, 4) : null,
        "Appartements du mois": l.refAppts,
        "Réservations du mois": l.refResas,
        "Factures du mois": l.refFacts,
        "Détail": detail,
        "Dernier calcul": horodatage,
      };

      const an = String(l.a);
      const cumulAn = parAnnee.get(an) || {
        mois: 0, caFacture: 0, caEstime: 0, loyers: 0, charges: 0, chargesFixes: 0,
        reste: 0, encours: 0, nuitees: 0, dispo: 0, fiable: false,
        moisFiables: 0, caFiable: 0, margeFiable: 0,
      };
      cumulAn.mois += 1;
      cumulAn.caFacture += l.caFacture;
      cumulAn.caEstime += l.caEstime;
      cumulAn.loyers += l.loyers;
      cumulAn.charges += l.charges;
      cumulAn.chargesFixes += chargesFixesMois;
      cumulAn.reste += suivi.get(l.k)?.reste || 0;
      cumulAn.encours += encoursParMois.get(l.k) || 0;
      cumulAn.nuitees += l.nuiteesVendues;
      cumulAn.dispo += l.nuiteesDispo;
      if (!avantMiseEnService) {
        cumulAn.fiable = true;
        cumulAn.moisFiables += 1;
        cumulAn.caFiable += caTotal;
        cumulAn.margeFiable += marge;
      }
      parAnnee.set(an, cumulAn);

      const existant = financeParCle.get(l.k);
      if (existant) {
        idParMois.set(l.k, existant.id);
        if (champsChangent(existant.fields, fields)) {
          aMettreAJour.push({ id: existant.id, fields });
        }
      } else {
        aCreer.push({ fields });
      }
    }

    // Écriture, dans l'ordre : les mois d'abord (pour obtenir leurs identifiants),
    // puis les loyers auxquels on rattache le mois correspondant.
    // Les mois sortis de la fenêtre (historique d'avant la mise en service, prévisionnel trop
    // lointain) n'ont plus lieu d'être : on les supprime plutôt que de les laisser se figer.
    const clesAttendues = new Set(lignes.map((l) => l.k));
    // Les lignes « Historique registre 2025-2026 » (champ Source) sont reconstituées depuis le
    // registre de facturation d'avant la plateforme : hors fenêtre par construction, jamais
    // recalculées, jamais supprimées (ajouté le 06/09/2026).
    const financeObsoletes = financeExistant.filter(
      (r) => !clesAttendues.has(texte(r.fields["Mois"])) && texte(r.fields["Source"]) !== HISTORIQUE_REGISTRE,
    );
    if (financeObsoletes.length) await supprimer(T_FINANCE, financeObsoletes.map((r) => r.id));

    if (aCreer.length) await ecrire(T_FINANCE, "POST", aCreer);
    if (aMettreAJour.length) await ecrire(T_FINANCE, "PATCH", aMettreAJour);
    if (aCreer.length) {
      for (const r of await lireTable(T_FINANCE)) idParMois.set(texte(r.fields["Mois"]), r.id);
    }

    const rattache = <T extends { mois: string; fields: Record<string, unknown> }>(x: T) => {
      const id = idParMois.get(x.mois);
      if (id) x.fields["Mois lié"] = [id];
      return x;
    };
    if (aSolder.length) await ecrire(T_INTERVENTIONS, "PATCH", aSolder);
    if (facturesASolder.length) await ecrire(T_FACTURES, "PATCH", facturesASolder);
    if (creerLoyers.length) await ecrire(T_LOYERS, "POST", creerLoyers.map((x) => ({ fields: rattache(x).fields })));
    if (majLoyers.length) await ecrire(T_LOYERS, "PATCH", majLoyers.map((x) => ({ id: x.id, fields: rattache(x).fields })));

    // ------------------------------------------------------- notification mensuelle Slack
    // Les lignes existent trois mois à l'avance ; ce qui se passe le 1er, c'est qu'elles
    // deviennent exigibles. On poste donc le récap au moment de cette bascule — une seule
    // fois, et si le cron avait sauté le 1er, le lendemain fait aussi bien l'affaire.
    if (basculees.length) {
      const kMois = cle(moisCourant.a, moisCourant.m);
      const duMois = lignes.find((l) => l.k === kMois)?.loyersDetail ?? [];
      const totalMois = arrondi(duMois.reduce((s, d) => s + d.montant, 0));
      const anterieurs = [...suivi.entries()].filter(([k]) => k < kMois && k >= MISE_EN_SERVICE);
      const arriere = arrondi(anterieurs.reduce((s, [, v]) => s + v.reste, 0));
      const nbArriere = anterieurs.reduce((s, [, v]) => s + v.nbReste, 0);
      const eur = (n: number) => `${n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
      const top = [...duMois].sort((a, b) => b.montant - a.montant).slice(0, 5);

      const titre = `:key: *Loyers propriétaires — ${NOMS_MOIS[moisCourant.m]} ${moisCourant.a}*`;
      if (!(await dejaAnnonce(titre))) await slack(
        [
          titre,
          "",
          `${duMois.length} loyer(s) viennent de passer à payer : *${eur(totalMois)}*`,
          arriere > 0.01
            ? `Reste des mois précédents : *${eur(arriere)}* sur ${nbArriere} ligne(s)`
            : "Aucun arriéré : tous les mois précédents sont soldés.",
          arriere > 0.01 ? `*Total à virer aujourd'hui : ${eur(totalMois + arriere)}*` : "",
          "",
          "Les plus gros virements du mois :",
          ...top.map((d) => `• ${d.code} — ${eur(d.montant)} — ${d.periode}`),
          "",
          "Les montants sont au prorata des nuitées occupées et incluent déjà les charges.",
          "Passez chaque ligne en « Payé » au fil des virements :",
          "https://airtable.com/appcLt70GQiR1FAbT/pagG2ImBSleukjpdt",
        ]
          .filter((x) => x !== "")
          .join("\n"),
        SLACK_LOYERS
      );
      await dedoublonner(titre);
    }

    // ------------------------------------------------------------ « Finance annuelle »
    // Agrégation des mois déjà calculés. Une année n'est comparable à la précédente que si
    // les deux sont postérieures à la mise en service : sinon on comparerait un vrai chiffre
    // à un résidu de saisie, et la croissance affichée serait absurde.
    const anneeCourante = String(moisCourant.a);
    const annuel = [...parAnnee.entries()].sort(([x], [y]) => x.localeCompare(y));
    const totalAn = (c: CumulAn) => arrondi(c.caFacture + c.caEstime);
    const margeBruteAn = (c: CumulAn) => arrondi(totalAn(c) - c.loyers);
    const margeNetteAn = (c: CumulAn) => arrondi(margeBruteAn(c) - c.chargesFixes);

    const anneesParCle = new Map(anneesExistantes.map((r) => [texte(r.fields["Année"]), r]));
    const creerAns: unknown[] = [];
    const majAns: unknown[] = [];

    for (const [an, c] of annuel) {
      const total = totalAn(c);
      const brute = margeBruteAn(c);
      const nette = margeNetteAn(c);
      const prec = parAnnee.get(String(Number(an) - 1));
      const complet = (x: CumulAn) => x.moisFiables === x.mois && x.mois > 0;
      const precFiable = !!prec && complet(prec) && complet(c);
      const precTotal = precFiable ? totalAn(prec) : null;

      const fiabilite = !c.fiable
        ? "Historique incomplet"
        : an === anneeCourante
          ? "Année en cours"
          : an > anneeCourante
            ? "Année à venir"
            : c.mois >= 12
              ? "Année complète"
              : "Historique incomplet";

      const moisLies = annuel.length
        ? [...idParMois.entries()].filter(([k]) => k.startsWith(an + "-")).map(([, id]) => id)
        : [];

      const fields: Record<string, unknown> = {
        "Année": an,
        "Fiabilité": fiabilite,
        "Mois couverts": c.mois,
        "Mois fiables": c.moisFiables,
        "CA des mois fiables": arrondi(c.caFiable),
        "Marge brute des mois fiables": arrondi(c.margeFiable),
        "CA facturé": arrondi(c.caFacture),
        "CA estimé": arrondi(c.caEstime),
        "CA total": total,
        "% facturé": total > 0 ? arrondi(c.caFacture / total, 4) : 0,
        "Loyers propriétaires dus": arrondi(c.loyers),
        "Charges appartements": arrondi(c.charges),
        "Charges fixes": arrondi(c.chargesFixes),
        "Marge brute": brute,
        "Taux de marge brute": total > 0 ? arrondi(brute / total, 4) : null,
        "Marge nette": nette,
        "Taux de marge nette": total > 0 ? arrondi(nette / total, 4) : null,
        "Reste à verser": arrondi(c.reste),
        "Encours client": arrondi(c.encours),
        "Nuitées vendues": c.nuitees,
        "Nuitées disponibles": c.dispo,
        "Taux d occupation": c.dispo > 0 ? arrondi(c.nuitees / c.dispo, 4) : null,
        "Δ CA vs année précédente": precTotal === null ? null : arrondi(total - precTotal),
        "Δ CA vs année précédente %": precTotal ? arrondi((total - precTotal) / precTotal, 4) : null,
        "Δ Marge nette vs année précédente": precFiable ? arrondi(nette - margeNetteAn(prec)) : null,
        "Mois de l année": moisLies,
        Source: "Calculé depuis Airtable",
        "Détail": [
          !c.fiable
            ? "⚠️ Année entièrement antérieure à la mise en service d'Airtable : seuls quelques baux longs y figurent. Le CA réel était bien plus élevé, ne pas lire cette ligne comme une performance."
            : c.moisFiables < c.mois
              ? `⚠️ Année à moitié fiable : ${c.mois - c.moisFiables} mois sur ${c.mois} sont antérieurs à juillet 2026 et très incomplets. Le chiffre à regarder est celui des ${c.moisFiables} mois fiables : ${arrondi(c.caFiable).toLocaleString("fr-FR")} € de CA et ${arrondi(c.margeFiable).toLocaleString("fr-FR")} € de marge brute.`
              : "",
          `${total.toLocaleString("fr-FR")} € de CA sur ${c.mois} mois — marge brute ${brute.toLocaleString("fr-FR")} €, marge nette ${nette.toLocaleString("fr-FR")} € après ${arrondi(c.chargesFixes).toLocaleString("fr-FR")} € de charges de structure.`,
        ]
          .filter(Boolean)
          .join("\n"),
        "Dernier calcul": horodatage,
      };

      const existant = anneesParCle.get(an);
      if (existant) {
        // Une année reprise d'une liasse fiscale est de la donnée comptable certifiée :
        // le calcul ne doit jamais l'écraser.
        if (texte(existant.fields["Source"]) === "Saisi depuis la liasse fiscale") continue;
        if (champsChangent(existant.fields, fields)) majAns.push({ id: existant.id, fields });
      } else {
        creerAns.push({ fields: { ...fields, Source: "Calculé depuis Airtable" } });
      }
    }

    if (creerAns.length) await ecrire(T_ANNEE, "POST", creerAns);
    if (majAns.length) await ecrire(T_ANNEE, "PATCH", majAns);

    const courant = parCle.get(cle(moisCourant.a, moisCourant.m));
    return NextResponse.json({
      ok: true,
      duree_ms: Date.now() - debut,
      mois_calcules: lignes.length,
      finance: { crees: aCreer.length, mis_a_jour: aMettreAJour.length },
      loyers: {
        crees: creerLoyers.length,
        mis_a_jour: majLoyers.length,
        neutralises: aNeutraliser.length,
        doublons_supprimes: purges.length,
        doublons_restants: doublonsASupprimer.length - purges.length,
        supprimes_hors_fenetre: horsFenetre.length,
      },
      rattrapages: creerLoyers.filter((x) => x.fields["Rattrapage"] === true).length,
      alertes: orphelinesPayees.length,
      charges_fixes: chargesFixes.length,
      interventions: { a_deduire: aDeduire.length, soldees: aSolder.length },
      factures_proprietaire_soldees: facturesASolder.length,
      annees: { crees: creerAns.length, mis_a_jour: majAns.length },
      mois_courant: courant
        ? {
            mois: courant.k,
            ca_total: arrondi(courant.caFacture + courant.caEstime),
            a_virer: arrondi(courant.loyers + courant.charges),
            marge: arrondi(courant.caFacture + courant.caEstime - courant.loyers - courant.charges),
          }
        : null,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    await slack(`:x: *Finance mensuelle — le calcul a échoué*\n\`${message}\`\n\n_Les tables gardent les valeurs du dernier passage réussi._`);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  } finally {
    await libererVerrou();
  }
}
