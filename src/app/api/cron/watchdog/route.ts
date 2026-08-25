import { NextResponse } from "next/server";

// Watchdog des automatisations MIP (n8n + crons).
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
//
// Ajout du 23/08 — troisième famille : CONTRÔLE PAR LE RÉSULTAT.
//   Les deux familles ci-dessus regardent si le workflow a TOURNÉ. Elles ne voient pas
//   le cas où il tourne, ne plante pas, et ne fait rien : les automatisations Airtable
//   « J-2 Check-in / Check-out » ont ainsi affiché 23 succès par mois pendant des mois
//   sans envoyer un seul email (comparaison de dates entre deux formats incompatibles).
//   Ces contrôles-ci ne regardent donc pas l'exécution mais l'effet attendu : le locataire
//   a-t-il reçu quelque chose ? Ils attrapent d'un coup l'automatisation morte, le script
//   qui ne matche rien, le webhook injoignable et l'email rejeté.

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
  // request@ : canal d'entrée de TOUTES les demandes clients. Le 24/08/2026 le trigger IMAP est
  // resté figé 69 h sans que personne ne le sache, seuil 72 h. Ramené à 24 h : le week-end sans
  // trafic peut produire une fausse alerte, c'est assumé — savoir en 24 h que le canal est mort
  // vaut mieux que trois jours de demandes perdues.
  { nom: "Demandes entrantes · request@ (AUTO-00)", workflowId: "FrnZPqeYoZzG67MJ", silenceHours: 24 },
  // assistance@ : les locataires signalent quand ils ont un souci. Une semaine sans rien est plausible.
  { nom: "Interventions · assistance@ (AUTO-11)", workflowId: "gedYOrIn44VBTMUo", silenceHours: 168 },
  { nom: "Facturation quotidienne (AUTO-16)", workflowId: "wIprQ1tdkkXrMFNx", dailyByHourParis: 9 },
  { nom: "Paiements Pennylane (AUTO-17)", workflowId: "H2UffqEU4CFsT3No", dailyByHourParis: 8 },
];

// ── Contrôles par le résultat ────────────────────────────────────────────────
const AT_RESERVATIONS = "tbl5uN32egP4YCvUi";
const AT_CHECKIN = "tbl8SktZKbyopdQ7l";
// Les scripts J-2 ont été corrigés le 23/08 au soir. Le premier passage corrigé a
// lieu le 24/08 à 9h et vise les événements du 26/08 : avant cette date, l'automatisation
// n'est responsable de rien. Alerter plus tôt reviendrait à crier sur un historique
// qui n'a jamais eu de chance de partir, et sur les 4 arrivées du 24/08 que Vincent
// a délibérément choisi de ne pas envoyer.
const PLANCHER = "2026-08-26";
// L'événement est dans FENETRE_JOURS jours ou moins : l'email aurait dû partir à J-2,
// donc on alerte dès J-2 et on répète à J-1 puis le jour même. Passée la date, on se tait :
// il est trop tard, et l'alerte a déjà eu trois occasions d'être vue.
const FENETRE_JOURS = 2;
// AUTO-08A/08B sont déclenchés à 9h00 Paris. On leur laisse deux heures avant de crier.
const HEURE_MIN_PARIS = 11;
const STATUTS_RESA_ACTIVES = ["Booking validé", "Contrat envoyé", "Contrat signé", "En cours"];

function parisParts(d: Date) {
  const fmt = new Intl.DateTimeFormat("fr-FR", {
    timeZone: "Europe/Paris", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", hour12: false,
  });
  const p = Object.fromEntries(fmt.formatToParts(d).map((x) => [x.type, x.value]));
  return { date: `${p.year}-${p.month}-${p.day}`, hour: parseInt(p.hour, 10) };
}

type Exec = { startedAt: string; mode?: string; status?: string };
type Rec = { id: string; fields: Record<string, unknown> };

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

async function airtableAll(table: string, champs: string[]): Promise<Rec[]> {
  const out: Rec[] = [];
  let offset = "";
  do {
    const q = new URLSearchParams({ pageSize: "100" });
    for (const c of champs) q.append("fields[]", c);
    if (offset) q.set("offset", offset);
    const d = await airtable("GET", `${table}?${q.toString()}`);
    out.push(...((d.records as Rec[]) || []));
    offset = (d.offset as string) || "";
  } while (offset);
  return out;
}

