import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import JSZip from "jszip";
import { lireBlocLoreal, manquants, type BlocLoreal } from "@/lib/loreal-notes";

// Récap mensuel de facturation L'Oréal — dernier jour calendaire de chaque mois.
//
// Pourquoi (01/09/2026, demande de Vincent) : c'est ce tableau qui déclenche la DED
// chez L'Oréal, et sans DED nous n'émettons pas la facture définitive, donc nous ne
// sommes pas payés. Une proforma oubliée n'est pas un désagrément de reporting :
// c'est un loyer perdu. Toute la conception part de là.
//
// LA GARANTIE ANTI-OUBLI tient à un seul champ, « Reporté à L'Oréal le » (table
// Factures) : une facture qui ne l'a pas n'a jamais été envoyée. On l'horodate
// APRÈS l'envoi réussi de l'email — jamais avant. Conséquence voulue : si l'envoi
// échoue, rien n'est marqué et la facture repart au passage suivant. Mieux vaut
// un doublon visible qu'un oubli silencieux.
//
// LES TROIS BLOCS, tels que Vincent les a définis :
//   1. loyers de la période M+2 (au 30 septembre : novembre) ;
//   2. transferts proforma, toutes périodes confondues, jamais reportés ;
//   3. loyers de M+1 ET du mois en cours — le rattrapage des réservations signées
//      depuis le dernier envoi, qui sinon passeraient entre deux tableaux.
// Dans les trois cas le filtre décisif reste le même : jamais reportée.

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const AT_BASE = process.env.AIRTABLE_BASE_ID || "";
const AT_TOKEN = process.env.AIRTABLE_WATCHDOG_TOKEN || "";
const RESEND = process.env.RESEND_API_KEY || "";
const DESTINATAIRE = "vincent@move-in-paris.com";
const EXPEDITEUR = "Move in Paris <contact@move-in-paris.com>";

const T_FACTURES = "tblC97ei6ZPWhWUwe";
const T_RESERVATIONS = "tbl5uN32egP4YCvUi";
const CHAMP_REPORTE = "Reporté à L'Oréal le";
const CHAMP_RECAP = "Récap L'Oréal";
const TVA_SERVICE = 0.20;

type Dict = Record<string, unknown>;
type Rec = { id: string; createdTime?: string; fields: Dict };

const txt = (v: unknown) => (Array.isArray(v) ? String(v[0] ?? "") : v == null ? "" : String(v)).trim();
const lien1 = (v: unknown) => (Array.isArray(v) && v.length ? String(v[0]) : "");
const sansAcc = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase();

