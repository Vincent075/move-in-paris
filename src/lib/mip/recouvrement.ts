// Recouvrement client — briques communes aux crons « encaissements » et « relances ».
//
// Demande de Vincent (05/09/2026) : « un outil complet de comptabilité relance client »,
// automatique et relié à Pennylane. Trois mouvements, tous ici :
//   1) ENCAISSEMENTS — toutes les heures, on lit les crédits bancaires dans Pennylane
//      (jeton lecture PENNYLANE_API_KEY_BANK, jamais le jeton facturation) et on les
//      rapproche des factures « Envoyée » de la plateforme. Pennylane n'a AUCUN endpoint
//      de lettrage : le rapprochement est le nôtre, et il n'écrit que dans Airtable.
//   2) RELANCES — chaque matin, toute facture dont l'échéance (date d'envoi + 30 j) est
//      dépassée entre dans la table Relances et avance seule : 1re relance à J+0, 2e à
//      J+7, puis « J+14 · relance manuelle » signalée à Guillaume par un email HTML.
//   3) CONFIRMATION — dès qu'un règlement est détecté sur une facture relancée, un email
//      de bonne réception part au payeur et la relance se clôture.
// Un crédit sans facture reconnue passe « À identifier » ; si l'on reconnaît le payeur,
// on lui demande ses références par email (aux mêmes contacts que ses factures).
// L'Oréal est HORS circuit (relances et demandes) : Vincent s'en occupe à la main.
// Toutes les réponses aux emails vont à Guillaume (Reply-To).
import {
  airtable, lireTable, lireEnregistrement, slack, envoyerEmailLocataire, htmlEmailLocataire, signataire,
  telechargerS3, texte, premier, jourParis, type Rec, type Dict, type Carte, type Signataire, type PieceJointe,
} from "./courrier";
import {
  T_FACTURES, T_MONITORING, SLACK_FACTURATION, chargerContexte, langueDe, horodatageParis, Journal, ecrireFacture,
  type Contexte, type Langue,
} from "./facturation";
import { getFacture, idDepuisLien, urlPdf, telechargerPdf } from "./pennylane";
import { AsyncLocalStorage } from "node:async_hooks";

export const T_RELANCES = "tblUnPePXu9xzOJX2";
export const T_ENCAISSEMENTS = "tbl07focU5UDWb57t";
export const T_HISTORIQUE = "tbl8Alhpc3XXZtlCg";   // Historique factures (registre 2025-2026, table de données)
export const T_CLIENTS = "tblIzSOniHXHCLWQJ";
export const T_AGENCES = "tblINIOlKNzndfDRX";
export const T_OCCUPANTS = "tblgcFnDwxjqVJy8L";
export const T_CONTACTS = "tblCvwLYdXYiZg6pY";
export const GUILLAUME = "guillaume@move-in-paris.com";
export const ECHEANCE_JOURS = 30;
export const DELAI_RELANCE_JOURS = 7;
export const COMPTES: Record<string, string> = { "1848853": "BNP ****4506", "2740829": "Compte ****2036" };
export const BASE_ID = process.env.AIRTABLE_BASE_ID || "appcLt70GQiR1FAbT";

