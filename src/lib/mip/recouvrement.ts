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

export const T_RELANCES = "tblUnPePXu9xzOJX2";
export const T_ENCAISSEMENTS = "tbl07focU5UDWb57t";
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
  texte(s).normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase()
    .replace(/\bOECD\b/g, "OCDE").replace(/\bPRENOD\b/g, "PERNOD").replace(/\bBUEGROUND\b/g, "BLUEGROUND");
const STOP = new Set(["VIREMENT", "VIR", "SEPA", "RECU", "INST", "TIERS", "FROM", "SENT", "REVOLUT", "LOYER", "LOYERS", "RENT", "FACTURE", "INVOICE", "PAIEMENT", "PAYMENT", "PARIS", "MOVE", "FRANCE", "LIMITED", "SERVICES", "UNLIMITED", "CORPORATE", "HOUSING", "MOTIF", "REFBEN", "ORIG", "NOTPROVIDED", "RNF", "EID", "SAS", "SARL", "MONSIEUR", "MADAME", "MLLE", "MME", "GROUP", "INTERNATIONAL", "COMPANY", "FRANCE", "EUROPE", "HOLDING", "BANK", "TRANSFER", "MOIS", "MONTH", "MARS", "AVRIL", "JUIN", "JUILLET", "AOUT", "SEPTEMBRE", "OCTOBRE", "NOVEMBRE", "DECEMBRE", "JANVIER", "FEVRIER"]);
export const mots = (s: unknown): Set<string> => new Set(sa(s).split(/[^A-Z]+/).filter((w) => w.length >= 4 && !STOP.has(w)));
const intersecte = (a: Set<string>, b: Set<string>) => { for (const x of a) if (b.has(x)) return true; return false; };

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
export const estLoreal = (s: unknown) => sa(s).includes("OREAL");

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

// Mouvements qui ne sont jamais un règlement client (remboursements, impôts, prêts…).
const HORS_CLIENT = /URSSAF|IMPOT|DGFIP|\bPRET\b|AMORTISSEMENT|CAPITAL|APPORT|AXA FRANCE IARD|MMA IARD|GENERALI|THELEM|KEREIS|GESTION ASSURANCES|EDF |ORANGE |UBER|CM-CIC|NATIOCREDIMURS|DIGITAL CLASSIFIEDS|GOOGLE|SECAB|REMBOURST|SCI STELLA|ESC ESTHETIQUE|SIP PARIS|REMBOURSEMENT ERREUR|EXCEDENT DE VERSEMENT|ORIG SASU MOVE IN PAR|MALAKOFF HUMANIS|ASP SERVICES|ASP MDT|BNP PARIBAS MDT|REJET RECU VIR|ERREUR DE VIR|PROT\.ENTREPRISE|PRLV SEPA RETOURNE|ANTHROPIC|AMAZON/i;
export const horsClient = (c: Credit) => HORS_CLIENT.test(c.libelle);

// ── Factures ouvertes de la plateforme ──────────────────────────────────────
export type FactureOuverte = {
  rec: Rec; numero: string; numeroPl: string; montant: number; encaisse: number; reste: number;
  client: string; agence: string; occupants: string; mention: string; mots: Set<string>; loreal: boolean; dateEnvoi: string;
};
export function decrire(rec: Rec): FactureOuverte {
  const f = rec.fields;
  const client = liens(f["Client final"]).join(", ");
  const agence = liens(f["Nom agence (from Agence de relocation)"]).join(", ");
  const occupants = liens(f["Occupants"]).join(", ");
  const mention = texte(f["Mention sur facture"]).trim();
  const montant = arrondi(nombre(f["Montant total HT"]));
  const encaisse = arrondi(nombre(f["Montant encaissé"]));
  const m = new Set<string>([...mots(client), ...mots(agence), ...mots(occupants)]);
  return {
    rec, numero: texte(f["Numéro facture"]) || rec.id, numeroPl: texte(f["Numéro Pennylane"]), montant, encaisse,
    reste: arrondi(montant - encaisse), client, agence, occupants, mention, mots: m,
    loreal: estLoreal(client) || estLoreal(agence), dateEnvoi: texte(f["Date d'envoi"]).slice(0, 10),
  };
}
// Le numéro Pennylane (F-2026-09-0444) est ce que le client recopie dans son virement :
// on le range une fois pour toutes dans la fiche quand il manque.
export async function facturesOuvertes(): Promise<FactureOuverte[]> {
  const rows = await lireTable(T_FACTURES, `AND({Statut}='Envoyée', {Type}!='Avoir', {Mode facturation}!='Proforma', {Montant total HT}>1)`);
  const out: FactureOuverte[] = [];
  for (const rec of rows) {
    const d = decrire(rec);
    if (!d.numeroPl) {
      const id = idDepuisLien(rec.fields["Lien Pennylane"]);
      if (id) {
        try {
          const pl = await getFacture(id);
          if (texte(pl.invoice_number)) { d.numeroPl = texte(pl.invoice_number); await ecrireFacture(rec.id, { "Numéro Pennylane": d.numeroPl }); }
        } catch { /* on rapprochera sur le FAC-… et le montant */ }
      }
    }
    if (d.reste > 0.009) out.push(d);
  }
  return out;
}