async function airtable(method: string, path: string, body?: unknown) {
  const r = await fetch(`https://api.airtable.com/v0/${AT_BASE}/${path}`, {
    method, headers: { Authorization: `Bearer ${AT_TOKEN}`, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined, cache: "no-store",
  });
  if (!r.ok) throw new Error(`Airtable ${method} ${path} -> ${r.status} ${await r.text()}`);
  return r.json();
}
async function tout(table: string): Promise<Rec[]> {
  const out: Rec[] = []; let offset = "";
  do {
    const q = new URLSearchParams({ pageSize: "100" });
    if (offset) q.set("offset", offset);
    const d = await airtable("GET", `${table}?${q}`);
    out.push(...((d.records as Rec[]) ?? [])); offset = txt(d.offset);
  } while (offset);
  return out;
}

// Mois de Paris, en clair, pour nommer le récap et calculer M, M+1, M+2.
function moisParis(d: Date, decalage: number) {
  const p = new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", year: "numeric", month: "2-digit", day: "2-digit" })
    .formatToParts(d).reduce((a, x) => ({ ...a, [x.type]: x.value }), {} as Dict);
  const an = Number(p.year), mo = Number(p.month) + decalage;
  const y = an + Math.floor((mo - 1) / 12), m = ((mo - 1) % 12 + 12) % 12 + 1;
  const fin = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return { debut: `${y}-${String(m).padStart(2, "0")}-01`, fin: `${y}-${String(m).padStart(2, "0")}-${fin}`,
           libelle: new Date(Date.UTC(y, m - 1, 1)).toLocaleString("en-GB", { month: "long", year: "numeric" }).toUpperCase(),
           jourDuMois: Number(p.day), dernierJour: new Date(Date.UTC(an, Number(p.month), 0)).getUTCDate() };
}
const chevauche = (d1: string, f1: string, d2: string, f2: string) => !!d1 && !!f1 && d1 <= f2 && f1 >= d2;


// Airtable écrit l'occupant « Prénom NOM », le nom de famille en capitales et parfois
// en plusieurs mots : « Léandro DOMINGOS COUTO », « Bruno, Domingo ZEVALLOS RAMOS ».
// Prendre le dernier mot donnerait COUTO et RAMOS — des noms faux sur une facture
// client. On isole donc la suite finale de mots entièrement capitalisés.
function couperNom(complet: string) {
  const mots = complet.replace(/,/g, " ").split(/\s+/).filter(Boolean);
  let i = mots.length;
  while (i > 1 && mots[i - 1] === mots[i - 1].toUpperCase() && /[A-ZÀ-Ý]/.test(mots[i - 1])) i--;
  if (i === mots.length) i = Math.max(1, mots.length - 1);
  return { prenom: mots.slice(0, i).join(" "), nom: mots.slice(i).join(" ") || complet };
}

type Ligne = {
  facture: Rec; type: "Loyer" | "Transfert"; bloc: string;
  nom: string; prenom: string; agence: string; consultant: string;
  adresse: string; periode: string; nuits: number | ""; tarif: number | "";
  refLoyer: string; loyer: number | ""; refService: string; service: number | "";
  bloc_loreal: BlocLoreal | null; incomplets: string[];
};

export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const url = new URL(request.url);
  const simulation = url.searchParams.get("simulation") === "1";
  const force = url.searchParams.get("force") === "1";

  const now = new Date();
  const M = moisParis(now, 0), M1 = moisParis(now, 1), M2 = moisParis(now, 2);
  // Le cron passe tous les jours ; seul le dernier jour calendaire déclenche l'envoi.
  if (!force && !simulation && M.jourDuMois !== M.dernierJour) {
    return NextResponse.json({ ok: true, envoi: false, raison: `jour ${M.jourDuMois}/${M.dernierJour}` });
  }

  const [factures, resas] = await Promise.all([tout(T_FACTURES), tout(T_RESERVATIONS)]);
  const parResa = new Map(resas.map((r) => [r.id, r]));

  const lignes: Ligne[] = [];
  for (const f of factures) {
    const ff = f.fields;
    if (txt(ff["Mode facturation"]) !== "Proforma") continue;
    if (!sansAcc(txt(ff["Client final"])).includes("OREAL")) continue;
    if (ff[CHAMP_REPORTE]) continue;                       // déjà parti : on ne renvoie jamais
    const cat = txt(ff["Catégorie"]);
    const d = txt(ff["Période facturée début"]).slice(0, 10);
    const fi = txt(ff["Période facturée fin"]).slice(0, 10);

    // Ce qui distingue un rattrapage d'un loyer normal, c'est la PÉRIODE, pas la
    // nouveauté du locataire. Le tableau couvre M+2 : une ligne qui s'arrête avant
    // le 1er de ce mois porte un mois antérieur, jamais facturé faute de réservation
    // à l'envoi précédent. Un locataire qui arrive en M+2 est simplement nouveau.
    let bloc = "";
    if (cat === "Transfert") bloc = "2 · Transferts";
    else if (fi && fi <= M2.debut && chevauche(d, fi, M.debut, M1.fin)) bloc = "3 · Rattrapage";
    else if (chevauche(d, fi, M2.debut, M2.fin)) bloc = `1 · Loyers ${M2.libelle}`;
    else continue;

    const resa = parResa.get(lien1(ff["Réservation liée"]));
    const rf = resa?.fields ?? {};
    const b = lireBlocLoreal(txt(rf["Notes internes"]));
    const { prenom, nom } = couperNom(txt(ff["Occupants"]).trim());
    const montant = Number(ff["Montant total HT"] ?? 0);
    const nuits = d && fi ? Math.round((Date.parse(fi) - Date.parse(d)) / 86400000) : 0;
    lignes.push({
      facture: f, type: cat === "Transfert" ? "Transfert" : "Loyer", bloc,
      nom, prenom,
      agence: txt(rf["Nom agence"]).includes("Dwell") ? "Dwellworks" : "Santa Fe",
      consultant: b?.consultant || txt(rf["Contact  agence"]) || txt(rf["Contact agence"]),
      adresse: txt(ff["Adresse appartement (récap)"]),
      periode: cat === "Transfert" ? `Transfert ${txt(ff["Date d'envoi"]).slice(0, 10)}`
                                   : (d && fi ? `Du ${d.slice(8)}/${d.slice(5, 7)}/${d.slice(2, 4)} au ${fi.slice(8)}/${fi.slice(5, 7)}/${fi.slice(2, 4)}` : ""),
      nuits: cat === "Transfert" ? "" : nuits,
      tarif: cat === "Transfert" || !nuits ? "" : Math.round((montant / nuits) * 100) / 100,
      refLoyer: cat === "Transfert" ? "" : txt(ff["Numéro facture"]),
      loyer: cat === "Transfert" ? "" : montant,
      refService: cat === "Transfert" ? txt(ff["Numéro facture"]) : "",
      service: cat === "Transfert" ? montant : "",
      bloc_loreal: b, incomplets: manquants(b),
    });
  }

  // Un transfert se pose sur la ligne de loyer du même occupant quand elle existe :
  // L'Oréal attend une ligne par séjour, pas une ligne par prestation.
  const fusion: Ligne[] = [];
  for (const l of lignes.filter((x) => x.type === "Loyer")) fusion.push(l);
  for (const t of lignes.filter((x) => x.type === "Transfert")) {
    const h = fusion.find((l) => sansAcc(l.nom) === sansAcc(t.nom) && !l.refService);
    if (h) { h.refService = t.refService; h.service = t.service; h.facture = h.facture; fusion.push({ ...t, bloc: h.bloc, nom: t.nom, loyer: "", refLoyer: "", periode: t.periode, service: "", refService: "", tarif: "", nuits: "" }); }
    else fusion.push(t);
  }
  const finales = fusion.filter((l) => l.refLoyer || l.refService);

  // Un récap par agence : Santa Fe et Dwellworks ont chacune leur circuit de
  // validation chez L'Oréal, et mélanger leurs dossiers dans un même fichier oblige
  // le destinataire à trier. Chaque groupe part dans son propre email, avec ses
  // propres pièces jointes — et surtout son propre marquage : si l'envoi d'une
  // agence échoue, ses factures restent non reportées et repartiront, sans que
  // celles de l'autre agence soient rejouées pour autant.
  // Le contrôle porte sur TOUTES les factures, pas seulement celles qu'on envoie :
  // c'est ce qui permet de repérer une proforma qui dort depuis des semaines.
  const envoyeesIci = new Set(finales.map((l) => l.facture.id));
  // Plafond : la fin du mois déjà couvert par le récap précédent. Au-delà, les nuits
  // ne sont pas encore dues — leurs factures naîtront mois par mois. On ne contrôle
  // donc que ce qui AURAIT DÛ être facturé et transmis à ce jour.
  // Plafond : la fin du mois que CE récap facture. La fenêtre de contrôle est donc
  // exactement le périmètre que l'email doit couvrir — ni plus, ni moins.
  const alertes = controleCompletude(factures, resas, envoyeesIci, M2.fin);

  const AGENCES = ["Santa Fe", "Dwellworks"] as const;
  const stamp = new Date().toISOString();
  const rapports: Dict[] = [];
  let toutOk = true;

  for (const agence of AGENCES) {
    const groupe = finales.filter((l) => l.agence === agence);
    if (!groupe.length) { rapports.push({ agence, lignes: 0, envoye: false, raison: "aucune facture" }); continue; }

    const nomFichier = `Move In Paris Billing Report ${agence} (${M2.libelle}).xlsx`;
    const classeur = await construire(groupe, M2.libelle);
    const buf = Buffer.from(await classeur.xlsx.writeBuffer());
    const incompletes = groupe.filter((l) => l.incomplets.length);
    const resume: Dict = {
      agence, fichier: nomFichier, lignes: groupe.length,
      blocs: Object.fromEntries(["1 · Loyers " + M2.libelle, "2 · Transferts", "3 · Rattrapage"]
        .map((b) => [b, groupe.filter((l) => l.bloc === b).length])),
      totalHT: Math.round(groupe.reduce((s, l) => s + (Number(l.loyer) || 0) + (Number(l.service) || 0), 0) * 100) / 100,
      aCompleter: incompletes.map((l) => `${l.nom} — ${l.incomplets.join(", ")}`),
      rattrapages: groupe.filter((l) => l.bloc === "3 · Rattrapage").map((l) => ({
        nom: `${l.nom} ${l.prenom}`.trim(), periode: l.periode,
        nuits: l.nuits, montant: Number(l.loyer) || 0,
      })),
    };
    const pdfs = await archivePdf(groupe, `${agence} ${M2.libelle}`);
    resume.pdfJoints = pdfs.jointes;
    resume.pdfIntrouvables = pdfs.absents;
    resume.pdfTailleKo = pdfs.contenu ? Math.round(pdfs.contenu.length / 1024) : 0;

    if (simulation) { rapports.push({ ...resume, envoye: false, simulation: true }); continue; }

    resume.alertes = alertes;
    const envoye = await envoyer(nomFichier, buf, resume, `${agence} — M+2 ${M2.libelle}`, pdfs);
    if (!envoye) {
      toutOk = false;
      rapports.push({ ...resume, envoye: false, erreur: "envoi échoué — rien marqué, repartira au prochain passage" });
      continue;
    }
    const ids = [...new Set(groupe.map((l) => l.facture.id))];
    for (let i = 0; i < ids.length; i += 10) {
      await airtable("PATCH", T_FACTURES, {
        records: ids.slice(i, i + 10).map((id) => ({ id, fields: { [CHAMP_REPORTE]: stamp, [CHAMP_RECAP]: nomFichier } })),
      });
    }
    rapports.push({ ...resume, envoye: true, marquees: ids.length });
  }

  return NextResponse.json({ ok: toutOk, simulation, mois: M2.libelle,
    lignesTotal: finales.length, controle: alertes, rapports }, { status: toutOk ? 200 : 500 });
}

