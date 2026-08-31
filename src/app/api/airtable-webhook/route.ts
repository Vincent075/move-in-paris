import { createHmac } from "crypto";
import { NextResponse } from "next/server";

// Temps réel Airtable → recalculs immédiats (29/08/2026, exigence de Vincent :
// « je veux que la facturation se mette à jour en temps réel, je ne négocie pas »).
//
// Airtable POSTe ici à la SECONDE où une table source change :
//   Factures · Loyers propriétaires · Interventions · Charges fixes  → finance
//   Réservations · Appartements                                      → dispo + finance
// Le recalcul est celui des crons existants — les écritures sélectives du 28/08
// le rendent quasi gratuit quand rien d'utile n'a changé (≈0,7 s), et idempotent.
// Les crons horaires restent en filet : ce endpoint accélère, il ne remplace pas.
//
// MÉCANIQUE AIRTABLE À NE PAS OUBLIER : après un ping, Airtable N'EN ENVOIE PLUS
// tant que les payloads n'ont pas été consommés (listPayloads avec curseur).
// On consomme donc systématiquement, curseur mémorisé par webhook dans la table
// Monitoring (ligne « wh:<id> »). Sans ça, le temps réel meurt après le 1er ping.
//
// BOUCLE D'ÉCHO, assumée et amortie : nos recalculs écrivent dans Loyers →
// nouveau ping → nouveau recalcul → zéro écriture (sélectif) → silence. Un écho
// par changement réel, pas d'emballement.
//
// Auth : HMAC-SHA256 du corps avec le secret propre à chaque webhook
// (X-Airtable-Content-MAC), secrets dans AIRTABLE_WEBHOOK_CONF. Un appel non
// signé est rejeté — et de toute façon ce endpoint ne fait que déclencher des
// recalculs internes, il n'accepte aucune donnée.

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const AT_BASE = process.env.AIRTABLE_BASE_ID || "";
const AT_TOKEN = process.env.AIRTABLE_WATCHDOG_TOKEN || "";
// Deux variables fusionnées, et c'est volontaire : AIRTABLE_WEBHOOK_CONF est chiffrée
// chez Vercel, donc illisible même pour la relire. Y ajouter une entrée obligerait à
// réécrire tout le contenu de mémoire, au risque de perdre les secrets des webhooks
// déjà en place. Une variable d'appoint évite d'y toucher.
const CONF: Record<string, { secret: string; table: string; nom: string }> = {
  ...JSON.parse(process.env.AIRTABLE_WEBHOOK_CONF || "{}"),
  ...JSON.parse(process.env.AIRTABLE_WEBHOOK_CONF_2 || "{}"),
};
const T_MONITORING = "tblDEkjIyKoKJG5Yj";
// Réservations, Appartements et Interventions : les trois tables dont dépend
// « Disponibilité ». Les interventions y sont depuis le 30/08 — leur webhook
// existait déjà mais ne déclenchait que le recalcul financier.
const TABLES_DISPO = new Set(["tbl5uN32egP4YCvUi", "tbltFlpzQWXjoWg88", "tblUjK6taP6ti0kGa"]);
// Ménages et Check-in : suivi terrain, aucun impact financier.
const TABLES_TERRAIN = new Set(["tblVE8HEtnuTeCi8r", "tbl8SktZKbyopdQ7l"]);
// Leads : un passage à « Signé » crée le propriétaire et l'appartement. Aucun
// impact financier, donc pas de recalcul de finance sur cette table.
const TABLE_LEADS = "tblUxEm8sB4eHyNG1";

// Les SEULS champs dont le changement peut modifier le planning des ménages.
// C'est une liste blanche, et c'est volontaire : le 29/08/2026, relancer la
// projection sur n'importe quelle modification a créé une boucle. Créer un ménage
// écrit le lien inverse « Ménages » de sa réservation, ce qui modifie la table
// Réservations, ce qui repingue ce webhook, qui relance la projection… 1 754 lignes
// au lieu de 493. En n'écoutant que ces champs-là, le lien inverse ne réveille plus
// rien : la boucle ne peut plus démarrer, au lieu d'être seulement amortie.
const CHAMPS_PLANNING = new Set([
  "fld5dNHHJbwwosc3m", // Réservations · Date d'entrée
  "flda6ctcQYNFsR8rK", // Réservations · Date de sortie
  "fldrL3Ub0cKCAE44d", // Réservations · Statut
  "fldO6C01fvh0YciBF", // Réservations · Weekly cleaning inclus
  "flddB6umdxk4anofN", // Réservations · Appartement
  "fldYfBKSIK0bm5O6r", // Appartements · Jour de ménage régulier
]);

type Dict = Record<string, unknown>;

