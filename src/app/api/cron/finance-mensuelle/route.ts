import { NextResponse } from "next/server";

// Pilotage financier mois par mois — alimente deux tables Airtable, chaque nuit.
//
//   « Finance mensuelle »               : 1 ligne par mois, la vue direction.
//   « Loyers propriétaires à verser »   : 1 ligne par appartement et par mois, le suivi des virements.
//
// RÈGLE DU CA (validée avec Vincent le 22/08/2026) — chaque montant est rattaché aux mois
// qu'il COUVRE, jamais à sa date d'émission :
//
//     CA du mois = Σ factures couvrant ces jours  +  prix nuitée × jours NON encore facturés
//
// Le calcul se fait au jour près : une facture qui ne couvre qu'une partie du mois ne doit pas
// annuler le reste du séjour. Les factures partent le 28 avec un cycle M+1 ou M+2, donc en cours
// de mois une bonne part du CA n'est pas encore facturée : la part estimée comble le trou et se
// réduit toute seule à mesure que la facturation rattrape. Le champ « % facturé » dit à quel point
// la ligne est certaine.
//
// RÈGLE DU LOYER PROPRIÉTAIRE — reprise à l'identique du workflow n8n « 6.2 Récap mensuel paiements
// propriétaires » de Tech Tribe, pour que les deux chemins de calcul se contrôlent mutuellement :
//
//     Montant à virer = Loyer propriétaire / mois × nuitées occupées ÷ jours du mois
//
// Le loyer suit l'occupation : pas de réservation sur un appartement, rien de dû. Et quand deux
// réservations se chevauchent sur le même appartement, les intervalles sont FUSIONNÉS avant calcul,
// pour ne jamais payer deux fois la même nuit.
//
// CE QUE LE CRON NE TOUCHE JAMAIS : « Statut » et « Date de paiement » sur les lignes de loyers.
// Ces deux champs appartiennent à Vincent ; tout le reste est recalculé et écrasé à chaque passage.

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const AT_BASE = process.env.AIRTABLE_BASE_ID || "";
const AT_TOKEN = process.env.AIRTABLE_WATCHDOG_TOKEN || "";
const SLACK_TOKEN = process.env.SLACK_BOT_TOKEN_MIP || "";
const SLACK_CHANNEL = "C0BC1NZGWRM"; // #automatisations_failures

const T_APPARTEMENTS = "tbltFlpzQWXjoWg88";
const T_RESERVATIONS = "tbl5uN32egP4YCvUi";
const T_FACTURES = "tblC97ei6ZPWhWUwe";
const T_FINANCE = "tbleTNIQZjch1WQ6O";
const T_LOYERS = "tblLnbrAH1AfVvTb7";

// Réservations qui engagent un loyer propriétaire et génèrent du CA.
const STATUTS_RESA = ["Contrat signé", "En cours", "Check-out", "Clôturée"];
// Appartements pour lesquels MIP est engagé auprès du propriétaire.
const STATUTS_PARC = ["Actif", "Contrat signé"];

const CHAMPS_CHARGES = [
  "Charges électriques",
  "Charges gaz",
  "Charges TOEM",
  "Charges immeuble",
  "Charges internet",
  "Abonnement canal",
  "Entretien chaudière",
];

const MOIS_AVANT = 24;
const MOIS_APRES = 12;

// Mise en service de la facturation dans Airtable. Avant cette date, seuls les baux longs
// ont été saisis : le CA de ces mois-là est réel mais très incomplet, et il ne faut surtout
// pas le lire comme une performance. D'où le marqueur « Historique incomplet ».
const MISE_EN_SERVICE = "2026-07";

const NOMS_MOIS = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];

type Rec = { id: string; fields: Record<string, unknown> };

const first = (v: unknown): unknown => (Array.isArray(v) ? v[0] : v);
const nombre = (v: unknown): number => (typeof v === "number" ? v : 0);
const texte = (v: unknown): string => {
  const x = first(v);
  return typeof x === "string" ? x : "";
};
const liens = (v: unknown): string[] => (Array.isArray(v) ? (v as string[]) : []);
const arrondi = (n: number, d = 2) => Math.round(n * 10 ** d) / 10 ** d;

