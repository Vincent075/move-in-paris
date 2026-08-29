import { NextResponse } from "next/server";

// Suivi terrain : ménages et check-ins soldés par l'équipe → Slack.
//
// Pourquoi (29/08/2026, demande de Vincent) : l'équipe terrain a désormais accès aux
// deux pages de l'interface. Quand un ménage est fait, ils passent eux-mêmes le
// statut à « Terminé » et laissent un commentaire ; pour un check-in, ils notent en
// plus le nombre de clés remises. Ce qui manquait, c'est le retour : personne au
// bureau ne voyait passer l'information, donc personne ne pouvait s'y fier. Ce
// endpoint fait remonter chaque clôture dans #ménages et #check-in, commentaire
// compris. C'est ce qui rend le suivi traçable : une prestation confirmée par
// quelqu'un, à une heure connue, avec ce qu'il a constaté sur place.
//
// IDEMPOTENCE, le point sensible : on ne peut pas relire l'historique d'Airtable, on
// compare donc le statut courant au champ « Dernier statut notifié », écrit juste
// après l'envoi. Un enregistrement déjà annoncé ne repart pas, même si ce endpoint
// tourne cent fois. Un aller-retour Terminé → Planifié → Terminé renotifie, et c'est
// voulu : c'est un nouveau passage sur place.
//
// AMORÇAGE : au tout premier passage, les enregistrements déjà « Terminé » avant la
// mise en service de ce mécanisme sont marqués comme notifiés SANS rien envoyer —
// sinon Vincent recevrait d'un coup des dizaines de messages sur des prestations
// anciennes. Seul ce qui est soldé à partir de maintenant remonte.
//
// Déclenché par le temps réel Airtable (à la seconde) et par le cron horaire en
// filet, au cas où un webhook serait perdu.

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const AT_BASE = process.env.AIRTABLE_BASE_ID || "";
const AT_TOKEN = process.env.AIRTABLE_WATCHDOG_TOKEN || "";
const SLACK_TOKEN = process.env.SLACK_BOT_TOKEN_MIP || "";
const T_MENAGES = "tblVE8HEtnuTeCi8r";
const T_CHECKIN = "tbl8SktZKbyopdQ7l";
const T_MONITORING = "tblDEkjIyKoKJG5Yj";
const T_UTILISATEURS = "tblCTaXoRZpJGSesQ";
const CANAL_MENAGES = "C0BCH7FRDC2";
const CANAL_CHECKIN = "C0BLGARJ8R0";
const CHAMP_NOTIFIE = "Dernier statut notifié";
const LOT = 10;

type Dict = Record<string, unknown>;
type Rec = { id: string; fields: Dict };
const texte = (v: unknown) => (typeof v === "string" ? v : v == null ? "" : String(v));
const premier = (v: unknown) => (Array.isArray(v) ? texte(v[0]) : texte(v));

// Qui a fait le travail : deux champs, deux formes. « Collaborateur » est un compte
// Airtable et arrive comme objet {id, email, name} — l'écrire tel quel affichait
// « par [object Object] ». « Assignée à » est un lien vers Utilisateurs et arrive
// comme identifiant rec…, illisible tel quel : on le résout sur la table.
function nomPersonne(v: unknown, annuaire: Map<string, string>): string {
  if (v == null || v === "") return "";
  if (Array.isArray(v)) {
    return v.map((x) => nomPersonne(x, annuaire)).filter(Boolean).join(", ");
  }
  if (typeof v === "object") {
    const o = v as Dict;
    return texte(o["name"]) || texte(o["email"]) || "";
  }
  const s = texte(v);
  return s.startsWith("rec") ? (annuaire.get(s) || "") : s;
}

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

// L'API Slack répond 200 avec { ok: false } quand le jeton est révoqué ou l'app
// retirée du canal — la panne d'août. On lit donc la réponse au lieu de la supposer.
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
  const nom = "Suivi terrain (ménages · check-ins)";
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
  } catch { /* le tableau de bord ne conditionne pas les envois */ }
}

const heureParis = () =>
  new Intl.DateTimeFormat("fr-FR", {
    timeZone: "Europe/Paris", hour: "2-digit", minute: "2-digit",
  }).format(new Date());

const jourFr = (v: unknown) => {
  const t = Date.parse(texte(v));
  if (!Number.isFinite(t)) return texte(v).slice(0, 10);
  return new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", day: "2-digit", month: "2-digit" }).format(new Date(t));
};