async function airtable(method: string, path: string, body?: unknown): Promise<Dict> {
  const r = await fetch(`https://api.airtable.com/v0/${path}`, {
    method,
    headers: { Authorization: `Bearer ${AT_TOKEN}`, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });
  return r.json();
}

// Curseur de consommation, mémorisé dans Monitoring (une ligne par webhook).
async function lireCurseur(webhookId: string): Promise<{ rowId: string | null; cursor: number }> {
  const d = await airtable("GET", `${AT_BASE}/${T_MONITORING}?pageSize=100`);
  for (const rec of ((d.records as Dict[]) ?? [])) {
    const f = rec.fields as Dict;
    if (String(f["Contrôle"]) === `wh:${webhookId}`) {
      return { rowId: String(rec.id), cursor: parseInt(String(f["Détail"] ?? "1"), 10) || 1 };
    }
  }
  return { rowId: null, cursor: 1 };
}

async function ecrireCurseur(webhookId: string, rowId: string | null, cursor: number, nom: string) {
  const fields = {
    "Contrôle": `wh:${webhookId}`, Statut: "OK",
    "Détail": String(cursor),
    "Dernière vérification": new Date().toISOString(),
  };
  if (rowId) await airtable("PATCH", `${AT_BASE}/${T_MONITORING}/${rowId}`, { fields, typecast: true });
  else await airtable("POST", `${AT_BASE}/${T_MONITORING}`, { records: [{ fields: { ...fields, Statut: "OK" } }], typecast: true });
  void nom;
}

export async function POST(request: Request) {
  const corps = await request.text();

  let notif: Dict;
  try { notif = JSON.parse(corps); } catch { return NextResponse.json({ ok: false }, { status: 400 }); }
  const webhookId = String((notif.webhook as Dict)?.id ?? "");
  const conf = CONF[webhookId];
  if (!conf) return NextResponse.json({ ok: false, erreur: "webhook inconnu" }, { status: 404 });

  const mac = request.headers.get("x-airtable-content-mac") || "";
  const attendu = "hmac-sha256=" + createHmac("sha256", Buffer.from(conf.secret, "base64"))
    .update(corps, "utf8").digest("hex");
  if (mac !== attendu) return NextResponse.json({ ok: false, erreur: "signature" }, { status: 401 });

  // 1) Consommer les payloads pour réarmer les notifications. Le contenu ne nous
  //    sert pas (les recalculs relisent tout), seul le curseur compte.
  const { rowId, cursor } = await lireCurseur(webhookId);
  let c = cursor;
  let toucheLePlanning = false;
  for (let i = 0; i < 20; i++) {
    const d = await airtable("GET", `bases/${AT_BASE}/webhooks/${webhookId}/payloads?cursor=${c}&limit=50`);
    // On lit le contenu, uniquement pour savoir si un champ du planning a bougé.
    for (const p of ((d.payloads as Dict[]) ?? [])) {
      for (const t of Object.values((p.changedTablesById as Dict) ?? {})) {
        const tt = t as Dict;
        const modifs = { ...((tt.changedRecordsById as Dict) ?? {}), ...((tt.createdRecordsById as Dict) ?? {}) };
        for (const r of Object.values(modifs)) {
          const cur = ((r as Dict).current ?? r) as Dict;
          for (const fid of Object.keys((cur.cellValuesByFieldId as Dict) ?? {})) {
            if (CHAMPS_PLANNING.has(fid)) toucheLePlanning = true;
          }
        }
        // Une réservation créée ou supprimée change le planning, quels que soient
        // les champs remontés.
        if (Object.keys((tt.createdRecordsById as Dict) ?? {}).length) toucheLePlanning = true;
        if (((tt.destroyedRecordIds as string[]) ?? []).length) toucheLePlanning = true;
      }
    }
    c = parseInt(String(d.cursor ?? c), 10) || c;
    if (d.mightHaveMore !== true) break;
  }
  await ecrireCurseur(webhookId, rowId, c, conf.nom);

  // 2) Déclencher les recalculs concernés, en interne, avec le secret des crons.
  const secret = process.env.CRON_SECRET || "";
  const base = "https://move-in-paris.vercel.app";
  const lance = async (chemin: string) => {
    try {
      await fetch(`${base}${chemin}`, {
        headers: { Authorization: `Bearer ${secret}` }, cache: "no-store",
      });
    } catch { /* le filet horaire repassera */ }
  };
  // Chaque table réveille ce qui la concerne, et rien d'autre : les tables terrain
  // (ménages, check-ins) n'ont aucun effet sur la finance, les relancer serait du
  // travail pur perte et des écritures en cascade pour rien.
  const travaux = conf.table === TABLE_LEADS
    // Un lead entre : il est annoncé dans #leads dans la seconde, qu'il vienne d'un
    // formulaire du site ou d'une saisie à la main. Voir /api/cron/leads-nouveaux.
    ? [lance("/api/cron/leads-signes"), lance("/api/cron/leads-nouveaux")]
    : TABLES_TERRAIN.has(conf.table)
      // Le signataire suit l'assignation dans la seconde : c'est lui qui permet à
      // chacun de ne voir que son planning, sans rien changer à la saisie.
      ? [lance("/api/cron/terrain-notifs"), lance("/api/cron/terrain-signataire")]
      : [lance("/api/cron/finance-mensuelle")];
  if (TABLES_DISPO.has(conf.table)) {
    travaux.push(lance("/api/cron/dispo-appartements"));
    // Le planning ne se recalcule que si un champ qui le détermine a réellement
    // changé (liste blanche ci-dessus) : une extension signée ou un jour de ménage
    // modifié se voient dans la seconde, un lien inverse ne réveille rien. Le
    // recalcul pose en plus son propre verrou, pour qu'il n'en tourne jamais deux.
    if (toucheLePlanning) travaux.push(lance("/api/cron/menages-projection"));
  }
  await Promise.all(travaux);

  return NextResponse.json({ ok: true, table: conf.nom, cursor: c });
}
