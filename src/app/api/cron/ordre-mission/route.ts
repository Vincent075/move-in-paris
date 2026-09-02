import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

// Le bouton « Envoyer l'ordre de mission » de l'interface Airtable ne peut pas appeler une
// URL propre à l'intervention, et la base a atteint son plafond d'automatisations Airtable :
// impossible de refaire le montage de « Envoyer la facture » (bouton → automatisation → n8n).
// Le bouton se contente donc de COCHER une case, et c'est cette route qui fait le travail.
// Elle est réveillée en quelques secondes par le webhook Airtable des Interventions
// (voir /api/airtable-webhook), et repasse aussi toutes les heures en filet.
const AT_BASE = process.env.AIRTABLE_BASE_ID || "";
const AT_TOKEN = process.env.AIRTABLE_WATCHDOG_TOKEN || "";
const T_INTERVENTIONS = "tblUjK6taP6ti0kGa";
const CASE = "Envoyer l'ordre de mission";
const WEBHOOK = "https://vincent75.app.n8n.cloud/webhook/ordre-de-mission";

type Rec = { id: string; fields: Record<string, unknown> };
const texte = (v: unknown): string => {
  const x = Array.isArray(v) ? v[0] : v;
  return typeof x === "string" ? x : "";
};

async function airtable(method: string, path: string, body?: unknown) {
  const r = await fetch(`https://api.airtable.com/v0/${AT_BASE}/${path}`, {
    method,
    headers: { Authorization: `Bearer ${AT_TOKEN}`, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });
  if (!r.ok) throw new Error(`Airtable ${method} ${path} : HTTP ${r.status} — ${(await r.text()).slice(0, 300)}`);
  return r.json();
}

export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const debut = Date.now();
  try {
    // Seules les interventions dont la case est cochée ET qui ont un entrepreneur.
    const formule = `AND({${CASE}}, COUNTA({Entrepreneur}) > 0)`;
    const d = (await airtable(
      "GET",
      `${T_INTERVENTIONS}?filterByFormula=${encodeURIComponent(formule)}&pageSize=20`
    )) as { records?: Rec[] };
    const aTraiter = d.records ?? [];

    const faits: string[] = [];
    const rates: string[] = [];
    for (const r of aTraiter) {
      const code = texte(r.fields["Code intervention"]) || r.id;
      // On DÉCOCHE avant d'envoyer : si l'envoi échoue, on préfère un ordre de mission
      // manquant qu'un ordre envoyé deux fois à l'artisan parce que la case est restée.
      await airtable("PATCH", `${T_INTERVENTIONS}/${r.id}`, { fields: { [CASE]: false }, typecast: true });
      try {
        const rep = await fetch(`${WEBHOOK}?recordId=${encodeURIComponent(r.id)}&confirm=1`, { cache: "no-store" });
        if (!rep.ok) throw new Error(`HTTP ${rep.status}`);
        faits.push(code);
      } catch (e) {
        rates.push(`${code} : ${e instanceof Error ? e.message : String(e)}`);
      }
    }
    return NextResponse.json({
      ok: true,
      duree_ms: Date.now() - debut,
      envoyes: faits,
      echecs: rates,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