// Les PDF des proforma, groupés dans une archive. Vincent les veut avec le tableau :
// L'Oréal ne délivre la DED que sur pièces, et une proforma sans son PDF oblige à
// retourner la chercher une par une. On prend notre copie S3 — c'est celle qui a
// réellement été envoyée. Un PDF introuvable ne bloque jamais l'envoi : il est
// nommément signalé dans l'email.
async function archivePdf(lignes: Ligne[], libelle: string) {
  const zip = new JSZip();
  const absents: string[] = [];
  const vus = new Set<string>();
  for (const l of lignes) {
    const f = l.facture; const num = txt(f.fields["Numéro facture"]) || f.id;
    if (vus.has(num)) continue;
    vus.add(num);
    const s3 = txt(f.fields["Lien S3"]);
    let ok = false;
    if (s3) {
      try {
        const r = await fetch(s3, { cache: "no-store" });
        if (r.ok) {
          const b = Buffer.from(await r.arrayBuffer());
          if (b.length > 1000) { zip.file(`${num} - ${l.nom}.pdf`, b); ok = true; }
        }
      } catch { /* signalé plus bas */ }
    }
    if (!ok) absents.push(`${num} — ${l.nom}`);
  }
  const contenu = Object.keys(zip.files).length
    ? Buffer.from(await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" }))
    : null;
  return { contenu, nom: `Proformas ${libelle}.zip`, jointes: vus.size - absents.length, absents };
}


// ── Preuve de complétude ────────────────────────────────────────────────────
// Vincent doit pouvoir se fier à cet email sans le revérifier. Le récap ne se
// contente donc pas de lister ce qu'il envoie : il vérifie, séjour par séjour et
// NUIT PAR NUIT, que rien ne manque. Deux anomalies sont possibles et toutes deux
// coûtent de l'argent réel :
//   1. une nuit occupée qu'AUCUNE facture ne couvre — la facture n'existe pas ;
//   2. une nuit couverte par une facture qui n'a jamais été transmise à L'Oréal
//      et qui ne part pas non plus dans ce récap — la facture existe mais dort.
// Le 01/09/2026, la seconde a bien failli coûter 17 060 € : six proforma avaient été
// marquées « déjà envoyées » sur une supposition. Ce contrôle-ci ne suppose rien,
// il recalcule.
function nuits(d1: string, d2: string): string[] {
  const out: string[] = [];
  if (!d1 || !d2) return out;
  const a = new Date(d1 + "T00:00:00Z"), b = new Date(d2 + "T00:00:00Z");
  for (let t = a.getTime(); t < b.getTime(); t += 86400000) out.push(new Date(t).toISOString().slice(0, 10));
  return out;
}
// Regroupe des nuits éparses en intervalles lisibles : « 27/09 → 30/09 (3 nuits) ».
function intervalles(js: string[]): string[] {
  const t = [...new Set(js)].sort();
  const out: string[] = [];
  let deb = t[0], prev = t[0];
  for (const x of t.slice(1)) {
    const suivant = new Date(new Date(prev + "T00:00:00Z").getTime() + 86400000).toISOString().slice(0, 10);
    if (x === suivant) { prev = x; continue; }
    out.push(`${deb} → ${prev}`); deb = x; prev = x;
  }
  if (t.length) out.push(`${deb} → ${prev}`);
  return out;
}

// Le contrôle n'a de sens que sur une fenêtre bornée. En dessous du plancher, les
// loyers étaient facturés hors plateforme et Airtable n'en garde pas trace. Au-dessus
// du plafond — la fin de M+2 — les nuits ne sont pas encore dues : elles partiront
// dans un récap ultérieur, mois par mois. Sans ces bornes le contrôle crie sur tout
// et ne sert plus à rien, ce qui est pire que pas de contrôle.
// Plancher : 1er novembre 2026. Tout ce qui précède est soldé par le tableau du
// 01/09/2026 — décision de Vincent, le passé n'est plus à contrôler. Avant cette date
// les loyers passaient aussi par des tableaux Excel sans proforma Airtable, donc le
// contrôle n'aurait produit que du bruit.
const PLANCHER_CONTROLE = "2026-11-01";
// Exception au plancher : une réservation créée à partir de cette date n'a jamais pu
// figurer dans un tableau précédent. Toutes ses nuits sont donc à contrôler, y compris
// celles d'octobre ou d'avant — c'est exactement le mécanisme de rattrapage.
const DEPUIS_NOUVELLES = "2026-09-01";

function controleCompletude(factures: Rec[], resas: Rec[], envoyees: Set<string>, plafond: string) {
  const alertes: { resa: string; occupant: string; type: string; detail: string; montant: number }[] = [];
  const parResa = new Map<string, Rec[]>();
  for (const f of factures) {
    const id = lien1(f.fields["Réservation liée"]);
    if (id) (parResa.get(id) ?? parResa.set(id, []).get(id)!).push(f);
  }
  for (const r of resas) {
    const rf = r.fields;
    if (!sansAcc(txt(rf["Nom contact finale"])).includes("OREAL")) continue;
    const e = txt(rf["Date d'entrée"]).slice(0, 10), s = txt(rf["Date de sortie"]).slice(0, 10);
    if (!e || !s) continue;
    const recente = (r.createdTime ?? "").slice(0, 10) >= DEPUIS_NOUVELLES;
    const bas = recente ? DEPUIS_NOUVELLES : PLANCHER_CONTROLE;
    const sejour = nuits(e, s).filter((j) => j >= bas && j <= plafond);
    if (!sejour.length) continue;
    const fs = (parResa.get(r.id) ?? []).filter((f) => txt(f.fields["Catégorie"]) !== "Transfert");
    const couvertes = new Set<string>(), transmises = new Set<string>();
    let dormantes = 0;
    for (const f of fs) {
      const js = nuits(txt(f.fields["Période facturée début"]).slice(0, 10), txt(f.fields["Période facturée fin"]).slice(0, 10));
      js.forEach((j) => couvertes.add(j));
      const partie = !!f.fields[CHAMP_REPORTE] || envoyees.has(f.id);
      if (partie) js.forEach((j) => transmises.add(j));
      else if (js.length) dormantes += Number(f.fields["Montant total HT"] ?? 0);
    }
    const code = txt(rf["Code réservation"]), occ = txt(rf["Nom occupant"]);
    const sansFacture = sejour.filter((j) => !couvertes.has(j));
    if (sansFacture.length) {
      const pu = Number(rf["Prix nuitée HT"] ?? 0);
      alertes.push({ resa: code, occupant: occ, type: "Aucune facture",
        detail: intervalles(sansFacture).join(", ") + ` (${sansFacture.length} nuit(s))`,
        montant: Math.round(sansFacture.length * pu) });
    }
    const nonTransmises = sejour.filter((j) => couvertes.has(j) && !transmises.has(j));
    if (nonTransmises.length) {
      alertes.push({ resa: code, occupant: occ, type: "Facture jamais transmise",
        detail: intervalles(nonTransmises).join(", ") + ` (${nonTransmises.length} nuit(s))`,
        montant: Math.round(dormantes) });
    }
  }
  return alertes;
}

// ── Mise en forme, reprise à l'identique du tableau validé avec Vincent ──────
const ENTETES = ["GPZ Employee ID","Employee Last name","Employee First name","Initiated by","SF Consultant",
  "Appartement à Paris","Periode","Nightly Rate","N° Facture Loyer","Montant Loyer","N° Facture Service",
  "Montant Service HT","Montant Loyer + Service HT","TVA à 20% / Sur Services","Total TTC",
  "Nombre de Nuits Facturées","Country which bears the cost","L Oréal Host Legal Entity Name",
  "L Oréal Host Legal Entity code","L Oreal Host Business Unit code","Host Cost Center","HR Contact","L'Oréal Policy"];
const FONDS = ["FFD9D9D9","FFD9D9D9","FFD9D9D9","FFD9D9D9","FFD9D9D9","FFD9D9D9","FFD9D9D9","FFD9D9D9",
  "FFE4F2DD","FFE4F2DD","FFFFE7D9","FFFFE7D9","FFFFF3CC","FFFFF3CC","FFF6B084","FFD9D9D9","FFD9D9D9",
  "FFD9D9D9","FFD9D9D9","FFD9D9D9","FFD9D9D9","FFD9D9D9","FFD9D9D9"];
const LARGEURS = [16,22,20,14,22,34,24,12,17,14,17,17,22,20,14,20,20,38,20,22,20,22,26];

async function construire(lignes: Ligne[], libelle: string) {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Billing report");
  ws.addRow(ENTETES);
  ENTETES.forEach((_, i) => {
    const c = ws.getRow(1).getCell(i + 1);
    c.font = { bold: true, size: 9 };
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFBDD7EF" } };
    c.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    ws.getColumn(i + 1).width = LARGEURS[i];
  });
  ws.getRow(1).height = 40;

  const ordre = ["1 · Loyers " + libelle, "3 · Rattrapage", "2 · Transferts"];
  const triees = [...lignes].sort((a, b) =>
    ordre.indexOf(a.bloc) - ordre.indexOf(b.bloc) || sansAcc(a.nom).localeCompare(sansAcc(b.nom)));

  for (const l of triees) {
    const loyer = Number(l.loyer) || 0, serv = Number(l.service) || 0;
    const b = l.bloc_loreal;
    const r = ws.addRow([l.bloc_loreal?.gpz ?? "", l.nom, l.prenom, l.agence, l.consultant,
      l.adresse, l.periode, l.tarif, l.refLoyer, l.loyer, l.refService, l.service,
      serv ? Math.round((loyer + serv) * 100) / 100 : (loyer || ""),
      serv ? Math.round(serv * TVA_SERVICE * 100) / 100 : "",
      Math.round((loyer + serv * (1 + TVA_SERVICE)) * 100) / 100, l.nuits, "France",
      b?.entiteNom ?? "", b?.entiteCode ?? "", b?.businessUnit ?? "", b?.costCenter ?? "",
      b?.contactRh ?? "", b?.policy ?? ""]);
    r.height = 25.5;
    r.eachCell({ includeEmpty: true }, (c, i) => {
      c.font = { size: 10 };
      c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: FONDS[i - 1] ?? "FFD9D9D9" } };
      c.alignment = { horizontal: "center", vertical: "middle" };
      c.border = { bottom: { style: "thin", color: { argb: "FFBBBBBB" } } };
      if ([8, 10, 12, 13, 14, 15].includes(i)) c.numFmt = '# ##0.00 "€"';
    });
  }
  const fin = ws.rowCount;
  const tot = ws.addRow([]);
  tot.getCell(2).value = "TOTAL";
  for (const col of [10, 12, 13, 14, 15, 16]) {
    const L = String.fromCharCode(64 + col);
    tot.getCell(col).value = { formula: `SUM(${L}2:${L}${fin})` } as never;
    tot.getCell(col).numFmt = col === 16 ? "0" : '# ##0.00 "€"';
  }
  tot.eachCell({ includeEmpty: true }, (c) => {
    c.font = { bold: true, size: 11 };
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEDEDED" } };
    c.border = { top: { style: "medium", color: { argb: "FF2F4858" } } };
    c.alignment = { horizontal: "center", vertical: "middle" };
  });
  tot.height = 25.5;
  ws.views = [{ state: "frozen", ySplit: 1 }];
  ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: fin, column: ENTETES.length } };
  return wb;
}

