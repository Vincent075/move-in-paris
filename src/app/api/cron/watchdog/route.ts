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

type Exec = { id: string; workflowId?: string; startedAt: string; mode?: string; status?: string };
type Rec = { id: string; createdTime?: string; fields: Record<string, unknown> };

async function n8n(path: string) {
  const r = await fetch(`${N8N_URL}${path}`, { headers: { "X-N8N-API-KEY": N8N_KEY }, cache: "no-store" });
  if (!r.ok) throw new Error(`n8n HTTP ${r.status}`);
  return r.json();
}

// « 1 exécution en échec » ne dit pas SUR QUOI. Pour agir il faut le dossier, et
// aller le chercher dans n8n à chaque alerte est exactement le frottement qui fait
// qu'on finit par ne plus ouvrir les alertes. Le watchdog rouvre donc lui-même
// l'exécution fautive et en extrait le code réservation / facture / demande.
// Les codes MIP ont un format assez distinctif pour être trouvés par recherche
// directe dans la trace, quelle que soit la forme des données du workflow — un
// parcours structuré casserait au premier workflow qui range ses champs autrement.
const CODES_MIP = /\b(?:RES|FAC|DEM|PRO|INT|AVO)-\d{4}-\d{3,4}\b/g;
const MAX_EXECS_DETAILLEES = 3;

const champ = (o: unknown, k: string): unknown =>
  o && typeof o === "object" ? (o as Record<string, unknown>)[k] : undefined;

async function detailExec(e: Exec): Promise<string> {
  const quand = new Intl.DateTimeFormat("fr-FR", {
    timeZone: "Europe/Paris", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
  }).format(new Date(e.startedAt));
  const lien = e.workflowId ? `${N8N_URL}/workflow/${e.workflowId}/executions/${e.id}` : "";
  try {
    const full = await n8n(`/api/v1/executions/${e.id}?includeData=true`);
    const donnees = champ(full, "data");
    const brut = JSON.stringify(typeof donnees === "string" ? JSON.parse(donnees) : donnees ?? full);

    const codes = [...new Set(brut.match(CODES_MIP) || [])].slice(0, 3);
    const noms = [...new Set(
      [...brut.matchAll(/"Nom occupant":\s*\[?\s*"([^"]{2,60})"/g)].map((m) => m[1]),
    )].slice(0, 2);

    const resultData = champ(donnees, "resultData");
    const node = String(
      champ(resultData, "lastNodeExecuted") ??
        /"lastNodeExecuted":\s*"([^"]+)"/.exec(brut)?.[1] ??
        "n/a",
    );
    const msg = String(champ(champ(resultData, "error"), "message") ?? "")
      .split("\n")[0]
      .slice(0, 180);

    const dossier = codes.length
      ? `${codes.join(", ")}${noms.length ? ` (${noms.join(", ")})` : ""}`
      : "dossier non identifié dans la trace";
    return `• ${quand} · *${dossier}* — node « ${node} »${msg ? ` : ${msg}` : ""}${lien ? `\n  ${lien}` : ""}`;
  } catch {
    // L'alerte reste utile même si la trace est illisible : mieux vaut un lien nu
    // qu'une alerte avalée par une exception de confort.
    return `• ${quand} · dossier illisible (trace inaccessible)${lien ? `\n  ${lien}` : ""}`;
  }
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