async function slack(text: string) {
  if (!SLACK_TOKEN) return;
  try {
    await fetch("https://slack.com/api/chat.postMessage", {
      method: "POST",
      headers: { Authorization: `Bearer ${SLACK_TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify({ channel: SLACK_CHANNEL, text }),
    });
  } catch {
    /* une alerte qui échoue ne doit pas faire tomber le calcul */
  }
}

async function lireTable(tableId: string): Promise<Rec[]> {
  const out: Rec[] = [];
  let offset: string | undefined;
  do {
    const url = new URL(`https://api.airtable.com/v0/${AT_BASE}/${tableId}`);
    url.searchParams.set("pageSize", "100");
    if (offset) url.searchParams.set("offset", offset);
    const r = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${AT_TOKEN}` },
      cache: "no-store",
    });
    if (!r.ok) throw new Error(`lecture ${tableId} : HTTP ${r.status}`);
    const j = (await r.json()) as { records?: Rec[]; offset?: string };
    out.push(...(j.records || []));
    offset = j.offset;
  } while (offset);
  return out;
}

async function ecrire(tableId: string, method: "POST" | "PATCH", records: unknown[]) {
  for (let i = 0; i < records.length; i += 10) {
    const lot = records.slice(i, i + 10);
    const r = await fetch(`https://api.airtable.com/v0/${AT_BASE}/${tableId}`, {
      method,
      headers: { Authorization: `Bearer ${AT_TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify({ records: lot, typecast: true }),
    });
    if (!r.ok) {
      const detail = await r.text();
      throw new Error(`écriture ${tableId} : HTTP ${r.status} — ${detail.slice(0, 300)}`);
    }
  }
}

async function supprimer(tableId: string, ids: string[]) {
  for (let i = 0; i < ids.length; i += 10) {
    const url = new URL(`https://api.airtable.com/v0/${AT_BASE}/${tableId}`);
    for (const id of ids.slice(i, i + 10)) url.searchParams.append("records[]", id);
    const r = await fetch(url.toString(), {
      method: "DELETE",
      headers: { Authorization: `Bearer ${AT_TOKEN}` },
    });
    if (!r.ok) throw new Error(`suppression ${tableId} : HTTP ${r.status}`);
  }
}

// ---------------------------------------------------------------- dates
// Tout se calcule en dates civiles pures (midi UTC) : pas de piège d'heure d'été.
const jour = (s: string) => new Date(`${s.slice(0, 10)}T12:00:00Z`);
const iso = (d: Date) => d.toISOString().slice(0, 10);
const ajouteJours = (d: Date, n: number) => new Date(d.getTime() + n * 86400000);
const ecartJours = (a: Date, b: Date) => Math.round((b.getTime() - a.getTime()) / 86400000);
const debutMois = (a: number, m: number) => new Date(Date.UTC(a, m, 1, 12));
const cle = (a: number, m: number) => `${a}-${String(m + 1).padStart(2, "0")}`;

export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const debut = Date.now();

  try {
    const [appartements, reservations, factures, financeExistant, loyersExistants] = await Promise.all([
      lireTable(T_APPARTEMENTS),
      lireTable(T_RESERVATIONS),
      lireTable(T_FACTURES),
      lireTable(T_FINANCE),
      lireTable(T_LOYERS),
    ]);

    const parAppartement = new Map(appartements.map((a) => [a.id, a]));
    const maintenant = new Date();
    const moisCourant = { a: maintenant.getUTCFullYear(), m: maintenant.getUTCMonth() };

    // ------------------------------------------------------------ factures
    // Chaque facture est ventilée sur les mois de sa période facturée, au prorata des jours,
    // en gardant trace des JOURS couverts : c'est ce qui permet de ne pas doubler le CA plus bas.
    type Ventil = { montant: number; jours: Set<string> };
    const factParResa = new Map<string, Map<string, Ventil>>();
    const factOrphelines = new Map<string, number>();
    const factRefs = new Map<string, Set<string>>();

    for (const f of factures) {
      const champs = f.fields;
      if (texte(champs["Type"]) === "Avoir") continue;
      const montant = nombre(champs["Montant total HT"]);
      const d1 = texte(champs["Période facturée début"]);
      const d2 = texte(champs["Période facturée fin"]);
      const resa = liens(champs["Réservation liée"])[0];

      if (d1 && d2) {
        const a = jour(d1);
        const b = jour(d2);
        const total = Math.max(1, ecartJours(a, b) + 1);
        for (let c = a; c <= b; c = ajouteJours(c, 1)) {
          const k = cle(c.getUTCFullYear(), c.getUTCMonth());
          if (!factRefs.has(k)) factRefs.set(k, new Set());
          factRefs.get(k)!.add(f.id);
          if (resa) {
            if (!factParResa.has(resa)) factParResa.set(resa, new Map());
            const parMois = factParResa.get(resa)!;
            if (!parMois.has(k)) parMois.set(k, { montant: 0, jours: new Set() });
            const v = parMois.get(k)!;
            v.montant += montant / total;
            v.jours.add(iso(c));
          } else {
            factOrphelines.set(k, (factOrphelines.get(k) || 0) + montant / total);
          }
        }
      } else {
        // Transferts et interventions ponctuels : pas de période, on retient la date d'envoi.
        const envoi = texte(champs["Date d'envoi"]);
        if (!envoi) continue;
        const d = jour(envoi);
        const k = cle(d.getUTCFullYear(), d.getUTCMonth());
        factOrphelines.set(k, (factOrphelines.get(k) || 0) + montant);
        if (!factRefs.has(k)) factRefs.set(k, new Set());
        factRefs.get(k)!.add(f.id);
      }
    }

    // ------------------------------------------------------------ fenêtre de calcul
    const moisList: { a: number; m: number; k: string }[] = [];
    for (let i = -MOIS_AVANT; i <= MOIS_APRES; i++) {
      const d = debutMois(moisCourant.a, moisCourant.m + i);
      moisList.push({ a: d.getUTCFullYear(), m: d.getUTCMonth(), k: cle(d.getUTCFullYear(), d.getUTCMonth()) });
    }

    type Ligne = {
      k: string;
      a: number;
      m: number;
      caFacture: number;
      caEstime: number;
      loyers: number;
      charges: number;
      nuiteesVendues: number;
      nuiteesDispo: number;
      apptsLoues: number;
      apptsParc: number;
      refAppts: string[];
      refResas: string[];
      refFacts: string[];
      loyersDetail: {
        apptId: string;
        code: string;
        nuits: number;
        joursMois: number;
        loyerPlein: number;
        montant: number;
        charges: number;
        resas: string[];
        proprio: string[];
      }[];
    };

    const lignes: Ligne[] = [];

    for (const { a, m, k } of moisList) {
      const d1 = debutMois(a, m);
      const d2 = debutMois(a, m + 1); // borne exclusive
      const joursMois = ecartJours(d1, d2);

      let caFacture = 0;
      let caEstime = 0;
      let nuiteesVendues = 0;
      const intervalles = new Map<string, [Date, Date][]>();
      const resasDuMois = new Set<string>();

      for (const r of reservations) {
        const champs = r.fields;
        if (!STATUTS_RESA.includes(texte(champs["Statut"]))) continue;
        const entreeTxt = texte(champs["Date d'entrée"]);
        if (!entreeTxt) continue;
        const entree = jour(entreeTxt);
        const sortieTxt = texte(champs["Date de sortie"]);
        const sortie = sortieTxt ? jour(sortieTxt) : d2; // bail long sans fin : borne au mois
        if (!(entree < d2 && sortie > d1)) continue;

        const a1 = entree > d1 ? entree : d1;
        const b1 = sortie < d2 ? sortie : d2;
        const nuits = ecartJours(a1, b1);
        if (nuits <= 0) continue;

        resasDuMois.add(r.id);
        nuiteesVendues += nuits;

        const ventil = factParResa.get(r.id)?.get(k);
        caFacture += ventil?.montant || 0;

        // Jours du séjour dans ce mois qu'aucune facture ne couvre encore.
        let joursNonFactures = 0;
        for (let c = a1; c < b1; c = ajouteJours(c, 1)) {
          if (!ventil?.jours.has(iso(c))) joursNonFactures++;
        }
        caEstime += joursNonFactures * nombre(champs["Prix nuitée HT"]);

        const apptId = liens(champs["Appartement"])[0];
        if (apptId) {
          if (!intervalles.has(apptId)) intervalles.set(apptId, []);
          intervalles.get(apptId)!.push([a1, b1]);
        }
      }

      caFacture += factOrphelines.get(k) || 0;

      // Loyers propriétaires : fusion des intervalles avant prorata.
      let loyers = 0;
      let charges = 0;
      const loyersDetail: Ligne["loyersDetail"] = [];

      for (const [apptId, brut] of intervalles) {
        const appt = parAppartement.get(apptId);
        if (!appt) continue;
        brut.sort((x, y) => x[0].getTime() - y[0].getTime());
        const fusionnes: [Date, Date][] = [];
        for (const [deb, fin] of brut) {
          const dernier = fusionnes[fusionnes.length - 1];
          if (dernier && deb <= dernier[1]) {
            if (fin > dernier[1]) dernier[1] = fin;
          } else {
            fusionnes.push([deb, fin]);
          }
        }
        const nuits = fusionnes.reduce((s, [deb, fin]) => s + ecartJours(deb, fin), 0);
        const loyerPlein = nombre(appt.fields["Loyer propriétaire / mois"]);
        const chargesPleines = CHAMPS_CHARGES.reduce((s, c) => s + nombre(appt.fields[c]), 0);
        const montant = arrondi((loyerPlein * nuits) / joursMois);
        const chargesProrata = arrondi((chargesPleines * nuits) / joursMois);
        loyers += montant;
        charges += chargesProrata;

        loyersDetail.push({
          apptId,
          code: texte(appt.fields["Code appartement"]) || apptId,
          nuits,
          joursMois,
          loyerPlein,
          montant,
          charges: chargesProrata,
          resas: reservations
            .filter((r) => liens(r.fields["Appartement"])[0] === apptId && resasDuMois.has(r.id))
            .map((r) => r.id),
          proprio: liens(appt.fields["Propriétaire"]),
        });
      }

      // Taille du parc au 1er du mois : appartements engagés dont le contrat a commencé.
      const parc = appartements.filter((ap) => {
        if (!STATUTS_PARC.includes(texte(ap.fields["Statut pipeline"]))) return false;
        const dc = texte(ap.fields["Date début contrat"]);
        return !dc || jour(dc) < d2;
      });

      lignes.push({
        k,
        a,
        m,
        caFacture: arrondi(caFacture),
        caEstime: arrondi(caEstime),
        loyers: arrondi(loyers),
        charges: arrondi(charges),
        nuiteesVendues,
        nuiteesDispo: parc.length * joursMois,
        apptsLoues: intervalles.size,
        apptsParc: parc.length,
        refAppts: [...intervalles.keys()],
        refResas: [...resasDuMois],
        refFacts: [...(factRefs.get(k) || [])],
        loyersDetail,
      });
    }

    // ------------------------------------------------------------ écriture « Finance mensuelle »
    const parCle = new Map(lignes.map((l) => [l.k, l]));
    const horodatage = new Date().toISOString();

    const aCreer: unknown[] = [];
    const idParMois = new Map<string, string>();

    for (const l of lignes) {
      const caTotal = arrondi(l.caFacture + l.caEstime);
      const marge = arrondi(caTotal - l.loyers - l.charges);
      const prec = parCle.get(cle(l.a, l.m - 1));
      const precTotal = prec ? arrondi(prec.caFacture + prec.caEstime) : null;
      const precMarge = prec ? arrondi(precTotal! - prec.loyers - prec.charges) : null;
      // Comparer à un mois « Historique incomplet » produirait une évolution absurde
      // (+482 % en août 2026 face à un août 2025 où seuls 3 baux longs étaient saisis).
      // Tant que le N-1 n'est pas fiable, la colonne reste vide.
      const cleN1 = cle(l.a - 1, l.m);
      const n1 = cleN1 >= MISE_EN_SERVICE ? parCle.get(cleN1) : undefined;
      const n1Total = n1 ? arrondi(n1.caFacture + n1.caEstime) : null;

      const passe = l.a < moisCourant.a || (l.a === moisCourant.a && l.m < moisCourant.m);
      const futur = l.a > moisCourant.a || (l.a === moisCourant.a && l.m > moisCourant.m);

      const avantMiseEnService = l.k < MISE_EN_SERVICE;
      const partFacturee = caTotal > 0 ? l.caFacture / caTotal : 0;
      const fiabilite = avantMiseEnService
        ? "Historique incomplet"
        : partFacturee >= 0.95
          ? "Chiffre consolidé"
          : partFacturee > 0
            ? "Facturation en cours"
            : "Estimé sur réservations";

      const detail = [
        avantMiseEnService
          ? "⚠️ Mois antérieur à la mise en service d'Airtable : seuls les baux longs y figurent. Le CA réel de ce mois était plus élevé, ne pas lire cette ligne comme une performance."
          : "",
        `${caTotal.toLocaleString("fr-FR")} € de CA — ${l.caFacture.toLocaleString("fr-FR")} € facturés, ${l.caEstime.toLocaleString("fr-FR")} € estimés d'après les réservations.`,
        `${l.loyers.toLocaleString("fr-FR")} € de loyers propriétaires + ${l.charges.toLocaleString("fr-FR")} € de charges, au prorata de ${l.nuiteesVendues} nuitées occupées.`,
        `Marge ${marge.toLocaleString("fr-FR")} € sur ${l.apptsLoues} appartement(s) loué(s), parc de ${l.apptsParc}.`,
      ]
        .filter(Boolean)
        .join("\n");

      const fields: Record<string, unknown> = {
        Mois: l.k,
        "Libellé": `${NOMS_MOIS[l.m]} ${l.a}`,
        "Début de mois": iso(debutMois(l.a, l.m)),
        "Statut du mois": passe ? "Clôturé" : futur ? "Prévisionnel" : "En cours",
        "Fiabilité": fiabilite,
        "CA facturé": l.caFacture,
        "CA estimé": l.caEstime,
        "CA total": caTotal,
        "% facturé": caTotal > 0 ? arrondi(l.caFacture / caTotal, 4) : 0,
        "Loyers propriétaires dus": l.loyers,
        "Charges dues": l.charges,
        "Total à virer": arrondi(l.loyers + l.charges),
        Marge: marge,
        "Taux de marge": caTotal > 0 ? arrondi(marge / caTotal, 4) : 0,
        "Nuitées vendues": l.nuiteesVendues,
        "Nuitées disponibles": l.nuiteesDispo,
        "Taux d'occupation": l.nuiteesDispo > 0 ? arrondi(l.nuiteesVendues / l.nuiteesDispo, 4) : 0,
        "Appartements loués": l.apptsLoues,
        "Appartements sous contrat": l.apptsParc,
        "Revenu par appartement": l.apptsParc > 0 ? arrondi(caTotal / l.apptsParc) : 0,
        "Δ CA vs mois précédent": precTotal === null ? null : arrondi(caTotal - precTotal),
        "Δ CA vs mois précédent %": precTotal ? arrondi((caTotal - precTotal) / precTotal, 4) : null,
        "Δ Marge vs mois précédent": precMarge === null ? null : arrondi(marge - precMarge),
        "Δ CA vs N-1": n1Total === null ? null : arrondi(caTotal - n1Total),
        "Δ CA vs N-1 %": n1Total ? arrondi((caTotal - n1Total) / n1Total, 4) : null,
        "Appartements du mois": l.refAppts,
        "Réservations du mois": l.refResas,
        "Factures du mois": l.refFacts,
        "Détail": detail,
        "Dernier calcul": horodatage,
      };

      aCreer.push({ fields });
    }

    // Une page « Liste » d'interface Airtable n'a pas de tri persistant : elle affiche les
    // enregistrements dans leur ordre de création. On reconstruit donc la table entière à chaque
    // passage, du mois le plus récent au plus ancien, pour que l'ordre naturel soit le bon.
    // C'est sans risque : « Finance mensuelle » est une table de pure lecture, rien n'y est saisi
    // à la main. La table des loyers, elle, n'est JAMAIS reconstruite (Vincent y saisit le statut).
    aCreer.sort((x, y) => {
      const a = (x as { fields: Record<string, unknown> }).fields["Mois"] as string;
      const b = (y as { fields: Record<string, unknown> }).fields["Mois"] as string;
      return b.localeCompare(a);
    });

    if (financeExistant.length) await supprimer(T_FINANCE, financeExistant.map((r) => r.id));
    await ecrire(T_FINANCE, "POST", aCreer);

    // Les identifiants ont changé : on relit pour pouvoir lier les loyers au bon mois.
    for (const r of await lireTable(T_FINANCE)) idParMois.set(texte(r.fields["Mois"]), r.id);

    // ------------------------------------------------------------ écriture « Loyers à verser »
    // Clé = « AAAA-MM · APT-xxx ». Statut et Date de paiement ne sont JAMAIS touchés.
    const loyersParRef = new Map(loyersExistants.map((r) => [texte(r.fields["Référence"]), r]));
    const creerLoyers: unknown[] = [];
    const majLoyers: unknown[] = [];
    const refsAttendues = new Set<string>();

    for (const l of lignes) {
      for (const d of l.loyersDetail) {
        if (d.montant <= 0 && d.charges <= 0) continue;
        const ref = `${l.k} · ${d.code}`;
        refsAttendues.add(ref);
        const futur = l.a > moisCourant.a || (l.a === moisCourant.a && l.m > moisCourant.m);

        const fields: Record<string, unknown> = {
          "Référence": ref,
          Mois: l.k,
          "Libellé mois": `${NOMS_MOIS[l.m]} ${l.a}`,
          "Début de mois": iso(debutMois(l.a, l.m)),
          Appartement: [d.apptId],
          "Propriétaire": d.proprio,
          "Réservations": d.resas,
          "Nuitées occupées": d.nuits,
          "Jours du mois": d.joursMois,
          Occupation: arrondi(d.nuits / d.joursMois, 4),
          "Loyer plein": d.loyerPlein,
          "Montant à virer": d.montant,
          "Charges à virer": d.charges,
          "Total à virer": arrondi(d.montant + d.charges),
          "Détail": `${d.loyerPlein.toLocaleString("fr-FR")} € × ${d.nuits} nuitées ÷ ${d.joursMois} jours = ${d.montant.toLocaleString("fr-FR")} €, plus ${d.charges.toLocaleString("fr-FR")} € de charges au même prorata.`,
          "Dernier calcul": horodatage,
        };
        const mois = idParMois.get(l.k);
        if (mois) fields["Mois lié"] = [mois];

        const existant = loyersParRef.get(ref);
        if (existant) {
          majLoyers.push({ id: existant.id, fields }); // Statut et Date de paiement absents : préservés
        } else {
          creerLoyers.push({ fields: { ...fields, Statut: futur ? "En attente" : "À payer" } });
        }
      }
    }

    if (creerLoyers.length) await ecrire(T_LOYERS, "POST", creerLoyers);
    if (majLoyers.length) await ecrire(T_LOYERS, "PATCH", majLoyers);

    // Une ligne dont la réservation a disparu ne doit plus réclamer un virement.
    // On la neutralise sans la supprimer, sauf si elle est déjà payée : dans ce cas on alerte.
    const orphelines = loyersExistants.filter(
      (r) => !refsAttendues.has(texte(r.fields["Référence"])) && nombre(r.fields["Total à virer"]) > 0
    );
    const orphelinesPayees = orphelines.filter((r) => texte(r.fields["Statut"]) === "Payé");
    const orphelinesAnnulables = orphelines.filter((r) => texte(r.fields["Statut"]) !== "Payé");

    if (orphelinesAnnulables.length) {
      await ecrire(
        T_LOYERS,
        "PATCH",
        orphelinesAnnulables.map((r) => ({
          id: r.id,
          fields: {
            "Montant à virer": 0,
            "Charges à virer": 0,
            "Total à virer": 0,
            "Nuitées occupées": 0,
            "Détail": "Plus aucune réservation ne couvre ce mois pour cet appartement : rien à verser.",
            "Dernier calcul": horodatage,
          },
        }))
      );
    }

    if (orphelinesPayees.length) {
      await slack(
        `:warning: *Finance mensuelle — ${orphelinesPayees.length} loyer(s) déjà payé(s) sans réservation en face*\n` +
          orphelinesPayees.map((r) => `• ${texte(r.fields["Référence"])} — ${nombre(r.fields["Total à virer"]).toLocaleString("fr-FR")} €`).join("\n") +
          `\n\n_La réservation a été supprimée ou son statut a changé après le virement. À vérifier._`
      );
    }

    const courant = parCle.get(cle(moisCourant.a, moisCourant.m));
    return NextResponse.json({
      ok: true,
      duree_ms: Date.now() - debut,
      mois_calcules: lignes.length,
      finance: { reconstruites: aCreer.length },
      loyers: { crees: creerLoyers.length, mis_a_jour: majLoyers.length, neutralises: orphelinesAnnulables.length },
      alertes: orphelinesPayees.length,
      mois_courant: courant
        ? {
            mois: courant.k,
            ca_total: arrondi(courant.caFacture + courant.caEstime),
            a_virer: arrondi(courant.loyers + courant.charges),
            marge: arrondi(courant.caFacture + courant.caEstime - courant.loyers - courant.charges),
          }
        : null,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    await slack(`:x: *Finance mensuelle — le calcul a échoué*\n\`${message}\`\n\n_Les tables gardent les valeurs du dernier passage réussi._`);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
