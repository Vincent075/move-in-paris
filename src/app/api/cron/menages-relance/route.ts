import { NextResponse } from "next/server";
import {
  lireEnregistrement, signataire, htmlEmailLocataire, envoyerEmailLocataire, dateEN,
  jourParis as jourParisLib, texte as texteLib, premier as premierLib,
} from "@/lib/mip/courrier";

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

// ── Rappel J-1 aux locataires ────────────────────────────────────────────────
const T_RESERVATIONS = "tbl5uN32egP4YCvUi";
const T_OCCUPANTS = "tblgcFnDwxjqVJy8L";
const T_APPARTEMENTS = "tbltFlpzQWXjoWg88";
const CHAMP_RAPPEL = "Rappel locataire envoyé le";

async function rappelsLocatairesJ1(menages: Rec[], aujourdhui: string, opts: { ligne?: string; test?: boolean } = {}) {
  const demain = jourParisLib(new Date(Date.now() + 86400_000));
  // Recette : `?ligne=recXXX&test=1` envoie le rappel d'un ménage précis à Vincent,
  // sans horodater la fiche ni prévenir Slack.
  const candidats = opts.ligne
    ? menages.filter((m) => m.id === opts.ligne)
    : menages.filter((m) =>
      texte(m.fields["Type"]) === "Régulier" &&
      texte(m.fields["Statut"]) === "Planifié" &&
      jourParis(m.fields["Date prévue"]) === demain &&
      !texte(m.fields[CHAMP_RAPPEL]),
    );
  const envoyes: string[] = [];
  const sautes: string[] = [];
  const echecs: string[] = [];
  for (const m of candidats) {
    const adresse = premier(m.fields["Adresse appartement"]) || "appartement non précisé";
    const libelle = `${jourFr(m.fields["Date prévue"])} · ${adresse}`;
    try {
      const resa = await lireEnregistrement(T_RESERVATIONS, premier(m.fields["Réservation liée"]));
      if (!resa) { sautes.push(`${libelle} — pas de réservation liée`); continue; }
      const occ = await lireEnregistrement(T_OCCUPANTS, premierLib(resa.fields["Occupant"]));
      const email = texteLib(occ?.fields["Email"]).trim();
      if (!occ || !email) { sautes.push(`${libelle} — occupant sans email`); continue; }
      const appt = await lireEnregistrement(T_APPARTEMENTS, premierLib(resa.fields["Appartement"]));
      const nomCourt = texteLib(appt?.fields["Nom / Référence"]) || texteLib(appt?.fields["adresse complète"]) || adresse;
      const adresseComplete = texteLib(appt?.fields["adresse complète"]) || texteLib(appt?.fields["Adresse"]) || adresse;
      const sgn = await signataire(resa.fields["Collaborateur"]);

      // Le Housekeeping process n'est PAS rejoint : le locataire l'a déjà reçu avec
      // son email d'arrivée (Vincent, 03/09/2026). On lui dit seulement où il se trouve.
      const prenom = texteLib(occ.fields["Prénom"]).trim().split(/\s+/)[0] || "Guest";
      const html = htmlEmailLocataire({
        titre: `Your weekly cleaning is tomorrow · ${nomCourt}`,
        prenom,
        intro: [
          `A quick reminder that your <strong>weekly cleaning</strong> at <strong>${adresseComplete}</strong> is scheduled for <strong>tomorrow, ${dateEN(m.fields["Date prévue"])}</strong>, between 10am and 5pm.`,
        ],
        cartes: [
          { label: "Apartment", valeur: nomCourt },
          { label: "Cleaning day", valeur: dateEN(m.fields["Date prévue"]), gras: true },
          { label: "Time window", valeur: "Between 10am and 5pm" },
        ],
        encadre: {
          titre: "Before our team arrives",
          corps: "Please follow the <strong>Housekeeping process</strong> you received with your arrival email: tidy surfaces, put personal belongings away, and make sure our team can access every room. Our housekeeper has a set of keys and will let herself in if you are out.",
        },
        fin: [
          "If tomorrow does not suit you, simply reply to this email and we will find another day this week.",
          "Thank you, and have a lovely day in Paris.",
        ],
        signataire: sgn,
      });
      // Un seul passage par jour : un relais n8n qui tousse ne doit pas faire perdre le
      // rappel. Seconde tentative après 8 s avant de déclarer l'échec.
      const envoi = () => envoyerEmailLocataire({
        usrEmail: sgn.email, mailTo: opts.test ? "vincent@move-in-paris.com" : email, mailReplyTo: sgn.email,
        mailSubject: `${opts.test ? "[TEST] " : ""}Your weekly cleaning is tomorrow · ${nomCourt}`,
        mailHtml: html,
        origine: "menages-relance/rappel-j1",
      });
      let res = await envoi();
      if (!res.ok) { await new Promise((r) => setTimeout(r, 8000)); res = await envoi(); }
      if (!res.ok) { echecs.push(`${libelle} — ${res.erreur}`); continue; }
      if (!opts.test) {
        await airtable("PATCH", T_MENAGES, { records: [{ id: m.id, fields: { [CHAMP_RAPPEL]: new Date().toISOString() } }], typecast: true });
      }
      envoyes.push(`${libelle} → ${opts.test ? "vincent@ (test)" : email}`);
    } catch (e) {
      echecs.push(`${libelle} — ${e instanceof Error ? e.message : e}`);
    }
  }
  if (!opts.test && (envoyes.length || echecs.length)) {
    await slack(CANAL_MENAGES,
      `*Rappels J-1 envoyés aux locataires* — ménages de demain ${demain} (aujourd'hui ${aujourdhui})\n` +
      (envoyes.length ? envoyes.map((x) => `• ${x}`).join("\n") : "• aucun") +
      (sautes.length ? `\n_Non envoyés (données manquantes) :_\n${sautes.map((x) => `• ${x}`).join("\n")}` : "") +
      (echecs.length ? `\n:warning: *Échecs :*\n${echecs.map((x) => `• ${x}`).join("\n")}` : ""));
  }
  return {
    envoyes: envoyes.length, sautes: sautes.length, echecs: echecs.length,
    resume: `Rappels J-1 : ${envoyes.length} envoyé(s), ${sautes.length} sans données, ${echecs.length} en échec.`,
  };
}