// ── Nuits facturées plusieurs fois ──────────────────────────────────────────
// Le 28/08/2026, le batch a réémis 12 périodes déjà facturées (36 958 € HT) :
// AUTO-04A enchaîne ses échéances au 30/09 quand le batch part du 01/10, et le
// verrou anti-doublon ne comparait que la date de début — un jour d'écart le
// rendait aveugle. Les trois créateurs de factures ont depuis un rognage nuit
// par nuit, mais un verrou qui a déjà été aveugle une fois ne mérite plus une
// confiance sans contrôle : ce filet rebalaye toutes les factures chaque heure
// et crie tant qu'une nuit est portée par deux factures vivantes. Une facture
// annulée par avoir (lien « From field: Avoir associé ») ne compte pas.
async function controleNuitsDoubles(): Promise<Resultat> {
  const nom = "Nuits facturées plusieurs fois";
  const factures = await airtableAll(AT_FACTURES, [
    "Numéro facture", "Catégorie", "Statut", "Type",
    "Période facturée début", "Période facturée fin",
    "Réservation liée", "From field: Avoir associé",
  ]);
  const resas = await airtableAll(AT_RESERVATIONS, ["Code réservation", "Nom occupant"]);
  const nomResa = new Map(resas.map((r) => [r.id, libelle(r)]));

  const parResa = new Map<string, { nuit: string; num: string }[]>();
  for (const f of factures) {
    const g = f.fields;
    if (String(g["Catégorie"] ?? "") !== "Loyer") continue;
    if (String(g["Statut"] ?? "") === "Avoir" || String(g["Type"] ?? "") === "Avoir") continue;
    if ((g["From field: Avoir associé"] as string[] | undefined)?.length) continue;
    const a = jour(g["Période facturée début"]);
    const b = jour(g["Période facturée fin"]);
    if (!a || !b) continue;
    for (const rid of (g["Réservation liée"] as string[] | undefined) ?? []) {
      const liste = parResa.get(rid) ?? [];
      // fin exclusive : la nuit du départ appartient à l'échéance suivante
      for (let d = new Date(`${a}T00:00:00Z`); d < new Date(`${b}T00:00:00Z`); d = new Date(d.getTime() + 864e5)) {
        liste.push({ nuit: d.toISOString().slice(0, 10), num: String(g["Numéro facture"] ?? f.id) });
      }
      parResa.set(rid, liste);
    }
  }

  const lignes: string[] = [];
  for (const [rid, nuits] of parResa) {
    const parNuit = new Map<string, Set<string>>();
    for (const { nuit, num } of nuits) {
      parNuit.set(nuit, (parNuit.get(nuit) ?? new Set()).add(num));
    }
    const doubles = [...parNuit.entries()].filter(([, nums]) => nums.size > 1);
    if (!doubles.length) continue;
    const facs = [...new Set(doubles.flatMap(([, nums]) => [...nums]))].sort().join(" / ");
    lignes.push(`• ${nomResa.get(rid) ?? rid} — ${doubles.length} nuit(s) en double : ${facs}`);
  }

  if (!lignes.length) {
    return { nom, statut: "OK", detail: "Chaque nuit de loyer n'est portée que par une seule facture vivante." };
  }
  return {
    nom,
    statut: "ALERTE",
    detail:
      `${lignes.length} réservation(s) avec des nuits facturées plusieurs fois :\n${lignes.join("\n")}` +
      "\nSupprimer le brouillon en double (ou générer un avoir si la facture est émise) avant que le client ne paie deux fois.",
  };
}

// ── Cohérence du ménage hebdomadaire ────────────────────────────────────────
// Depuis le 25/08/2026, la case « Weekly cleaning inclus » de la réservation
// commande le ménage régulier dans AUTO-12. Deux façons de se tromper restent
// possibles, et aucune ne se voit à l'œil nu :
//   A. case cochée mais l'appartement n'a pas de « Jour de ménage régulier » →
//      on a vendu un ménage que la planification ne créera jamais. C'est le cas
//      qu'on a trouvé à la main sur RES-2026-0144, et personne ne l'avait vu.
//   B. case oubliée sur une location à venir dont l'appartement a bien un jour →
//      le client perdra son ménage en silence. Vincent a choisi le défaut
//      décoché en connaissance de cause ; ce rappel est la contrepartie.
// Le rappel B ne sort que le JEUDI, veille du passage d'AUTO-12 le vendredi 8h :
// c'est une revue avant planification, pas une alarme permanente. Une fois le
// locataire entré, on considère le choix délibéré et on se tait.
const AT_APPARTEMENTS = "tbltFlpzQWXjoWg88";
const JOUR_REVUE_MENAGE = 4; // jeudi

