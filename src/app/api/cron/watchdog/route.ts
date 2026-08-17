import { NextResponse } from "next/server";

// Chien de garde des automatisations MIP (n8n + crons).
// Lecture seule sur n8n. État + historique dans la table Airtable « Monitoring ».
// Alerte Slack #automatisations_failures, ré-alerte au plus toutes les 6 h.

export const dynamic = "force-dynamic";

const N8N_URL = process.env.N8N_WATCHDOG_URL || "";
const N8N_KEY = process.env.N8N_WATCHDOG_API_KEY || "";
const SLACK_TOKEN = process.env.SLACK_BOT_TOKEN_MIP || "";
const SLACK_CHANNEL = "C0BC1NZGWRM"; // #automatisations_failures
const AT_BASE = process.env.AIRTABLE_BASE_ID || "";
const AT_TOKEN = process.env.AIRTABLE_WATCHDOG_TOKEN || "";
const AT_MONITORING = "tblDEkjIyKoKJG5Yj";
const REALERT_HOURS = 6;

type Check = {
  nom: string;
  workflowId?: string;
  mode?: "trigger";        // ne compter que les exécutions de production
  maxAgeHours?: number;    // fraîcheur exigée
  dailyByHourParis?: number; // cron quotidien : doit avoir tourné aujourd'hui avant cette heure
};

const CHECKS: Check[] = [
  { nom: "AUTO-00 routeur request@", workflowId: "FrnZPqeYoZzG67MJ", mode: "trigger", maxAgeHours: 30 },
  { nom: "AUTO-11 assistance@", workflowId: "gedYOrIn44VBTMUo", mode: "trigger", maxAgeHours: 96 },
  { nom: "AUTO-16 facturation (cron 8h)", workflowId: "wIprQ1tdkkXrMFNx", dailyByHourParis: 9 },
  { nom: "AUTO-17 paiements (cron 7h)", workflowId: "H2UffqEU4CFsT3No", dailyByHourParis: 8 },
];

function parisParts(d: Date) {
  const fmt = new Intl.DateTimeFormat("fr-FR", {
    timeZone: "Europe/Paris", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", hour12: false,
  });
  const p = Object.fromEntries(fmt.formatToParts(d).map((x) => [x.type, x.value]));
  return { date: `${p.year}-${p.month}-${p.day}`, hour: parseInt(p.hour, 10) };
}

async function lastExecution(workflowId: string, triggerOnly: boolean): Promise<Date | null> {
  const r = await fetch(`${N8N_URL}/api/v1/executions?workflowId=${workflowId}&limit=20`, {
    headers: { "X-N8N-API-KEY": N8N_KEY }, cache: "no-store",
  });
  if (!r.ok) throw new Error(`n8n HTTP ${r.status}`);
  const data = (await r.json()).data || [];
  for (const e of data) {
    if (triggerOnly && e.mode !== "trigger") continue;
    return new Date(e.startedAt);
  }
  return null;
}

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

  const now = new Date();
  const paris = parisParts(now);
  const results: Record<string, string> = {};

  // état existant (une ligne par contrôle)
  const existing = await airtable("GET", `${AT_MONITORING}?pageSize=100`);
  const rows: Record<string, { id: string; lastAlert?: string }> = {};
  for (const rec of existing.records || []) {
    rows[rec.fields["Contrôle"]] = { id: rec.id, lastAlert: rec.fields["Dernière alerte"] };
  }

  for (const check of CHECKS) {
    let statut = "OK";
    let detail = "";
    try {
      const last = await lastExecution(check.workflowId!, check.mode === "trigger");
      if (!last) {
        statut = "ALERTE"; detail = "Aucune exécution trouvée dans l'historique.";
      } else if (check.maxAgeHours) {
        const ageH = (now.getTime() - last.getTime()) / 3.6e6;
        detail = `Dernière exécution il y a ${ageH.toFixed(1)} h.`;
        if (ageH > check.maxAgeHours) statut = "ALERTE";
      } else if (check.dailyByHourParis) {
        const ranToday = parisParts(last).date === paris.date;
        detail = ranToday ? "A tourné aujourd'hui." : `Pas d'exécution aujourd'hui (dernière : ${last.toISOString()}).`;
        if (!ranToday && paris.hour >= check.dailyByHourParis) statut = "ALERTE";
      }
    } catch (e) {
      statut = "ALERTE"; detail = `API n8n injoignable : ${e instanceof Error ? e.message : e}`;
    }
    results[check.nom] = statut;

    const row = rows[check.nom];
    const fields: Record<string, unknown> = {
      "Contrôle": check.nom, "Statut": statut, "Détail": detail, "Dernière vérification": now.toISOString(),
    };
    let doAlert = false;
    if (statut === "ALERTE") {
      const lastAlert = row?.lastAlert ? new Date(row.lastAlert) : null;
      doAlert = !lastAlert || (now.getTime() - lastAlert.getTime()) / 3.6e6 >= REALERT_HOURS;
      if (doAlert) fields["Dernière alerte"] = now.toISOString();
    }
    if (row) await airtable("PATCH", `${AT_MONITORING}/${row.id}`, { fields, typecast: true });
    else await airtable("POST", AT_MONITORING, { records: [{ fields }], typecast: true });

    if (doAlert) {
      await slack(`:rotating_light: *Chien de garde — ${check.nom}*\n${detail}\nAucune alerte n8n n'a été émise : panne probablement *silencieuse* (trigger mort, publication coincée ou cron arrêté). Vérifier n8n.`);
    }
  }

  return NextResponse.json({ ok: true, paris, results });
}
