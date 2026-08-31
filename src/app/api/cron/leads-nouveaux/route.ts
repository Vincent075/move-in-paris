import { NextResponse } from "next/server";

// Tout nouveau lead → notification #leads, quelle que soit son origine.
//
// Pourquoi (31/08/2026) : seuls les leads venus des formulaires du site étaient
// annoncés, parce que la notification était postée par /api/contact au moment de
// la soumission. Un lead saisi à la main dans Airtable — un appel, une recommandation,
// un contact pris en rendez-vous — n'existait pour personne d'autre que celui qui
// l'avait tapé. C'est précisément le lead le plus qualifié qui passait sous silence.
//
// Ce contrôle-ci ne regarde donc plus l'origine mais la table : il notifie ce qui
// entre, point. Il est réveillé par le webhook temps réel déjà posé sur la table
// Leads (donc dans les deux secondes), et repassé toutes les heures en filet.
//
// L'idempotence tient au champ « Notifié Slack le » : /api/contact l'horodate dès la
// création pour les leads du site, qui sont déjà annoncés par ses soins et ne doivent
// pas l'être deux fois. Un lead saisi à la main ne l'a pas, donc il part.

export const dynamic = "force-dynamic";

const AT_BASE = process.env.AIRTABLE_BASE_ID || "";
const AT_TOKEN = process.env.AIRTABLE_WATCHDOG_TOKEN || "";
const SLACK_TOKEN = process.env.SLACK_BOT_TOKEN_MIP || "";
const SLACK_CHANNEL = "C0BLK75UCAG"; // #leads, le canal de l'équipe commerciale

const T_LEADS = "tblUxEm8sB4eHyNG1";
const CHAMP_NOTIF = "Notifié Slack le";

// Les leads antérieurs à la mise en service ne sont pas annoncés : ils sont déjà
// connus, et déverser cinquante notifications d'un coup ferait fuir le canal.
const PLANCHER = "2026-08-31T11:00:00.000Z";
// Garde-fou : si une reprise en masse survenait malgré le plancher, on préfère
// tronquer et le dire plutôt que d'inonder Slack.
const MAX_PAR_PASSAGE = 15;

type Rec = { id: string; fields: Record<string, unknown> };

async function airtable(method: string, path: string, body?: unknown) {
  const r = await fetch(`https://api.airtable.com/v0/${AT_BASE}/${path}`, {
    method,
    headers: { Authorization: `Bearer ${AT_TOKEN}`, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });
  if (!r.ok) throw new Error(`Airtable ${method} ${path} -> HTTP ${r.status} ${await r.text()}`);
  return r.json();
}

async function slack(texteMessage: string): Promise<boolean> {
  if (!SLACK_TOKEN) return false;
  try {
    const r = await fetch("https://slack.com/api/chat.postMessage", {
      method: "POST",
      headers: { Authorization: `Bearer ${SLACK_TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify({ channel: SLACK_CHANNEL, text: texteMessage }),
    });
    return (await r.json())?.ok === true;
  } catch {
    return false;
  }
}

const texte = (v: unknown) => (v == null ? "" : String(v)).trim();
const euros = (v: unknown) => (typeof v === "number" && v > 0 ? v.toLocaleString("fr-FR") : "");

function message(f: Record<string, unknown>) {
  const nom = [f["Civilité"], f["Prénom"], f["Nom"]].map(texte).filter(Boolean).join(" ");
  const contact = [
    texte(f["Téléphone"]) ? `📞 ${texte(f["Téléphone"])}` : "",
    texte(f["Email"]) ? `✉️ ${texte(f["Email"])}` : "",
  ].filter(Boolean).join(" · ");
  // Un lead sans « Source formulaire » ne vient d'aucun formulaire : il a été saisi
  // à la main. Le dire évite de chercher un formulaire qui n'existe pas.
  const source = texte(f["Source formulaire"]) || "Saisi à la main dans Airtable";
  const min = euros(f["Estimation MIP min (€/mois)"]);
  const max = euros(f["Estimation MIP max (€/mois)"]);
  const collab = (f["Collaborateur"] as { name?: string } | undefined)?.name;
  const code = texte(f["Code lead"]);
  return [
    `🆕 *Nouveau lead${code ? ` ${code}` : ""}* — ${nom || "sans nom"}`,
    `Source : ${source}`,
    contact,
    texte(f["Adresse du bien"]) ? `Bien : ${texte(f["Adresse du bien"])}` : "",
    min && max ? `Estimation : ${min} – ${max} €/mois` : "",
    collab ? `Suivi par : ${collab}` : "",
    texte(f["Message"]) ? `\n>${texte(f["Message"]).slice(0, 400).replace(/\n/g, "\n>")}` : "",
  ].filter(Boolean).join("\n");
}

export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const simulation = new URL(request.url).searchParams.get("simulation") === "1";

  const q = new URLSearchParams({ pageSize: "100" });
  for (const c of ["Code lead", "Civilité", "Prénom", "Nom", "Email", "Téléphone",
    "Adresse du bien", "Message", "Source formulaire", "Collaborateur",
    "Estimation MIP min (€/mois)", "Estimation MIP max (€/mois)", "Date de réception"]) {
    q.append("fields[]", c);
  }
  q.set("filterByFormula",
    `AND({${CHAMP_NOTIF}} = BLANK(), IS_AFTER({Date de réception}, '${PLANCHER}'))`);
  const nouveaux: Rec[] = (await airtable("GET", `${T_LEADS}?${q}`)).records ?? [];

  if (simulation) {
    return NextResponse.json({
      ok: true, simulation: true, aNotifier: nouveaux.length,
      apercu: nouveaux.slice(0, 5).map((r) => message(r.fields)),
    });
  }

  const lot = nouveaux.slice(0, MAX_PAR_PASSAGE);
  const envoyes: string[] = [];
  const rates: string[] = [];
  for (const r of lot) {
    // On horodate AVANT de poster : deux réveils simultanés du webhook liraient
    // sinon le même lead et l'annonceraient deux fois. En cas d'échec Slack on
    // efface l'horodatage, et le passage horaire réessaiera.
    await airtable("PATCH", T_LEADS, {
      records: [{ id: r.id, fields: { [CHAMP_NOTIF]: new Date().toISOString() } }],
    });
    if (await slack(message(r.fields))) {
      envoyes.push(texte(r.fields["Code lead"]) || r.id);
    } else {
      await airtable("PATCH", T_LEADS, { records: [{ id: r.id, fields: { [CHAMP_NOTIF]: null } }] });
      rates.push(texte(r.fields["Code lead"]) || r.id);
    }
  }

  return NextResponse.json({
    ok: true,
    notifies: envoyes,
    echecs: rates,
    restants: Math.max(0, nouveaux.length - lot.length),
  });
}
