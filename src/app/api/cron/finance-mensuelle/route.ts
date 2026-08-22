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
const T_CHARGES = "tble8Op6dPxj0N94t";
const T_ANNEE = "tblTOg5qWyjdlRvy9";

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

// ---------------------------------------------------------------- dates
// Tout se calcule en dates civiles pures (midi UTC) : pas de piège d'heure d'été.
const jour = (s: string) => new Date(`${s.slice(0, 10)}T12:00:00Z`);
const iso = (d: Date) => d.toISOString().slice(0, 10);
const ajouteJours = (d: Date, n: number) => new Date(d.getTime() + n * 86400000);
const ecartJours = (a: Date, b: Date) => Math.round((b.getTime() - a.getTime()) / 86400000);
const debutMois = (a: number, m: number) => new Date(Date.UTC(a, m, 1, 12));
const cle = (a: number, m: number) => `${a}-${String(m + 1).padStart(2, "0")}`;
const jjmm = (d: Date) => `${String(d.getUTCDate()).padStart(2, "0")}/${String(d.getUTCMonth() + 1).padStart(2, "0")}`;

export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const debut = Date.now();

  try {
    const [appartements, reservations, factures, financeExistant, loyersExistants, chargesFixes] =
      await Promise.all([
        lireTable(T_APPARTEMENTS),
        lireTable(T_RESERVATIONS),
        lireTable(T_FACTURES),
        lireTable(T_FINANCE),
        lireTable(T_LOYERS),
        lireTable(T_CHARGES),
      ]);
    const anneesExistantes = await lireTable(T_ANNEE);

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
    // Ce qu'on nous doit : même ventilation que le CA facturé, mais restreinte aux factures
    // non encaissées. « Envoyée » = partie chez le client, pas encore payée.
    const encoursParMois = new Map<string, number>();
    const encoursVieuxParMois = new Map<string, number>();
    const impayeesParMois = new Map<string, Set<string>>();
    const AUJOURDHUI = new Date();

    for (const f of factures) {
      const champs = f.fields;
      if (texte(champs["Type"]) === "Avoir") continue;
      const montant = nombre(champs["Montant total HT"]);
      const d1 = texte(champs["Période facturée début"]);
      const d2 = texte(champs["Période facturée fin"]);
      const resa = liens(champs["Réservation liée"])[0];

      // Une facture « Envoyée » n'est pas encore encaissée. On date son ancienneté sur la date
      // d'envoi quand elle existe (19 factures sur 44 au 22/08), sinon sur le début de période.
      const impayee = texte(champs["Statut"]) === "Envoyée";
      const dateAge = texte(champs["Date d'envoi"]) || d1;
      const vieille =
        impayee && dateAge ? ecartJours(jour(dateAge), AUJOURDHUI) > 30 : false;
      const noteEncours = (k: string, part: number) => {
        if (!impayee) return;
        encoursParMois.set(k, (encoursParMois.get(k) || 0) + part);
        if (vieille) encoursVieuxParMois.set(k, (encoursVieuxParMois.get(k) || 0) + part);
        if (!impayeesParMois.has(k)) impayeesParMois.set(k, new Set());
        impayeesParMois.get(k)!.add(f.id);
      };

      if (d1 && d2) {
        const a = jour(d1);
        const b = jour(d2);
        const total = Math.max(1, ecartJours(a, b) + 1);
        for (let c = a; c <= b; c = ajouteJours(c, 1)) {
          const k = cle(c.getUTCFullYear(), c.getUTCMonth());
          if (!factRefs.has(k)) factRefs.set(k, new Set());
          factRefs.get(k)!.add(f.id);
          noteEncours(k, montant / total);
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
        noteEncours(k, montant);
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
        periode: string;
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

        // Les bornes sont exclusives côté fin : une résa du 01/09 au 01/10 fait 30 nuitées,
        // qui vont du 01/09 au 30/09. D'où le retrait d'un jour à l'affichage.
        // Format voulu par Vincent, volontairement court : « du 01/09 au 30/09 (30 nuits) ».
        const bornes = fusionnes
          .map(([deb, fin]) => `du ${jjmm(deb)} au ${jjmm(ajouteJours(fin, -1))}`)
          .join(" et ");
        const periode = `${bornes} (${nuits} ${nuits > 1 ? "nuits" : "nuit"})`;

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
          periode,
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

    const horodatage = new Date().toISOString();

    // Charges de structure : une ligne par charge récurrente, pas par mois. Une charge compte
    // sur un mois si elle avait déjà commencé et n'était pas encore terminée. « Depuis le » vide
    // = a toujours existé ; « Jusqu au » vide = toujours en cours. Ainsi une embauche de mars
    // ne pèse pas sur janvier, et une résiliation ne réécrit pas le passé.
    const chargesDuMois = (d1: Date, d2: Date) =>
      arrondi(
        chargesFixes.reduce((somme, c) => {
          const debut = texte(c.fields["Depuis le"]);
          const fin = texte(c.fields["Jusqu au"]);
          if (debut && jour(debut) >= d2) return somme;
          if (fin && jour(fin) < d1) return somme;
          return somme + nombre(c.fields["Montant mensuel"]);
        }, 0)
      );

    // ------------------------------------------------------------ écriture « Loyers à verser »
    // Clé = « AAAA-MM · APT-xxx ». Statut et Date de paiement ne sont JAMAIS touchés.
    const loyersParRef = new Map(loyersExistants.map((r) => [texte(r.fields["Référence"]), r]));
    const creerLoyers: { ref: string; mois: string; fields: Record<string, unknown> }[] = [];
    const majLoyers: { id: string; ref: string; mois: string; fields: Record<string, unknown> }[] = [];
    const refsAttendues = new Set<string>();
    // Totaux par mois, pour alimenter « Finance mensuelle » juste après.
    const suivi = new Map<string, { verses: number; reste: number; nbReste: number }>();
    const cumule = (k: string, verses: number, reste: number) => {
      const e = suivi.get(k) || { verses: 0, reste: 0, nbReste: 0 };
      e.verses += verses;
      e.reste += reste;
      if (reste > 0.01) e.nbReste += 1;
      suivi.set(k, e);
    };

    for (const l of lignes) {
      // Avant la mise en service, seuls quelques baux longs étaient saisis et Vincent a réglé
      // ces mois-là hors Airtable. Générer des lignes « à payer » pour eux ferait apparaître
      // une dette fantôme de plus de 200 000 €. On commence donc au premier mois fiable.
      if (l.k < MISE_EN_SERVICE) continue;
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
          "Période occupée": d.periode,
          "Jours du mois": d.joursMois,
          Occupation: arrondi(d.nuits / d.joursMois, 4),
          "Loyer plein": d.loyerPlein,
          "Montant à virer": d.montant,
          "Charges à virer": d.charges,
          "Total à virer": arrondi(d.montant + d.charges),
          "Détail": `Loyer ${d.periode}`,
          "Dernier calcul": horodatage,
        };
        const total = arrondi(d.montant + d.charges);
        const existant = loyersParRef.get(ref);

        if (existant) {
          // Statut, Date de paiement et Rattrapage appartiennent à Vincent ou au passé :
          // ils ne figurent pas dans le payload, donc ils survivent au recalcul.
          const paye = texte(existant.fields["Statut"]) === "Payé";
          if (paye) {
            // Photographie du montant au moment du paiement. Si le montant bouge ensuite
            // (séjour prolongé, avenant), l'écart devient visible au lieu d'être perdu.
            const snapshot = nombre(existant.fields["Montant payé"]) || total;
            const ecart = arrondi(total - snapshot);
            fields["Montant payé"] = snapshot;
            fields["Écart à régulariser"] = ecart;
            fields["À régler"] = ecart > 0.01;
            cumule(l.k, snapshot, Math.max(0, ecart));
          } else {
            fields["Montant payé"] = null;
            fields["Écart à régulariser"] = null;
            fields["À régler"] = !futur;
            cumule(l.k, 0, total);
          }
          majLoyers.push({ id: existant.id, ref, mois: l.k, fields });
        } else {
          // Ligne qui naît alors que son mois a déjà commencé : réservation saisie en cours
          // de route. Elle se paiera avec le lot suivant, d'où le marqueur « Rattrapage ».
          const passe = l.a < moisCourant.a || (l.a === moisCourant.a && l.m < moisCourant.m);
          const enCours = l.a === moisCourant.a && l.m === moisCourant.m;
          creerLoyers.push({
            ref,
            mois: l.k,
            fields: {
              ...fields,
              Statut: futur ? "En attente" : "À payer",
              "À régler": !futur,
              Rattrapage: passe || enCours,
            },
          });
          cumule(l.k, 0, total);
        }
      }
    }



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

    // ------------------------------------------------------------ écriture « Finance mensuelle »
    const parCle = new Map(lignes.map((l) => [l.k, l]));
    const financeParCle = new Map(financeExistant.map((r) => [texte(r.fields["Mois"]), r]));

    const aCreer: unknown[] = [];
    const aMettreAJour: unknown[] = [];
    const idParMois = new Map<string, string>();
    type CumulAn = {
      mois: number; caFacture: number; caEstime: number; loyers: number; charges: number;
      chargesFixes: number; reste: number; encours: number; nuitees: number; dispo: number; fiable: boolean;
      moisFiables: number; caFiable: number; margeFiable: number;
    };
    const parAnnee = new Map<string, CumulAn>();

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
      const chargesFixesMois = avantMiseEnService
        ? 0
        : chargesDuMois(debutMois(l.a, l.m), debutMois(l.a, l.m + 1));
      const margeNette = arrondi(caTotal - l.loyers - l.charges - chargesFixesMois);
      // Ce qui traîne encore sur les mois d'AVANT celui-ci : à régler avec le lot du mois
      // pour ne pas laisser filer un loyer oublié.
      const arriere = arrondi(
        [...suivi.entries()]
          .filter(([k]) => k < l.k && k >= MISE_EN_SERVICE)
          .reduce((somme, [, v]) => somme + v.reste, 0)
      );
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
        "Année": String(l.a),
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
        "Loyers versés": arrondi(suivi.get(l.k)?.verses || 0),
        "Reste à verser": arrondi(suivi.get(l.k)?.reste || 0),
        "Avancement des virements":
          (suivi.get(l.k)?.verses || 0) + (suivi.get(l.k)?.reste || 0) > 0
            ? arrondi((suivi.get(l.k)?.verses || 0) / ((suivi.get(l.k)?.verses || 0) + (suivi.get(l.k)?.reste || 0)), 4)
            : null,
        "Marge brute": marge,
        "Taux de marge brute": caTotal > 0 ? arrondi(marge / caTotal, 4) : 0,
        "Charges fixes": chargesFixesMois,
        "Marge nette": margeNette,
        "Taux de marge nette": caTotal > 0 ? arrondi(margeNette / caTotal, 4) : null,
        "Arriéré des mois précédents": arriere,
        "Encours client": arrondi(encoursParMois.get(l.k) || 0),
        "Factures en attente": impayeesParMois.get(l.k)?.size || 0,
        "Encours de plus de 30 jours": arrondi(encoursVieuxParMois.get(l.k) || 0),
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

      const an = String(l.a);
      const cumulAn = parAnnee.get(an) || {
        mois: 0, caFacture: 0, caEstime: 0, loyers: 0, charges: 0, chargesFixes: 0,
        reste: 0, encours: 0, nuitees: 0, dispo: 0, fiable: false,
        moisFiables: 0, caFiable: 0, margeFiable: 0,
      };
      cumulAn.mois += 1;
      cumulAn.caFacture += l.caFacture;
      cumulAn.caEstime += l.caEstime;
      cumulAn.loyers += l.loyers;
      cumulAn.charges += l.charges;
      cumulAn.chargesFixes += chargesFixesMois;
      cumulAn.reste += suivi.get(l.k)?.reste || 0;
      cumulAn.encours += encoursParMois.get(l.k) || 0;
      cumulAn.nuitees += l.nuiteesVendues;
      cumulAn.dispo += l.nuiteesDispo;
      if (!avantMiseEnService) {
        cumulAn.fiable = true;
        cumulAn.moisFiables += 1;
        cumulAn.caFiable += caTotal;
        cumulAn.margeFiable += marge;
      }
      parAnnee.set(an, cumulAn);

      const existant = financeParCle.get(l.k);
      if (existant) {
        idParMois.set(l.k, existant.id);
        aMettreAJour.push({ id: existant.id, fields });
      } else {
        aCreer.push({ fields });
      }
    }

    // Écriture, dans l'ordre : les mois d'abord (pour obtenir leurs identifiants),
    // puis les loyers auxquels on rattache le mois correspondant.
    if (aCreer.length) await ecrire(T_FINANCE, "POST", aCreer);
    if (aMettreAJour.length) await ecrire(T_FINANCE, "PATCH", aMettreAJour);
    if (aCreer.length) {
      for (const r of await lireTable(T_FINANCE)) idParMois.set(texte(r.fields["Mois"]), r.id);
    }

    const rattache = <T extends { mois: string; fields: Record<string, unknown> }>(x: T) => {
      const id = idParMois.get(x.mois);
      if (id) x.fields["Mois lié"] = [id];
      return x;
    };
    if (creerLoyers.length) await ecrire(T_LOYERS, "POST", creerLoyers.map((x) => ({ fields: rattache(x).fields })));
    if (majLoyers.length) await ecrire(T_LOYERS, "PATCH", majLoyers.map((x) => ({ id: x.id, fields: rattache(x).fields })));

    // ------------------------------------------------------------ « Finance annuelle »
    // Agrégation des mois déjà calculés. Une année n'est comparable à la précédente que si
    // les deux sont postérieures à la mise en service : sinon on comparerait un vrai chiffre
    // à un résidu de saisie, et la croissance affichée serait absurde.
    const anneeCourante = String(moisCourant.a);
    const annuel = [...parAnnee.entries()].sort(([x], [y]) => x.localeCompare(y));
    const totalAn = (c: CumulAn) => arrondi(c.caFacture + c.caEstime);
    const margeBruteAn = (c: CumulAn) => arrondi(totalAn(c) - c.loyers - c.charges);
    const margeNetteAn = (c: CumulAn) => arrondi(margeBruteAn(c) - c.chargesFixes);

    const anneesParCle = new Map(anneesExistantes.map((r) => [texte(r.fields["Année"]), r]));
    const creerAns: unknown[] = [];
    const majAns: unknown[] = [];

    for (const [an, c] of annuel) {
      const total = totalAn(c);
      const brute = margeBruteAn(c);
      const nette = margeNetteAn(c);
      const prec = parAnnee.get(String(Number(an) - 1));
      const complet = (x: CumulAn) => x.moisFiables === x.mois && x.mois > 0;
      const precFiable = !!prec && complet(prec) && complet(c);
      const precTotal = precFiable ? totalAn(prec) : null;

      const fiabilite = !c.fiable
        ? "Historique incomplet"
        : an === anneeCourante
          ? "Année en cours"
          : an > anneeCourante
            ? "Année à venir"
            : c.mois >= 12
              ? "Année complète"
              : "Historique incomplet";

      const moisLies = annuel.length
        ? [...idParMois.entries()].filter(([k]) => k.startsWith(an + "-")).map(([, id]) => id)
        : [];

      const fields: Record<string, unknown> = {
        "Année": an,
        "Fiabilité": fiabilite,
        "Mois couverts": c.mois,
        "Mois fiables": c.moisFiables,
        "CA des mois fiables": arrondi(c.caFiable),
        "Marge brute des mois fiables": arrondi(c.margeFiable),
        "CA facturé": arrondi(c.caFacture),
        "CA estimé": arrondi(c.caEstime),
        "CA total": total,
        "% facturé": total > 0 ? arrondi(c.caFacture / total, 4) : 0,
        "Loyers propriétaires dus": arrondi(c.loyers),
        "Charges appartements": arrondi(c.charges),
        "Charges fixes": arrondi(c.chargesFixes),
        "Marge brute": brute,
        "Taux de marge brute": total > 0 ? arrondi(brute / total, 4) : null,
        "Marge nette": nette,
        "Taux de marge nette": total > 0 ? arrondi(nette / total, 4) : null,
        "Reste à verser": arrondi(c.reste),
        "Encours client": arrondi(c.encours),
        "Nuitées vendues": c.nuitees,
        "Nuitées disponibles": c.dispo,
        "Taux d occupation": c.dispo > 0 ? arrondi(c.nuitees / c.dispo, 4) : null,
        "Δ CA vs année précédente": precTotal === null ? null : arrondi(total - precTotal),
        "Δ CA vs année précédente %": precTotal ? arrondi((total - precTotal) / precTotal, 4) : null,
        "Δ Marge nette vs année précédente": precFiable ? arrondi(nette - margeNetteAn(prec)) : null,
        "Mois de l année": moisLies,
        "Détail": [
          !c.fiable
            ? "⚠️ Année entièrement antérieure à la mise en service d'Airtable : seuls quelques baux longs y figurent. Le CA réel était bien plus élevé, ne pas lire cette ligne comme une performance."
            : c.moisFiables < c.mois
              ? `⚠️ Année à moitié fiable : ${c.mois - c.moisFiables} mois sur ${c.mois} sont antérieurs à juillet 2026 et très incomplets. Le chiffre à regarder est celui des ${c.moisFiables} mois fiables : ${arrondi(c.caFiable).toLocaleString("fr-FR")} € de CA et ${arrondi(c.margeFiable).toLocaleString("fr-FR")} € de marge brute.`
              : "",
          `${total.toLocaleString("fr-FR")} € de CA sur ${c.mois} mois — marge brute ${brute.toLocaleString("fr-FR")} €, marge nette ${nette.toLocaleString("fr-FR")} € après ${arrondi(c.chargesFixes).toLocaleString("fr-FR")} € de charges de structure.`,
        ]
          .filter(Boolean)
          .join("\n"),
        "Dernier calcul": horodatage,
      };

      const existant = anneesParCle.get(an);
      if (existant) majAns.push({ id: existant.id, fields });
      else creerAns.push({ fields });
    }

    if (creerAns.length) await ecrire(T_ANNEE, "POST", creerAns);
    if (majAns.length) await ecrire(T_ANNEE, "PATCH", majAns);

    const courant = parCle.get(cle(moisCourant.a, moisCourant.m));
    return NextResponse.json({
      ok: true,
      duree_ms: Date.now() - debut,
      mois_calcules: lignes.length,
      finance: { crees: aCreer.length, mis_a_jour: aMettreAJour.length },
      loyers: { crees: creerLoyers.length, mis_a_jour: majLoyers.length, neutralises: orphelinesAnnulables.length },
      rattrapages: creerLoyers.filter((x) => x.fields["Rattrapage"] === true).length,
      alertes: orphelinesPayees.length,
      charges_fixes: chargesFixes.length,
      annees: { crees: creerAns.length, mis_a_jour: majAns.length },
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