// ── Rapprochement d'un crédit ───────────────────────────────────────────────
export type Rapprochement = { factures: FactureOuverte[]; parts: number[]; methode: string; note: string; partiel: boolean };
const NUMEROS = /\bFAC-20\d{2}-\d{3,4}\b|\bF-20\d{2}-\d{2}-\d{3,4}\b/g;
const TAUX_SILVERDOOR = [0.10, 0.12, 0.125, 0.15, 0.17, 0.175, 0.20];
function commission(libelle: string): number | null {
  const m = /LESS\s*(?:COMM\.?)?\s*([\d ,.]{2,12}?)(?=\s*COMM|\s*\d{2}\.\d{2}\.\d{2}|\s*-|\s*$|\s*[A-Z])/i.exec(libelle);
  if (!m) return null;
  let v = m[1].trim().replace(/\s/g, "").replace(",", "");
  if (!v.includes(".") && v.length > 3) v = `${v.slice(0, -2)}.${v.slice(-2)}`;
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? arrondi(n) : null;
}
function sousEnsemble(c: FactureOuverte[], cible: number, k = 3): FactureOuverte[] | null {
  const l = c.slice().sort((a, b) => a.dateEnvoi.localeCompare(b.dateEnvoi)).slice(0, 14);
  const n = l.length;
  for (let taille = 1; taille <= Math.min(k, n); taille++) {
    const idx = Array.from({ length: taille }, (_, i) => i);
    while (true) {
      const combo = idx.map((i) => l[i]);
      if (Math.abs(combo.reduce((s, f) => s + f.reste, 0) - cible) < 0.01) return combo;
      let p = taille - 1;
      while (p >= 0 && idx[p] === n - taille + p) p--;
      if (p < 0) break;
      idx[p]++;
      for (let q = p + 1; q < taille; q++) idx[q] = idx[q - 1] + 1;
    }
  }
  return null;
}
export function rapprocher(c: Credit, toutes: FactureOuverte[]): Rapprochement | null {
  const L = sa(c.libelle);
  // Un règlement ne précède pas sa facture (au-delà de quelques jours d'acompte) : les
  // factures émises plus de 5 jours après le crédit ne sont pas candidates. Indispensable
  // pendant la transition, où des virements de l'ancien système côtoient les factures neuves.
  const limite = plusJours(c.date, 5);
  const ouvertes = toutes.filter((f) => !f.dateEnvoi || f.dateEnvoi <= limite);
  if (!ouvertes.length) return null;
  const total = (fs: FactureOuverte[]) => arrondi(fs.reduce((s, f) => s + f.reste, 0));
  // 1) Nos numéros dans le libellé (Fresenius, Vinci, AXA, L'Oréal Corporate, particuliers soigneux).
  const cites = Array.from(new Set((c.libelle.toUpperCase().match(NUMEROS) ?? []).map((x) => x.toUpperCase())));
  if (cites.length) {
    const fs = ouvertes.filter((f) => cites.includes(f.numero.toUpperCase()) || (f.numeroPl && cites.includes(f.numeroPl.toUpperCase())));
    if (fs.length) {
      const s = total(fs);
      if (Math.abs(s - c.montant) < 0.01) return { factures: fs, parts: fs.map((f) => f.reste), methode: "numéro de facture cité dans le libellé", note: "", partiel: false };
      if (fs.length === 1 && c.montant < fs[0].reste) return { factures: fs, parts: [c.montant], methode: "numéro cité, règlement partiel", note: `reste ${eur(arrondi(fs[0].reste - c.montant))}`, partiel: true };
      if (fs.length === 1 && c.montant > fs[0].reste && c.montant <= fs[0].reste * 1.05) return { factures: fs, parts: [fs[0].reste], methode: "numéro cité, montant légèrement supérieur", note: `trop-perçu ${eur(arrondi(c.montant - fs[0].reste))}`, partiel: false };
      // Plusieurs numéros cités pour un montant différent : on impute dans l'ordre, la
      // dernière facture reste partielle ; au-delà de 5 % de trop, on ne devine pas.
      if (c.montant > s * 1.05) return null;
      let restant = c.montant;
      const parts = fs.map((f) => { const p = Math.min(f.reste, Math.max(0, restant)); restant = arrondi(restant - p); return arrondi(p); });
      return { factures: fs, parts, methode: "numéros cités, montant différent", note: `factures ${eur(s)} vs virement ${eur(c.montant)}${c.montant > s ? ` (trop-perçu ${eur(arrondi(c.montant - s))})` : " : imputé dans l'ordre, dernière facture partielle"}`, partiel: c.montant < s - 0.009 };
    }
  }
  // 2) Payeur reconnu par son nom (client final, agence, occupant) + montant exact ou somme exacte.
  const LM = mots(c.libelle);
  const cands = ouvertes.filter((f) => intersecte(f.mots, LM) || (f.mention && L.includes(sa(f.mention))));
  if (!cands.length) return null;
  const exact = cands.filter((f) => Math.abs(f.reste - c.montant) < 0.01);
  if (exact.length === 1) return { factures: exact, parts: [c.montant], methode: "payeur reconnu, montant exact", note: "", partiel: false };
  const combo = sousEnsemble(cands, c.montant);
  if (combo) return { factures: combo, parts: combo.map((f) => f.reste), methode: `payeur reconnu, somme exacte de ${combo.length} factures`, note: "", partiel: false };
  // 3) Commission déduite (Oasis : écrite dans le libellé ; SilverDoor : 10 à 20 %).
  const comm = commission(c.libelle);
  if (comm) {
    const brut = arrondi(c.montant + comm);
    const ex = cands.filter((f) => Math.abs(f.reste - brut) < 0.01);
    const cb = ex.length === 1 ? ex : sousEnsemble(cands, brut, 2);
    if (cb) return { factures: cb, parts: cb.map((f) => f.reste), methode: "commission déduite dans le libellé", note: `commission ${eur(comm)} retenue par le partenaire`, partiel: false };
  }
  if (L.includes("SILVERDOOR")) {
    for (const f of cands) for (const t of TAUX_SILVERDOOR) if (Math.abs(f.reste * (1 - t) - c.montant) < 0.02)
      return { factures: [f], parts: [f.reste], methode: `SilverDoor, commission ${Math.round(t * 1000) / 10} %`, note: `commission ${eur(arrondi(f.reste - c.montant))} retenue`, partiel: false };
  }
  // 4) Un seul dossier ouvert chez ce payeur : partiel, ou trop-perçu marginal.
  if (cands.length === 1) {
    const f = cands[0];
    if (c.montant < f.reste) return { factures: [f], parts: [c.montant], methode: "payeur reconnu, règlement partiel", note: `reste ${eur(arrondi(f.reste - c.montant))}`, partiel: true };
    if (c.montant <= f.reste * 1.05) return { factures: [f], parts: [f.reste], methode: "payeur reconnu, montant légèrement supérieur", note: `trop-perçu ${eur(arrondi(c.montant - f.reste))}`, partiel: false };
  }
  return null;
}

