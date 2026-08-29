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
const CONF: Record<string, { secret: string; table: string; nom: string }> =
  JSON.parse(process.env.AIRTABLE_WEBHOOK_CONF || "{}");
const T_MONITORING = "tblDEkjIyKoKJG5Yj";
const TABLES_DISPO = new Set(["tbl5uN32egP4YCvUi", "tbltFlpzQWXjoWg88"]);
// Ménages et Check-in : suivi terrain, aucun impact financier.
const TABLES_TERRAIN = new Set(["tblVE8HEtnuTeCi8r", "tbl8SktZKbyopdQ7l"]);

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
  for (let i = 0; i < 20; i++) {
    const d = await airtable("GET", `bases/${AT_BASE}/webhooks/${webhookId}/payloads?cursor=${c}&limit=50`);
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
  const travaux = TABLES_TERRAIN.has(conf.table)
    ? [lance("/api/cron/terrain-notifs")]
    : [lance("/api/cron/finance-mensuelle")];
  if (TABLES_DISPO.has(conf.table)) travaux.push(lance("/api/cron/dispo-appartements"));
  await Promise.all(travaux);

  return NextResponse.json({ ok: true, table: conf.nom, cursor: c });
}