export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const menages = await lireTable(T_MENAGES);
    const aujourdhui = jourParis(new Date());

    // Recette du rappel J-1 (`?ligne=recXXX&test=1`) : on ne fait QUE ça. Les étapes 1
    // et 2 (bascule des ménages du jour, relance Slack, Monitoring) sont réservées au
    // passage planifié du matin — un essai l'après-midi ne doit rien écrire ni republier.
    const urlReq = new URL(request.url);
    const ligneRecette = urlReq.searchParams.get("ligne") || undefined;
    const testRecette = urlReq.searchParams.get("test") === "1";
    if (ligneRecette || testRecette) {
      if (!testRecette) return NextResponse.json({ ok: false, erreur: "?ligne= n'est accepté qu'avec &test=1 (un envoi réel passe par le cron du matin)" }, { status: 400 });
      const rappels = await rappelsLocatairesJ1(menages, aujourdhui, { ligne: ligneRecette, test: true });
      return NextResponse.json({ ok: true, test: true, rappels });
    }

    // ── 1. Les ménages du jour passent en « En cours » ────────────────────────
    // On compare des jours civils à Paris, pas des instants : « Date prévue » est un
    // dateTime dont l'heure ne veut rien dire ici (2h du matin pour la plupart), et
    // raisonner en UTC ferait basculer les ménages un jour trop tôt ou trop tard.
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

    // ── 3. Rappel J-1 aux locataires (03/09/2026, demande de Vincent) ─────────
    // La veille d'un ménage RÉGULIER, le locataire reçoit un rappel en anglais depuis
    // la boîte du collaborateur : le passage a lieu « between 10am and 5pm » (l'heure
    // n'est jamais planifiée). Le Housekeeping process n'est pas rejoint : il a été
    // envoyé avec l'email d'arrivée, le rappel dit seulement où le retrouver. Jamais
    // pour un départ.
    // Idempotence : « Rappel locataire envoyé le » sur le ménage.
    const rappels = await rappelsLocatairesJ1(menages, aujourdhui);

    if (!enRetard.length) {
      await monitoring("OK",
        `${bascules} ménage(s) du jour passé(s) en « En cours ». Aucun ménage en attente de confirmation. ${rappels.resume}`);
      return NextResponse.json({ ok: true, bascules, en_retard: 0, rappels });
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
    return NextResponse.json({ ok: true, bascules, en_retard: enRetard.length, slack: envoye, rappels });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await monitoring("ALERTE", `Relance des ménages en échec : ${msg}`);
    return NextResponse.json({ ok: false, erreur: msg }, { status: 500 });
  }
}