// ── Payeur connu (pour la demande de références) ────────────────────────────
export type Payeur = { type: "Client final" | "Agence" | "Occupant"; rec: Rec; nom: string; loreal: boolean };
export type Annuaire = { clients: Rec[]; agences: Rec[]; occupants: Rec[] };
export async function chargerAnnuaire(): Promise<Annuaire> {
  const [clients, agences, occupants] = await Promise.all([
    lireTable(T_CLIENTS), lireTable(T_AGENCES), lireTable(T_OCCUPANTS, "{Nom}!=''"),
  ]);
  return { clients, agences, occupants };
}
export function reconnaitrePayeur(c: Credit, a: Annuaire): Payeur | null {
  const LM = mots(c.libelle);
  const cherche = (rows: Rec[], champ: string, type: Payeur["type"]): Payeur | null => {
    let meilleur: { rec: Rec; n: number; nom: string } | null = null;
    for (const rec of rows) {
      const nom = texte(rec.fields[champ]).trim();
      const m = mots(nom);
      if (!m.size) continue;
      let n = 0;
      for (const w of m) if (LM.has(w)) n++;
      // Tous les mots significatifs du nom (ou au moins deux) doivent être dans le libellé.
      if (n && (n === m.size || n >= 2) && (!meilleur || n > meilleur.n)) meilleur = { rec, n, nom };
    }
    return meilleur ? { type, rec: meilleur.rec, nom: meilleur.nom, loreal: estLoreal(meilleur.nom) } : null;
  };
  return cherche(a.clients, "Nom client final", "Client final") ?? cherche(a.agences, "Nom agence", "Agence") ?? cherche(a.occupants, "Nom", "Occupant");
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
  let langue: Langue = p.type === "Client final" ? "fr_FR" : "en_GB";
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
  if (!to) {
    to = texte(p.rec.fields[p.type === "Client final" ? "Email copie auto" : p.type === "Agence" ? "Email principal" : "Email"]).trim().toLowerCase();
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
    { label: fr ? "Montant" : "Amount", valeur: eur(i.montant, langue) },
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
  const titre = fr ? `Deuxième rappel · facture ${i.numeroPl || i.numero} en retard de ${i.retard} jours` : `Second reminder · invoice ${i.numeroPl || i.numero} is ${i.retard} days overdue`;
  const intro = [fr
    ? `Malgré notre rappel du ${dateLongue(rappelLe || plusJours(aujourdhui(), -DELAI_RELANCE_JOURS), langue)}, la facture <strong>${refAff(i)}</strong> reste impayée à ce jour, soit <strong>${i.retard} jours</strong> après son échéance.`
    : `Despite our reminder of ${dateLongue(rappelLe || plusJours(aujourdhui(), -DELAI_RELANCE_JOURS), langue)}, invoice <strong>${refAff(i)}</strong> remains unpaid to date, <strong>${i.retard} days</strong> after its due date.`];
  const encadre = { titre: fr ? "Règlement sous 7 jours" : "Payment within 7 days", corps: fr
    ? `Nous vous remercions de régulariser <strong>${eur(i.reste, langue)}</strong> sous sept jours, en rappelant la référence <strong>${i.numeroPl || i.numero}</strong>. Passé ce délai, notre service comptable prendra directement contact avec vous.`
    : `Please settle <strong>${eur(i.reste, langue)}</strong> within seven days, quoting reference <strong>${i.numeroPl || i.numero}</strong>. Beyond that date, our accounts department will contact you directly.` };
  const fin_ = [preuve, fr ? "Nous vous remercions de votre attention." : "Thank you for your attention."];
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
    `Deux relances automatiques sont parties sans règlement : ${lignes.length === 1 ? "cette facture attend" : "ces factures attendent"} maintenant votre appel ou votre email personnel${nouvelles ? ` (${nouvelles} nouvelle${nouvelles > 1 ? "s" : ""} depuis hier)` : ""}.`,
    table,
    `Une fois la relance faite, cochez « Relance 3 faite » dans la page <a href="${urlPage}" style="color:#B88B58;">Relances</a> d'Airtable : la ligne sort de cette liste. Un règlement détecté en banque la clôture automatiquement et envoie la confirmation au client.`,
  ];
  return { objet: `${titre} · Move in Paris`, html: rendre({ titre, prenom: "Guillaume", intro, fin: [] }, "fr_FR", sgn) };
}

