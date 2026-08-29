import { NextResponse } from "next/server";

// Relance des ménages non soldés — une fois par jour, 8h Paris.
//
// Pourquoi ce cron REMPLACE la clôture automatique (29/08/2026) : fermer les fiches
// à la place de l'équipe vidait la liste mais tuait le suivi. On ne savait plus qui
// était passé, ni ce qui avait été constaté sur place, et une prestation oubliée
// devenait indiscernable d'une prestation faite. Depuis aujourd'hui c'est l'équipe
// terrain qui solde ses ménages depuis l'interface, et chaque clôture remonte dans
// #ménages avec son commentaire (voir cron/terrain-notifs).
//
// Le rôle de ce cron est donc l'inverse du précédent : il ne ferme rien, il RAPPELLE
// ce qui traîne. Un ménage encore « Planifié » plus de 48 h après sa date prévue
// veut dire l'une de deux choses, et les deux méritent qu'on le sache : soit il n'a
// pas été fait, soit personne ne l'a confirmé.
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
    const limite = Date.now() - DELAI_H * 3600_000;
    const enRetard = menages
      .filter((m) => {
        if (texte(m.fields["Statut"]) !== "Planifié") return false;
        const t = Date.parse(texte(m.fields["Date prévue"]));
        return Number.isFinite(t) && t < limite;
      })
      .sort((a, b) => texte(a.fields["Date prévue"]).localeCompare(texte(b.fields["Date prévue"])));

    if (!enRetard.length) {
      await monitoring("OK", "Aucun ménage en attente de confirmation.");
      return NextResponse.json({ ok: true, en_retard: 0 });
    }

    const lignes = enRetard.slice(0, MAX_LISTES).map((m) => {
      const f = m.fields;
      const adresse = premier(f["Adresse appartement"]) || "appartement non précisé";
      return `• ${jourFr(f["Date prévue"])} · ${texte(f["Type"]) || "ménage"} · ${adresse}`;
    });
    const reste = enRetard.length - lignes.length;

    const msg =
      `*${enRetard.length} ménage(s) sans confirmation* — prévus il y a plus de ${DELAI_H / 24} jours ` +
      `et toujours au statut « Planifié ».\n` +
      lignes.join("\n") +
      (reste > 0 ? `\n…et ${reste} autre(s).` : "") +
      `\nSi la prestation a eu lieu, passez la fiche en « Terminé » avec un commentaire : ` +
      `c'est ce qui la fait remonter ici et disparaître de cette liste.`;

    const envoye = await slack(CANAL_MENAGES, msg);
    await monitoring(envoye ? "OK" : "ALERTE",
      envoye ? `${enRetard.length} ménage(s) sans confirmation, relance envoyée.`
             : `${enRetard.length} ménage(s) sans confirmation — ENVOI SLACK EN ÉCHEC.`);
    return NextResponse.json({ ok: true, en_retard: enRetard.length, slack: envoye });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await monitoring("ALERTE", `Relance des ménages en échec : ${msg}`);
    return NextResponse.json({ ok: false, erreur: msg }, { status: 500 });
  }
}
