import { NextResponse } from "next/server";

// Le planning des ménages, projeté sur toute la durée des séjours.
//
// Pourquoi (29/08/2026, demande de Vincent) : AUTO-12 générait la semaine suivante,
// tous les vendredis. Impossible donc de savoir ce qu'on doit à un propriétaire en
// octobre, de commander l'équipe à l'avance, ou simplement d'ouvrir le planning le
// matin en sachant ce qui vient. Pire, le planning ne suivait pas la réalité : une
// extension ou un départ anticipé signé aujourd'hui ne changeait rien avant le
// vendredi suivant.
//
// LA RÈGLE, telle que Vincent l'a posée. Il y a un ménage régulier si et seulement si
// les trois conditions sont réunies :
//   1. l'appartement est loué — une réservation engagée le couvre ce jour-là ;
//   2. la réservation a « Weekly cleaning inclus » coché — le ménage est vendu ;
//   3. l'appartement porte un « Jour de ménage régulier » — on sait quel jour passer.
// Et il y a un ménage de départ le jour de la sortie, qu'il y ait weekly cleaning ou
// non : un appartement ne change jamais de locataire sans être nettoyé.
//
// LE PLANNING SUIT LA DONNÉE, il ne la précède pas. On projette du jour d'entrée au
// jour de sortie, sans horizon arbitraire : la fin du séjour EST l'horizon. Un bail
// sans date de sortie ne produit donc pas de régulier au-delà d'une fenêtre courte,
// parce qu'on ne facture pas un ménage sur un séjour dont on ignore la fin.
//
// RÉCONCILIATION, la partie délicate. À chaque passage on recalcule la vérité, puis :
//   - ce qui manque est créé ;
//   - ce qui ne devrait plus exister est supprimé — mais UNIQUEMENT un ménage futur,
//     encore « Planifié », que personne n'a touché : ni commentaire, ni assignation.
//   Un ménage passé, soldé, en cours, annulé, commenté ou assigné n'est JAMAIS touché.
//   C'est ce qui rend le recalcul rejouable sans détruire le travail de l'équipe.
//
// Déclenché par le temps réel Airtable (Réservations, Appartements) et par un cron
// horaire en filet : une extension signée à 14h apparaît au planning dans la seconde.
//
// ?simulation=1 calcule et renvoie le détail sans écrire une seule ligne.

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const AT_BASE = process.env.AIRTABLE_BASE_ID || "";
const AT_TOKEN = process.env.AIRTABLE_WATCHDOG_TOKEN || "";
const T_MENAGES = "tblVE8HEtnuTeCi8r";
const T_RESAS = "tbl5uN32egP4YCvUi";
const T_APPARTEMENTS = "tbltFlpzQWXjoWg88";
const T_MONITORING = "tblDEkjIyKoKJG5Yj";
const LOT = 10;

// Statuts de réservation qui engagent réellement l'appartement.
const ENGAGES = new Set(["En cours", "Contrat signé", "Booking validé", "Pré-booking"]);
// Un bail sans date de sortie : on ne projette que cette fenêtre, parce qu'un séjour
// dont on ignore la fin ne justifie pas de remplir le calendrier sur des mois.
const FENETRE_BAIL_OUVERT_J = 92;
const JOURS: Record<string, number> = {
  Lundi: 1, Mardi: 2, Mercredi: 3, Jeudi: 4, Vendredi: 5, Samedi: 6, Dimanche: 0,
};

type Dict = Record<string, unknown>;
type Rec = { id: string; fields: Dict };
const texte = (v: unknown) => (typeof v === "string" ? v : v == null ? "" : String(v));
const liens = (v: unknown): string[] => (Array.isArray(v) ? (v as string[]) : []);