// ── Petits outils ───────────────────────────────────────────────────────────
export const nombre = (v: unknown) => { const n = Number(v ?? 0); return Number.isFinite(n) ? n : 0; };
export const arrondi = (v: number) => Math.round(v * 100) / 100;
export const echapper = (s: string) => s.replace(/'/g, "\\'");
const liens = (v: unknown): string[] => (Array.isArray(v) ? v.map((x) => texte(x)).filter(Boolean) : []);
// Sans accents, majuscules, fautes connues du registre corrigées (OECD = OCDE…).
export const sa = (s: unknown) =>
  texte(s).replace(/[’‘`´]/g, "'").replace(/ /g, " ").normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase()
    .replace(/\bOECD\b/g, "OCDE").replace(/\bPRENOD\b/g, "PERNOD").replace(/\bBUEGROUND\b/g, "BLUEGROUND").replace(/\bSILVER\s+DOOR\b/g, "SILVERDOOR");
const STOP = new Set(["VIREMENT", "VIR", "SEPA", "RECU", "INST", "TIERS", "FROM", "SENT", "REVOLUT", "LOYER", "LOYERS", "RENT", "FACTURE", "INVOICE", "PAIEMENT", "PAYMENT", "PARIS", "MOVE", "FRANCE", "LIMITED", "SERVICES", "UNLIMITED", "CORPORATE", "HOUSING", "MOTIF", "REFBEN", "ORIG", "NOTPROVIDED", "RNF", "EID", "FRM", "SAS", "SARL", "MONSIEUR", "MADAME", "MLLE", "MME", "GROUP", "INTERNATIONAL", "COMPANY", "FRANCE", "EUROPE", "HOLDING", "BANK", "TRANSFER", "MOIS", "MONTH", "MARS", "AVRIL", "JUIN", "JUILLET", "AOUT", "SEPTEMBRE", "OCTOBRE", "NOVEMBRE", "DECEMBRE", "JANVIER", "FEVRIER",
  "GIE", "LTD", "INC", "LLC", "PLC", "GMBH", "CIE", "SPA", "SRL", "AND", "THE", "DES", "LES", "EUR", "REF", "URI", "ROC", "TRN", "MDT", "NUMERO", "DELEGATION",
  "APARTMENT", "APARTMENTS", "MOBILITY", "TEMPORARY", "GLOBAL", "PAYOUT", "PAYMENT", "BOOKING", "DEPOSIT", "REFUND", "LLP"]);
// Mots significatifs d'un nom : trois lettres au moins (AXA, LEE, WOO étaient invisibles avec
// quatre), sans les mots creux de la banque et des raisons sociales.
export const mots = (s: unknown): Set<string> => new Set(sa(s).split(/[^A-Z]+/).filter((w) => w.length >= 3 && !STOP.has(w)));
export const motsOrdonnes = (s: unknown): string[] => sa(s).split(/[^A-Z]+/).filter((w) => w.length >= 3 && !STOP.has(w));
const intersecte = (a: Set<string>, b: Set<string>) => { for (const x of a) if (b.has(x)) return true; return false; };
// Un nom est « contenu » dans un libellé si tous ses mots significatifs y sont, et, pour une
// raison sociale, dans le MÊME ORDRE : « KABI PHARMA FRESENIUS DEUTSCHLAND » n'est pas
// « Fresenius Kabi France ». Pour une personne, l'ordre est libre (la banque écrit souvent le
// nom avant le prénom).
export type Nom = { mots: string[]; ordonne: boolean; type: "client" | "agence" | "occupant" };
export const nomDe = (s: unknown, ordonne: boolean, type: Nom["type"] = "client"): Nom | null => { const m = Array.from(new Set(motsOrdonnes(s))); return m.length ? { mots: m, ordonne, type } : null; };
export const contientNom = (libelle: string[], nom: Nom): boolean => {
  if (!nom.mots.every((w) => libelle.includes(w))) return false;
  if (!nom.ordonne) return true;
  let i = -1;
  for (const w of nom.mots) { const j = libelle.indexOf(w, i + 1); if (j < 0) return false; i = j; }
  return true;
};
// L'émetteur du virement, tel que la banque l'écrit (« /FRM … /EID », « /ORIG … /MOTIF »,
// « 1/COSMOPOLITAN… ») : un nom d'UN seul mot ne désigne un dossier que s'il est l'émetteur.
export const emetteurDe = (libelle: string): string => {
  const m = /\/FRM\s+(.+?)\s*\/EID/i.exec(libelle) || /\/ORIG\s+(.+?)\s*\/MOTIF/i.exec(libelle) || /^1\/([^/]+)/i.exec(libelle) || /^([A-Z0-9 .'&-]{3,60}?)\s+-\s/i.exec(libelle);
  if (m) return sa(m[1]);
  // Libellé sans structure (« STELLAR CORPORATE HOUSING ID1737 INV… ») : l'émetteur est en tête.
  return sa(libelle).split(/[^A-Z0-9]+/).filter(Boolean).slice(0, 5).join(" ");
};
const echapperRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
// Le numéro de dossier partenaire (« Mention sur facture ») ne désigne une facture que s'il
// ressemble à un identifiant : 5 caractères au moins, 3 chiffres au moins, pas « Septembre
// 2026 », et entier dans le libellé (pas au milieu d'un IBAN ou d'un autre nombre).
export const mentionDesigne = (mention: string, L: string): boolean => {
  const m = sa(mention).trim();
  if (m.length < 5 || (m.match(/\d/g) ?? []).length < 3 || /^[A-Z]+\s*\d{4}$/.test(m)) return false;
  return new RegExp(`(^|[^A-Z0-9])${echapperRe(m)}([^A-Z0-9]|$)`).test(L);
};
// Un de nos numéros de facture dans un libellé (FAC-2026-0125 ou F-2026-08-0312).
export const citeNumero = (libelle: string) => /\bFAC-20\d{2}-\d{3,4}\b|\bF-20\d{2}-\d{2}-\d{3,4}\b/i.test(libelle);
// Numéros du registre d'avant la plateforme (2026-275, 2025-705/2, 2026-A650), jamais la
// partie d'un numéro plateforme (F-2026-08-… ne matche pas : deux chiffres seulement).
export const refsRegistre = (libelle: string): string[] =>
  Array.from(new Set((libelle.toUpperCase().match(/(?<![A-Z]-)\b20(?:2[4-9])-A?\d{3,4}(?:\/\d)?\b/g) ?? [])));

export const eur = (v: number, langue: Langue = "fr_FR") =>
  new Intl.NumberFormat(langue === "fr_FR" ? "fr-FR" : "en-GB", { style: "currency", currency: "EUR" }).format(v);
export const dateLongue = (iso: string, langue: Langue) => {
  const t = Date.parse(texte(iso));
  if (!Number.isFinite(t)) return "";
  return new Intl.DateTimeFormat(langue === "fr_FR" ? "fr-FR" : "en-GB", { timeZone: "Europe/Paris", day: "numeric", month: "long", year: "numeric" }).format(new Date(t));
};
export const dateCourte = (iso: string) => {
  const t = Date.parse(texte(iso));
  if (!Number.isFinite(t)) return "";
  return new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(t));
};
export const plusJours = (iso: string, jours: number) => jourParis(new Date(Date.parse(iso) + jours * 86400000));
export const joursEntre = (a: string, b: string) => Math.round((Date.parse(b) - Date.parse(a)) / 86400000);
export const aujourdhui = () => jourParis(new Date());
// L'Oréal, et seulement L'Oréal : « L OREAL », « L'OREAL », « LOREAL ». Pas Boréalis ni Floréal.
export const estLoreal = (s: unknown) => /\bL\s?'?\s?OREAL\b|\bLOREAL\b/.test(sa(s));

// ── Monitoring (une ligne par contrôle, mise à jour) ────────────────────────
export async function monitoring(nom: string, statut: "OK" | "ALERTE", detail: string) {
  try {
    const rows = await lireTable(T_MONITORING, `{Contrôle}='${echapper(nom)}'`);
    const fields = { "Contrôle": nom, Statut: statut, "Détail": detail.slice(0, 4000), "Dernière vérification": new Date().toISOString() };
    if (rows[0]) await airtable("PATCH", `${T_MONITORING}/${rows[0].id}`, { fields, typecast: true });
    else await airtable("POST", T_MONITORING, { records: [{ fields }], typecast: true });
  } catch { /* le tableau de bord ne conditionne jamais le traitement */ }
}

// ── Banque : crédits Pennylane (lecture seule) ──────────────────────────────
export type Credit = { id: string; date: string; montant: number; libelle: string; compte: string };
export async function lireCredits(depuis: string): Promise<Credit[]> {
  const key = process.env.PENNYLANE_API_KEY_BANK || "";
  if (!key) throw new Error("PENNYLANE_API_KEY_BANK absente (variable dédiée au jeton banque, lecture seule)");
  const out: Credit[] = [];
  const filtre = encodeURIComponent(JSON.stringify([{ field: "date", operator: "gteq", value: depuis }]));
  let cursor = "";
  let avecFiltre = true;
  for (let page = 0; page < 80; page++) {
    const url = `https://app.pennylane.com/api/external/v2/transactions?limit=100${avecFiltre ? `&filter=${filtre}` : ""}${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""}`;
    const r = await fetch(url, { headers: { Authorization: `Bearer ${key}`, Accept: "application/json" }, cache: "no-store" });
    if (r.status === 400 && avecFiltre && !cursor) { avecFiltre = false; continue; } // filtre refusé : balayage complet
    if (!r.ok) throw new Error(`Pennylane transactions -> ${r.status} ${(await r.text()).slice(0, 200)}`);
    const d = (await r.json()) as { items?: Dict[]; has_more?: boolean; next_cursor?: string | null };
    for (const t of d.items ?? []) {
      const montant = nombre(t.amount);
      const date = texte(t.date).slice(0, 10);
      if (!(montant > 0) || date < depuis) continue;
      out.push({
        id: texte(t.id), date, montant: arrondi(montant),
        libelle: texte(t.label).replace(/\s+/g, " ").trim(),
        compte: texte((t.bank_account as Dict | undefined)?.id),
      });
    }
    if (d.has_more !== true || !d.next_cursor) break;
    cursor = d.next_cursor;
  }
  out.sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
  return out;
}

// Mouvements qui ne sont jamais un règlement client (remboursements, impôts, prêts…). Chaque
// mot est borné : « HUBER » n'est pas UBER, « CAPITALE » n'est pas un apport en capital. Et la
// passe encaissements n'applique cette règle qu'en l'absence de l'un de nos numéros de facture
// dans le libellé. Un mouvement hors client est toujours raconté dans #facturation.
const HORS_CLIENT = /\bURSSAF\b|\bIMPOTS?\b|\bDGFIP\b|\bPRET\b|\bAMORTISSEMENT\b|APPORT EN CAPITAL|AUGMENTATION DE CAPITAL|\bCAPITAL SOCIAL\b|\bAPPORT\b|AXA FRANCE IARD|MMA IARD|\bGENERALI\b|\bTHELEM\b|\bKEREIS\b|GESTION ASSURANCES|\bEDF\b|\bORANGE\b|\bUBER\b|CM-CIC|\bNATIOCREDIMURS\b|DIGITAL CLASSIFIEDS|\bGOOGLE\b|\bSECAB\b|\bREMBOURST\b|SCI STELLA|ESC ESTHETIQUE|SIP PARIS|REMBOURSEMENT ERREUR|EXCEDENT DE VERSEMENT|ORIG SASU MOVE IN PAR|MALAKOFF HUMANIS|ASP SERVICES|ASP MDT|BNP PARIBAS MDT|REJET RECU VIR|ERREUR DE VIR|PROT\.ENTREPRISE|PRLV SEPA RETOURNE|\bANTHROPIC\b|\bAMAZON\b/i;
export const horsClient = (c: Credit) => HORS_CLIENT.test(c.libelle);

// ── Factures ouvertes de la plateforme ──────────────────────────────────────
// `noms` : un jeu de mots par nom complet (client, agence, chaque occupant). Une facture n'est
// candidate que si l'un de ces noms est ENTIÈREMENT dans le libellé. Un seul mot commun
// (un nom d'occupant partagé par deux dossiers, par exemple) suffisait à faire solder la
// facture d'un autre client : prouvé le 06/09/2026 sur les factures ouvertes réelles.
// `montant` est le montant à PAYER, toutes taxes comprises (HT × 1,2 si la facture porte
// « 20 % ») : c'est ce que le client vire et ce que les relances réclament. `montantHT` reste
// la valeur comptable. `credite` = avoirs partiels déjà émis sur cette facture : ils
// réduisent le reste dû, sinon le client qui règle le net était relancé pour la part créditée.
export type FactureOuverte = {
  rec: Rec; numero: string; numeroPl: string; montant: number; montantHT: number; encaisse: number; credite: number; reste: number;
  client: string; agence: string; occupants: string; mention: string; mots: Set<string>; noms: Nom[]; loreal: boolean; dateEnvoi: string;
};
export const coefTva = (f: Dict) => (texte(f["TVA"]) === "20 %" ? 1.2 : 1);
export function decrire(rec: Rec): FactureOuverte {
  const f = rec.fields;
  const client = liens(f["Client final"]).join(", ");
  // « Agence de relocation » est le lookup renseigné ; « Nom agence (from …) » est vide sur
  // toutes les factures (vérifié le 06/09/2026 : 0 sur 116). Lu ici, il ne l'était jamais.
  const agence = (liens(f["Agence de relocation"]).length ? liens(f["Agence de relocation"]) : liens(f["Nom agence (from Agence de relocation)"])).join(", ");
  const occupants = liens(f["Occupants"]).join(", ");
  const mention = texte(f["Mention sur facture"]).trim();
  const montantHT = arrondi(nombre(f["Montant total HT"]));
  const montant = arrondi(montantHT * coefTva(f));
  const encaisse = arrondi(nombre(f["Montant encaissé"]));
  const noms = [nomDe(client, true, "client"), nomDe(agence, true, "agence"), ...liens(f["Occupants"]).map((o) => nomDe(o, false, "occupant"))].filter((n): n is Nom => !!n);
  const m = new Set<string>(noms.flatMap((n) => n.mots));
  return {
    rec, numero: texte(f["Numéro facture"]) || rec.id, numeroPl: texte(f["Numéro Pennylane"]), montant, montantHT, encaisse, credite: 0,
    reste: arrondi(montant - encaisse), client, agence, occupants, mention, mots: m, noms,
    loreal: estLoreal(client) || estLoreal(agence), dateEnvoi: texte(f["Date d'envoi"]).slice(0, 10),
  };
}
// Le numéro Pennylane (F-2026-09-0444) est ce que le client recopie dans son virement :
// on le range une fois pour toutes dans la fiche quand il manque. Les avoirs partiels liés
// (« From field: Facture d'origine (partiel) ») sont lus en une requête et déduits du reste.
export async function facturesOuvertes(): Promise<FactureOuverte[]> {
  const rows = await lireTable(T_FACTURES, `AND({Statut}='Envoyée', {Type}!='Avoir', {Mode facturation}!='Proforma', {Montant total HT}>1)`);
  const idsAvoirs = Array.from(new Set(rows.flatMap((r) => liens(r.fields["From field: Facture d'origine (partiel)"]))));
  const avoirs = new Map<string, number>();
  for (let i = 0; i < idsAvoirs.length; i += 40) {
    const lot = idsAvoirs.slice(i, i + 40);
    const recs = await lireTable(T_FACTURES, `OR(${lot.map((id) => `RECORD_ID()='${id}'`).join(",")})`);
    for (const a of recs) avoirs.set(a.id, arrondi(Math.abs(nombre(a.fields["Montant total HT"])) * coefTva(a.fields)));
  }
  const out: FactureOuverte[] = [];
  for (const rec of rows) {
    const d = decrire(rec);
    d.credite = arrondi(liens(rec.fields["From field: Facture d'origine (partiel)"]).reduce((s, id) => s + (avoirs.get(id) ?? 0), 0));
    // Le montant à payer se LIT sur le document que le client a reçu, il ne se déduit pas :
    // quand la fiche n'a ni « Numéro Pennylane » ni « TVA » (factures émises par l'ancienne
    // chaîne n8n : 17 sur 20 le 06/09/2026, dont deux à 20 % chez Pennylane), on lit le
    // document une fois et on range dans la fiche ce qu'il faut pour ne plus y revenir.
    const tvaVide = !texte(rec.fields["TVA"]);
    if (!d.numeroPl || tvaVide) {
      const id = idDepuisLien(rec.fields["Lien Pennylane"]);
      if (id) {
        try {
          const pl = await getFacture(id);
          const champs: Dict = {};
          if (!d.numeroPl && texte(pl.invoice_number)) { d.numeroPl = texte(pl.invoice_number); champs["Numéro Pennylane"] = d.numeroPl; }
          const ttc = arrondi(nombre(pl.currency_amount));
          if (tvaVide && ttc > 0) {
            d.montant = ttc;
            champs["TVA"] = ttc > d.montantHT + 0.004 ? "20 %" : "Pas de TVA";
          }
          if (Object.keys(champs).length) await ecrireFacture(rec.id, champs);
        } catch { /* on rapprochera sur le FAC-… et le montant HT ; le journal de la passe le dira */ }
      }
    }
    d.reste = arrondi(d.montant - d.credite - d.encaisse);
    if (d.reste > 0.009) out.push(d);
  }
  return out;
}

// ── Créances d'avant la plateforme (registre 2025-2026) ─────────────────────
// Elles vivent dans la table Relances (lien « Facture historique »), jamais dans Factures.
// Le moteur les rapproche avec la même exigence de preuve : numéro du registre cité, ou nom
// complet du client ou de l'occupant et un montant qui ne laisse qu'une lecture possible.
export type CreanceHistorique = { rel: Rec; ref: string; client: string; occupant: string; montant: number; encaisse: number; reste: number; noms: Nom[]; factureHistId: string; loreal: boolean };
export async function creancesHistoriques(): Promise<CreanceHistorique[]> {
  const rows = await lireTable(T_RELANCES, `AND({Statut}='En cours', {Facture historique}!='')`);
  return rows.map((rel) => {
    const f = rel.fields;
    const montant = arrondi(nombre(f["Montant dû"]));
    const encaisse = arrondi(nombre(f["Montant encaissé"]));
    const client = texte(f["Client"]).trim(), occupant = texte(f["Occupant"]).trim();
    return { rel, ref: texte(f["Référence"]).trim(), client, occupant, montant, encaisse, reste: arrondi(montant - encaisse), noms: [nomDe(client, true, "client"), nomDe(occupant, false, "occupant")].filter((n): n is Nom => !!n), factureHistId: premier(f["Facture historique"]), loreal: estLoreal(client) };
  }).filter((x) => x.reste > 0.009 && !x.loreal);
}
export type RapprochementHistorique = { creances: CreanceHistorique[]; parts: number[]; methode: string };
// Une créance historique est désignée par un nom de client d'au moins deux mots, ou par le
// client ET l'occupant ensemble : « CHEN » ou « TAYLOR » seuls ne désignent rien (l'occupant
// du registre n'est qu'un nom de famille).
const histDesignee = (x: CreanceHistorique, LO: string[]) => {
  const client = x.noms.find((n) => n.type === "client"), occ = x.noms.find((n) => n.type === "occupant");
  if (client && client.mots.length >= 2 && contientNom(LO, client)) return true;
  return !!(client && occ && contientNom(LO, client) && contientNom(LO, occ));
};
export function rapprocherHistorique(c: Credit, toutes: CreanceHistorique[]): RapprochementHistorique | null {
  if (!toutes.length) return null;
  const L = sa(c.libelle);
  const LO = motsOrdonnes(c.libelle);
  const total = (xs: CreanceHistorique[]) => arrondi(xs.reduce((s, x) => s + x.reste, 0));
  const cites = refsRegistre(c.libelle);
  if (cites.length) {
    const cs = toutes.filter((x) => cites.includes(x.ref.toUpperCase()));
    if (!cs.length) return null;
    if (Math.abs(total(cs) - c.montant) < 0.01) return { creances: cs, parts: cs.map((x) => x.reste), methode: "numéro du registre cité dans le libellé" };
    if (cs.length === 1 && c.montant < cs[0].reste) {
      // Un partiel est une déduction : payeur reconnu (client ou occupant de la créance dans
      // le libellé), hors partenaire qui retient sa commission. Même règle que la plateforme.
      const x = cs[0];
      const payeurConnu = x.noms.some((n) => contientNom(LO, n));
      const partenaire = PARTENAIRES_COMMISSION.test(L) || PARTENAIRES_COMMISSION.test(sa(x.client));
      return payeurConnu && !partenaire ? { creances: cs, parts: [c.montant], methode: "numéro du registre cité, règlement partiel" } : null;
    }
    const combo = uniqueOuRien(sousEnsembles(cs, c.montant, Math.min(cs.length, 5), (x) => x.ref));
    return combo ? { creances: combo, parts: combo.map((x) => x.reste), methode: `numéros du registre cités, ${combo.length} créance(s) sur ${cs.length} réglée(s)` } : null;
  }
  const cands = toutes.filter((x) => histDesignee(x, LO));
  if (!cands.length) return null;
  if (cands.filter((x) => Math.abs(x.reste - c.montant) < 0.01).length > 1) return null;
  const combo = uniqueOuRien(sousEnsembles(cands, c.montant, 3, (x) => x.ref));
  return combo ? { creances: combo, parts: combo.map((x) => x.reste), methode: combo.length === 1 ? "payeur reconnu, montant exact" : `payeur reconnu, somme exacte de ${combo.length} créances` } : null;
}
export function diagnosticHistorique(c: Credit, toutes: CreanceHistorique[]): string {
  const L = sa(c.libelle);
  const LO = motsOrdonnes(c.libelle);
  const cites = refsRegistre(c.libelle);
  if (!cites.length) return "";
  const cs = toutes.filter((x) => cites.includes(x.ref.toUpperCase()));
  if (!cs.length) return `numéro de registre cité (${cites.join(", ")}) sans créance historique ouverte correspondante`;
  if (cs.length === 1) {
    const x = cs[0];
    if (c.montant > x.reste) return `numéro de registre cité (${x.ref}) mais virement supérieur au reste dû de ${eur(arrondi(c.montant - x.reste))} : écart à expliquer`;
    if (c.montant < x.reste) {
      if (PARTENAIRES_COMMISSION.test(L) || PARTENAIRES_COMMISSION.test(sa(x.client))) return `numéro de registre cité (${x.ref}, ${x.client}) mais virement inférieur au reste dû de ${eur(arrondi(x.reste - c.montant))} : commission retenue par le partenaire ? à rapprocher à la main`;
      if (!x.noms.some((n) => contientNom(LO, n))) return `numéro de registre cité (${x.ref}) par un payeur inconnu (ni ${x.client}${x.occupant ? ` ni ${x.occupant}` : ""} dans le libellé) et virement inférieur au reste dû de ${eur(arrondi(x.reste - c.montant))} : un numéro seul ne prouve pas un acompte, à imputer à la main`;
    }
  }
  return `numéro(s) de registre cité(s) (${cs.map((x) => x.ref).join(", ")}) mais montant incohérent : créances ${eur(arrondi(cs.reduce((s, x) => s + x.reste, 0)))} contre virement ${eur(c.montant)}`;
}

// ── Rapprochement d'un crédit ───────────────────────────────────────────────
export type Rapprochement = { factures: FactureOuverte[]; parts: number[]; methode: string; note: string; partiel: boolean; commission?: number };
const NUMEROS = /\bFAC-20\d{2}-\d{3,4}\b|\bF-20\d{2}-\d{2}-\d{3,4}\b/g;
// Écart maximal accepté au-delà du reste dû : arrondis et frais marginaux, rien de plus. La
// tolérance de 5 % absorbait un trop-perçu en silence (37,50 € sur un loyer OCDE, en
// production) et aurait avalé 7 275 € sur une facture globale : un écart n'est jamais rangé,
// il reste « À identifier » avec son diagnostic.
const TOLERANCE = 1;
// Montant lu tel qu'il est écrit : 1250 · 1250.00 · 1 250,00 · 1.250,00 · 1,250.00. Plus
// d'heuristique « quatre chiffres = des centimes » (elle lisait 12,50 € dans « 1250 »).
export function lireMontant(brut: string): number | null {
  const m = /^(\d+(?:[ .,]\d{3})*)(?:([.,])(\d{1,2}))?$/.exec(brut.trim());
  if (!m) return null;
  const n = Number(m[3] ? `${m[1].replace(/[ .,]/g, "")}.${m[3]}` : m[1].replace(/[ .,]/g, ""));
  return Number.isFinite(n) ? n : null;
}
// Commission ÉCRITE par le partenaire dans le libellé (« LESS COMM 125.00 », « LESS COMMISSION
// OF 1.250,00 », « LESS 250.00 COMM »). Le mot COMMISSION est obligatoire : « LESS 150
// DEPOSIT » ou « LESS 400 CLEANING FEE » sont des retenues litigieuses, pas des commissions,
// et un pourcentage (« LESS 10% COMM ») n'est pas un montant. Frontière de mot : « WIRELESS
// 300 » n'est rien.
export function commission(libelle: string): number | null {
  const l = libelle.replace(/ /g, " ");
  const num = "(\\d+(?:[ .,]\\d{3})*(?:[.,]\\d{1,2})?)(?![\\d.,]*\\s*%)";
  const m = new RegExp(`\\bLESS\\s+COMM(?:ISSION)?\\.?\\s+(?:OF\\s+)?(?:EUR\\s*)?${num}`, "i").exec(l)
    || new RegExp(`\\bLESS\\s+(?:EUR\\s*)?${num}\\s+(?:EUR\\s+)?COMM(?:ISSION)?\\b`, "i").exec(l);
  if (!m) return null;
  const n = lireMontant(m[1]);
  return n !== null && n > 0 ? arrondi(n) : null;
}
// TOUTES les combinaisons (1 à k factures, parmi les 40 plus anciennes) dont la somme tombe
// juste sur la cible. Une seule = rattachement sûr. Plusieurs = ambigu : le moteur ne choisit
// PAS, un humain tranche. Vincent (06/09/2026) : « tu rapproches surtout pas par montant, je
// peux très bien louer deux appartements à 175 € par nuit ». Avant cette règle, la première
// combinaison trouvée gagnait (donc la facture la plus ancienne), la mauvaise facture passait
// « Payée » et le client à jour recevait une relance pour l'autre. Prouvé le 06/09 en
// exécutant la fonction sur deux factures identiques du même client.
function sousEnsembles<T extends { reste: number }>(c: T[], cible: number, k = 3, cle: (x: T) => string = (x) => { const f = x as unknown as FactureOuverte; return `${f.dateEnvoi ?? ""}|${f.numero ?? ""}`; }): T[][] {
  const l = c.slice().sort((a, b) => cle(a).localeCompare(cle(b))).slice(0, 40);
  const n = l.length;
  const out: T[][] = [];
  for (let taille = 1; taille <= Math.min(k, n); taille++) {
    const idx = Array.from({ length: taille }, (_, i) => i);
    while (true) {
      const combo = idx.map((i) => l[i]);
      if (Math.abs(combo.reduce((s, f) => s + f.reste, 0) - cible) < 0.01) out.push(combo);
      let p = taille - 1;
      while (p >= 0 && idx[p] === n - taille + p) p--;
      if (p < 0) break;
      idx[p]++;
      for (let q = p + 1; q < taille; q++) idx[q] = idx[q - 1] + 1;
    }
  }
  return out;
}
// Une seule combinaison, ou rien : jamais un choix arbitraire entre plusieurs.
const uniqueOuRien = <T,>(combos: T[][]) => (combos.length === 1 ? combos[0] : null);
const numeros = (fs: FactureOuverte[]) => fs.map((f) => f.numero).join(", ");
// Une facture est candidate pour un crédit si le libellé désigne son dossier : le numéro de
// dossier partenaire imprimé sur la facture (« Mention sur facture », 4 caractères au moins),
// ou le nom COMPLET du client, de l'agence ou d'un occupant. Jamais un mot isolé.
// Désignation d'une facture par le libellé : le numéro de dossier partenaire, ou le nom du
// CLIENT ou d'un OCCUPANT de la facture (jamais le nom de l'agence seul : Cosmopolitan paie
// pour Loro Piana comme pour Pernod Ricard, son nom ne désigne aucune facture en particulier).
// Un nom d'un seul mot (« AXA ») ne désigne que s'il est l'émetteur du virement.
const designee = (f: FactureOuverte, L: string, LO: string[]) => {
  if (mentionDesigne(f.mention, L)) return true;
  const emetteur = motsOrdonnes(emetteurDe(L));
  return f.noms.some((n) => n.type !== "agence" && (n.mots.length >= 2 ? contientNom(LO, n) : contientNom(emetteur, n)));
};
// Factures que le moteur a le droit de solder seul : L'Oréal est HORS circuit (Vincent impute
// à la main ses virements groupés). Pour un rapprochement au NOM, une facture émise plus de
// 14 jours après le crédit n'est pas candidate (un règlement ne précède pas sa facture au-delà
// de quelques jours d'acompte ; l'OCDE paie le 20 pour une facture émise le 26). Un numéro
// CITÉ, lui, vaut pour toute facture ouverte : un client qui paie un mois d'avance en donnant
// la bonne référence est rapproché.
const horsLoreal = (toutes: FactureOuverte[]) => toutes.filter((f) => !f.loreal);
const eligibles = (c: Credit, toutes: FactureOuverte[]) => {
  const limite = plusJours(c.date, 14);
  return horsLoreal(toutes).filter((f) => !f.dateEnvoi || f.dateEnvoi <= limite);
};
// Un règlement PARTIEL est une déduction (« ce virement est un acompte sur CETTE facture »),
// pas une preuve. Il n'est imputé seul que si :
//  - la facture n'est pas adressée à une agence et le virement ne vient pas d'un partenaire
//    qui retient sa commission (SilverDoor, Oasis) : un montant inférieur sans commission
//    écrite est alors une commission retenue, à rapprocher à la main (Vincent, 06/09/2026 :
//    les taux varient à chaque réservation) ;
//  - la désignation est FORTE : le numéro de dossier, ou un nom d'au moins deux mots. « AXA »
//    seul ne prouve pas un acompte (un virement AXA Assurances réduisait le solde AXA GROUP).
export const PARTENAIRES_COMMISSION = /SILVERDOOR|OASIS CORPORATE|OASIS COLLECTIONS/;
const partielPermis = (f: FactureOuverte, L: string) => !f.agence && texte(f.rec.fields["Facturer à"]) !== "Agence" && !PARTENAIRES_COMMISSION.test(L);
const designationForte = (f: FactureOuverte, L: string, LO: string[]) =>
  mentionDesigne(f.mention, L) || f.noms.some((n) => n.type !== "agence" && n.mots.length >= 2 && contientNom(LO, n));
const ok = (factures: FactureOuverte[], parts: number[], methode: string, note = "", partiel = false, commission?: number): Rapprochement => ({ factures, parts, methode, note, partiel, ...(commission ? { commission } : {}) });

// Règle générale (Vincent, 06/09/2026) : le moteur n'impute que ce qu'il peut PROUVER. Une
// facture désignée par son numéro ou par son dossier et un montant qui tombe juste, c'est une
// preuve. Un montant seul, un taux de commission deviné, un choix entre deux factures
// possibles, un écart absorbé, ce n'est pas une preuve : le crédit reste « À identifier »
// avec le diagnostic, et une personne tranche. Mieux vaut une imputation manuelle qu'une
// facture impayée passée « Payée ».
export function rapprocher(c: Credit, toutes: FactureOuverte[]): Rapprochement | null {
  const L = sa(c.libelle);
  const total = (fs: FactureOuverte[]) => arrondi(fs.reduce((s, f) => s + f.reste, 0));
  const comm = commission(c.libelle);   // commission ÉCRITE par le partenaire, jamais devinée
  const net = (fs: FactureOuverte[]) => arrondi(total(fs) - (comm ?? 0));

  // 1) Nos numéros dans le libellé : la désignation la plus sûre, sur TOUTES les factures
  //    ouvertes. Un numéro cité qui ne correspond à aucune facture ouverte (déjà soldée,
  //    annulée, ancien système) arrête tout : on ne retombe pas sur une devinette au nom.
  const cites = Array.from(new Set((c.libelle.toUpperCase().match(NUMEROS) ?? []).map((x) => x.toUpperCase())));
  if (cites.length) {
    const fs = horsLoreal(toutes).filter((f) => cites.includes(f.numero.toUpperCase()) || (f.numeroPl && cites.includes(f.numeroPl.toUpperCase())));
    if (!fs.length) return null;
    if (Math.abs(total(fs) - c.montant) < 0.01) return ok(fs, fs.map((f) => f.reste), "numéro de facture cité dans le libellé");
    if (comm && Math.abs(net(fs) - c.montant) < 0.01) return ok(fs, fs.map((f) => f.reste), "numéro cité, commission écrite déduite", `commission ${eur(comm)} retenue par le partenaire`, false, comm);
    if (c.montant > total(fs) && c.montant - total(fs) <= TOLERANCE) return ok(fs, fs.map((f) => f.reste), "numéro cité, écart d'arrondi", `écart ${eur(arrondi(c.montant - total(fs)))}`);
    if (fs.length === 1) {
      if (c.montant < fs[0].reste && partielPermis(fs[0], L)) return ok(fs, [c.montant], "numéro cité, règlement partiel", `reste ${eur(arrondi(fs[0].reste - c.montant))}`, true);
      return null;   // trop-perçu au-delà de l'arrondi, ou partiel d'agence ou de partenaire : à expliquer, pas à absorber
    }
    // Plusieurs numéros cités, montant différent : une seule combinaison de ces factures qui
    // tombe juste, sinon rien. Plus d'imputation « dans l'ordre » : l'ordre de lecture n'est
    // pas une preuve.
    const combos = sousEnsembles(fs, c.montant, Math.min(fs.length, 5));
    const combo = uniqueOuRien(combos);
    return combo ? ok(combo, combo.map((f) => f.reste), `numéros cités, ${combo.length} facture(s) sur ${fs.length} réglée(s)`) : null;
  }

  // 2) Dossier désigné par le nom complet du payeur ou le numéro de dossier partenaire, puis
  //    montant exact d'UNE facture ou d'UNE combinaison. Deux réponses possibles = aucune.
  const ouvertes = eligibles(c, toutes);
  if (!ouvertes.length) return null;
  const LO = motsOrdonnes(c.libelle);
  const cands = ouvertes.filter((f) => designee(f, L, LO));
  if (!cands.length) return null;
  if (cands.filter((f) => Math.abs(f.reste - c.montant) < 0.01).length > 1) return null;
  const combos = sousEnsembles(cands, c.montant);
  if (combos.length > 1) return null;
  if (combos.length === 1) {
    const combo = combos[0];
    return ok(combo, combo.map((f) => f.reste), combo.length === 1 ? "payeur reconnu, montant exact" : `payeur reconnu, somme exacte de ${combo.length} factures`);
  }
  // 3) Commission écrite dans le libellé (Oasis, SilverDoor…) : le brut = crédit + commission
  //    doit tomber sur UNE facture désignée. Aucun taux n'est jamais deviné : les taux varient
  //    d'une réservation à l'autre (Vincent, 06/09/2026), un règlement partenaire sans
  //    référence ni commission écrite est rapproché à la main.
  if (comm) {
    const brut = arrondi(c.montant + comm);
    if (cands.filter((f) => Math.abs(f.reste - brut) < 0.01).length > 1) return null;
    const cb = uniqueOuRien(sousEnsembles(cands, brut, 2));
    if (cb) return ok(cb, cb.map((f) => f.reste), "commission écrite déduite", `commission ${eur(comm)} retenue par le partenaire`, false, comm);
  }
  // 4) Un seul dossier désigné : règlement partiel (hors facture d'agence), ou écart
  //    d'arrondi. Jamais un trop-perçu.
  if (cands.length === 1) {
    const f = cands[0];
    if (c.montant < f.reste && partielPermis(f, L) && designationForte(f, L, LO)) return ok([f], [c.montant], "payeur reconnu, règlement partiel", `reste ${eur(arrondi(f.reste - c.montant))}`, true);
    if (c.montant > f.reste && c.montant - f.reste <= TOLERANCE) return ok([f], [f.reste], "payeur reconnu, écart d'arrondi", `écart ${eur(arrondi(c.montant - f.reste))}`);
  }
  return null;
}

// Pourquoi un crédit n'a PAS été rapproché. La raison est écrite dans la ligne Encaissements
// et dans Slack, pour que la personne qui tranche sache exactement où regarder.
export function diagnostic(c: Credit, toutes: FactureOuverte[]): string {
  if (estLoreal(c.libelle)) return "L'Oréal : imputation manuelle (règle)";
  const L = sa(c.libelle);
  const LM = mots(c.libelle);
  const LO = motsOrdonnes(c.libelle);
  const somme = (fs: FactureOuverte[]) => eur(arrondi(fs.reduce((s, f) => s + f.reste, 0)));
  const cites = Array.from(new Set((c.libelle.toUpperCase().match(NUMEROS) ?? []).map((x) => x.toUpperCase())));
  if (cites.length) {
    const fs = horsLoreal(toutes).filter((f) => cites.includes(f.numero.toUpperCase()) || (f.numeroPl && cites.includes(f.numeroPl.toUpperCase())));
    if (!fs.length) return `numéro cité (${cites.join(", ")}) sans facture ouverte correspondante : déjà soldée, annulée ou ancien système`;
    if (fs.length === 1 && c.montant > fs[0].reste) return `numéro cité (${fs[0].numero}) mais virement supérieur au reste dû de ${eur(arrondi(c.montant - fs[0].reste))} : écart à expliquer`;
    if (fs.length === 1 && c.montant < fs[0].reste && fs[0].agence) return `numéro cité (${fs[0].numero}) mais virement inférieur au reste dû de ${eur(arrondi(fs[0].reste - c.montant))} sur une facture d'agence : commission retenue ? à valider à la main`;
    return `numéro(s) cité(s) (${numeros(fs)}) mais montant incohérent : factures ${somme(fs)} contre virement ${eur(c.montant)}`;
  }
  const ouvertes = eligibles(c, toutes);
  if (!ouvertes.length) return "aucune facture ouverte à cette date";
  const cands = ouvertes.filter((f) => designee(f, L, LO));
  if (!cands.length) {
    const proches = ouvertes.filter((f) => intersecte(f.mots, LM));
    return proches.length
      ? `aucune facture désignée sans ambiguïté ; un mot commun avec ${numeros(proches.slice(0, 4))} (nom incomplet dans le libellé)`
      : "aucun payeur connu dans le libellé";
  }
  const exact = cands.filter((f) => Math.abs(f.reste - c.montant) < 0.01);
  if (exact.length > 1) return `AMBIGU : ${exact.length} factures de ce payeur au même montant (${numeros(exact)}), à imputer à la main`;
  const combos = sousEnsembles(cands, c.montant);
  if (combos.length > 1) return `AMBIGU : ${combos.length} combinaisons de factures atteignent ${eur(c.montant)} (${combos.map((k) => k.map((f) => f.numero).join(" + ")).join(" ; ")}), à imputer à la main`;
  const comm = commission(c.libelle);
  if (comm) {
    const brut = arrondi(c.montant + comm);
    const ex = cands.filter((f) => Math.abs(f.reste - brut) < 0.01);
    if (ex.length > 1) return `AMBIGU : commission ${eur(comm)} déduite, ${ex.length} factures de ce payeur au montant brut ${eur(brut)} (${numeros(ex)}), à imputer à la main`;
  }
  if (cands.length === 1 && c.montant > cands[0].reste) return `payeur reconnu (${cands[0].numero}) mais virement supérieur au reste dû de ${eur(arrondi(c.montant - cands[0].reste))} : écart à expliquer`;
  if (cands.length === 1 && c.montant < cands[0].reste && !partielPermis(cands[0], L)) return `règlement d'agence ou de partenaire (${cands[0].numero}) inférieur au reste dû de ${eur(arrondi(cands[0].reste - c.montant))}, sans numéro ni commission écrite : commission retenue ? à rapprocher à la main`;
  if (cands.length === 1 && c.montant < cands[0].reste && !designationForte(cands[0], L, LO)) return `payeur reconnu sur un seul mot (${cands[0].noms.filter((n) => n.mots.length === 1).map((n) => n.mots[0]).join(", ")}) et virement inférieur au reste dû (${cands[0].numero}, reste ${eur(cands[0].reste)}) : un mot isolé ne prouve pas un acompte, à imputer à la main`;
  return `payeur reconnu (${numeros(cands)}) mais aucun montant ne correspond : reste dû ${cands.map((f) => eur(f.reste)).join(", ")}`;
}

// ── Payeur connu (pour la demande de références) ────────────────────────────
// `sur` : TOUS les mots significatifs du nom sont dans le libellé (identification formelle).
// Vincent (06/09/2026) : l'email de demande de références ne part que dans ce cas. La
// reconnaissance souple (au moins deux mots) ne sert plus qu'au journal.
export type Payeur = { type: "Client final" | "Agence" | "Occupant"; rec: Rec; nom: string; loreal: boolean; sur: boolean };
export type Annuaire = { clients: Rec[]; agences: Rec[]; occupants: Rec[] };
export async function chargerAnnuaire(): Promise<Annuaire> {
  const [clients, agences, occupants] = await Promise.all([
    lireTable(T_CLIENTS), lireTable(T_AGENCES), lireTable(T_OCCUPANTS, "{Nom}!=''"),
  ]);
  return { clients, agences, occupants };
}
export function reconnaitrePayeur(c: Credit, a: Annuaire): Payeur | null {
  const LM = mots(c.libelle);
  const LO = motsOrdonnes(c.libelle);
  const EO = motsOrdonnes(emetteurDe(c.libelle));   // l'émetteur seul (« /FRM … »), s'il est écrit
  // Une SOCIÉTÉ est sûre si tous ses mots sont dans le libellé dans l'ordre, et : soit elle a
  // au moins deux mots significatifs, soit (un seul mot, « Grospiron », « AXA ») elle est
  // l'émetteur du virement. Si l'émetteur est écrit, la société sûre doit s'y trouver : un
  // client qui paie lui-même en citant son agence en référence n'est pas l'agence.
  const cherche = (rows: Rec[], champ: string, type: Payeur["type"]): Payeur | null => {
    let meilleur: { rec: Rec; n: number; nom: string; sur: boolean } | null = null;
    let exAequo = false;
    for (const rec of rows) {
      const nom = texte(rec.fields[champ]).trim();
      const m = mots(nom);
      if (!m.size) continue;
      let n = 0;
      for (const w of m) if (LM.has(w)) n++;
      if (!n || !(n === m.size || n >= 2)) continue;
      const ordonne = { mots: Array.from(new Set(motsOrdonnes(nom))), ordonne: true, type: "client" as const };
      const sur = n === m.size && (EO.length ? contientNom(EO, ordonne) : m.size >= 2 && contientNom(LO, ordonne));
      // Deux fiches à égalité (« Relocation Service » et « Santa Fé Relocation » sur un même
      // libellé) : aucune n'est sûre, l'email ne part pas, le journal dit « probable ».
      if (!meilleur || n > meilleur.n) { meilleur = { rec, n, nom, sur }; exAequo = false; }
      else if (n === meilleur.n && sa(nom) !== sa(meilleur.nom)) exAequo = true;
    }
    return meilleur ? { type, rec: meilleur.rec, nom: meilleur.nom, loreal: estLoreal(meilleur.nom), sur: meilleur.sur && !exAequo } : null;
  };
  // Une PERSONNE (occupant) est sûre si son nom de famille ET un prénom sont dans le libellé
  // (ordre libre) : « DEAL » seul dans « DEAL 2026 SEPTEMBER » n'est pas Christine DEAL.
  const chercheOccupant = (rows: Rec[]): Payeur | null => {
    let meilleur: { rec: Rec; n: number; nom: string; sur: boolean } | null = null;
    let exAequo = false;
    for (const rec of rows) {
      const famille = mots(rec.fields["Nom"]), prenoms = mots(rec.fields["Prénom"]);
      if (!famille.size) continue;
      const nF = [...famille].filter((w) => LM.has(w)).length, nP = [...prenoms].filter((w) => LM.has(w)).length;
      if (nF !== famille.size) continue;
      const n = nF + nP;
      const sur = nP >= 1 || (prenoms.size === 0 && famille.size >= 2);
      const nom = texte(rec.fields["Nom complet"]) || `${texte(rec.fields["Prénom"])} ${texte(rec.fields["Nom"])}`.trim();
      if (!meilleur || n > meilleur.n) { meilleur = { rec, n, nom, sur }; exAequo = false; }
      else if (n === meilleur.n && sa(nom) !== sa(meilleur.nom)) exAequo = true;
    }
    return meilleur ? { type: "Occupant", rec: meilleur.rec, nom: meilleur.nom, loreal: false, sur: meilleur.sur && !exAequo } : null;
  };
  const trouves = [cherche(a.agences, "Nom agence", "Agence"), cherche(a.clients, "Nom client final", "Client final"), chercheOccupant(a.occupants)].filter((p): p is Payeur => !!p);
  if (!trouves.length) return null;
  // L'agence est l'émetteur du virement quand elle paie pour son client : si elle est
  // formellement présente, c'est elle. Sinon une seule fiche sûre, ou aucune (ambigu).
  const agence = trouves.find((p) => p.type === "Agence" && p.sur);
  if (agence) return agence;
  const surs = trouves.filter((p) => p.sur);
  if (surs.length === 1) return surs[0];
  return { ...trouves[0], sur: false };
}
// Les mêmes contacts que ses factures : le destinataire (et les copies) de sa facture la plus récente.
export async function contactsDuPayeur(p: Payeur): Promise<{ to: string; cc: string; prenom: string; langue: Langue }> {
  // Dans une formule Airtable, un champ lié s'écrit avec le champ primaire de la fiche liée
  // (son code), jamais avec son identifiant d'enregistrement.
  const champ = p.type === "Client final" ? "Client final liée" : p.type === "Agence" ? "Agence liée" : "Occupant lié";
  const code = texte(p.rec.fields[p.type === "Client final" ? "Code client final" : p.type === "Agence" ? "Code agence" : "Code occupant"]).trim();
  const rows = code
    ? await lireTable(T_FACTURES, `AND(FIND('${echapper(code)}', ARRAYJOIN({${champ}})), {Destinataire email}!='')`).catch(() => [] as Rec[])
    : [];
  rows.sort((x, y) => texte(y.fields["Date d'envoi"]).localeCompare(texte(x.fields["Date d'envoi"])));
  const derniere = rows[0];
  let to = "", cc = "", prenom = "";
  // Même règle de langue que les factures et les relances (langueDe) : la langue choisie sur la
  // dernière facture, sinon la fiche, sinon la langue par défaut du type de payeur (une agence
  // en anglais, un client ou un particulier en français).
  const fiche = texte(p.rec.fields["Langue des emails"]);
  let langue: Langue = fiche === "Français" ? "fr_FR" : fiche === "Anglais" ? "en_GB" : p.type === "Agence" ? "en_GB" : "fr_FR";
  if (derniere) {
    const contact = await lireEnregistrement(T_CONTACTS, premier(derniere.fields["Destinataire email"]));
    to = texte(contact?.fields["Email"]).trim().toLowerCase();
    prenom = texte(contact?.fields["Prénom"]).trim().split(/\s+/)[0];
    const copies: string[] = [];
    for (const id of liens(derniere.fields["Copies (CC)"])) {
      const cRec = await lireEnregistrement(T_CONTACTS, id);
      const e = texte(cRec?.fields["Email"]).trim().toLowerCase();
      if (e && e !== to && !copies.includes(e)) copies.push(e);
    }
    cc = copies.join(",");
    const l = texte(derniere.fields["Langue de l'email"]);
    if (l === "Français") langue = "fr_FR"; else if (l === "Anglais") langue = "en_GB";
  }
  // Jamais un contact interne comme destinataire : un email « à nous-mêmes » n'est pas une
  // demande au client, et il masquerait l'absence de contact.
  if (/@move-in-paris\.com$/i.test(to)) { to = ""; cc = ""; }
  if (!to) {
    // Le champ de repli peut contenir plusieurs adresses séparées par « ; » ou « , » : la
    // première est le destinataire, les autres des copies. Rien qui ne ressemble pas à un email.
    const brut = texte(p.rec.fields[p.type === "Client final" ? "Email copie auto" : p.type === "Agence" ? "Email principal" : "Email"]).toLowerCase();
    const adresses = brut.split(/[;,\s]+/).map((s) => s.trim()).filter((s, i, a) => /^[^@\s]+@[^@\s]+\.[a-z]{2,}$/.test(s) && a.indexOf(s) === i);
    to = adresses[0] || "";
    cc = adresses.slice(1).join(",");
    if (p.type === "Occupant") prenom = texte(p.rec.fields["Prénom"]).trim().split(/\s+/)[0];
  }
  return { to, cc, prenom, langue };
}

// ── Gabarit : mêmes codes que les factures, en français ou en anglais ───────
type Corps = { titre: string; prenom: string; intro: string[]; cartes?: Carte[]; encadre?: { titre: string; corps: string }; fin: string[] };
export function rendre(e: Corps, langue: Langue, sgn: Signataire): string {
  let html = htmlEmailLocataire({ ...e, signataire: sgn });
  // Sans prénom connu (contact comptabilité d'une société), on n'écrit ni « Guest » ni un
  // prénom inventé : « Madame, Monsieur, » / « Dear Sir or Madam, ».
  if (langue === "fr_FR") {
    html = html.replace('<html lang="en">', '<html lang="fr">')
      .replace(/<p style="margin:0 0 16px 0;">Dear ([^<]*),<\/p>/, (_m, p: string) => `<p style="margin:0 0 16px 0;">${e.prenom ? `Bonjour ${p}` : "Madame, Monsieur"},</p>`)
      .replace("Kind regards,", "Cordialement,");
  } else if (!e.prenom) {
    html = html.replace('<p style="margin:0 0 16px 0;">Dear Guest,</p>', '<p style="margin:0 0 16px 0;">Dear Sir or Madam,</p>');
  }
  return html;
}
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// Langue des emails du circuit : celle de la facture si elle est fixée, sinon celle de la
// fiche facturée (Client final / Agence, champ « Langue des emails »), sinon l'anglais.
// Vincent (05/09/2026) : « les seuls emails en français sont à Fresenius, la plupart des
// autres sont en anglais ».
export function langueRelance(ctx: Contexte): Langue {
  const choisie = texte(ctx.v?.["Langue de l'email"]);
  if (choisie === "Français") return "fr_FR";
  if (choisie === "Anglais") return "en_GB";
  const fiche = texte(ctx.fiche?.fields["Langue des emails"]);
  if (fiche === "Français") return "fr_FR";
  // Sinon la langue de la FACTURE elle-même : un rappel ne change pas de langue par rapport
  // au document qu'il rappelle (PwC et Pernod Ricard recevaient une facture en français puis
  // un rappel en anglais).
  return langueDe(ctx);
}

export type InfoFacture = { numero: string; numeroPl: string; montant: number; reste: number; dateEnvoi: string; echeance: string; retard: number; adresse: string; periode: string };
export function infoDe(ctx: Contexte, f: FactureOuverte): InfoFacture {
  const debut = texte(ctx.v["Période facturée début"]).slice(0, 10), fin = texte(ctx.v["Période facturée fin"]).slice(0, 10);
  const adresse = texte(ctx.appartement?.fields["adresse complète"]) || premier(ctx.v["Adresse appartement (récap)"]) || texte(ctx.appartement?.fields["Adresse"]);
  const echeance = f.dateEnvoi ? plusJours(f.dateEnvoi, ECHEANCE_JOURS) : "";
  return {
    numero: f.numero, numeroPl: f.numeroPl, montant: f.montant, reste: f.reste, dateEnvoi: f.dateEnvoi, echeance,
    retard: echeance ? Math.max(0, joursEntre(echeance, aujourdhui())) : 0, adresse, periode: debut && fin ? `${debut}|${fin}` : "",
  };
}
const refAff = (i: InfoFacture) => (i.numeroPl ? `${i.numeroPl} (${i.numero})` : i.numero);

export function emailRelance(ctx: Contexte, i: InfoFacture, niveau: 1 | 2, langue: Langue, rappelLe = ""): { objet: string; html: string } {
  const fr = langue === "fr_FR";
  const prenom = texte(ctx.contact?.fields["Prénom"]).trim().split(/\s+/)[0] || (ctx.conf && ctx.fiche ? ctx.conf.prenom(ctx.fiche.fields).split(/\s+/)[0] : "");
  const [debut, fin] = i.periode.split("|");
  const cartes: Carte[] = [
    { label: fr ? "Facture" : "Invoice", valeur: refAff(i), gras: true },
    ...(i.adresse ? [{ label: fr ? "Appartement" : "Apartment", valeur: i.adresse }] : []),
    ...(debut && fin ? [{ label: fr ? "Période" : "Period", valeur: `${dateLongue(debut, langue)} – ${dateLongue(fin, langue)}` }] : []),
    { label: fr ? "Émise le" : "Issued on", valeur: dateLongue(i.dateEnvoi, langue) },
    { label: fr ? "Échéance" : "Due date", valeur: dateLongue(i.echeance, langue) },
    { label: fr ? "Montant TTC" : "Amount incl. VAT", valeur: eur(i.montant, langue) },
    ...(i.reste < i.montant - 0.009 ? [{ label: fr ? "Reste dû" : "Balance due", valeur: eur(i.reste, langue), gras: true }] : []),
  ];
  const preuve = fr
    ? "Si ce règlement a déjà été effectué, nous vous remercions de nous transmettre une preuve de paiement (date, montant et référence du virement) afin que nous puissions le retrouver : il peut s'agir d'une erreur de notre part, et nous la corrigerons aussitôt."
    : "If this payment has already been made, please send us a proof of payment (date, amount and transfer reference) so that we can trace it: the error may be on our side, and we will correct it straight away.";
  if (niveau === 1) {
    const titre = fr ? `Rappel · facture ${i.numeroPl || i.numero} échue le ${dateLongue(i.echeance, langue)}` : `Reminder · invoice ${i.numeroPl || i.numero} due on ${dateLongue(i.echeance, langue)}`;
    const intro = [fr
      ? `Sauf erreur de notre part, la facture <strong>${refAff(i)}</strong>, émise le ${dateLongue(i.dateEnvoi, langue)} et arrivée à échéance le ${dateLongue(i.echeance, langue)}, n'a pas encore été réglée.`
      : `Unless we are mistaken, invoice <strong>${refAff(i)}</strong>, issued on ${dateLongue(i.dateEnvoi, langue)} and due on ${dateLongue(i.echeance, langue)}, has not yet been settled.`];
    const encadre = { titre: fr ? "Règlement" : "Payment", corps: fr
      ? `Nous vous remercions de bien vouloir procéder au règlement de <strong>${eur(i.reste, langue)}</strong> par virement sur le compte indiqué au bas de la facture, en rappelant la référence <strong>${i.numeroPl || i.numero}</strong>.`
      : `We would be grateful if you could arrange payment of <strong>${eur(i.reste, langue)}</strong> by bank transfer to the account shown at the bottom of the invoice, quoting reference <strong>${i.numeroPl || i.numero}</strong>.` };
    const fin_ = [preuve, fr ? "Nous restons à votre disposition pour toute question." : "We remain at your disposal for any question."];
    return { objet: `${titre} · Move in Paris`, html: rendre({ titre, prenom, intro, cartes, encadre, fin: fin_ }, langue, ctx.sgn) };
  }
  // Deuxième relance : un rappel du premier message, sur le même ton (B2B, jamais de
  // menace ni de mention d'un service de recouvrement — demande de Vincent, 05/09/2026).
  const premier = dateLongue(rappelLe || plusJours(aujourdhui(), -DELAI_RELANCE_JOURS), langue);
  const titre = fr ? `Rappel · facture ${i.numeroPl || i.numero} · suite à notre message du ${premier}` : `Reminder · invoice ${i.numeroPl || i.numero} · further to our message of ${premier}`;
  const intro = [fr
    ? `Nous nous permettons de revenir vers vous au sujet de la facture <strong>${refAff(i)}</strong>, pour laquelle nous vous avons adressé un premier rappel le ${premier}. Sauf erreur de notre part, elle n'a pas encore été réglée (échéance le ${dateLongue(i.echeance, langue)}).`
    : `We are following up on invoice <strong>${refAff(i)}</strong>, for which we sent you a first reminder on ${premier}. Unless we are mistaken, it has not yet been settled (due on ${dateLongue(i.echeance, langue)}).`];
  const encadre = { titre: fr ? "Règlement" : "Payment", corps: fr
    ? `Nous vous remercions de bien vouloir procéder au règlement de <strong>${eur(i.reste, langue)}</strong> par virement, en rappelant la référence <strong>${i.numeroPl || i.numero}</strong>. Si le paiement est déjà en cours de traitement de votre côté, un simple retour de votre part nous suffira.`
    : `We would be grateful if you could arrange payment of <strong>${eur(i.reste, langue)}</strong> by bank transfer, quoting reference <strong>${i.numeroPl || i.numero}</strong>. If the payment is already being processed on your side, a short reply is all we need.` };
  const fin_ = [preuve, fr ? "Nous vous remercions et restons à votre disposition." : "Thank you, we remain at your disposal."];
  return { objet: `${titre} · Move in Paris`, html: rendre({ titre, prenom, intro, cartes, encadre, fin: fin_ }, langue, ctx.sgn) };
}

export function emailConfirmation(ctx: Contexte, i: InfoFacture, c: { date: string; montant: number }, langue: Langue): { objet: string; html: string } {
  const fr = langue === "fr_FR";
  const prenom = texte(ctx.contact?.fields["Prénom"]).trim().split(/\s+/)[0] || (ctx.conf && ctx.fiche ? ctx.conf.prenom(ctx.fiche.fields).split(/\s+/)[0] : "");
  const titre = fr ? `Règlement reçu · facture ${i.numeroPl || i.numero}` : `Payment received · invoice ${i.numeroPl || i.numero}`;
  const intro = [fr
    ? `Nous accusons bonne réception de votre règlement de <strong>${eur(c.montant, langue)}</strong>, reçu le ${dateLongue(c.date, langue)}, au titre de la facture <strong>${refAff(i)}</strong>.`
    : `We acknowledge receipt of your payment of <strong>${eur(c.montant, langue)}</strong>, received on ${dateLongue(c.date, langue)}, for invoice <strong>${refAff(i)}</strong>.`];
  const cartes: Carte[] = [
    { label: fr ? "Facture" : "Invoice", valeur: refAff(i), gras: true },
    { label: fr ? "Montant reçu" : "Amount received", valeur: eur(c.montant, langue) },
    { label: fr ? "Reçu le" : "Received on", valeur: dateLongue(c.date, langue) },
    { label: fr ? "Solde" : "Balance", valeur: i.reste > 0.009 ? eur(i.reste, langue) : (fr ? "Facture soldée" : "Invoice settled"), gras: true },
  ];
  const fin_ = [fr ? "Nous vous remercions et vous prions de ne pas tenir compte de nos précédents rappels." : "Thank you, and please disregard our previous reminders."];
  return { objet: `${titre} · Move in Paris`, html: rendre({ titre, prenom, intro, cartes, fin: fin_ }, langue, ctx.sgn) };
}

export function emailDemandeReferences(p: Payeur, c: Credit, prenom: string, langue: Langue, sgn: Signataire): { objet: string; html: string } {
  const fr = langue === "fr_FR";
  const titre = fr ? `Votre virement de ${eur(c.montant, langue)} du ${dateLongue(c.date, langue)}` : `Your transfer of ${eur(c.montant, langue)} dated ${dateLongue(c.date, langue)}`;
  const intro = [fr
    ? `Nous avons bien reçu un virement de <strong>${eur(c.montant, langue)}</strong> le ${dateLongue(c.date, langue)}, mais son libellé ne nous permet pas d'identifier la ou les factures qu'il règle.`
    : `We have received a transfer of <strong>${eur(c.montant, langue)}</strong> on ${dateLongue(c.date, langue)}, but its wording does not allow us to identify which invoice(s) it settles.`];
  const cartes: Carte[] = [
    { label: fr ? "Montant" : "Amount", valeur: eur(c.montant, langue), gras: true },
    { label: fr ? "Reçu le" : "Received on", valeur: dateLongue(c.date, langue) },
    { label: fr ? "Libellé" : "Wording", valeur: c.libelle.slice(0, 90) },
  ];
  const encadre = { titre: fr ? "Ce que nous vous demandons" : "What we need", corps: fr
    ? "Pourriez-vous nous indiquer le ou les numéros de facture concernés, ou nous transmettre votre avis de paiement ? Nous pourrons ainsi imputer ce règlement correctement et vous en confirmer la bonne réception."
    : "Could you let us know the invoice number(s) concerned, or send us your remittance advice? We will then allocate this payment correctly and confirm receipt." };
  const fin_ = [fr ? "Nous vous remercions par avance." : "Thank you in advance."];
  return { objet: `${titre} · Move in Paris`, html: rendre({ titre, prenom, intro, cartes, encadre, fin: fin_ }, langue, sgn) };
}

export type LigneDigest = { id: string; reference: string; client: string; occupant: string; reste: number; echeance: string; retard: number; destinataire: string; relance1: string; relance2: string; pennylane: string; nouvelle: boolean };
export function emailDigestGuillaume(lignes: LigneDigest[], urlPage: string, sgn: Signataire): { objet: string; html: string } {
  const nouvelles = lignes.filter((l) => l.nouvelle).length;
  const total = lignes.reduce((s, l) => s + l.reste, 0);
  const titre = `Relances manuelles à faire · ${lignes.length} facture${lignes.length > 1 ? "s" : ""} · ${eur(total)}`;
  const td = (s: string, extra = "") => `<td style="padding:8px 10px;border-bottom:1px solid #E8E4DF;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#0D0D0D;vertical-align:top;${extra}">${s}</td>`;
  const th = (s: string) => `<th align="left" style="padding:8px 10px;border-bottom:2px solid #B88B58;font-family:Arial,Helvetica,sans-serif;font-size:11px;letter-spacing:1px;color:#6B6B6B;text-transform:uppercase;">${s}</th>`;
  const rows = lignes.map((l) =>
    `<tr>${td(`<a href="https://airtable.com/${BASE_ID}/${T_RELANCES}/${l.id}" style="color:#0D0D0D;font-weight:bold;text-decoration:none;">${esc(l.reference)}</a>${l.nouvelle ? ' <span style="color:#B88B58;font-size:11px;">NOUVEAU</span>' : ""}`)}${td(esc(l.client) + (l.occupant ? `<br><span style="color:#6B6B6B;">${esc(l.occupant)}</span>` : ""))}${td(eur(l.reste), "text-align:right;white-space:nowrap;font-weight:bold;")}${td(`${dateCourte(l.echeance)}<br><span style="color:#B23A3A;">${l.retard} j</span>`)}${td(`${esc(l.destinataire)}<br><span style="color:#6B6B6B;">R1 ${l.relance1 || "—"} · R2 ${l.relance2 || "—"}</span>`)}${td(l.pennylane ? `<a href="${l.pennylane}" style="color:#B88B58;">Pennylane</a>` : "")}</tr>`).join("");
  const table = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;"><tr>${th("Facture")}${th("Client")}${th("Reste dû")}${th("Échéance")}${th("Relances")}${th("")}</tr>${rows}</table>`;
  const intro = [
    `${lignes.length === 1 ? "Cette facture attend" : "Ces factures attendent"} votre appel ou votre email personnel${nouvelles ? ` (${nouvelles} nouvelle${nouvelles > 1 ? "s" : ""} depuis hier)` : ""} : les relances automatiques sont épuisées, ou ne s'appliquent pas aux créances d'avant la plateforme.`,
    table,
    `Une fois la relance faite, cochez « Relance 3 faite » dans la page <a href="${urlPage}" style="color:#B88B58;">Relances</a> d'Airtable : la ligne sort de cette liste. Un règlement détecté en banque la clôture automatiquement, et envoie la confirmation au client quand il avait été relancé par email.`,
  ];
  return { objet: `${titre} · Move in Paris`, html: rendre({ titre, prenom: "Guillaume", intro, fin: [] }, "fr_FR", sgn) };
}

// ── Envoi ───────────────────────────────────────────────────────────────────
// Toutes les réponses arrivent chez Guillaume (Reply-To), quel que soit l'expéditeur.
// Mode test (`?test=adresse` sur les routes) : chaque email part vers cette adresse, sans
// copie, avec l'objet préfixé par le vrai destinataire — rien ne part chez un client.
// Le destinataire de test vit dans le contexte de LA requête (AsyncLocalStorage), jamais dans
// une variable de module : sur Vercel, deux requêtes peuvent partager le même processus, et
// une variable partagée laissait un aperçu de gabarits partir chez de vrais clients dès qu'un
// cron réel démarrait pendant l'aperçu (défaut prouvé le 06/09/2026).
const contexteTest = new AsyncLocalStorage<string>();
export const avecDestinataireTest = <T>(email: string, fn: () => Promise<T>): Promise<T> => contexteTest.run(email.trim().toLowerCase(), fn);
export const destinataireTestActuel = () => contexteTest.getStore() || "";
export const enModeTest = () => destinataireTestActuel() !== "";
export async function envoyer(args: { de: string; to: string; cc?: string; objet: string; html: string; origine: string; attachments?: PieceJointe[] }): Promise<{ ok: boolean; erreur?: string }> {
  const destinataireTest = destinataireTestActuel();
  const to = destinataireTest || args.to;
  const cc = destinataireTest ? "" : (args.cc || "");
  // Copie de test : la boîte de Vincent archive tout objet contenant « facture » (règle de
  // tri OVH, constatée par IMAP le 05/09/2026). Un espace de largeur nulle dans le mot
  // rend la règle aveugle sans rien changer à l'affichage. Jamais sur un vrai envoi.
  // Le filtre lit aussi le corps : même traitement sur le texte du HTML (jamais dans les
  // balises ni les liens), uniquement pour une copie de test.
  const masquer = (t: string) => t.replace(/(fac)(ture)/gi, "$1\u200B$2");
  const objet = destinataireTest ? masquer(`[TEST → ${args.to}${args.cc ? ` cc ${args.cc}` : ""}] ${args.objet}`) : args.objet;
  const html = destinataireTest ? args.html.replace(/>([^<]*)</g, (_m, t: string) => `>${masquer(t)}<`) : args.html;
  return envoyerEmailLocataire({ usrEmail: args.de, mailTo: to, mailCc: cc, mailReplyTo: GUILLAUME, mailSubject: objet, mailHtml: html, origine: args.origine, attachments: args.attachments })
    .catch((e) => ({ ok: false, erreur: e instanceof Error ? e.message : String(e) }));
}
export const signataireGuillaume = () => signataire({ email: GUILLAUME });
export const slackRecouvrement = (message: string) => slack(SLACK_FACTURATION, message);

// ── PDF de la facture, à joindre aux relances (S3 d'abord, Pennylane ensuite) ───
export async function pdfFacture(rec: Rec, numero: string): Promise<PieceJointe | null> {
  try {
    let pdf = await telechargerS3(`factures/${rec.id}_${numero}.pdf`);
    if (!pdf) {
      const id = idDepuisLien(rec.fields["Lien Pennylane"]);
      if (id) { const url = await urlPdf(id, null, 15_000); pdf = url ? await telechargerPdf(url) : null; }
    }
    return pdf ? { name: `${numero}.pdf`, contentType: "application/pdf", base64: pdf.toString("base64") } : null;
  } catch { return null; }
}

// ── Relances : lecture / création d'une ligne ───────────────────────────────
// Une seule ligne par facture. S'il en existe plusieurs (saisie manuelle, ancien import), la
// ligne « En cours » prime, et on ne crée jamais une seconde ligne pour une référence connue.
export async function relanceDe(numero: string): Promise<Rec | null> {
  const rows = await lireTable(T_RELANCES, `{Référence}='${echapper(numero)}'`);
  if (rows.length > 1) rows.sort((a, b) => Number(texte(b.fields["Statut"]) === "En cours") - Number(texte(a.fields["Statut"]) === "En cours"));
  return rows[0] ?? null;
}
export async function ecrireRelance(id: string, champs: Dict) {
  await airtable("PATCH", T_RELANCES, { records: [{ id, fields: champs }], typecast: true });
}
export async function creerRelance(champs: Dict): Promise<Rec> {
  const existante = texte(champs["Référence"]) ? await relanceDe(texte(champs["Référence"])) : null;
  if (existante) return existante;
  const r = await airtable("POST", T_RELANCES, { records: [{ fields: champs }], typecast: true });
  const rec = ((r.records as Rec[] | undefined) ?? [])[0];
  if (!rec) throw new Error("ligne Relances non créée");
  return rec;
}
export const journalRelance = (rec: Rec | null, ligne: string) => new Journal(rec?.fields["Journal"]).ajouter(`${horodatageParis()} — ${ligne}`).texte();
export { T_FACTURES, T_MONITORING, SLACK_FACTURATION, chargerContexte, langueDe, horodatageParis, Journal, ecrireFacture, texte, premier, liens, lireTable, lireEnregistrement, airtable };
export type { Rec, Dict, Contexte, Langue };
