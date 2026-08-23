import { NextResponse } from "next/server";

// Disponibilité réelle des appartements, calculée depuis les réservations.
//
// Pourquoi (23/08) : « Disponibilité » et « Date de disponibilité » sont remplis à
// la main et avaient dérivé sur 34 des 52 appartements actifs. Quatre appartements
// occupés étaient annoncés libres, dont un pris jusqu'en juillet 2027. Le rollup
// « Prochaine disponibilité » comptait en plus les réservations ANNULÉES :
// APT-106 Rivoli passait pour occupé jusqu'au 30/11 à cause d'un booking annulé.
//
// DEUX SORTIES, PARCE QU'UNE DATE NE SUFFIT PAS.
//
// 1) Sur Appartements : « Libre à partir du » = fin de la dernière réservation.
//    Répond à « qu'est-ce qui est libre durablement à partir de telle date ».
//    Compresse volontairement toutes les fenêtres en une seule date, donc PERD
//    les trous entre deux séjours.
//
// 2) Sur Disponibilités : une ligne par fenêtre réellement libre, trous compris.
//    C'est la sortie complète. Un trou de 13 jours sur le 3P Ternes redevient du
//    stock vendable pour un dépannage, au lieu de disparaître du calcul.
//    Correction du 23/08 : j'avais écarté les trous en constatant que le séjour le
//    plus court en base faisait 29 nuits. La base ne contenait que l'historique
//    depuis le lancement ; les dépannages de 7 à 12 jours existent bel et bien.
//    Ne jamais reconclure « pas de séjours courts » à partir de cette table seule.
//
// Propriété à préserver en priorité si ce calcul évolue : aucun faux positif.
// On ne propose jamais un appartement occupé.
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
const T_DISPONIBILITES = "tblQUgzOEXMnMoqhB";

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

// Zone commerciale, déduite du code postal plutôt que de la ville : la ville est
// saisie à la main et comporte des variantes (« Paris » avec espace final,
// « Levallois-Perret » et « Levallois Perret »). Le code postal, lui, est fiable.
export function zoneDe(codePostal: unknown, ville: unknown): string {
  const cp = String(codePostal ?? "").replace(/\D/g, "");
  if (cp.length === 5 && cp.startsWith("75")) {
    const n = parseInt(cp.slice(3), 10);
    return `Paris ${n === 1 ? "1er" : `${n}e`}`;
  }
  const v = String(ville ?? "").replace(/[\s-]+/g, " ").trim();
  return v || "Non renseigné";
}

// null = occupé sans terme connu.
export function libreAPartirDe(creneaux: Creneau[], aujourdhui: string): string | null {
  const derniereSortie = creneaux.reduce((m, c) => (c.fin > m ? c.fin : m), "");
  if (derniereSortie >= SANS_TERME) return null;
  return derniereSortie > aujourdhui ? derniereSortie : aujourdhui;
}

const enJours = (a: string, b: string) =>
  Math.round((Date.parse(b + "T00:00:00Z") - Date.parse(a + "T00:00:00Z")) / 864e5);

export type Fenetre = { debut: string; fin: string; sansFin: boolean; nature: string };

// Toutes les fenêtres libres à partir d'aujourd'hui, trous inter-séjours compris.
// Les réservations sont d'abord fusionnées : deux séjours qui se chevauchent ou
// s'enchaînent ne doivent pas fabriquer un faux trou de zéro jour.
export function fenetresLibres(creneaux: Creneau[], aujourdhui: string): Fenetre[] {
  const tries = [...creneaux].sort((a, b) => (a.debut < b.debut ? -1 : a.debut > b.debut ? 1 : 0));
  const fusion: Creneau[] = [];
  for (const c of tries) {
    const last = fusion[fusion.length - 1];
    if (last && c.debut <= last.fin) { if (c.fin > last.fin) last.fin = c.fin; }
    else fusion.push({ ...c });
  }

  const out: Fenetre[] = [];
  let curseur = aujourdhui;
  for (const c of fusion) {
    if (c.fin <= aujourdhui) continue;               // séjour terminé
    if (c.debut > curseur) {
      out.push({ debut: curseur, fin: c.debut, sansFin: false, nature: "Trou entre deux séjours" });
    }
    if (c.fin >= SANS_TERME) return out;             // bail sans préavis : plus rien après
    if (c.fin > curseur) curseur = c.fin;
  }
  out.push({ debut: curseur, fin: SANS_TERME, sansFin: true, nature: "Après le dernier séjour" });
  return out;
}

