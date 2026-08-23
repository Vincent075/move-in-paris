import { NextResponse } from "next/server";

// Disponibilité réelle des appartements, calculée depuis les réservations.
//
// Pourquoi (23/08) : « Disponibilité » et « Date de disponibilité » sont remplis à
// la main et avaient dérivé sur 34 des 52 appartements actifs. Quatre appartements
// occupés étaient annoncés libres, dont un pris jusqu'en juillet 2027. Le rollup
// « Prochaine disponibilité » comptait en plus les réservations ANNULÉES :
// APT-106 Rivoli passait pour occupé jusqu'au 30/11 à cause d'un booking annulé.
//
// MODÈLE RETENU : « libre à partir de la fin de la dernière réservation ».
// On avait d'abord essayé « première fenêtre libre depuis aujourd'hui ». Testé sur
// 6 périodes réelles, ce modèle ratait 42 appartements pourtant libres : un logement
// occupé jusqu'au 28/10 était décrit comme libre du 23 au 29 août, donc invisible
// pour une demande de novembre. Le modèle retenu n'en rate que 10, et uniquement
// sur des trous inter-séjours.
//
// Ces trous ne coûtent rien : le séjour le plus court jamais enregistré fait 29 nuits,
// et les 4 trous existants du parc font 13, 4, 2 et 1 jours. Ce sont des délais de
// rotation, pas des créneaux vendables.
//
// Aucun des deux modèles ne produit de faux positif : on ne propose jamais un
// appartement occupé. C'est la propriété qu'il faut préserver en priorité si ce
// calcul évolue un jour.
//
// Règles :
//   - Toute réservation NON annulée bloque. Prudence volontaire.
//   - Réservation sans date de sortie (bail en cours, pas de préavis) = bloque
//     jusqu'à nouvel ordre. Ce n'est PAS une donnée manquante : le jour où le
//     préavis tombe, la date de sortie est saisie et l'appartement réapparaît.
//   - Appartement sans aucune réservation en base : impossible à calculer, on
//     relaie le champ manuel et on le signale dans « Source dispo ».

export const dynamic = "force-dynamic";

const AT_BASE = process.env.AIRTABLE_BASE_ID || "";
const AT_TOKEN = process.env.AIRTABLE_WATCHDOG_TOKEN || "";

const T_APPARTEMENTS = "tbltFlpzQWXjoWg88";
const T_RESERVATIONS = "tbl5uN32egP4YCvUi";

// Sentinelle interne « sans terme connu ». N'est jamais écrite dans Airtable.
const SANS_TERME = "2099-12-31";
const PARC = ["Actif", "Contrat signé"];

type Rec = { id: string; fields: Record<string, unknown> };
type Creneau = { debut: string; fin: string };

async function airtable(method: string, path: string, body?: unknown) {
  const r = await fetch(`https://api.airtable.com/v0/${AT_BASE}/${path}`, {
    method,
    headers: { Authorization: `Bearer ${AT_TOKEN}`, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });
  if (!r.ok) throw new Error(`Airtable ${method} ${path} → HTTP ${r.status}`);
  return r.json();
}

async function lire(table: string, champs: string[]): Promise<Rec[]> {
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

function aujourdhuiParis(): string {
  return new Intl.DateTimeFormat("fr-CA", {
    timeZone: "Europe/Paris", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(new Date());
}

const jour = (v: unknown) => String(v ?? "").slice(0, 10);

// null = occupé sans terme connu.
export function libreAPartirDe(creneaux: Creneau[], aujourdhui: string): string | null {
  const derniereSortie = creneaux.reduce((m, c) => (c.fin > m ? c.fin : m), "");
  if (derniereSortie >= SANS_TERME) return null;
  return derniereSortie > aujourdhui ? derniereSortie : aujourdhui;
}

export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const aujourdhui = aujourdhuiParis();
  const appts = await lire(T_APPARTEMENTS, [
    "Code appartement", "Statut pipeline", "Disponibilité", "Libre à partir du", "Source dispo",
  ]);
  const resas = await lire(T_RESERVATIONS, ["Statut", "Date d'entrée", "Date de sortie", "Appartement"]);

  const parAppart = new Map<string, Creneau[]>();
  for (const r of resas) {
    if (String(r.fields["Statut"] ?? "") === "Annulée") continue;
    const debut = jour(r.fields["Date d'entrée"]);
    if (!debut) continue;
    const fin = jour(r.fields["Date de sortie"]) || SANS_TERME;
    for (const aid of (r.fields["Appartement"] as string[] | undefined) ?? []) {
      if (!parAppart.has(aid)) parAppart.set(aid, []);
      parAppart.get(aid)!.push({ debut, fin });
    }
  }

  const maj: { id: string; fields: Record<string, unknown> }[] = [];
  const compte = { reservations: 0, sansTerme: 0, manuel: 0, horsParc: 0 };

  for (const a of appts) {
    if (!PARC.includes(String(a.fields["Statut pipeline"] ?? ""))) { compte.horsParc++; continue; }
    const creneaux = parAppart.get(a.id) ?? [];
    let libre: string | null = null;
    let source: string;

    if (!creneaux.length) {
      // Aucune donnée : on n'invente rien, on relaie le jugement de Vincent.
      source = "Champ manuel";
      if (String(a.fields["Disponibilité"] ?? "") === "Disponible") libre = aujourdhui;
      compte.manuel++;
    } else {
      libre = libreAPartirDe(creneaux, aujourdhui);
      if (libre === null) { source = "Occupé sans terme"; compte.sansTerme++; }
      else { source = "Réservations"; compte.reservations++; }
    }

    if (jour(a.fields["Libre à partir du"]) === (libre ?? "") &&
        String(a.fields["Source dispo"] ?? "") === source) continue;

    maj.push({ id: a.id, fields: { "Libre à partir du": libre, "Source dispo": source } });
  }

  for (let i = 0; i < maj.length; i += 10) {
    await airtable("PATCH", T_APPARTEMENTS, { records: maj.slice(i, i + 10), typecast: true });
  }

  return NextResponse.json({ ok: true, aujourdhui, misAJour: maj.length, compte });
}
