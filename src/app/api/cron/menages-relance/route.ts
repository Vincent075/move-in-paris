import { NextResponse } from "next/server";

// Le matin des ménages — une fois par jour, 8h Paris. Deux gestes, dans cet ordre.
//
// 1) LES MÉNAGES DU JOUR PASSENT EN « EN COURS ». Demandé par Vincent le 29/08/2026 :
//    l'équipe terrain ouvre son planning le matin et doit voir d'un coup d'œil ce qui
//    est pour aujourd'hui, sans lire les dates. Le statut porte donc le temps :
//    « Planifié » = à venir, « En cours » = c'est aujourd'hui, « Terminé » = fait et
//    confirmé. La bascule ne touche QUE les ménages du jour encore « Planifié » :
//    elle ne rouvre jamais un ménage déjà soldé ni un ménage annulé.
//    Attention au vocabulaire : dans cette table le statut de départ est « Planifié »,
//    pas « À planifier » — « À planifier » n'existe que dans la table Check-in.
//
// 2) RELANCE DE CE QUI TRAÎNE. Ce cron ne clôture rien : depuis le 29/08 c'est
//    l'équipe qui solde ses ménages depuis l'interface, et chaque clôture remonte
//    dans #ménages avec son commentaire (voir cron/terrain-notifs). Fermer les fiches
//    à sa place vidait la liste mais tuait le suivi : une prestation oubliée devenait
//    indiscernable d'une prestation faite. On rappelle donc, on ne referme pas.
//    Un ménage encore ouvert plus de 48 h après sa date veut dire l'une de deux
//    choses, et les deux méritent qu'on le sache : soit il n'a pas été fait, soit
//    personne ne l'a confirmé. Le filtre couvre « Planifié » ET « En cours »,
//    puisque la bascule ci-dessus fait sortir de « Planifié » dès le jour même.
//
// UN SEUL message récapitulatif par jour, jamais un message par ménage : un rappel
// qui déborde n'est plus lu. Et rien du tout quand il n'y a rien à dire — le silence
// est l'état normal.

export const dynamic = "force-dynamic";
export const maxDuration = 120;

const AT_BASE = process.env.AIRTABLE_BASE_ID || "";
const AT_TOKEN = process.env.AIRTABLE_WATCHDOG_TOKEN || "";
const SLACK_TOKEN = process.env.SLACK_BOT_TOKEN_MIP || "";
const T_MENAGES = "tblVE8HEtnuTeCi8r";
const T_MONITORING = "tblDEkjIyKoKJG5Yj";
const CANAL_MENAGES = "C0BCH7FRDC2";
const DELAI_H = 48;
const MAX_LISTES = 15;
const LOT = 10; // maximum accepté par l'API Airtable sur une écriture

type Dict = Record<string, unknown>;
type Rec = { id: string; fields: Dict };
const texte = (v: unknown) => (typeof v === "string" ? v : v == null ? "" : String(v));
const premier = (v: unknown) => (Array.isArray(v) ? texte(v[0]) : texte(v));