async function controlesMenageHebdo(paris: { date: string; hour: number }): Promise<Resultat[]> {
  const apts = await airtableAll(AT_APPARTEMENTS, ["Jour de ménage régulier"]);
  const jourDe = new Map(apts.map((a) => [a.id, String(a.fields["Jour de ménage régulier"] ?? "")]));
  const resas = await airtableAll(AT_RESERVATIONS, [
    "Code réservation", "Statut", "Nom occupant", "Appartement", "Weekly cleaning inclus", "Date d'entrée",
  ]);
  const actives = resas.filter((r) => STATUTS_RESA_ACTIVES.includes(String(r.fields["Statut"] ?? "")));
  const jourResa = (r: Rec) => jourDe.get(String((r.fields["Appartement"] as string[] | undefined)?.[0] ?? "")) || "";
  const cochee = (r: Rec) => r.fields["Weekly cleaning inclus"] === true;

  const promis = actives.filter((r) => cochee(r) && !jourResa(r));
  const oublis = actives.filter((r) => !cochee(r) && jourResa(r) && jour(r.fields["Date d'entrée"]) >= paris.date);

  const a: Resultat = promis.length
    ? {
        nom: "Ménage vendu mais impossible à planifier",
        statut: "ALERTE",
        detail:
          `${promis.length} réservation(s) avec « Weekly cleaning inclus » coché sur un appartement sans jour de ménage :\n` +
          promis.map((r) => `• ${libelle(r)}`).join("\n") +
          "\nAucun ménage régulier ne sera créé. Renseigner le jour de ménage sur l'appartement, ou décocher la case.",
      }
    : { nom: "Ménage vendu mais impossible à planifier", statut: "OK", detail: "Toutes les cases cochées portent sur un appartement avec un jour de ménage." };

  // getUTCDay sur la date-calendrier de Paris, fixée à midi pour éviter tout
  // glissement de fuseau : 4 = jeudi.
  const jeudi = new Date(`${paris.date}T12:00:00Z`).getUTCDay() === JOUR_REVUE_MENAGE;
  const b: Resultat = oublis.length && jeudi
    ? {
        nom: "Ménages à confirmer avant planification",
        statut: "ALERTE",
        detail:
          `AUTO-12 planifie demain 8h. ${oublis.length} location(s) à venir n'auront PAS de ménage hebdomadaire ` +
          `alors que leur appartement en propose un :\n` +
          oublis.map((r) => `• ${libelle(r)} — entrée le ${jour(r.fields["Date d'entrée"])}, ménage le ${jourResa(r)}`).join("\n") +
          "\nCocher « Weekly cleaning inclus » sur celles qui doivent en avoir.",
      }
    : {
        nom: "Ménages à confirmer avant planification",
        statut: "OK",
        detail: oublis.length
          ? `${oublis.length} location(s) à venir sans ménage hebdomadaire — revue envoyée le jeudi.`
          : "Rien à confirmer.",
      };

  return [a, b];
}

// ── Webhooks Airtable du temps réel ─────────────────────────────────────────
// Depuis le 29/08/2026, six webhooks Airtable pingent /api/airtable-webhook à la
// seconde où Factures, Loyers, Interventions, Charges, Réservations ou
// Appartements changent — c'est le « temps réel » exigé par Vincent. Airtable
// les fait EXPIRER au bout de 7 jours : sans rafraîchissement, le temps réel
// meurt en silence un vendredi et personne ne s'en aperçoit avant le cron filet.
// Chaque passage horaire prolonge donc leur bail, et crie s'il en manque un.
// Le jeton du watchdog n'a pas le scope webhook : on utilise celui qui les a
// créés (AIRTABLE_WEBHOOK_PAT = claude-lecture-mip).
const WEBHOOK_PAT = process.env.AIRTABLE_WEBHOOK_PAT || "";
const WEBHOOKS_ATTENDUS = 6;

