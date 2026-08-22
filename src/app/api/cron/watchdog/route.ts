import { NextResponse } from "next/server";

// Chien de garde des automatisations MIP (n8n + crons).
// Lecture seule sur n8n. État + historique dans la table Airtable « Monitoring ».
// Alerte Slack #automatisations_failures, ré-alerte au plus toutes les 6 h.
//
// Principe (revu le 22/08) : une boîte email silencieuse n'est PAS une panne.
//   - request@ : c'est MIP qui transfère les demandes → pas de transfert = pas d'alerte à avoir.
//   - assistance@ : ce sont les locataires qui écrivent → pas de mail = aucun problème signalé, tant mieux.
// On distingue donc deux familles de contrôles :
//   1) PANNE AVÉRÉE (alerte immédiate) : workflow désactivé, ou dernières exécutions en erreur, ou API n8n muette.
//      C'est ce qui a réellement cassé par le passé (désactivations auto du trigger IMAP le 27/07).
//   2) SILENCE ANORMAL (alerte tardive) : plus aucune réception depuis un délai calibré sur l'historique réel.
//      Filet de sécurité pour le cas « trigger mort sans erreur » (panne des 14-17/08), sans bruit quotidien.

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
  workflowId: string;
  // Boîte email : on ne juge pas le volume reçu, seulement la santé technique.
  // silenceHours = filet de sécurité, calibré au-dessus du plus grand écart observé.
  silenceHours?: number;
  // Cron quotidien : une exécution manquante EST une panne.
  dailyByHourParis?: number;
};

const CHECKS: Check[] = [
  // request@ : écart observé médian 3 h, max 45 h → on ne s'inquiète qu'au-delà de 72 h.
  { nom: "Demandes entrantes · request@ (AUTO-00)", workflowId: "FrnZPqeYoZzG67MJ", silenceHours: 72 },
  // assistance@ : les locataires signalent quand ils ont un souci. Une semaine sans rien est plausible.
  { nom: "Interventions · assistance@ (AUTO-11)", workflowId: "gedYOrIn44VBTMUo", silenceHours: 168 },
  { nom: "Facturation quotidienne (AUTO-16)", workflowId: "wIprQ1tdkkXrMFNx", dailyByHourParis: 9 },
  { nom: "Paiements Pennylane (AUTO-17)", workflowId: "H2UffqEU4CFsT3No", dailyByHourParis: 8 },
];

function parisParts(d: Date) {
  const fmt = new Intl.DateTimeFormat("fr-FR", {
    timeZone: "Europe/Paris", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", hour12: false,
  });
  const p = Object.fromEntries(fmt.formatToParts(d).map((x) => [x.type, x.value]));
  return { date: `${p.year}-${p.month}-${p.day}`, hour: parseInt(p.hour, 10) };
}

type Exec = { startedAt: string; mode?: string; status?: string };

async function n8n(path: string) {
  const r = await fetch(`${N8N_URL}${path}`, { headers: { "X-N8N-API-KEY": N8N_KEY }, cache: "no-store" });
  if (!r.ok) throw new Error(`n8n HTTP ${r.status}`);
  return r.json();
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

  const existing = await airtable("GET", `${AT_MONITORING}?pageSize=100`);
  const rows: Record<string, { id: string; lastAlert?: string }> = {};
  for (const rec of existing.records || []) {
    rows[rec.fields["Contrôle"]] = { id: rec.id, lastAlert: rec.fields["Dernière alerte"] };
  }

  for (const check of CHECKS) {
    let statut = "OK";
    let detail = "";
    try {
      const wf = await n8n(`/api/v1/workflows/${check.workflowId}`);
      const execs: Exec[] = (await n8n(`/api/v1/executions?workflowId=${check.workflowId}&limit=20`)).data || [];

      // ── 1. Panne avérée ─────────────────────────────────────────────
      if (wf.active === false) {
        statut = "ALERTE";
        detail = "Le workflow est DÉSACTIVÉ dans n8n : plus rien ne tourne.";
      } else {
        const enErreur = execs.filter((e) => e.status && !["success", "running", "waiting", "new"].includes(e.status));
        if (enErreur.length) {
          statut = "ALERTE";
          detail = `${enErreur.length} exécution(s) en échec récemment (dernier statut : ${enErreur[0].status}).`;
        } else {
          // ── 2. Rythme attendu ─────────────────────────────────────────
          const triggers = execs.filter((e) => e.mode === "trigger");
          const last = check.dailyByHourParis
            ? (execs[0] ? new Date(execs[0].startedAt) : null)
            : (triggers[0] ? new Date(triggers[0].startedAt) : null);

          if (check.dailyByHourParis) {
            if (!last) {
              statut = "ALERTE"; detail = "Aucune exécution trouvée dans l'historique.";
            } else {
              const ranToday = parisParts(last).date === paris.date;
              detail = ranToday ? "A tourné aujourd'hui." : `Pas d'exécution aujourd'hui (dernière : ${last.toISOString()}).`;
              if (!ranToday && paris.hour >= check.dailyByHourParis) statut = "ALERTE";
            }
          } else if (check.silenceHours) {
            if (!last) {
              detail = "Aucune réception dans l'historique — workflow actif et sans erreur.";
            } else {
              const ageH = (now.getTime() - last.getTime()) / 3.6e6;
              detail = `Workflow actif, aucune erreur. Dernière réception il y a ${ageH.toFixed(0)} h.`;
              if (ageH > check.silenceHours) {
                statut = "ALERTE";
                detail = `Aucune réception depuis ${ageH.toFixed(0)} h (seuil ${check.silenceHours} h). ` +
                  "Le workflow est actif et sans erreur : c'est peut-être normal (personne n'a écrit), mais à vérifier.";
              }
            }
          }
        }
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
      await slack(`:rotating_light: *Chien de garde — ${check.nom}*\n${detail}`);
    }
  }

  return NextResponse.json({ ok: true, paris, results });
}