async function airtable(method: string, path: string, body?: unknown): Promise<Dict> {
  const r = await fetch(`https://api.airtable.com/v0/${AT_BASE}/${path}`, {
    method,
    headers: { Authorization: `Bearer ${AT_TOKEN}`, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });
  if (!r.ok) throw new Error(`Airtable ${method} ${path} : HTTP ${r.status}`);
  return r.json();
}

async function lireTable(tableId: string): Promise<Rec[]> {
  const out: Rec[] = [];
  let offset: string | undefined;
  do {
    const url = new URL(`https://api.airtable.com/v0/${AT_BASE}/${tableId}`);
    url.searchParams.set("pageSize", "100");
    if (offset) url.searchParams.set("offset", offset);
    const r = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${AT_TOKEN}` }, cache: "no-store",
    });
    if (!r.ok) throw new Error(`lecture ${tableId} : HTTP ${r.status}`);
    const j = (await r.json()) as { records?: Rec[]; offset?: string };
    out.push(...(j.records || []));
    offset = j.offset;
  } while (offset);
  return out;
}

async function slack(canal: string, texteMsg: string): Promise<boolean> {
  if (!SLACK_TOKEN) return false;
  try {
    const r = await fetch("https://slack.com/api/chat.postMessage", {
      method: "POST",
      headers: { Authorization: `Bearer ${SLACK_TOKEN}`, "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({ channel: canal, text: texteMsg, unfurl_links: false }),
    });
    const j = (await r.json()) as { ok?: boolean };
    return j.ok === true;
  } catch { return false; }
}

async function monitoring(statut: string, detail: string) {
  const nom = "Ménages non soldés (relance)";
  try {
    const d = await airtable("GET", `${T_MONITORING}?pageSize=100`);
    const row = ((d.records as Dict[]) ?? []).find(
      (r) => texte((r.fields as Dict)?.["Contrôle"]) === nom,
    );
    const fields = {
      "Contrôle": nom, Statut: statut, "Détail": detail,
      "Dernière vérification": new Date().toISOString(),
    };
    if (row) await airtable("PATCH", `${T_MONITORING}/${row.id}`, { fields, typecast: true });
    else await airtable("POST", T_MONITORING, { records: [{ fields }], typecast: true });
  } catch { /* le tableau de bord ne conditionne pas la relance */ }
}

// Jour civil à Paris, au format AAAA-MM-JJ : la seule comparaison de dates qui ne
// dérape pas au changement d'heure ni sur un dateTime stocké à 2h du matin.
const jourParis = (v: unknown): string => {
  const t = typeof v === "object" && v instanceof Date ? v.getTime() : Date.parse(texte(v));
  if (!Number.isFinite(t)) return "";
  const p = new Intl.DateTimeFormat("fr-CA", {
    timeZone: "Europe/Paris", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(new Date(t));
  return p;
};

const jourFr = (v: unknown) => {
  const t = Date.parse(texte(v));
  if (!Number.isFinite(t)) return texte(v).slice(0, 10);
  return new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", day: "2-digit", month: "2-digit" }).format(new Date(t));
};

export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const menages = await lireTable(T_MENAGES);

    // ── 1. Les ménages du jour passent en « En cours » ────────────────────────
    // On compare des jours civils à Paris, pas des instants : « Date prévue » est un
    // dateTime dont l'heure ne veut rien dire ici (2h du matin pour la plupart), et
    // raisonner en UTC ferait basculer les ménages un jour trop tôt ou trop tard.
    const aujourdhui = jourParis(new Date());
    const duJour = menages.filter(
      (m) => texte(m.fields["Statut"]) === "Planifié" && jourParis(m.fields["Date prévue"]) === aujourdhui,
    );
    let bascules = 0;
    for (let i = 0; i < duJour.length; i += LOT) {
      const records = duJour.slice(i, i + LOT).map((m) => ({ id: m.id, fields: { Statut: "En cours" } }));
      await airtable("PATCH", T_MENAGES, { records, typecast: true });
      bascules += records.length;
    }
    // La suite raisonne sur l'état d'après bascule, sans relire la table.
    for (const m of duJour) m.fields["Statut"] = "En cours";

    // ── 2. Ce qui traîne ──────────────────────────────────────────────────────
    const limite = Date.now() - DELAI_H * 3600_000;
    const OUVERTS = new Set(["Planifié", "En cours"]);
    const enRetard = menages
      .filter((m) => {
        if (!OUVERTS.has(texte(m.fields["Statut"]))) return false;
        const t = Date.parse(texte(m.fields["Date prévue"]));
        return Number.isFinite(t) && t < limite;
      })
      .sort((a, b) => texte(a.fields["Date prévue"]).localeCompare(texte(b.fields["Date prévue"])));

    if (!enRetard.length) {
      await monitoring("OK",
        `${bascules} ménage(s) du jour passé(s) en « En cours ». Aucun ménage en attente de confirmation.`);
      return NextResponse.json({ ok: true, bascules, en_retard: 0 });
    }

    const lignes = enRetard.slice(0, MAX_LISTES).map((m) => {
      const f = m.fields;
      const adresse = premier(f["Adresse appartement"]) || "appartement non précisé";
      return `• ${jourFr(f["Date prévue"])} · ${texte(f["Type"]) || "ménage"} · ${adresse}`;
    });
    const reste = enRetard.length - lignes.length;

    const msg =
      `*${enRetard.length} ménage(s) sans confirmation* — prévus il y a plus de ${DELAI_H / 24} jours ` +
      `et toujours ouverts (« Planifié » ou « En cours »).\n` +
      lignes.join("\n") +
      (reste > 0 ? `\n…et ${reste} autre(s).` : "") +
      `\nSi la prestation a eu lieu, passez la fiche en « Terminé » avec un commentaire : ` +
      `c'est ce qui la fait remonter ici et disparaître de cette liste.`;

    const envoye = await slack(CANAL_MENAGES, msg);
    await monitoring(envoye ? "OK" : "ALERTE",
      envoye ? `${bascules} passé(s) en « En cours » · ${enRetard.length} sans confirmation, relance envoyée.`
             : `${bascules} passé(s) en « En cours » · ${enRetard.length} sans confirmation — ENVOI SLACK EN ÉCHEC.`);
    return NextResponse.json({ ok: true, bascules, en_retard: enRetard.length, slack: envoye });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await monitoring("ALERTE", `Relance des ménages en échec : ${msg}`);
    return NextResponse.json({ ok: false, erreur: msg }, { status: 500 });
  }
}