async function controleWebhooksTempsReel(): Promise<Resultat> {
  const nom = "Webhooks temps réel Airtable";
  if (!WEBHOOK_PAT) {
    return { nom, statut: "ALERTE", detail: "AIRTABLE_WEBHOOK_PAT absent : les webhooks ne sont plus rafraîchis et mourront sous 7 jours." };
  }
  const H = { Authorization: `Bearer ${WEBHOOK_PAT}`, "Content-Type": "application/json" };
  const r = await fetch(`https://api.airtable.com/v0/bases/${AT_BASE}/webhooks`, { headers: H, cache: "no-store" });
  if (!r.ok) {
    return { nom, statut: "ALERTE", detail: `Liste des webhooks illisible (HTTP ${r.status}) : temps réel non vérifiable.` };
  }
  const liste = ((await r.json()).webhooks as { id: string; isHookEnabled?: boolean }[]) ?? [];
  let rafraichis = 0;
  for (const w of liste) {
    const rf = await fetch(`https://api.airtable.com/v0/bases/${AT_BASE}/webhooks/${w.id}/refresh`, {
      method: "POST", headers: H, cache: "no-store",
    });
    if (rf.ok) rafraichis++;
  }
  const inactifs = liste.filter((w) => w.isHookEnabled === false).length;
  if (liste.length < WEBHOOKS_ATTENDUS || inactifs) {
    return {
      nom, statut: "ALERTE",
      detail: `${liste.length}/${WEBHOOKS_ATTENDUS} webhook(s) présents${inactifs ? `, ${inactifs} désactivé(s)` : ""} — ` +
        "le temps réel est partiellement mort : relancer creer_webhooks.py puis mettre à jour AIRTABLE_WEBHOOK_CONF.",
    };
  }
  return { nom, statut: "OK", detail: `${liste.length} webhooks actifs, bail prolongé (${rafraichis} rafraîchis).` };
}

// ── Reconnexion préventive des triggers IMAP ────────────────────────────────
// OVH n'expose aucun push : la seule façon de lire request@ et assistance@ est
// l'IMAP, et le nœud n8n perd sa connexion sans jamais le dire — trois gels en
// onze jours (69 h début août, puis à peine 21 h après le redémarrage du 24/08).
// Surveiller ne suffit pas, parce que le silence d'une boîte est ambigu : sur
// AUTO-00 l'écart médian entre deux réceptions est de 3 h et le maximum observé
// de 45 h, donc aucun seuil ne sépare « personne n'écrit » de « la connexion est
// morte » sans crier à tort. On renonce donc à détecter le gel et on le rend
// improbable : la connexion est refaite toutes les six heures. Un email arrivé
// pendant la reconnexion reste non lu et sera pris au passage suivant, rien ne
// se perd.
const IMAP_WORKFLOWS = [
  { nom: "request@ (AUTO-00)", id: "FrnZPqeYoZzG67MJ" },
  { nom: "assistance@ (AUTO-11)", id: "gedYOrIn44VBTMUo" },
];
// À l'écart des crons de 7h, 8h et 9h, pour ne pas croiser une exécution en cours.
const HEURES_RECONNEXION_PARIS = [4, 10, 16, 22];
const N8N_WRITE_KEY = process.env.N8N_WATCHDOG_WRITE_KEY || "";

async function n8nPost(path: string) {
  const r = await fetch(`${N8N_URL}${path}`, {
    method: "POST",
    headers: { "X-N8N-API-KEY": N8N_WRITE_KEY, "Content-Type": "application/json" },
    body: "{}",
    cache: "no-store",
  });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}