// ── Envoi ───────────────────────────────────────────────────────────────────
// Toutes les réponses arrivent chez Guillaume (Reply-To), quel que soit l'expéditeur.
// Mode test (`?test=adresse` sur les routes) : chaque email part vers cette adresse, sans
// copie, avec l'objet préfixé par le vrai destinataire — rien ne part chez un client.
let destinataireTest = "";
export const definirDestinataireTest = (email: string) => { destinataireTest = email.trim().toLowerCase(); };
export const enModeTest = () => destinataireTest !== "";
export async function envoyer(args: { de: string; to: string; cc?: string; objet: string; html: string; origine: string; attachments?: PieceJointe[] }): Promise<{ ok: boolean; erreur?: string }> {
  const to = destinataireTest || args.to;
  const cc = destinataireTest ? "" : (args.cc || "");
  const objet = destinataireTest ? `[TEST → ${args.to}${args.cc ? ` cc ${args.cc}` : ""}] ${args.objet}` : args.objet;
  return envoyerEmailLocataire({ usrEmail: args.de, mailTo: to, mailCc: cc, mailReplyTo: GUILLAUME, mailSubject: objet, mailHtml: args.html, origine: args.origine, attachments: args.attachments })
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
export async function relanceDe(numero: string): Promise<Rec | null> {
  const rows = await lireTable(T_RELANCES, `{Référence}='${echapper(numero)}'`);
  return rows[0] ?? null;
}
export async function ecrireRelance(id: string, champs: Dict) {
  await airtable("PATCH", T_RELANCES, { records: [{ id, fields: champs }], typecast: true });
}
export async function creerRelance(champs: Dict): Promise<Rec> {
  const r = await airtable("POST", T_RELANCES, { records: [{ fields: champs }], typecast: true });
  const rec = ((r.records as Rec[] | undefined) ?? [])[0];
  if (!rec) throw new Error("ligne Relances non créée");
  return rec;
}
export const journalRelance = (rec: Rec | null, ligne: string) => new Journal(rec?.fields["Journal"]).ajouter(`${horodatageParis()} — ${ligne}`).texte();
export { T_FACTURES, T_MONITORING, SLACK_FACTURATION, chargerContexte, langueDe, horodatageParis, Journal, ecrireFacture, texte, premier, liens, lireTable, lireEnregistrement, airtable };
export type { Rec, Dict, Contexte, Langue };
