import { NextResponse } from "next/server";

// Relance manuelle des transferts non confirmés, à J-4 de l'arrivée.
//
// Chaîne réelle : « À planifier » → [bouton, AUTO-13 demande les infos au prestataire] → « Envoyé »
// → [bouton, AUTO-14 envoie la confirmation à l'occupant] → « Planifié ».
// AUTO-31 relance l'OCCUPANT à J-6, mais seulement s'il est déjà « Envoyé ».
//
// Pourquoi la date d'ARRIVÉE de la réservation, et pas la date du transfert :
// tant que l'occupant n'a pas donné son vol/train, le champ « Date / Heure » est VIDE.
// Or ce sont exactement ces transferts-là qu'il faut relancer (les 4 « Infos demandées » du 22/08
// n'avaient aucune date). La date d'entrée de la résa, elle, est toujours renseignée.
// Le transfert peut décaler d'un jour, peu importe : c'est l'arrivée qui fait référence.
//
// À J-4, si le statut n'est toujours pas « Planifié », l'occupant n'a pas répondu à la relance J-6 :
// on prévient dans Slack pour écrire un mail manuel. Deuxième et dernière chance avant l'arrivée.

export const dynamic = "force-dynamic";

const AT_BASE = process.env.AIRTABLE_BASE_ID || "";
const AT_TOKEN = process.env.AIRTABLE_WATCHDOG_TOKEN || "";
const AT_TRANSFERTS = "tbl6rACvIe41eKXCt";
const SLACK_TOKEN = process.env.SLACK_BOT_TOKEN_MIP || "";
const SLACK_CHANNEL = "C0BC1NZGWRM";

const SEUIL_JOURS = 4;
const STATUTS_OK = ["Planifié", "Terminé"]; // confirmation partie à l'occupant

type Rec = { id: string; fields: Record<string, unknown> };

const first = (v: unknown) => (Array.isArray(v) ? v[0] : v);

async function slack(text: string) {
  if (!SLACK_TOKEN) return;
  await fetch("https://slack.com/api/chat.postMessage", {
    method: "POST",
    headers: { Authorization: `Bearer ${SLACK_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({ channel: SLACK_CHANNEL, text }),
  });
}

// Jours entiers restants avant l'arrivée, en date civile Europe/Paris.
function joursAvant(dateArrivee: string, now: Date) {
  const jour = (d: Date) =>
    new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris", year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
  const a = new Date(`${String(dateArrivee).slice(0, 10)}T12:00:00Z`);
  const b = new Date(`${jour(now)}T12:00:00Z`);
  return Math.round((a.getTime() - b.getTime()) / 86400000);
}

export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const r = await fetch(`https://api.airtable.com/v0/${AT_BASE}/${AT_TRANSFERTS}?pageSize=100`, {
    headers: { Authorization: `Bearer ${AT_TOKEN}` },
    cache: "no-store",
  });
  const records: Rec[] = (await r.json()).records || [];
  const now = new Date();

  const aRelancer = records
    .map((rec) => {
      const arrivee = first(rec.fields["Date d'entrée résa"]) as string | undefined;
      return { rec, arrivee, j: arrivee ? joursAvant(arrivee, now) : null };
    })
    .filter(({ rec, arrivee, j }) => {
      const statut = rec.fields["Statut"] as string | undefined;
      if (!arrivee || j === null) return false;
      if (statut && STATUTS_OK.includes(statut)) return false;
      return j >= 0 && j <= SEUIL_JOURS;
    })
    .sort((a, b) => (a.j as number) - (b.j as number));

  if (!aRelancer.length) {
    return NextResponse.json({ ok: true, alertes: 0 });
  }

  const lignes = aRelancer.map(({ rec, arrivee, j }) => {
    const f = rec.fields;
    const occupant = first(f["Nom occupant"]) || "";
    const tel = f["Téléphone"] ? ` · ${f["Téléphone"]}` : "";
    const quand = j === 0 ? "aujourd'hui" : j === 1 ? "demain" : `dans ${j} jours`;
    return `• *${f["Code transfert"]}* — arrivée ${quand} (${String(arrivee).slice(0, 10)})` +
      `${occupant ? ` · ${occupant}` : ""}${tel} · statut : *${f["Statut"] || "vide"}*`;
  });

  await slack(
    `:warning: *${aRelancer.length} transfert(s) non confirmé(s) à J-${SEUIL_JOURS}*\n` +
      "Le statut n'est pas « Planifié » : l'occupant n'a pas donné ses informations de vol/train " +
      "et n'a pas répondu à la relance automatique J-6. *À relancer à la main.*\n" +
      lignes.join("\n")
  );

  return NextResponse.json({
    ok: true,
    alertes: aRelancer.length,
    codes: aRelancer.map(({ rec, j }) => ({ code: rec.fields["Code transfert"], jours: j, statut: rec.fields["Statut"] })),
  });
}