async function reconnecterImap(heureParis: number): Promise<Resultat | null> {
  if (!HEURES_RECONNEXION_PARIS.includes(heureParis)) return null;
  const nom = "Reconnexion IMAP (request@ · assistance@)";
  if (!N8N_WRITE_KEY) {
    return { nom, statut: "ALERTE", detail: "N8N_WATCHDOG_WRITE_KEY absente : les connexions IMAP ne sont plus refaites." };
  }

  const faits: string[] = [];
  const rates: string[] = [];
  const reportes: string[] = [];
  for (const w of IMAP_WORKFLOWS) {
    try {
      // Ne jamais couper sous les pieds d'une exécution en cours. AUTO-00 appelle
      // deux fois OpenAI et enchaîne une dizaine de recherches Airtable : traiter
      // une demande peut prendre une minute, et l'interrompre laisserait une
      // demande à moitié créée, sans notification Slack, sans que personne ne le
      // sache. Si le workflow travaille, on le laisse finir — la prochaine fenêtre
      // est dans six heures, et une connexion qui vient de servir n'est de toute
      // façon pas celle qui est en train de mourir.
      const enCours = (await n8n(`/api/v1/executions?workflowId=${w.id}&status=running&limit=1`))?.data || [];
      if (enCours.length) { reportes.push(w.nom); continue; }

      await n8nPost(`/api/v1/workflows/${w.id}/deactivate`);
      // Le danger de la manœuvre est de laisser un workflow ÉTEINT : plus aucune
      // demande ne rentrerait, et en silence. On réessaie donc la réactivation
      // avant d'abandonner, et un échec complet devient une alerte immédiate.
      let actif = false;
      for (let essai = 0; essai < 3 && !actif; essai++) {
        try {
          const a = await n8nPost(`/api/v1/workflows/${w.id}/activate`);
          actif = a?.active === true;
        } catch { /* on retente */ }
      }
      if (actif) faits.push(w.nom);
      else rates.push(`${w.nom} — RESTÉ ÉTEINT, à réactiver à la main immédiatement`);
    } catch (e) {
      rates.push(`${w.nom} : ${e instanceof Error ? e.message : e}`);
    }
  }

  const report = reportes.length ? ` Reporté (exécution en cours) : ${reportes.join(", ")}.` : "";
  if (rates.length) {
    return { nom, statut: "ALERTE", detail: `Reconnexion IMAP en échec :\n• ${rates.join("\n• ")}${report}` };
  }
  const refaites = faits.length ? `Connexions refaites à ${heureParis}h : ${faits.join(", ")}.` : `Aucune connexion refaite à ${heureParis}h.`;
  return { nom, statut: "OK", detail: `${refaites}${report}` };
}

// ── Contrôle : facture créée dans Airtable, absente de Pennylane ─────────────
// Le lien Pennylane n'est écrit qu'à partir de la réponse de l'API : une facture
// sans lien exploitable n'existe donc pas chez Pennylane. C'est exactement ce qui
// s'est produit le 24/08 — jeton mort, AUTO-16 a créé les lignes Airtable, la
// création Pennylane a échoué, et personne ne l'a su. La facturation et la
// comptabilité ont divergé en silence pendant dix-neuf jours, et on ne l'a
// découvert qu'en allant regarder. C'est le genre d'écart qui ne se voit jamais
// tant qu'on ne le cherche pas : il doit donc venir à nous, pas l'inverse.
// AUTO-16 crée la ligne en « À préparer » puis enchaîne sur la création Pennylane :
// deux heures de grâce suffisent à ne pas alerter sur une facture en cours de route.
const AT_FACTURES = "tblC97ei6ZPWhWUwe";
const GRACE_FACTURE_H = 2;
const MAX_FACTURES_LISTEES = 10;

// Même lecture que celle d'AUTO-17 : invoice_id en premier, repli sur une longue
// suite de chiffres en fin d'URL pour les liens restés à l'ancien format. Le seuil
// de 7 chiffres écarte le « page=1 » qui traîne à la fin des liens récents.
const idPennylane = (lien: string) =>
  /invoice_id=(\d+)/.exec(lien)?.[1] ?? /(\d{7,})\D*$/.exec(lien)?.[1] ?? null;