async function envoyer(nom: string, buf: Buffer, resume: Dict, libelle: string,
                       pdfs: { contenu: Buffer | null; nom: string; jointes: number; absents: string[] }) {
  if (!RESEND) return false;
  const manque = (resume.aCompleter as string[]) ?? [];
  const rattr = (resume.rattrapages as { nom: string; periode: string; nuits: number | string; montant: number }[]) ?? [];
  const alertes = (resume.alertes as { resa: string; occupant: string; type: string; detail: string; montant: number }[]) ?? [];
  const blocs = resume.blocs as Record<string, number>;
  const html = `
    <p>Bonjour Vincent,</p>
    <p style="font-size:16px"><strong>${libelle} &nbsp;+&nbsp; transferts &nbsp;+&nbsp; rattrapage</strong></p>
    <table cellpadding="6" style="border-collapse:collapse;font-family:system-ui,sans-serif;font-size:14px">
      ${Object.entries(blocs).map(([b, n]) => `<tr><td style="border-bottom:1px solid #eee">${b}</td><td style="border-bottom:1px solid #eee;text-align:right"><strong>${n}</strong></td></tr>`).join("")}
      <tr><td><strong>Total HT</strong></td><td style="text-align:right"><strong>${Number(resume.totalHT).toLocaleString("fr-FR")} €</strong></td></tr>
    </table>
    <p>${resume.lignes} ligne(s). Ces factures sont désormais marquées comme reportées : elles ne repartiront pas au prochain récap.</p>
    ${pdfs.jointes ? `<p>Les <strong>${pdfs.jointes} proforma</strong> sont jointes en archive.${pdfs.absents.length ? ` ${pdfs.absents.length} PDF introuvable(s) : ${pdfs.absents.join(", ")}.` : ""}</p>` : ""}
    ${rattr.length
      ? `<p style="margin-top:18px"><strong>Rattrapages</strong> — périodes antérieures au mois du tableau, jamais facturées parce que la réservation n'existait pas à l'envoi précédent :</p>
         <table cellpadding="0" style="border-collapse:collapse;font-family:system-ui,sans-serif;font-size:13px">
         ${rattr.map((x) => `<tr><td style="border-bottom:1px solid #eee;padding:4px 10px">${x.nom}</td><td style="border-bottom:1px solid #eee;padding:4px 10px">${x.periode}</td><td style="border-bottom:1px solid #eee;padding:4px 10px;text-align:right">${x.nuits} nuits</td><td style="border-bottom:1px solid #eee;padding:4px 10px;text-align:right">${x.montant.toLocaleString("fr-FR")} €</td></tr>`).join("")}
         <tr><td colspan="3" style="padding:6px 10px"><strong>Total rattrapage</strong></td><td style="padding:6px 10px;text-align:right"><strong>${rattr.reduce((s2, x) => s2 + x.montant, 0).toLocaleString("fr-FR")} €</strong></td></tr></table>`
      : `<p style="margin-top:18px"><strong>Aucun rattrapage</strong> — toutes les périodes du tableau concernent le mois annoncé.</p>`}
    ${manque.length ? `<p><strong>À compléter avant envoi à L'Oréal</strong> — le bloc de facturation manque ou est incomplet dans les notes internes de la réservation :</p><ul>${manque.map((m) => `<li>${m}</li>`).join("")}</ul>` : `<p>Toutes les lignes sont complètes.</p>`}
    <p style="color:#888;font-size:12px">Envoyé automatiquement le dernier jour du mois.</p>`;
  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${RESEND}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: EXPEDITEUR, to: [DESTINATAIRE],
        subject: `Récap facturation L'Oréal ${libelle}`, html,
        attachments: [{ filename: nom, content: buf.toString("base64") },
          ...(pdfs.contenu ? [{ filename: pdfs.nom, content: pdfs.contenu.toString("base64") }] : [])] }),
    });
    return r.ok;
  } catch { return false; }
}