async function slack(text: string) {
  await fetch("https://slack.com/api/chat.postMessage", {
    method: "POST",
    headers: { Authorization: `Bearer ${SLACK_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({ channel: SLACK_CHANNEL, text }),
  });
}

const jour = (v: unknown) => String(v ?? "").slice(0, 10);
const libelle = (r: Rec) =>
  `${r.fields["Code réservation"] ?? r.id}${
    Array.isArray(r.fields["Nom occupant"]) && r.fields["Nom occupant"].length
      ? ` (${(r.fields["Nom occupant"] as unknown[])[0]})`
      : ""
  }`;

type Resultat = { nom: string; statut: string; detail: string };

// Renvoie les deux contrôles « le locataire a-t-il reçu son email ? ».
// Aucune lecture n8n ici : uniquement l'état réel des données.
async function controlesResultat(paris: { date: string; hour: number }): Promise<Resultat[]> {
  const limite = parisParts(new Date(Date.now() + FENETRE_JOURS * 864e5)).date;
  const resas = await airtableAll(AT_RESERVATIONS, [
    "Code réservation", "Statut", "Date d'entrée", "Date de sortie",
    "Check-in lié", "Checkout process envoyé", "Nom occupant",
  ]);
  const checkins = await airtableAll(AT_CHECKIN, ["Rappel J-2 envoyé"]);
  const rappelEnvoye = new Map(checkins.map((c) => [c.id, c.fields["Rappel J-2 envoyé"] === true]));

  const dansLaFenetre = (d: string) => d >= PLANCHER && d >= paris.date && d <= limite;

  const arrivees = resas.filter((r) => {
    const d = jour(r.fields["Date d'entrée"]);
    if (!d || !dansLaFenetre(d)) return false;
    if (!STATUTS_RESA_ACTIVES.includes(String(r.fields["Statut"] ?? ""))) return false;
    // Pas de fiche Check-in = rien n'a pu être coché : on considère l'envoi non prouvé.
    const ci = (r.fields["Check-in lié"] as string[] | undefined)?.[0];
    return !ci || !rappelEnvoye.get(ci);
  });

  // AUTO-08B ne traite que les séjours « En cours » : on calque la même condition,
  // sinon on alerterait sur des réservations que le workflow n'aurait jamais prises.
  const departs = resas.filter((r) => {
    const d = jour(r.fields["Date de sortie"]);
    if (!d || !dansLaFenetre(d)) return false;
    if (String(r.fields["Statut"] ?? "") !== "En cours") return false;
    return r.fields["Checkout process envoyé"] !== true;
  });

  const rendre = (nom: string, manquants: Rec[], quoi: string, champDate: string): Resultat => {
    if (!manquants.length) return { nom, statut: "OK", detail: `Rien en attente sur les ${FENETRE_JOURS} prochains jours.` };
    const liste = manquants
      .map((r) => `${libelle(r)} le ${jour(r.fields[champDate])}`)
      .join(", ");
    if (paris.hour < HEURE_MIN_PARIS) {
      return { nom, statut: "OK", detail: `${manquants.length} en attente, l'automatisation de 9h n'a pas encore été jugée (contrôle à partir de ${HEURE_MIN_PARIS}h) : ${liste}.` };
    }
    return {
      nom,
      statut: "ALERTE",
      detail: `${manquants.length} ${quoi} sans trace d'envoi : ${liste}. ` +
        "L'email aurait dû partir à J-2. Vérifier l'automatisation Airtable et relancer à la main si besoin.",
    };
  };

  return [
    rendre("Rappel d'arrivée J-2 (AUTO-08A)", arrivees, "arrivée(s)", "Date d'entrée"),
    rendre("Process de départ J-2 (AUTO-08B)", departs, "départ(s)", "Date de sortie"),
  ];
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

  // Écrit l'état dans Monitoring et n'alerte que si le statut est ALERTE,
  // au plus une fois toutes les REALERT_HOURS.
  async function rapporter(nom: string, statut: string, detail: string) {
    results[nom] = statut;
    const row = rows[nom];
    const fields: Record<string, unknown> = {
      "Contrôle": nom, "Statut": statut, "Détail": detail, "Dernière vérification": now.toISOString(),
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
      await slack(`:rotating_light: *Watchdog — ${nom}*\n${detail}`);
    }
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
        // On ne regarde que les échecs SURVENUS APRÈS le dernier succès. Sans ça, un échec
        // isolé reste dans la fenêtre des 20 dernières exécutions et déclenche une alerte
        // toutes les heures pendant des jours — AUTO-16 ne tourne qu'une fois par jour, son
        // échec du 24/08 aurait crié pendant trois semaines alors qu'il était réglé le jour même.
        // Un dispositif qui crie pour rien finit par ne plus être lu.
        const iDernierSucces = execs.findIndex((e) => e.status === "success");
        const depuisDernierSucces = iDernierSucces === -1 ? execs : execs.slice(0, iDernierSucces);
        const enErreur = depuisDernierSucces.filter((e) => e.status && !["success", "running", "waiting", "new"].includes(e.status));
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
    await rapporter(check.nom, statut, detail);
  }

  // ── 3. Contrôles par le résultat ────────────────────────────────────
  // Isolés dans leur propre try : une panne Airtable ici ne doit pas priver
  // Vincent des quatre contrôles n8n déjà écrits plus haut.
  try {
    for (const r of await controlesResultat(paris)) await rapporter(r.nom, r.statut, r.detail);
  } catch (e) {
    await rapporter("Contrôles par le résultat", "ALERTE",
      `Impossible de lire Airtable : ${e instanceof Error ? e.message : e}`);
  }

  return NextResponse.json({ ok: true, paris, results });
}