const jjmmaaaa = (d: string) => `${d.slice(8, 10)}/${d.slice(5, 7)}/${d.slice(0, 4)}`;
const cleCreneau = (code: string, f: Fenetre) =>
  `${code} · ${jjmmaaaa(f.debut)} → ${f.sansFin ? "sans fin" : jjmmaaaa(f.fin)}`;

export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const aujourdhui = aujourdhuiParis();
  const appts = await lire(T_APPARTEMENTS, [
    "Code appartement", "Statut pipeline", "Disponibilité", "Libre à partir du", "Source dispo",
    "Nom / Référence", "Type", "Code postal", "Ville",
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

  // ── Table Disponibilités : une ligne par fenêtre libre ────────────────────
  // La clé « Créneau » encode appartement + bornes : toute modification produit
  // une clé différente, donc un diff création/suppression suffit, sans PATCH.
  const voulues = new Map<string, Record<string, unknown>>();
  for (const a of appts) {
    if (!PARC.includes(String(a.fields["Statut pipeline"] ?? ""))) continue;
    const code = String(a.fields["Code appartement"] ?? "");
    const creneaux = parAppart.get(a.id) ?? [];
    const fenetres = creneaux.length
      ? fenetresLibres(creneaux, aujourdhui)
      : String(a.fields["Disponibilité"] ?? "") === "Disponible"
        ? [{ debut: aujourdhui, fin: SANS_TERME, sansFin: true, nature: "Aucune donnée" }]
        : [];
    for (const f of fenetres) {
      if (!f.sansFin && enJours(f.debut, f.fin) <= 0) continue;   // rotation le même jour
      const cle = cleCreneau(code, f);
      voulues.set(cle, {
        "Créneau": cle,
        "Code appartement": code,
        "Appartement": String(a.fields["Nom / Référence"] ?? ""),
        "Type": String(a.fields["Type"] ?? ""),
        "Typologie": String(a.fields["Type"] ?? ""),
        "Zone": zoneDe(a.fields["Code postal"], a.fields["Ville"]),
        "Début": f.debut,
        "Fin": f.fin,
        "Sans fin": f.sansFin,
        "Durée (jours)": f.sansFin ? null : enJours(f.debut, f.fin),
        "Nature": f.nature,
      });
    }
  }

  const existantes = await lire(T_DISPONIBILITES, ["Créneau"]);
  const parCle = new Map(existantes.map((r) => [String(r.fields["Créneau"] ?? ""), r.id]));
  const aCreer = [...voulues.entries()].filter(([c]) => !parCle.has(c)).map(([, f]) => ({ fields: f }));
  const aSupprimer = [...parCle.entries()].filter(([c]) => !voulues.has(c)).map(([, id]) => id);

  for (let i = 0; i < aCreer.length; i += 10) {
    await airtable("POST", T_DISPONIBILITES, { records: aCreer.slice(i, i + 10), typecast: true });
  }
  for (let i = 0; i < aSupprimer.length; i += 10) {
    const q = aSupprimer.slice(i, i + 10).map((id) => `records[]=${id}`).join("&");
    await airtable("DELETE", `${T_DISPONIBILITES}?${q}`);
  }

  return NextResponse.json({
    ok: true, aujourdhui, misAJour: maj.length, compte,
    creneaux: { total: voulues.size, crees: aCreer.length, supprimes: aSupprimer.length },
  });
}
