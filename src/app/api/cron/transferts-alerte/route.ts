import { NextResponse } from "next/server";

// Alerte transferts non confirmés à l'approche de la date.
//
// Chaîne réelle : « À planifier » → [bouton Airtable, AUTO-13 envoie la demande au prestataire]
// → « Envoyé » → [bouton Airtable, AUTO-14 envoie la confirmation à l'occupant] → « Planifié ».
// Donc tant que le statut n'est pas « Planifié », l'occupant n'a PAS reçu sa confirmation de transfert.
//
// AUTO-31 (J-6) relance l'occupant, mais uniquement si le transfert est déjà « Envoyé ».
// Les transferts restés « À planifier » ou « Infos demandées » ne sont surveillés par personne :
// c'est ce trou qu'on ferme ici, à J-4 de l'arrivée.

export const dynamic = "force-dynamic";

const AT_BASE = process.env.AIRTABLE_BASE_ID || "";
const AT_TOKEN = process.env.AIRTABLE_WATCHDOG_TOKEN || "";
const AT_TRANSFERTS = "tbl6rACvIe41eKXCt";
const SLACK_TOKEN = process.env.SLACK_BOT_TOKEN_MIP || "";
const SLACK_CHANNEL = "C0BC1NZGWRM";

const SEUIL_JOURS = 4;
const SEUIL_HEURES = SEUIL_JOURS * 24;
const STATUTS_OK = ["Planifié", "Terminé"]; // confirmation partie à l'occupant

type Rec = { id: string; fields: Record<string, unknown> };

async function slack(text: string) {
  if (!SLACK_TOKEN) return;
  await fetch("https://slack.com/api/chat.postMessage", {
    method: "POST",
    headers: { Authorization: `Bearer ${SLACK_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({ channel: SLACK_CHANNEL, text }),
  });
}

function heuresParis(iso: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    timeZone: "Europe/Paris", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
  }).format(new Date(iso));
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

  const now = Date.now();
  const enRetard = records.filter((rec) => {
    const statut = rec.fields["Statut"] as string | undefined;
    const date = rec.fields["Date / Heure"] as string | undefined;
    if (!date || (statut && STATUTS_OK.includes(statut))) return false;
    const h = (new Date(date).getTime() - now) / 3.6e6;
    return h >= 0 && h <= SEUIL_HEURES;
  });

  if (!enRetard.length) {
    return NextResponse.json({ ok: true, alertes: 0 });
  }

  const lignes = enRetard
    .sort((a, b) => String(a.fields["Date / Heure"]).localeCompare(String(b.fields["Date / Heure"])))
    .map((rec) => {
      const f = rec.fields;
      const occupant = Array.isArray(f["Nom occupant"]) ? (f["Nom occupant"] as string[])[0] : "";
      return `• *${f["Code transfert"]}* — ${f["Type"]} ${f["Lieu"] || ""} le ${heuresParis(String(f["Date / Heure"]))}` +
        `${occupant ? ` · ${occupant}` : ""} · statut : *${f["Statut"] || "vide"}*`;
    });

  await slack(
    `:red_circle: *${enRetard.length} transfert(s) non confirmé(s) à moins de ${SEUIL_JOURS} jours*\n` +
      `Le statut n'est pas « Planifié » : l'occupant n'a donc pas reçu sa confirmation de transfert.\n` +
      lignes.join("\n")
  );

  return NextResponse.json({ ok: true, alertes: enRetard.length, codes: enRetard.map((x) => x.fields["Code transfert"]) });
}