const liste = (v: unknown) =>
  (Array.isArray(v) ? v : v == null ? [] : [v]).map(String).filter(Boolean).join(", ");

async function controleFacturesSansPennylane(now: Date): Promise<Resultat> {
  const nom = "Factures Airtable sans facture Pennylane";
  const factures = await airtableAll(AT_FACTURES, [
    "Numéro facture", "Statut", "Montant total HT", "Lien Pennylane",
    "Code réservation (récap)", "Occupants",
  ]);
  const orphelines = factures.filter((r) => {
    if (idPennylane(String(r.fields["Lien Pennylane"] ?? ""))) return false;
    const cree = r.createdTime ? new Date(r.createdTime).getTime() : 0;
    return cree > 0 && (now.getTime() - cree) / 3.6e6 >= GRACE_FACTURE_H;
  });

  if (!orphelines.length) {
    return { nom, statut: "OK", detail: `Les ${factures.length} factures ont bien leur contrepartie Pennylane.` };
  }

  const lignes = orphelines
    .sort((a, b) => String(b.createdTime).localeCompare(String(a.createdTime)))
    .slice(0, MAX_FACTURES_LISTEES)
    .map((r) => {
      const f = r.fields;
      const resa = liste(f["Code réservation (récap)"]) || "sans réservation";
      const qui = liste(f["Occupants"]);
      return `• *${f["Numéro facture"] ?? r.id}* — ${f["Montant total HT"] ?? "?"} € HT · ${resa}` +
        `${qui ? ` (${qui})` : ""} · statut « ${f["Statut"] ?? "?"} » · créée le ${jour(r.createdTime)}`;
    });
  const reste = orphelines.length - lignes.length;

  return {
    nom,
    statut: "ALERTE",
    detail:
      `${orphelines.length} facture(s) existent dans Airtable sans facture Pennylane :\n` +
      lignes.join("\n") +
      (reste > 0 ? `\n…et ${reste} autre(s).` : "") +
      "\nElles n'ont donc jamais été émises côté comptabilité : à recréer, ou à supprimer si elles n'ont pas lieu d'être.",
  };
}


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
          const lignes = await Promise.all(enErreur.slice(0, MAX_EXECS_DETAILLEES).map(detailExec));
          const reste = enErreur.length - lignes.length;
          detail =
            `${enErreur.length} exécution(s) en échec depuis le dernier succès ` +
            `(dernier statut : ${enErreur[0].status}).\n${lignes.join("\n")}` +
            (reste > 0 ? `\n…et ${reste} autre(s) plus ancienne(s).` : "");
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
    const fac = await controleFacturesSansPennylane(now);
    await rapporter(fac.nom, fac.statut, fac.detail);
    for (const r of await controlesMenageHebdo(paris)) await rapporter(r.nom, r.statut, r.detail);
    const dbl = await controleNuitsDoubles();
    await rapporter(dbl.nom, dbl.statut, dbl.detail);
    const wh = await controleWebhooksTempsReel();
    await rapporter(wh.nom, wh.statut, wh.detail);
  } catch (e) {
    await rapporter("Contrôles par le résultat", "ALERTE",
      `Impossible de lire Airtable : ${e instanceof Error ? e.message : e}`);
  }

  // ── 4. Reconnexion préventive des boîtes mail ───────────────────────────
  // Isolée elle aussi : si n8n refuse l'écriture, les contrôles précédents ont
  // déjà été rapportés et ne doivent pas être perdus.
  try {
    const rec = await reconnecterImap(paris.hour);
    if (rec) await rapporter(rec.nom, rec.statut, rec.detail);
  } catch (e) {
    await rapporter("Reconnexion IMAP (request@ · assistance@)", "ALERTE",
      `Reconnexion impossible : ${e instanceof Error ? e.message : e}`);
  }

  return NextResponse.json({ ok: true, paris, results });
}
