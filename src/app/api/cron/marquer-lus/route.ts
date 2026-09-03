import { NextResponse } from "next/server";
import { ImapFlow } from "imapflow";

// Marquer « lu » dans les boîtes OVH ce que la chaîne a réellement traité.
//
// Pourquoi (03/09/2026, demande de Vincent) : depuis la bascule Postmark, n8n ne lit
// plus request@ ni assistance@ en IMAP, donc plus rien ne marque les mails comme lus.
// Vincent lit ces boîtes dans Outlook et veut retrouver le sens d'avant : un mail en
// gras = pas encore traité, un mail lu = pris en charge par l'automatisation.
//
// LA RÈGLE, ET RIEN D'AUTRE : on ne marque lu qu'un mail que Postmark a effectivement
// poussé dans n8n (statut « Processed » chez Postmark). Un mail que la redirection n'a
// pas transmis, ou que Postmark a bloqué ou raté, reste en gras — c'est précisément
// l'information que Vincent veut voir. Une règle Outlook « marquer lu à l'arrivée »
// aurait donné l'apparence sans le sens.
//
// On n'écrit qu'un drapeau \Seen. Jamais de suppression, jamais de déplacement.

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const HOST = process.env.IMAP_HOST || "ssl0.ovh.net";
const SLACK_TOKEN = process.env.SLACK_BOT_TOKEN_MIP || "";
const SLACK_CANAL = "C0BC1NZGWRM"; // #automatisations_failures
const FENETRE_JOURS = 7;
// Tolérance entre la date du mail (en-tête) et sa réception chez Postmark.
const TOLERANCE_MS = 3 * 3600 * 1000;

const BOITES = [
  { boite: "request@move-in-paris.com", motDePasse: process.env.IMAP_REQUEST_PASSWORD || "", postmark: process.env.POSTMARK_REQUEST_TOKEN || "" },
  { boite: "assistance@move-in-paris.com", motDePasse: process.env.IMAP_ASSISTANCE_PASSWORD || "", postmark: process.env.POSTMARK_ASSISTANCE_TOKEN || "" },
];

// La liste Postmark ne porte pas de « ReceivedAt » : la date disponible est celle de
// l'en-tête du mail (« Date », RFC 2822), la même que l'enveloppe IMAP. C'est sur elle
// qu'on rapproche — constaté le 03/09/2026, le premier passage n'avait rien marqué.
type Entrant = { MessageID: string; From: string; Subject: string; Date?: string; ReceivedAt?: string; Status: string };

async function slack(texte: string) {
  if (!SLACK_TOKEN) return;
  await fetch("https://slack.com/api/chat.postMessage", {
    method: "POST",
    headers: { Authorization: `Bearer ${SLACK_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({ channel: SLACK_CANAL, text: texte }),
  }).catch(() => {});
}

// Postmark a-t-il poussé ce mail dans n8n ? On interroge par expéditeur (filtre exact
// côté Postmark) et on confirme sur le sujet et la date : c'est ce qui identifie un
// mail sans avoir à relire l'en-tête Message-ID de chaque réception Postmark.
async function traiteParPostmark(token: string, from: string, sujet: string, date: Date | null) {
  const q = new URLSearchParams({ count: "20", offset: "0", status: "processed", fromemail: from });
  const r = await fetch(`https://api.postmarkapp.com/messages/inbound?${q}`, {
    headers: { "X-Postmark-Server-Token": token, Accept: "application/json" }, cache: "no-store",
  });
  if (!r.ok) throw new Error(`Postmark ${r.status}`);
  const j = (await r.json()) as { InboundMessages?: Entrant[] };
  const norm = (s: string) => (s || "").replace(/\s+/g, " ").trim().toLowerCase();
  return (j.InboundMessages ?? []).some((m) => {
    if (norm(m.Subject) !== norm(sujet)) return false;
    const t = Date.parse(m.ReceivedAt || m.Date || "");
    // Même expéditeur, même sujet, statut « Processed » : sans date exploitable des deux
    // côtés, c'est déjà une identification suffisante sur une fenêtre de 7 jours.
    if (!date || !Number.isFinite(t)) return true;
    return Math.abs(t - date.getTime()) <= TOLERANCE_MS;
  });
}

async function marquer(boite: string, motDePasse: string, token: string) {
  const client = new ImapFlow({
    host: HOST, port: 993, secure: true, logger: false,
    auth: { user: boite, pass: motDePasse },
  });
  const marques: string[] = [];
  const laisses: string[] = [];
  await client.connect();
  try {
    const verrou = await client.getMailboxLock("INBOX");
    try {
      const depuis = new Date(Date.now() - FENETRE_JOURS * 86400000);
      // imapflow renvoie `false` (et non une liste vide) quand la recherche échoue.
      const uids = (await client.search({ seen: false, since: depuis }, { uid: true })) || [];
      for (const uid of uids) {
        const msg = await client.fetchOne(String(uid), { envelope: true }, { uid: true });
        if (!msg) continue;
        const env = msg.envelope;
        const from = env?.from?.[0]?.address || "";
        const sujet = env?.subject || "";
        const date = env?.date ? new Date(env.date) : null;
        const libelle = `${boite.split("@")[0]} · « ${sujet.slice(0, 60)} » · ${from}`;
        if (!from) { laisses.push(libelle + " (sans expéditeur)"); continue; }
        if (await traiteParPostmark(token, from, sujet, date)) {
          await client.messageFlagsAdd(String(uid), ["\\Seen"], { uid: true });
          marques.push(libelle);
        } else {
          laisses.push(libelle);
        }
      }
    } finally {
      verrou.release();
    }
  } finally {
    await client.logout().catch(() => {});
  }
  return { marques, laisses };
}

export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const resultats: Record<string, unknown> = {};
  const erreurs: string[] = [];
  for (const b of BOITES) {
    if (!b.motDePasse || !b.postmark) {
      erreurs.push(`${b.boite} : mot de passe IMAP ou jeton Postmark absent`);
      continue;
    }
    try {
      resultats[b.boite] = await marquer(b.boite, b.motDePasse, b.postmark);
    } catch (e) {
      erreurs.push(`${b.boite} : ${e instanceof Error ? e.message : e}`);
    }
  }
  if (erreurs.length) {
    await slack(`:warning: *Marquage « lu » des boîtes request@ / assistance@ en échec*\n${erreurs.map((x) => `• ${x}`).join("\n")}\n_Les mails traités restent en gras dans Outlook tant que ce n'est pas réparé. Le traitement n8n, lui, n'est pas concerné._`);
  }
  return NextResponse.json({ ok: erreurs.length === 0, resultats, erreurs });
}