async function airtable(method: string, path: string, body?: unknown): Promise<Dict> {
  const r = await fetch(`https://api.airtable.com/v0/${AT_BASE}/${path}`, {
    method,
    headers: { Authorization: `Bearer ${AT_TOKEN}`, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });
  if (!r.ok) throw new Error(`Airtable ${method} ${path.slice(0, 40)} : HTTP ${r.status}`);
  return r.json();
}

async function lireTable(tableId: string): Promise<Rec[]> {
  const out: Rec[] = [];
  let offset: string | undefined;
  do {
    const url = new URL(`https://api.airtable.com/v0/${AT_BASE}/${tableId}`);
    url.searchParams.set("pageSize", "100");
    if (offset) url.searchParams.set("offset", offset);
    const r = await fetch(url.toString(), { headers: { Authorization: `Bearer ${AT_TOKEN}` }, cache: "no-store" });
    if (!r.ok) throw new Error(`lecture ${tableId} : HTTP ${r.status}`);
    const j = (await r.json()) as { records?: Rec[]; offset?: string };
    out.push(...(j.records || []));
    offset = j.offset;
  } while (offset);
  return out;
}

async function monitoring(statut: string, detail: string) {
  const nom = "Projection du planning ménages";
  try {
    const d = await airtable("GET", `${T_MONITORING}?pageSize=100`);
    const row = ((d.records as Dict[]) ?? []).find((r) => texte((r.fields as Dict)?.["Contrôle"]) === nom);
    const fields = { "Contrôle": nom, Statut: statut, "Détail": detail, "Dernière vérification": new Date().toISOString() };
    if (row) await airtable("PATCH", `${T_MONITORING}/${row.id}`, { fields, typecast: true });
    else await airtable("POST", T_MONITORING, { records: [{ fields }], typecast: true });
  } catch { /* le tableau de bord ne conditionne pas le planning */ }
}

// Verrou porté par une ligne de la table Monitoring. Airtable n'offre pas d'opération
// atomique, donc ce n'est pas un mutex parfait : deux appels à la même milliseconde
// pourraient encore passer. Mais les rafales qu'on subit viennent de webhooks espacés
// de plusieurs centaines de millisecondes, et le verrou les arrête toutes. Il expire
// seul au bout de VERROU_S : une fonction tuée en vol ne bloque pas le planning.
const VERROU = "lock:menages-projection";
const VERROU_S = 240;

async function prendreVerrou(): Promise<boolean> {
  try {
    const d = await airtable("GET", `${T_MONITORING}?pageSize=100`);
    const row = ((d.records as Dict[]) ?? []).find((r) => texte((r.fields as Dict)?.["Contrôle"]) === VERROU);
    const pose = row ? Date.parse(texte((row.fields as Dict)["Détail"])) : NaN;
    if (Number.isFinite(pose) && Date.now() - pose < VERROU_S * 1000) return false;
    const fields = {
      "Contrôle": VERROU, Statut: "OK", "Détail": new Date().toISOString(),
      "Dernière vérification": new Date().toISOString(),
    };
    if (row) await airtable("PATCH", `${T_MONITORING}/${row.id}`, { fields, typecast: true });
    else await airtable("POST", T_MONITORING, { records: [{ fields }], typecast: true });
    return true;
  } catch {
    return true; // un tableau de bord en panne ne doit pas geler le planning
  }
}

async function libererVerrou() {
  try {
    const d = await airtable("GET", `${T_MONITORING}?pageSize=100`);
    const row = ((d.records as Dict[]) ?? []).find((r) => texte((r.fields as Dict)?.["Contrôle"]) === VERROU);
    if (row) await airtable("PATCH", `${T_MONITORING}/${row.id}`, { fields: { "Détail": "" }, typecast: true });
  } catch { /* il expirera tout seul */ }
}

// Dates manipulées en jour civil pur (AAAA-MM-JJ), jamais en instants : la « Date
// prévue » est un dateTime stocké à minuit UTC, et raisonner en heures décalerait
// les ménages d'un jour selon la saison.
const iso = (d: Date) => d.toISOString().slice(0, 10);
const jour = (s: string) => new Date(`${s.slice(0, 10)}T00:00:00Z`);
const plus = (d: Date, n: number) => new Date(d.getTime() + n * 86400000);

export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const simulation = new URL(request.url).searchParams.get("simulation") === "1";
  const debut = Date.now();

  // VERROU. Deux recalculs en vol en même temps ne sont PAS idempotents : chacun lit
  // l'état d'avant écriture, ne voit rien en base, et crée l'intégralité du planning.
  // C'est ce qui a produit 1 754 ménages au lieu de 493 le 29/08/2026. Un seul passage
  // à la fois, donc — le suivant repassera de toute façon, il n'y a rien à perdre.
  if (!simulation) {
    const pris = await prendreVerrou();
    if (!pris) {
      return NextResponse.json({ ok: true, ignore: "un recalcul est déjà en cours" });
    }
  }

  try {
    const [resas, appartements, menages] = await Promise.all([
      lireTable(T_RESAS), lireTable(T_APPARTEMENTS), lireTable(T_MENAGES),
    ]);
    const appt = new Map(appartements.map((a) => [a.id, a.fields]));
    const aujourdhui = iso(new Date());

    // ── 1. La vérité : ce que le planning DEVRAIT contenir ────────────────────
    type Prevu = { appt: string; date: string; type: "Régulier" | "Départ"; duree: string; resa: string };
    const attendus = new Map<string, Prevu>();
    const cle = (p: { appt: string; date: string; type: string }) => `${p.appt}|${p.date}|${p.type}`;
    let sansJour = 0;

    for (const r of resas) {
      const f = r.fields;
      if (!ENGAGES.has(texte(f["Statut"]))) continue;
      const aid = liens(f["Appartement"])[0];
      const entree = texte(f["Date d'entrée"]).slice(0, 10);
      if (!aid || !entree) continue;
      const sortie = texte(f["Date de sortie"]).slice(0, 10);

      // Départ : le jour de la sortie, toujours, weekly cleaning ou non.
      if (sortie && sortie >= aujourdhui) {
        const p: Prevu = { appt: aid, date: sortie, type: "Départ", duree: "4h", resa: r.id };
        attendus.set(cle(p), p);
      }

      // Régulier : les trois conditions de Vincent.
      if (f["Weekly cleaning inclus"] !== true) continue;
      const nomJour = texte((appt.get(aid) as Dict | undefined)?.["Jour de ménage régulier"]);
      if (!(nomJour in JOURS)) { sansJour++; continue; }

      const fin = sortie || iso(plus(new Date(), FENETRE_BAIL_OUVERT_J));
      let d = jour(entree > aujourdhui ? entree : aujourdhui);
      while (d.getUTCDay() !== JOURS[nomJour]) d = plus(d, 1);
      const borne = jour(fin);
      while (d < borne) {
        const p: Prevu = { appt: aid, date: iso(d), type: "Régulier", duree: "2h", resa: r.id };
        // Un départ le même jour prime : on ne fait pas deux ménages.
        if (!attendus.has(cle({ ...p, type: "Départ" }))) attendus.set(cle(p), p);
        d = plus(d, 7);
      }
    }

    // ── 2. Comparer à l'existant ──────────────────────────────────────────────
    const existants = new Map<string, Rec>();
    for (const m of menages) {
      const d = texte(m.fields["Date prévue"]).slice(0, 10);
      const a = liens(m.fields["Appartement"])[0];
      if (d && a) existants.set(cle({ appt: a, date: d, type: texte(m.fields["Type"]) }), m);
    }

    const aCreer = [...attendus.values()].filter((p) => !existants.has(cle(p)));

    // Ne jamais supprimer autre chose qu'un ménage futur, encore « Planifié », que
    // personne n'a touché : c'est la garantie que le recalcul ne détruit rien.
    const aSupprimer = menages.filter((m) => {
      const f = m.fields;
      const d = texte(f["Date prévue"]).slice(0, 10);
      const a = liens(f["Appartement"])[0];
      if (!d || !a || d < aujourdhui) return false;
      if (texte(f["Statut"]) !== "Planifié") return false;
      if (texte(f["Notes / Dégâts"]).trim()) return false;
      if (liens(f["Assignée à"]).length || f["Collaborateur"]) return false;
      return !attendus.has(cle({ appt: a, date: d, type: texte(f["Type"]) }));
    });

    const parMois: Record<string, { reguliers: number; departs: number }> = {};
    for (const p of attendus.values()) {
      const m = p.date.slice(0, 7);
      parMois[m] ??= { reguliers: 0, departs: 0 };
      if (p.type === "Départ") parMois[m].departs++; else parMois[m].reguliers++;
    }

    if (simulation) {
      return NextResponse.json({
        ok: true, simulation: true,
        attendus: attendus.size, en_base: existants.size,
        a_creer: aCreer.length, a_supprimer: aSupprimer.length,
        resas_sans_jour_de_menage: sansJour,
        par_mois: Object.fromEntries(Object.entries(parMois).sort()),
        duree_ms: Date.now() - debut,
      });
    }

    // ── 3. Écrire ─────────────────────────────────────────────────────────────
    for (let i = 0; i < aCreer.length; i += LOT) {
      const records = aCreer.slice(i, i + LOT).map((p) => ({
        fields: {
          Type: p.type,
          "Date prévue": `${p.date}T08:00:00.000Z`,
          "Durée prévue": p.duree,
          Statut: "Planifié",
          Appartement: [p.appt],
          "Réservation liée": [p.resa],
        },
      }));
      await airtable("POST", T_MENAGES, { records, typecast: true });
    }
    for (let i = 0; i < aSupprimer.length; i += LOT) {
      const qs = aSupprimer.slice(i, i + LOT).map((m) => `records[]=${m.id}`).join("&");
      await airtable("DELETE", `${T_MENAGES}?${qs}`);
    }

    const detail = `${attendus.size} ménage(s) au planning · ${aCreer.length} créé(s) · ${aSupprimer.length} retiré(s).`;
    await libererVerrou();
    await monitoring("OK", detail);
    return NextResponse.json({
      ok: true, attendus: attendus.size, crees: aCreer.length, supprimes: aSupprimer.length,
      par_mois: Object.fromEntries(Object.entries(parMois).sort()), duree_ms: Date.now() - debut,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await libererVerrou();
    await monitoring("ALERTE", `Projection du planning en échec : ${msg}`);
    return NextResponse.json({ ok: false, erreur: msg }, { status: 500 });
  }
}