function messageMenage(f: Dict, annuaire: Map<string, string>): string {
  const type = texte(f["Type"]) || "Ménage";
  const adresse = premier(f["Adresse appartement"]) || "appartement non précisé";
  const occupant = premier(f["Nom occupant"]);
  const par = nomPersonne(f["Collaborateur"], annuaire) || nomPersonne(f["Assignée à"], annuaire);
  const notes = texte(f["Notes / Dégâts"]).trim();
  let m = `*Ménage ${type.toLowerCase()} terminé* — ${adresse}\n` +
    `Prévu le ${jourFr(f["Date prévue"])}, confirmé à ${heureParis()}` +
    (par ? ` par ${par}` : "") + (occupant ? ` · locataire ${occupant}` : "");
  if (notes) m += `\n> ${notes.replace(/\n/g, "\n> ")}`;
  return m;
}

function messageCheckin(f: Dict, annuaire: Map<string, string>): string {
  const adresse = premier(f["Adresse appartement"]) || "appartement non précisé";
  const occupant = premier(f["Nom occupant"]) || "occupant non précisé";
  const cles = f["Nb de clés remises"];
  const par = nomPersonne(f["Collaborateur"], annuaire) || nomPersonne(f["Assigné à"], annuaire);
  const com = texte(f["Commentaires"]).trim();
  let m = `*Check-in effectué* — ${occupant}, ${adresse}\n` +
    `Prévu le ${jourFr(f["Date du check-in"])}${texte(f["Heure du check-in"]) ? ` à ${texte(f["Heure du check-in"])}` : ""}, ` +
    `confirmé à ${heureParis()}` + (par ? ` par ${par}` : "");
  m += `\nClés remises : ${cles == null || cles === "" ? "_non renseigné_" : `${cles}`}`;
  if (com) m += `\n> ${com.replace(/\n/g, "\n> ")}`;
  return m;
}

export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const debut = Date.now();
  const bilan = { menages: 0, checkins: 0, amorces: 0, echecs: 0 };

  try {
    const annuaire = new Map<string, string>();
    for (const u of await lireTable(T_UTILISATEURS)) {
      const nom = [texte(u.fields["Prénom"]), texte(u.fields["Nom"])].filter(Boolean).join(" ");
      if (nom) annuaire.set(u.id, nom);
    }

    const lots: Array<{
      recs: Rec[]; canal: string; message: (f: Dict, a: Map<string, string>) => string; table: string; quoi: "menages" | "checkins";
    }> = [
      { recs: await lireTable(T_MENAGES), canal: CANAL_MENAGES, message: messageMenage, table: T_MENAGES, quoi: "menages" },
      { recs: await lireTable(T_CHECKIN), canal: CANAL_CHECKIN, message: messageCheckin, table: T_CHECKIN, quoi: "checkins" },
    ];

    for (const lot of lots) {
      // Amorçage : la première fois, on marque sans annoncer. Se reconnaît au fait
      // qu'AUCUN enregistrement de la table ne porte encore de statut notifié.
      const vierge = lot.recs.every((r) => !texte(r.fields[CHAMP_NOTIFIE]));
      const aTraiter = lot.recs.filter(
        (r) => texte(r.fields["Statut"]) === "Terminé" && texte(r.fields[CHAMP_NOTIFIE]) !== "Terminé",
      );
      if (!aTraiter.length) continue;

      const marquer: Array<{ id: string; fields: Dict }> = [];
      for (const r of aTraiter) {
        if (vierge) {
          bilan.amorces++;
          marquer.push({ id: r.id, fields: { [CHAMP_NOTIFIE]: "Terminé" } });
          continue;
        }
        const envoye = await slack(lot.canal, lot.message(r.fields, annuaire));
        if (!envoye) { bilan.echecs++; continue; } // pas de marquage : on réessaiera
        bilan[lot.quoi]++;
        marquer.push({ id: r.id, fields: { [CHAMP_NOTIFIE]: "Terminé" } });
      }
      for (let i = 0; i < marquer.length; i += LOT) {
        await airtable("PATCH", lot.table, { records: marquer.slice(i, i + LOT), typecast: true });
      }
    }

    const detail = bilan.amorces
      ? `Amorçage : ${bilan.amorces} enregistrement(s) déjà terminés marqués sans notification.`
      : `${bilan.menages} ménage(s) et ${bilan.checkins} check-in(s) annoncés` +
        (bilan.echecs ? ` · ${bilan.echecs} envoi(s) Slack en échec, seront réessayés.` : ".");
    await monitoring(bilan.echecs ? "ALERTE" : "OK", detail);
    return NextResponse.json({ ok: true, ...bilan, duree_ms: Date.now() - debut });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await monitoring("ALERTE", `Suivi terrain en échec : ${msg}`);
    return NextResponse.json({ ok: false, erreur: msg }, { status: 500 });
  }
}
