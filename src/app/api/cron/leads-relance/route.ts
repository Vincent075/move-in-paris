import { NextResponse } from "next/server";

// Relance commerciale des leads MIP.
// Un lead laissé en « Contacté » plus de RELANCE_JOURS jours passe en « À relancer ».
// Le champ « Date du statut » (dernière modification du champ Statut) sert de référence.
// Airtable ayant atteint son quota d'automatisations, la règle vit ici (cron Vercel quotidien).

export const dynamic = "force-dynamic";

const AT_BASE = process.env.AIRTABLE_BASE_ID || "";
const AT_TOKEN = process.env.AIRTABLE_WATCHDOG_TOKEN || "";
const AT_LEADS = "tblUxEm8sB4eHyNG1";
const SLACK_TOKEN = process.env.SLACK_BOT_TOKEN_MIP || "";
const SLACK_CHANNEL = "C0BC1NZGWRM";

const RELANCE_JOURS = 3; // délai commercial : on relance un lead 3 jours après le 1er contact

async function airtable(method: string, path: string, body?: unknown) {
  const r = await fetch(`https://api.airtable.com/v0/${AT_BASE}/${path}`, {
    method,
    headers: { Authorization: `Bearer ${AT_TOKEN}`, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });
  return r.json();
}

async function slack(text: string) {
  if (!SLACK_TOKEN) return;
  await fetch("https://slack.com/api/chat.postMessage", {
    method: "POST",
    headers: { Authorization: `Bearer ${SLACK_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({ channel: SLACK_CHANNEL, text }),
  });
}

export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // Leads en « Contacté » dont le statut n'a pas bougé depuis RELANCE_JOURS jours
  const formula = `AND({Statut}='Contacté', IS_BEFORE({Date du statut}, DATEADD(NOW(), -${RELANCE_JOURS}, 'days')))`;
  const found = await airtable("GET", `${AT_LEADS}?pageSize=100&filterByFormula=${encodeURIComponent(formula)}`);
  const records = found.records || [];

  if (!records.length) {
    return NextResponse.json({ ok: true, relances: 0 });
  }

  // Airtable limite les écritures à 10 entrées par requête
  const codes: string[] = [];
  for (let i = 0; i < records.length; i += 10) {
    const lot = records.slice(i, i + 10);
    await airtable("PATCH", AT_LEADS, {
      records: lot.map((r: { id: string }) => ({ id: r.id, fields: { Statut: "À relancer" } })),
      typecast: true,
    });
    for (const r of lot) codes.push(r.fields?.["Code lead"] || r.id);
  }

  await slack(
    `:telephone_receiver: *${codes.length} lead(s) à relancer* — sans nouvelle depuis plus de ${RELANCE_JOURS} jours, passés de « Contacté » à « À relancer ».\n${codes.join(", ")}`
  );

  return NextResponse.json({ ok: true, relances: codes.length, codes });
}
