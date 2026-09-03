// Logique de facturation Move in Paris — émission, avoir, email (03/09/2026, GO de Vincent).
//
// Une facture naît dans Airtable (formulaire « Ajout facture »), se vérifie depuis sa
// fiche (bouton « Vérifier » → case « Vérification demandée »), s'émet d'un geste
// (bouton « Émettre la facture » → Statut « A envoyer »), et se crédite depuis la
// facture choisie (bouton « Créer un avoir » → case « Créer un avoir »). Ce fichier
// contient tout ce qui se décide et se calcule ; la route /api/cron/facture-emettre
// ne fait que choisir les lignes, poser les verrous et appeler ces fonctions.
//
// Décisions de Vincent du 03/09/2026 qui gouvernent ce code :
//   - TVA : sélecteur « Pas de TVA » (exempt) / « 20 % » (FR_200). Loyer → Pas de TVA.
//   - Le DESTINATAIRE de l'email est toujours un CONTACT (table Contacts), via le champ
//     « Destinataire email » : obligatoire pour émettre, quel que soit « Facturer à ».
//     Un client sans email ou sans adresse complète est REFUSÉ : jamais d'adresse
//     inventée sur un document comptable (AUTO-16 inventait « 12 rue de Bretagne »).
//   - Nouveau client Pennylane : chercher par email et adopter l'existant ; sinon créer,
//     et écrire son id dans la fiche Airtable DANS LA MÊME SÉQUENCE, relu avant tout
//     nouveau POST — jamais deux clients Pennylane pour une même fiche.
//   - Avoir PARTIEL : « Montant avoir HT » renseigné et inférieur au montant d'origine →
//     une ligne négative, TVA de l'origine, liée par link_credit_note, finalisée ; la
//     facture d'origine reste vivante (Statut inchangé) et l'avoir porte « Facture
//     d'origine (partiel) », pas « Avoir associé ». Vide → annulation totale.
//   - Email HTML dédié par catégorie et par type (loyer, dommage, honoraires,
//     prestation, proforma, avoir), gabarit htmlEmailLocataire, anglais pour Occupant
//     et Agence, français pour Propriétaire et Client final (même règle pour le PDF).
//   - Simple : peu de champs, tout ce qui se déduit se déduit (sans jamais écraser une
//     saisie), et les refus sont écrits en français clair dans « Journal ».
import {
  airtable, lireTable, lireEnregistrement, slack, signataire, htmlEmailLocataire, envoyerEmailLocataire,
  deposerS3, lienS3, telechargerS3, texte, premier, type Rec, type Dict, type Signataire, type Carte,
} from "@/lib/mip/courrier";
import {
  chercherClientParEmail, chercherParReference, creerClientParticulier, creerClientSociete, creerFacture,
  finaliser, getFacture, getLignes, idDepuisLien, lienPennylane, lierAvoir, listerFacturesClientDepuis, supprimerBrouillon,
  telechargerPdf, urlPdf, TEMPLATE_DEFAUT, TEMPLATE_IBAN, type PlAdresse, type PlFacture, type PlLigneEntree,
} from "@/lib/mip/pennylane";

// ── Tables et constantes ────────────────────────────────────────────────────
export const T_FACTURES = "tblC97ei6ZPWhWUwe";
export const T_RESERVATIONS = "tbl5uN32egP4YCvUi";
export const T_CONTACTS = "tblCvwLYdXYiZg6pY";
export const T_APPARTEMENTS = "tbltFlpzQWXjoWg88";
export const T_MONITORING = "tblDEkjIyKoKJG5Yj";
export const T_LIGNES = "tblVLB8lVKIZa2p8M"; // Lignes de facture (détail imprimé, plusieurs par facture)
export const SLACK_FACTURATION = "C0BCH7N4W90"; // #facturation (C0BCH7FRDC2 est #ménages)
export const WEBHOOK_AUTO16 = "https://vincent75.app.n8n.cloud/webhook/auto-16-facture-envoyee";
const ECHEANCE_JOURS = 30;
// Sélecteur de chemin pour un loyer standard : la chaîne AUTO-16 étape B (même client,
// même PDF, même email SMTP, même S3, même Slack que le batch) ou l'émission directe.
// ÉTEINT le 03/09/2026 (contre-expertise) : la chaîne n'applique pas les décisions de
// Vincent — pas de « language » sur le PDF, email générique anglais au lieu de l'email
// dédié, destinataire = email de la fiche et non le contact « Destinataire email » —,
// elle n'a pas d'external_reference (une panne entre « Creer Invoice » et « MAJ Lien »
// laisse une facture orpheline, invisible, recréée au clic suivant), et son « Lookup
// Client » liste 100 clients sans filtre (doublon possible). Le chemin direct couvre tout.
// Le code du chemin AUTO-16 reste en place, durci, si Vincent veut le rallumer d'un mot.
export const CHEMIN_AUTO16_ACTIF = false;
// Tentatives d'envoi d'email avant de décocher « Envoyer par email » : sans plafond, une
// ligne dont le relais refuse l'email serait rejouée toutes les 10 min sans jamais converger.
export const MAX_ECHECS_EMAIL = 6;
// Réservations où un chevauchement de nuits est DÉLIBÉRÉ (même exception que le watchdog).
const NUITS_DOUBLES_ADMISES = new Set(["RES-2026-0124"]);

export type Langue = "en_GB" | "fr_FR";
// Règle de Vincent (04/09/2026) : le PDF Pennylane est TOUJOURS en français, facture comme
// avoir. Le champ « Langue de l'email » ne pilote que la langue de l'EMAIL.
export const LANGUE_DOCUMENT: Langue = "fr_FR";
export type FactureA = "Occupant" | "Client final" | "Agence" | "Propriétaire" | "Contact";
export type Chemin = "auto16" | "direct";

// Qui est facturé, selon « Facturer à ». `personne` décide de l'endpoint Pennylane
// (particulier ou société) ; `langue` de celle du PDF et de l'email (règle de Vincent).
type ConfDest = {
  cle: FactureA; champLien: string; table: string; personne: boolean; langue: Langue;
  nom: (f: Dict) => string; prenom: (f: Dict) => string; email: (f: Dict) => string;
  adresse: (f: Dict) => string; tel: (f: Dict) => string;
};
const DESTINATAIRES: Record<string, ConfDest> = {
  Occupant: {
    cle: "Occupant", champLien: "Occupant lié", table: "tblgcFnDwxjqVJy8L", personne: true, langue: "en_GB",
    nom: (f) => texte(f["Nom"]), prenom: (f) => texte(f["Prénom"]), email: (f) => texte(f["Email"]),
    adresse: () => "", tel: (f) => texte(f["Téléphone"]),
  },
  "Client final": {
    cle: "Client final", champLien: "Client final liée", table: "tblIzSOniHXHCLWQJ", personne: false, langue: "fr_FR",
    nom: (f) => texte(f["Nom client final"]), prenom: () => "", email: (f) => texte(f["Email copie auto"]),
    adresse: (f) => texte(f["Adresse"]), tel: (f) => texte(f["Téléphone"]),
  },
  Agence: {
    cle: "Agence", champLien: "Agence liée", table: "tblINIOlKNzndfDRX", personne: false, langue: "en_GB",
    nom: (f) => texte(f["Nom agence"]), prenom: () => "", email: (f) => texte(f["Email principal"]),
    adresse: (f) => texte(f["Adresse"]), tel: (f) => texte(f["Téléphone"]),
  },
  "Propriétaire": {
    cle: "Propriétaire", champLien: "Propriétaire lié", table: "tblnUwaeTFk79O0dS", personne: true, langue: "fr_FR",
    nom: (f) => texte(f["Nom"]), prenom: (f) => texte(f["Prénom"]), email: (f) => texte(f["Email"]),
    adresse: (f) => texte(f["Adresse fiscale"]), tel: (f) => texte(f["Téléphone"]),
  },
  // Facturer une personne qui n'est ni occupant, ni propriétaire, ni société (ex. honoraires
  // de recherche à un particulier) : le payeur EST le contact du champ « Destinataire email »,
  // pas de second champ à remplir. Son adresse vient de « Adresse de facturation » (Contacts).
  Contact: {
    cle: "Contact", champLien: "Destinataire email", table: "tblCvwLYdXYiZg6pY", personne: true, langue: "fr_FR",
    nom: (f) => texte(f["Nom"]), prenom: (f) => texte(f["Prénom"]), email: (f) => texte(f["Email"]),
    adresse: (f) => texte(f["Adresse de facturation"]), tel: (f) => texte(f["Téléphone"]),
  },
};
// « Facturation à » de la réservation → « Facturer à » de la facture.
const FACTURATION_RESA: Record<string, FactureA> = { Locataire: "Occupant", Agence: "Agence", "Client final": "Client final" };

// ── Petits outils ───────────────────────────────────────────────────────────
const liens = (v: unknown): string[] => (Array.isArray(v) ? v.map((x) => texte(x)).filter(Boolean) : []);
const vide = (v: unknown) => v == null || v === "" || v === false || (Array.isArray(v) && v.length === 0);
const nombre = (v: unknown) => { const n = Number(v ?? 0); return Number.isFinite(n) ? n : 0; };
const memesLiens = (a: unknown, b: unknown) => liens(a).slice().sort().join(",") === liens(b).slice().sort().join(",");
const aujourdhui = () => new Date().toISOString().slice(0, 10);
const echeance = () => new Date(Date.now() + ECHEANCE_JOURS * 86400000).toISOString().slice(0, 10);
const cle = (rec: Rec, numero: string) => `factures/${rec.id}_${numero}.pdf`; // convention S3 d'AUTO-16
const echapper = (s: string) => s.replace(/'/g, "\\'");

export const horodatageParis = (d = new Date()) =>
  new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })
    .format(d).replace(",", "");

const eur = (v: number, langue: Langue = "fr_FR") =>
  new Intl.NumberFormat(langue === "fr_FR" ? "fr-FR" : "en-GB", { style: "currency", currency: "EUR" }).format(v);
const dateLongue = (iso: string, langue: Langue) => {
  const t = Date.parse(texte(iso));
  if (!Number.isFinite(t)) return "";
  return new Intl.DateTimeFormat(langue === "fr_FR" ? "fr-FR" : "en-GB", { timeZone: "Europe/Paris", day: "numeric", month: "long", year: "numeric" }).format(new Date(t));
};
const moisLong = (iso: string, langue: Langue) => {
  const t = Date.parse(texte(iso));
  if (!Number.isFinite(t)) return "";
  return new Intl.DateTimeFormat(langue === "fr_FR" ? "fr-FR" : "en-GB", { timeZone: "Europe/Paris", month: "long", year: "numeric" }).format(new Date(t));
};

// Adresse de facturation lue sur la fiche : « 8 rue X\n75016 Paris », « 8 rue X, 75016, Paris »…
// Code postal à 5 chiffres, ville après, voie avant. Un morceau manquant = refus (jamais
// de valeur par défaut : c'est la règle de Vincent).
export function lireAdresse(brut: string): { ok: boolean; adresse?: PlAdresse; manque: string } {
  const t = brut.replace(/\s+/g, " ").trim();
  const m = /\b(\d{5})\b/.exec(t);
  if (!t) return { ok: false, manque: "adresse vide" };
  if (!m) return { ok: false, manque: "code postal (5 chiffres) introuvable" };
  const voie = t.slice(0, m.index).replace(/^[\s,;–-]+|[\s,;–-]+$/g, "");
  const ville = t.slice(m.index + 5).replace(/^[\s,;–-]+|[\s,;–-]+$/g, "").replace(/,?\s*(France|FR)$/i, "").trim();
  if (!voie) return { ok: false, manque: "voie (numéro et rue) manquante avant le code postal" };
  if (!ville) return { ok: false, manque: "ville manquante après le code postal" };
  return { ok: true, adresse: { address: voie, postal_code: m[1], city: ville, country_alpha2: "FR" }, manque: "" };
}

// ── Journal (champ « Journal » de la facture) ───────────────────────────────
// Le journal est le seul endroit où Vincent lit ce qui s'est passé : aperçu de la
// vérification, motif de refus, étapes horodatées. On garde les 80 dernières lignes.
export class Journal {
  lignes: string[];
  constructor(existant: unknown) { this.lignes = texte(existant).split("\n").filter((l) => l.trim() !== ""); }
  remplacer(bloc: string) { this.lignes = bloc.split("\n"); return this; }
  ajouter(bloc: string) { this.lignes.push(...bloc.split("\n")); this.lignes = this.lignes.slice(-80); return this; }
  texte() { return this.lignes.join("\n"); }
}
export async function ecrireFacture(id: string, champs: Dict) {
  await airtable("PATCH", T_FACTURES, { records: [{ id, fields: champs }], typecast: true });
}

// ── Monitoring (une ligne par mode, mise à jour ; jamais une par facture) ───
// Le webhook temps réel et le watchdog lisent Monitoring en UNE page de 100 lignes :
// une ligne par facture les casserait au bout de quelques mois. On tient donc une ligne
// « dernière émission », « dernier avoir », « dernier email », « dernier refus », et la
// trace détaillée reste dans le Journal de chaque facture.
export async function journaliserMonitoring(mode: "émission" | "avoir" | "email" | "refus", statut: "OK" | "ALERTE", detail: string) {
  const nom = mode === "émission" ? "Facturation · dernière émission" : `Facturation · dernier ${mode}`;
  try {
    const rows = await lireTable(T_MONITORING, `{Contrôle}='${echapper(nom)}'`);
    const fields = { "Contrôle": nom, Statut: statut, "Détail": detail.slice(0, 4000), "Dernière vérification": new Date().toISOString() };
    if (rows[0]) await airtable("PATCH", `${T_MONITORING}/${rows[0].id}`, { fields, typecast: true });
    else await airtable("POST", T_MONITORING, { records: [{ fields }], typecast: true });
  } catch { /* le tableau de bord ne conditionne jamais une émission */ }
}
export const slackFacturation = (message: string) => slack(SLACK_FACTURATION, message);

// ── Verrou par fiche (protocole de checkin-finalisation) ────────────────────
// Airtable n'a pas d'écriture atomique. Chaque passage pose une ligne
// « verrou:facture:<fiche> » avec un jeton, relit, et seul le plus petit jeton continue.
// Un verrou de plus de 15 minutes est réputé abandonné (fonction interrompue).
const VERROU_PERIME_MS = 15 * 60 * 1000;
export async function verrouillerFiche(ficheId: string): Promise<string | null> {
  const nom = `verrou:facture:${ficheId}`;
  const jeton = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const cree = await airtable("POST", T_MONITORING, { records: [{ fields: {
    "Contrôle": nom, Statut: "OK", "Détail": jeton, "Dernière vérification": new Date().toISOString(),
  } }], typecast: true });
  const monId = texte(((cree.records as Rec[] | undefined) ?? [])[0]?.id);
  if (!monId) throw new Error("verrou non créé");
  await new Promise((r) => setTimeout(r, 1500));
  const lignes = await lireTable(T_MONITORING, `{Contrôle}='${nom}'`);
  const horodatage = (r: Rec) => Number(texte(r.fields["Détail"]).split("-")[0]) || 0;
  const vivantes = lignes.filter((r) => Date.now() - horodatage(r) < VERROU_PERIME_MS);
  vivantes.sort((a, b) => (horodatage(a) - horodatage(b)) || a.id.localeCompare(b.id));
  if (!vivantes.length || vivantes[0].id !== monId) {
    await airtable("DELETE", `${T_MONITORING}/${monId}`).catch(() => undefined);
    return null;
  }
  for (const r of lignes) if (!vivantes.includes(r)) await airtable("DELETE", `${T_MONITORING}/${r.id}`).catch(() => undefined);
  return monId;
}
export async function deverrouillerFiche(verrouId: string) {
  await airtable("DELETE", `${T_MONITORING}/${verrouId}`).catch(() => undefined);
}

// ── Contexte d'une facture ──────────────────────────────────────────────────
export type Contexte = {
  fac: Rec; numero: string;
  f: Dict;              // champs tels que lus
  v: Dict;              // vue effective : champs lus + déductions (jamais par-dessus une saisie)
  deductions: Dict;     // ce qui manquait et se déduit : à écrire dans la ligne
  resa: Rec | null; appartement: Rec | null;
  factureA: string; conf: ConfDest | null; fiche: Rec | null;
  contact: Rec | null; copies: Rec[];
  lignes: Rec[];        // lignes de détail (table Lignes de facture), triées ; vide = facture simple
  sgn: Signataire;
};

// Déduit ce qui manque à partir de la réservation. Règle absolue : une case remplie
// par Vincent n'est jamais réécrite, même si la déduction « tombe juste ».
export function deduireDepuisReservation(f: Dict, resa: Rec | null): Dict {
  const d: Dict = {};
  const rf = resa?.fields ?? {};
  const cat = texte(f["Catégorie"]);
  if (vide(f["Type"])) d["Type"] = "Facture";
  if (vide(f["TVA"])) d["TVA"] = cat === "Loyer" ? "Pas de TVA" : "20 %";
  if (vide(f["Mode facturation"])) d["Mode facturation"] = texte(rf["Mode facturation"]) || "Classique";
  if (vide(f["Modèle IBAN"])) d["Modèle IBAN"] = TEMPLATE_IBAN[texte(rf["Modèle facture (IBAN)"])] ? texte(rf["Modèle facture (IBAN)"]) : "IBAN 1";
  // Détail saisi (prix unitaire × quantité) : le total en découle et est écrit dans la fiche.
  // Un loyer garde sa règle à lui (total de la période ÷ nuits) : le prix unitaire est ignoré.
  const pu = nombre(f["Prix unitaire HT"]);
  if (cat !== "Loyer" && pu > 0) {
    const q = Math.max(1, Math.round(nombre(f["Quantité"]) || 1));
    const total = Math.round(pu * q * 100) / 100;
    if (Math.abs(nombre(f["Montant total HT"]) - total) > 0.004) d["Montant total HT"] = total;
  }
  if (!resa) return d;
  const factureA = texte(f["Facturer à"]) || FACTURATION_RESA[texte(rf["Facturation à"])] || "";
  if (vide(f["Facturer à"]) && factureA) d["Facturer à"] = factureA;
  const conf = DESTINATAIRES[factureA];
  if (conf && vide(f[conf.champLien])) {
    const source = conf.cle === "Occupant" ? rf["Occupant"] : conf.cle === "Client final" ? rf["Client final lié"]
      : conf.cle === "Agence" ? rf["Agence de relocation (entité)"] : undefined;
    if (liens(source).length) d[conf.champLien] = liens(source).slice(0, 1);
  }
  if (vide(f["Destinataire email"]) && liens(rf["Destinataire facture"]).length) d["Destinataire email"] = liens(rf["Destinataire facture"]).slice(0, 1);
  if (vide(f["Copies (CC)"]) && liens(rf["Copies facture (CC)"]).length) d["Copies (CC)"] = liens(rf["Copies facture (CC)"]);
  if (vide(f["Mention sur facture"]) && texte(rf["Mention sur facture"])) d["Mention sur facture"] = texte(rf["Mention sur facture"]);
  if (vide(f["Appartements"]) && liens(rf["Appartement"]).length) d["Appartements"] = liens(rf["Appartement"]).slice(0, 1);
  return d;
}

export async function chargerContexte(fac: Rec): Promise<Contexte> {
  const f = fac.fields;
  const numero = texte(f["Numéro facture"]) || fac.id;
  const resa = await lireEnregistrement(T_RESERVATIONS, premier(f["Réservation liée"]));
  const deductions = deduireDepuisReservation(f, resa);
  const v: Dict = { ...f, ...deductions };
  const factureA = texte(v["Facturer à"]);
  const conf = DESTINATAIRES[factureA] ?? null;
  const fiche = conf ? await lireEnregistrement(conf.table, premier(v[conf.champLien])) : null;
  let contact = await lireEnregistrement(T_CONTACTS, premier(v["Destinataire email"]));
  // Sans contact désigné : si un contact porte exactement l'email de la fiche facturée,
  // on l'adopte (déduction, pas invention). Sinon le refus dira quoi faire.
  if (!contact && conf && fiche) {
    const email = conf.email(fiche.fields).trim().toLowerCase();
    if (email) {
      const trouves = await lireTable(T_CONTACTS, `LOWER({Email})='${echapper(email)}'`).catch(() => [] as Rec[]);
      if (trouves.length === 1) { contact = trouves[0]; deductions["Destinataire email"] = [contact.id]; v["Destinataire email"] = [contact.id]; }
    }
  }
  const copies: Rec[] = [];
  for (const id of liens(v["Copies (CC)"])) { const c = await lireEnregistrement(T_CONTACTS, id); if (c) copies.push(c); }
  const appartement = await lireEnregistrement(T_APPARTEMENTS, premier(resa?.fields["Appartement"]) || premier(v["Appartements"]));
  const sgn = await signataire(resa?.fields["Collaborateur"]);
  // Lignes de détail. Elles font foi quand il y en a : le total de la facture en découle
  // (une facture sans ligne garde son détail simple : Libellé / Quantité / Prix unitaire).
  const lignes: Rec[] = [];
  for (const id of liens(v["Lignes de facture"])) { const l = await lireEnregistrement(T_LIGNES, id); if (l) lignes.push(l); }
  lignes.sort((a, b) => (nombre(a.fields["Ordre"]) || 9999) - (nombre(b.fields["Ordre"]) || 9999));
  if (lignes.length) {
    const total = Math.round(lignes.reduce((t, l) => t + totalLigne(l), 0) * 100) / 100;
    if (total > 0 && Math.abs(nombre(v["Montant total HT"]) - total) > 0.004) { deductions["Montant total HT"] = total; v["Montant total HT"] = total; }
  }
  return { fac, numero, f, v, deductions, resa, appartement, factureA, conf, fiche, contact, copies, lignes, sgn };
}

const emailContact = (c: Rec | null) => texte(c?.fields["Email"]).trim().toLowerCase();
// Email du CLIENT Pennylane (recherche par email, puis création). Une personne (occupant,
// propriétaire) doit porter le sien sur sa fiche. Une société sans « Email » de fiche
// prend celui du contact destinataire : c'est bien la personne qui reçoit ses factures,
// et c'est ce que fait déjà AUTO-16 (_emailPennylane || _emailDestinataire).
const emailClient = (ctx: Contexte) => {
  if (!ctx.conf || !ctx.fiche) return "";
  const fiche = ctx.conf.email(ctx.fiche.fields).trim().toLowerCase();
  return fiche || (ctx.conf.personne ? "" : emailContact(ctx.contact));
};
const prenomContact = (c: Rec | null, repli = "") => (texte(c?.fields["Prénom"]).trim().split(/\s+/)[0] || repli);
const adresseAppartement = (ctx: Contexte) =>
  texte(ctx.appartement?.fields["adresse complète"]) || premier(ctx.v["Adresse appartement (récap)"]) || premier(ctx.resa?.fields["Adresse appartement"]) || texte(ctx.appartement?.fields["Adresse"]);
const codeResa = (ctx: Contexte) => texte(ctx.resa?.fields["Code réservation"]).split(" · ")[0].trim() || premier(ctx.v["Code réservation (récap)"]).split(" · ")[0].trim();
export const langueDe = (ctx: Contexte): Langue => {
  // « Langue du document » sur la facture l'emporte ; vide = déduit du type de payeur.
  const choisie = texte(ctx.v?.["Langue du document"]);
  if (choisie === "Français") return "fr_FR";
  if (choisie === "Anglais") return "en_GB";
  return ctx.conf?.langue ?? "fr_FR";
};

// ── Vérification ────────────────────────────────────────────────────────────
export type ClientPl = { id: number | null; aCreer: boolean; adresse?: PlAdresse; detail: string };
export type Verification = {
  ok: boolean; blocages: string[]; avertissements: string[]; journal: string;
  chemin: Chemin; ligne: PlLigneEntree; lignes: PlLigneEntree[]; nuits: number; prixNuit: string;
  langue: Langue; template: number; mention: string; mode: "Classique" | "Proforma"; envoyerEmail: boolean;
  client: ClientPl; emailTo: string; emailCc: string; montantHT: number; montantTTC: number; tva: "exempt" | "FR_200";
};

// Nuits déjà couvertes par une facture VIVANTE de la même réservation, hors la ligne
// elle-même (sa « Clé période loyer » l'inscrit déjà dans le rollup). Fin exclusive.
async function nuitsDejaFacturees(ctx: Contexte, debut: string, fin: string): Promise<string[]> {
  if (!ctx.resa) return [];
  const code = codeResa(ctx);
  if (!code || NUITS_DOUBLES_ADMISES.has(code)) return [];
  const autres = await lireTable(T_FACTURES,
    `AND({Catégorie}='Loyer', {Type}!='Avoir', {Statut}!='Avoir', FIND('${echapper(code)}', ARRAYJOIN({Code réservation (récap)})))`);
  const doubles: string[] = [];
  for (const a of autres) {
    if (a.id === ctx.fac.id) continue;
    if (!liens(a.fields["Réservation liée"]).includes(ctx.resa.id)) continue;
    if (liens(a.fields["From field: Avoir associé"]).length) continue;
    const d1 = texte(a.fields["Période facturée début"]).slice(0, 10), f1 = texte(a.fields["Période facturée fin"]).slice(0, 10);
    if (!d1 || !f1) continue;
    for (let d = new Date(`${debut}T00:00:00Z`); d < new Date(`${fin}T00:00:00Z`); d = new Date(d.getTime() + 864e5)) {
      const nuit = d.toISOString().slice(0, 10);
      if (nuit >= d1 && nuit < f1) doubles.push(`${nuit.slice(8, 10)}/${nuit.slice(5, 7)} (${texte(a.fields["Numéro facture"]) || a.id})`);
    }
  }
  return doubles;
}

// Le client Pennylane : id déjà rangé sur la fiche → existant ; sinon cherché par email
// (adopté et rangé au moment de l'émission) ; sinon à créer, avec une adresse complète.
// Un occupant n'a pas de champ adresse : c'est l'adresse de l'appartement de sa
// réservation qui le domicilie (il y habite), jamais une adresse par défaut.
async function resoudreClientPennylane(ctx: Contexte, blocages: string[]): Promise<ClientPl> {
  if (!ctx.conf || !ctx.fiche) return { id: null, aCreer: false, detail: "" };
  const cf = ctx.fiche.fields;
  const existant = Number(cf["Pennylane customer ID"] ?? 0);
  if (existant > 0) return { id: existant, aCreer: false, detail: `client Pennylane ${existant} existant` };
  const email = emailClient(ctx);
  if (!email) { blocages.push(`la fiche ${ctx.conf.cle} « ${ctx.conf.nom(cf)} » n'a pas d'email${ctx.conf.personne ? "" : " (ni le contact destinataire)"} : impossible de retrouver ou créer le client Pennylane`); return { id: null, aCreer: true, detail: "" }; }
  let trouve: number | null = null;
  try { trouve = (await chercherClientParEmail(email))?.id ?? null; } catch (e) { blocages.push(`recherche du client Pennylane impossible : ${e instanceof Error ? e.message : e}`); }
  if (trouve) return { id: trouve, aCreer: false, detail: `client Pennylane ${trouve} retrouvé par email (${email}), sera rangé dans la fiche` };
  let brut = ctx.conf.adresse(cf);
  if (ctx.conf.cle === "Occupant") {
    const a = ctx.appartement?.fields ?? {};
    brut = [texte(a["Adresse"]), texte(a["Code postal"]), texte(a["Ville"])].filter(Boolean).join(" ") || adresseAppartement(ctx);
    if (!brut) { blocages.push("occupant sans adresse : lier la réservation (l'adresse de l'appartement sert d'adresse de facturation) ou renseigner « Pennylane customer ID » sur sa fiche"); return { id: null, aCreer: true, detail: "" }; }
  }
  if (!brut && ctx.conf.cle === "Contact") {
    blocages.push(`le contact « ${ctx.conf.nom(cf)} » n'a pas d'adresse : renseignez « Adresse de facturation » sur sa fiche Contacts (ex. « 12 rue de la Paix, 75002 Paris »)`);
    return { id: null, aCreer: true, detail: "" };
  }
  const adr = lireAdresse(brut);
  if (!adr.ok || !adr.adresse) {
    blocages.push(`adresse de facturation incomplète sur la fiche ${ctx.conf.cle} « ${ctx.conf.nom(cf)} » : ${adr.manque} (voie, code postal et ville sont obligatoires chez Pennylane)`);
    return { id: null, aCreer: true, detail: "" };
  }
  if (ctx.conf.personne && !ctx.conf.nom(cf)) blocages.push(`la fiche ${ctx.conf.cle} n'a pas de nom`);
  if (!ctx.conf.personne && !ctx.conf.nom(cf)) blocages.push(`la fiche ${ctx.conf.cle} n'a pas de raison sociale`);
  return { id: null, aCreer: true, adresse: adr.adresse, detail: `client Pennylane à créer (${ctx.conf.personne ? "particulier" : "société"}, ${adr.adresse.address}, ${adr.adresse.postal_code} ${adr.adresse.city}, ${email})` };
}

// ── Lignes de détail (table « Lignes de facture ») ──────────────────────────
export const quantiteLigne = (l: Rec) => { const q = nombre(l.fields["Quantité"]); return q > 0 ? q : 1; };
export const puLigne = (l: Rec) => Math.round(nombre(l.fields["Prix unitaire HT"]) * 100) / 100;
export const totalLigne = (l: Rec) => Math.round(quantiteLigne(l) * puLigne(l) * 100) / 100;
const tvaCode = (choix: string, defaut: "exempt" | "FR_200"): "exempt" | "FR_200" | null =>
  !choix ? defaut : choix === "20 %" ? "FR_200" : choix === "Pas de TVA" ? "exempt" : null;

// Les lignes de détail telles qu'elles partent chez Pennylane (une invoice_line chacune).
function lignesDetail(ctx: Contexte, tvaDefaut: "exempt" | "FR_200"): PlLigneEntree[] {
  return ctx.lignes.map((l) => {
    const d = texte(l.fields["Description (imprimée)"]).trim().slice(0, 2000);
    return {
      label: (texte(l.fields["Libellé"]).trim() || "Prestation").slice(0, 250),
      quantity: quantiteLigne(l), unit: "piece",
      raw_currency_unit_price: puLigne(l).toFixed(6),
      vat_rate: tvaCode(texte(l.fields["TVA"]), tvaDefaut) ?? tvaDefaut,
      ...(d ? { description: d } : {}),
    };
  });
}

// Ligne Pennylane. Un loyer se facture en nuits (« 31 day × 130,000000 »), le reste au forfait.
// Le montant Airtable est le TOTAL HT (convention de la table) : le prix par nuit en découle.
function construireLigne(ctx: Contexte, montantHT: number, nuits: number, tva: "exempt" | "FR_200"): { ligne: PlLigneEntree; prixNuit: string } {
  const cat = texte(ctx.v["Catégorie"]);
  const debut = texte(ctx.v["Période facturée début"]).slice(0, 10), fin = texte(ctx.v["Période facturée fin"]).slice(0, 10);
  const libelle = texte(ctx.v["Libellé"]).trim();
  // Détail imprimé sous le libellé (dommages, ménages, honoraires) : plusieurs lignes possibles.
  const description = texte(ctx.v["Description (imprimée)"]).trim().slice(0, 2000) || undefined;
  const code = codeResa(ctx);
  if (cat === "Loyer" && nuits > 0) {
    const titre = texte(ctx.v["Mode facturation"]) === "Proforma" ? "Proforma" : "Loyer";
    const label = libelle || [titre, code ? `Résa ${code}` : "", `${debut} au ${fin}`, adresseAppartement(ctx)].filter(Boolean).join(" — ");
    const prixNuit = (montantHT / nuits).toFixed(6);
    return { prixNuit, ligne: { label: label.slice(0, 250), quantity: nuits, unit: "day", raw_currency_unit_price: prixNuit, vat_rate: tva, ...(description ? { description } : {}) } };
  }
  const label = [libelle || cat || "Prestation", code ? `Résa ${code}` : ""].filter(Boolean).join(" — ");
  // « Quantité » (ex. 3 ménages) : le Montant total HT reste le TOTAL, le prix unitaire en découle.
  const quantite = Math.max(1, Math.round(nombre(ctx.v["Quantité"]) || 1));
  const puSaisi = nombre(ctx.v["Prix unitaire HT"]);
  const prixUnitaire = (puSaisi > 0 ? puSaisi : montantHT / quantite).toFixed(6);
  return { prixNuit: prixUnitaire, ligne: { label: label.slice(0, 250), quantity: quantite, unit: "piece", raw_currency_unit_price: prixUnitaire, vat_rate: tva, ...(description ? { description } : {}) } };
}

export async function verifier(ctx: Contexte, pourEmission = false): Promise<Verification> {
  const blocages: string[] = [];
  const avertissements: string[] = [];
  const v = ctx.v;
  const cat = texte(v["Catégorie"]);
  const montantHT = Math.round(nombre(v["Montant total HT"]) * 100) / 100;
  const mode: "Classique" | "Proforma" = texte(v["Mode facturation"]) === "Proforma" ? "Proforma" : "Classique";
  const tvaChoix = texte(v["TVA"]);
  const tva: "exempt" | "FR_200" = tvaChoix === "20 %" ? "FR_200" : "exempt";
  const template = TEMPLATE_IBAN[texte(v["Modèle IBAN"])] || TEMPLATE_DEFAUT;
  const mention = texte(v["Mention sur facture"]).trim();
  const envoyerEmail = v["Envoyer par email"] === true;
  const langue = langueDe(ctx);

  if (texte(v["Type"]) && texte(v["Type"]) !== "Facture") blocages.push(`Type « ${texte(v["Type"])} » : seule une ligne de Type « Facture » s'émet`);
  if (texte(v["Lien Pennylane"])) blocages.push("« Lien Pennylane » est déjà rempli : cette facture existe déjà chez Pennylane (pour un renvoi d'email, vider « Email envoyé le »)");
  if (!cat) blocages.push("« Catégorie » n'est pas renseignée");
  if (!ctx.factureA) blocages.push("« Facturer à » n'est pas renseigné (Occupant, Client final, Agence ou Propriétaire)");
  else if (!ctx.conf) blocages.push(`« Facturer à » = ${ctx.factureA} : valeur inconnue`);
  else if (!ctx.fiche) blocages.push(`« Facturer à » = ${ctx.factureA} mais « ${ctx.conf.champLien} » est vide`);
  if (!ctx.contact) blocages.push("« Destinataire email » est vide : choisir (ou créer) le contact qui recevra l'email, c'est obligatoire pour émettre");
  else if (!emailContact(ctx.contact)) blocages.push(`le contact « ${texte(ctx.contact.fields["Nom complet"]) || ctx.contact.id} » n'a pas d'email`);
  if (!(montantHT > 0)) blocages.push("montant manquant : renseignez « Montant total HT », ou « Prix unitaire HT » et « Quantité » (le total est alors calculé)");
  if (tvaChoix && tvaChoix !== "20 %" && tvaChoix !== "Pas de TVA") blocages.push(`« TVA » = ${tvaChoix} : valeur inconnue (Pas de TVA ou 20 %)`);
  if (mode === "Proforma" && !texte(v["Mode facturation"])) avertissements.push("mode déduit : Proforma");

  const debut = texte(v["Période facturée début"]).slice(0, 10), fin = texte(v["Période facturée fin"]).slice(0, 10);
  let nuits = 0;
  let nuitsDoubles: string[] = [];
  if (cat === "Loyer") {
    if (!ctx.resa) blocages.push("un loyer exige une réservation liée");
    if (!debut || !fin) blocages.push("un loyer exige une période complète (« Période facturée début » et « fin »)");
    else {
      nuits = Math.round((Date.parse(fin) - Date.parse(debut)) / 86400000);
      if (!(nuits > 0)) blocages.push("la fin de période doit être postérieure au début (le jour de départ est exclu)");
      else if (montantHT > 0 && Math.abs(Number((montantHT / nuits).toFixed(6)) * nuits - montantHT) > 0.01) blocages.push("montant / nuits ne redonne pas le total à 0,01 € près");
      if (nuits > 0 && ctx.resa) {
        try { nuitsDoubles = await nuitsDejaFacturees(ctx, debut, fin); } catch (e) { blocages.push(`contrôle des nuits impossible : ${e instanceof Error ? e.message : e}`); }
        if (nuitsDoubles.length) blocages.push(`${nuitsDoubles.length} nuit(s) déjà facturée(s) sur cette réservation : ${nuitsDoubles.slice(0, 6).join(", ")}${nuitsDoubles.length > 6 ? "…" : ""}`);
      }
    }
    if (tva === "FR_200") avertissements.push("loyer avec TVA 20 % (choix explicite ; la location meublée est normalement exonérée)");
  } else if (!ctx.lignes.length && !texte(v["Libellé"]).trim()) {
    blocages.push("aucun détail : ajoutez au moins une ligne (bouton « Ajouter une ligne » sur la fiche) — ou renseignez « Libellé » et « Montant total HT » pour une facture d'une seule ligne");
  }

  const client = await resoudreClientPennylane(ctx, blocages);
  const { ligne, prixNuit } = construireLigne(ctx, montantHT, nuits, tva);
  // Lignes de détail : elles remplacent la ligne unique et portent chacune leur TVA.
  const detail = ctx.lignes.length ? lignesDetail(ctx, tva) : [];
  ctx.lignes.forEach((l, i) => {
    const n = `ligne ${i + 1}`;
    if (!texte(l.fields["Libellé"]).trim()) blocages.push(`${n} de détail : « Libellé » est vide`);
    if (!(puLigne(l) > 0)) blocages.push(`${n} de détail « ${texte(l.fields["Libellé"]) || l.id} » : « Prix unitaire HT » doit être supérieur à 0`);
    const t = texte(l.fields["TVA"]);
    if (t && tvaCode(t, tva) === null) blocages.push(`${n} de détail : TVA « ${t} » inconnue (Pas de TVA ou 20 %)`);
  });
  if (ctx.lignes.length && cat === "Loyer") blocages.push("un loyer se facture en nuits : retirez les lignes de détail ou changez la catégorie");
  // Saisie simple ET lignes de détail : les lignes gagnent, on le dit au lieu de l'ignorer en silence.
  if (ctx.lignes.length && (texte(v["Libellé"]).trim() || nombre(v["Prix unitaire HT"]) > 0 || nombre(v["Quantité"]) > 1))
    avertissements.push(`la facture a ${ctx.lignes.length} ligne(s) de détail : « Libellé », « Quantité » et « Prix unitaire HT » de la facture ne sont pas imprimés (ce sont les lignes qui font foi)`);
  const lignes = detail.length ? detail : [ligne];
  const montantTTC = Math.round(lignes.reduce((t, l) => t + Number(l.raw_currency_unit_price) * l.quantity * (l.vat_rate === "FR_200" ? 1.2 : 1), 0) * 100) / 100;
  const emailTo = emailContact(ctx.contact);
  const emailCc = ctx.copies.map(emailContact).filter((x, i, a) => x && x !== emailTo && a.indexOf(x) === i).join(",");

  // Chemin. La chaîne AUTO-16 étape B ne sait faire QUE le loyer standard de la
  // réservation, avec les réglages de la réservation (destinataire, CC, IBAN, mention,
  // mode, exonération) et un prix par nuit à 2 décimales. Au moindre écart : direct.
  // Restrictions ajoutées le 03/09 (contre-expertise) : seulement une AGENCE (la chaîne
  // écrit un email anglais, ce qui ne coïncide qu'avec cette langue), et seulement un
  // client Pennylane DÉJÀ rangé sur la fiche (décision 5 : la chaîne liste 100 clients
  // sans filtre et peut en créer un second ; un client neuf ou retrouvé par email passe
  // par le chemin direct, qui le range lui-même dans la fiche).
  const rf = ctx.resa?.fields ?? {};
  const prixExactAuCentime = nuits > 0 && Math.abs(Number((montantHT / nuits).toFixed(2)) * nuits - montantHT) < 0.005;
  const clientSurFiche = Number(ctx.fiche?.fields["Pennylane customer ID"] ?? 0) > 0;
  const chemin: Chemin = CHEMIN_AUTO16_ACTIF && cat === "Loyer" && !!ctx.resa && nuits > 0
    && ctx.factureA === "Agence" && langue === "en_GB"
    && !client.aCreer && !!client.id && clientSurFiche
    && FACTURATION_RESA[texte(rf["Facturation à"])] === ctx.factureA
    && liens(rf["Destinataire facture"]).length > 0 && memesLiens(v["Destinataire email"], rf["Destinataire facture"])
    && (vide(v["Copies (CC)"]) || memesLiens(v["Copies (CC)"], rf["Copies facture (CC)"]))
    && envoyerEmail && tva === "exempt" && !texte(v["Libellé"]).trim()
    && (texte(rf["Mode facturation"]) || "Classique") === mode
    && (TEMPLATE_IBAN[texte(rf["Modèle facture (IBAN)"])] || TEMPLATE_DEFAUT) === template
    && texte(rf["Mention sur facture"]).trim() === mention
    && prixExactAuCentime
    ? "auto16" : "direct";

  const quand = horodatageParis();
  const qui = ctx.conf && ctx.fiche ? `${ctx.conf.cle} « ${[ctx.conf.prenom(ctx.fiche.fields), ctx.conf.nom(ctx.fiche.fields)].filter(Boolean).join(" ")} »` : ctx.factureA || "?";
  const lignesJournal = blocages.length
    ? [`BLOQUÉE le ${quand} — ${blocages.length} point(s) à corriger`, ...blocages.map((b) => `- ${b}`)]
    : [
      `VÉRIFIÉE le ${quand} — ${pourEmission ? "émission en cours" : "prête à émettre"}`,
      `Chemin : ${chemin === "auto16" ? "chaîne AUTO-16 (loyer standard de la réservation)" : "émission directe"}`,
      `Destinataire : ${qui} — ${client.detail}`,
      // Sur la chaîne, ce n'est pas la route qui produit l'email ni le PDF : le journal
      // dit ce qui sera réellement appliqué, pas ce que la route aurait calculé.
      ...(chemin === "auto16"
        ? [`Email et PDF produits par la chaîne AUTO-16 : email anglais générique de la chaîne à ${emailTo}${emailCc ? ` (CC ${emailCc})` : ""}, PDF dans la langue par défaut de l'entreprise Pennylane`]
        : [`Email à : ${emailTo}${emailCc ? ` · CC : ${emailCc}` : ""} · email en ${langue === "fr_FR" ? "français" : "anglais"} · PDF en français`]),
      ...(detail.length ? [`${detail.length} ligne(s) de détail :`] : [`Ligne : ${ligne.label}`]),
      ...(detail.length
        ? detail.flatMap((l, i) => [
          `  ${i + 1}. ${l.label} — ${l.quantity} × ${eur(Number(l.raw_currency_unit_price))} HT = ${eur(Math.round(Number(l.raw_currency_unit_price) * l.quantity * 100) / 100)} · ${l.vat_rate === "exempt" ? "sans TVA" : "TVA 20 %"}`,
          ...(l.description ? [`     ${l.description.replace(/\s*\n\s*/g, " / ").slice(0, 300)}`] : []),
        ])
        : [
          ...(ligne.description ? [`        Description imprimée : ${ligne.description.replace(/\s*\n\s*/g, " / ").slice(0, 300)}`] : []),
          `        ${ligne.quantity} ${cat === "Loyer" ? "nuits" : "×"} ${cat === "Loyer" ? "× " : ""}${eur(Number(ligne.raw_currency_unit_price))} HT · ${tva === "exempt" ? "sans TVA" : "TVA 20 %"}`,
        ]),
      `Total ${eur(montantHT)} HT / ${eur(montantTTC)} TTC`,
      `${texte(v["Modèle IBAN"]) || "IBAN 1"} · Mention : ${mention || "aucune"} · Mode : ${mode === "Proforma" ? "Proforma (brouillon Pennylane, sans numéro)" : "Classique (facture numérotée)"} · Email : ${envoyerEmail ? "à l'émission" : "non (case « Envoyer par email » décochée)"}`,
      ...(cat === "Loyer" ? [`Nuits déjà facturées sur la réservation : aucune sur cette période`] : []),
      ...(Object.keys(ctx.deductions).length ? [`Déduit de la réservation : ${Object.keys(ctx.deductions).join(", ")}`] : []),
      ...avertissements.map((a) => `Attention : ${a}`),
    ];
  return {
    ok: !blocages.length, blocages, avertissements, journal: lignesJournal.join("\n"), chemin, ligne, lignes, nuits, prixNuit,
    langue, template, mention, mode, envoyerEmail, client, emailTo, emailCc, montantHT, montantTTC, tva,
  };
}

// ── Emails HTML dédiés ──────────────────────────────────────────────────────
// Gabarit htmlEmailLocataire (charte noir/or). Il est écrit en anglais (« Dear », « Kind
// regards ») : pour le français on remplace ces deux formules après rendu, plutôt que
// de dupliquer le gabarit. Jamais d'emoji, jamais de civilité : le prénom seul.
export type Doc = {
  type: "facture" | "avoir"; numero: string; numeroPennylane: string; montantHT: number; montantTTC: number;
  tva: "exempt" | "FR_200"; mode: "Classique" | "Proforma"; echeance: string; pdfNom: string;
  origine?: { numero: string; numeroPennylane: string; montantHT: number; resteDu: number | null; partiel: boolean; motif: string };
};
export function emailPourFacture(ctx: Contexte, doc: Doc, langue: Langue = langueDe(ctx)): { objet: string; html: string } {
  const fr = langue === "fr_FR";
  const cat = texte(ctx.v["Catégorie"]);
  const adresse = adresseAppartement(ctx);
  const libelle = texte(ctx.v["Libellé"]).trim();
  const debut = texte(ctx.v["Période facturée début"]).slice(0, 10), fin = texte(ctx.v["Période facturée fin"]).slice(0, 10);
  const nuits = debut && fin ? Math.round((Date.parse(fin) - Date.parse(debut)) / 86400000) : 0;
  const prenom = prenomContact(ctx.contact, ctx.conf && ctx.fiche ? ctx.conf.prenom(ctx.fiche.fields).split(/\s+/)[0] : "");
  const proforma = doc.type === "facture" && doc.mode === "Proforma";
  const societe = ctx.conf && !ctx.conf.personne && ctx.fiche ? ctx.conf.nom(ctx.fiche.fields) : "";
  const montantCarte = (label: string, v: number, gras = false): Carte => ({ label, valeur: eur(v, langue), gras });
  const cartes: Carte[] = [];
  const intro: string[] = [];
  const fin_: string[] = [];
  let titre = "";
  let encadre: { titre: string; corps: string } | undefined;
  const numAff = doc.numeroPennylane ? `${doc.numeroPennylane} (${doc.numero})` : doc.numero;
  const ttc = doc.tva === "FR_200";

  if (doc.type === "avoir" && doc.origine) {
    const o = doc.origine;
    titre = fr ? `Avoir ${doc.numeroPennylane || doc.numero} · ${o.partiel ? "sur" : "annule"} la facture ${o.numeroPennylane || o.numero}`
      : `Credit note ${doc.numeroPennylane || doc.numero} · ${o.partiel ? "on" : "cancels"} invoice ${o.numeroPennylane || o.numero}`;
    intro.push(fr
      ? `Veuillez trouver ci-joint l'avoir <strong>${numAff}</strong> ${o.partiel ? "émis sur" : "annulant"} la facture <strong>${o.numeroPennylane || o.numero}</strong>${adresse ? ` (${adresse})` : ""}.`
      : `Please find attached credit note <strong>${numAff}</strong> ${o.partiel ? "issued against" : "cancelling"} invoice <strong>${o.numeroPennylane || o.numero}</strong>${adresse ? ` (${adresse})` : ""}.`);
    cartes.push({ label: fr ? "Avoir" : "Credit note", valeur: numAff, gras: true });
    cartes.push({ label: fr ? "Facture d'origine" : "Original invoice", valeur: o.numeroPennylane || o.numero });
    cartes.push(montantCarte(fr ? "Montant crédité HT" : "Amount credited excl. VAT", Math.abs(doc.montantHT)));
    if (ttc) cartes.push(montantCarte(fr ? "Montant crédité TTC" : "Amount credited incl. VAT", Math.abs(doc.montantTTC)));
    if (o.resteDu != null) cartes.push(montantCarte(fr ? "Reste dû sur la facture" : "Remaining due on the invoice", o.resteDu, true));
    cartes.push({ label: fr ? "Motif" : "Reason", valeur: o.motif });
    fin_.push(fr
      ? (o.partiel ? "La facture d'origine reste due pour le montant restant indiqué ci-dessus." : "La facture d'origine est annulée : aucun règlement n'est attendu à son titre. Si elle a déjà été réglée, nous vous remboursons dans les meilleurs délais.")
      : (o.partiel ? "The original invoice remains payable for the remaining amount shown above." : "The original invoice is cancelled: no payment is expected for it. If it has already been paid, we will refund you shortly."));
  } else {
    const nomDoc = proforma ? (fr ? "facture pro forma" : "pro forma invoice") : (fr ? "facture" : "invoice");
    const objetCat =
      cat === "Loyer" ? (fr ? `Facture de loyer` : `Rent invoice`)
      : cat === "Dommage" ? (fr ? `Facture de dommages` : `Invoice for damages`)
      : cat === "Honoraires" ? (fr ? `Facture d'honoraires` : `Invoice for fees`)
      : (fr ? `Facture` : `Invoice`);
    titre = `${proforma ? (fr ? "Pro forma · " : "Pro forma · ") : ""}${objetCat} ${doc.numeroPennylane || doc.numero}${cat === "Loyer" && adresse ? ` · ${adresse}` : ""}${cat === "Loyer" && debut ? ` · ${moisLong(debut, langue)}` : ""}`;
    if (cat === "Loyer") {
      intro.push(fr
        ? `Veuillez trouver ci-joint la ${nomDoc} <strong>${numAff}</strong> pour le loyer de <strong>${adresse}</strong>, du ${dateLongue(debut, langue)} au ${dateLongue(fin, langue)} (${nuits} nuits).`
        : `Please find attached ${nomDoc} <strong>${numAff}</strong> for the rent of <strong>${adresse}</strong>, from ${dateLongue(debut, langue)} to ${dateLongue(fin, langue)} (${nuits} nights).`);
      cartes.push({ label: fr ? "Facture" : "Invoice", valeur: numAff, gras: true });
      cartes.push({ label: fr ? "Appartement" : "Apartment", valeur: adresse || "—" });
      cartes.push({ label: fr ? "Période" : "Period", valeur: `${dateLongue(debut, langue)} – ${dateLongue(fin, langue)}` });
      cartes.push({ label: fr ? "Nuits" : "Nights", valeur: String(nuits) });
    } else {
      const quoi = cat === "Dommage" ? (fr ? "les dommages constatés" : "the damages observed") : cat === "Honoraires" ? (fr ? "nos honoraires" : "our fees") : (fr ? "la prestation suivante" : "the following service");
      intro.push(fr
        ? `Veuillez trouver ci-joint la ${nomDoc} <strong>${numAff}</strong> concernant ${quoi}${adresse ? ` (${adresse})` : ""} : <strong>${libelle}</strong>.`
        : `Please find attached ${nomDoc} <strong>${numAff}</strong> regarding ${quoi}${adresse ? ` (${adresse})` : ""}: <strong>${libelle}</strong>.`);
      cartes.push({ label: fr ? "Facture" : "Invoice", valeur: numAff, gras: true });
      cartes.push({ label: fr ? "Objet" : "Description", valeur: libelle });
      if (adresse) cartes.push({ label: fr ? "Appartement" : "Apartment", valeur: adresse });
    }
    if (societe) cartes.push({ label: fr ? "Facturé à" : "Billed to", valeur: societe });
    cartes.push(montantCarte(fr ? "Montant HT" : "Amount excl. VAT", doc.montantHT, !ttc));
    if (ttc) cartes.push(montantCarte(fr ? "Montant TTC" : "Amount incl. VAT", doc.montantTTC, true));
    if (!proforma) cartes.push({ label: fr ? "Échéance" : "Due date", valeur: dateLongue(doc.echeance, langue) });
    if (texte(ctx.v["Mention sur facture"])) cartes.push({ label: fr ? "Référence" : "Reference", valeur: texte(ctx.v["Mention sur facture"]) });
    if (proforma) {
      encadre = {
        titre: fr ? "Document pro forma" : "Pro forma document",
        corps: fr
          ? "Ce document est une facture pro forma, et non une facture définitive (pro forma, not a tax invoice). La facture définitive vous sera adressée séparément."
          : "This document is a pro forma invoice, not a tax invoice. The final invoice will be issued separately.",
      };
      fin_.push(fr ? "Nous restons à votre disposition pour toute question." : "Please do not hesitate to contact us with any question.");
    } else {
      encadre = {
        titre: fr ? "Règlement" : "Payment",
        corps: fr
          ? `Règlement par virement bancaire avant le ${dateLongue(doc.echeance, langue)}, sur le compte indiqué au bas de la facture, en rappelant la référence <strong>${doc.numeroPennylane || doc.numero}</strong>.`
          : `Payment by bank transfer before ${dateLongue(doc.echeance, langue)}, to the account shown at the bottom of the invoice, quoting reference <strong>${doc.numeroPennylane || doc.numero}</strong>.`,
      };
      fin_.push(fr ? "Nous vous remercions de votre confiance et restons à votre disposition pour toute question." : "Thank you for your trust. Please do not hesitate to contact us with any question.");
    }
  }

  let html = htmlEmailLocataire({ titre, prenom, intro, cartes, encadre, fin: fin_, signataire: ctx.sgn });
  if (fr) {
    // Le gabarit met « Guest » quand le prénom manque : en français, « Bonjour, » suffit.
    html = html.replace('<html lang="en">', '<html lang="fr">')
      .replace(/<p style="margin:0 0 16px 0;">Dear ([^<]*),<\/p>/, (_m, p: string) => `<p style="margin:0 0 16px 0;">Bonjour${prenom ? ` ${p}` : ""},</p>`)
      .replace("Kind regards,", "Cordialement,");
  }
  return { objet: `${titre} · Move in Paris`, html };
}

// ── Envoi (PDF, S3, email) — chaque étape tolérante ─────────────────────────
// Renvoie les accrocs rencontrés après l'émission : la facture existe, ces étapes se
// rattrapent (cron : « Email envoyé le » vide + « Envoyer par email » + lien rempli).
async function archiverEtEnvoyer(ctx: Contexte, rec: Rec, plId: string, pl: PlFacture | null, doc: Doc, envoyer: boolean, journal: Journal, langue: Langue): Promise<{ accrocs: string[]; emailEnvoye: boolean; lienS3: string }> {
  const accrocs: string[] = [];
  const key = cle(rec, doc.numero);
  let pdf: Buffer | null = null;
  let lien = "";
  try {
    const url = await urlPdf(plId, pl?.public_file_url ?? null);
    pdf = url ? await telechargerPdf(url) : null;
    if (!pdf) pdf = await telechargerS3(key); // renvoi : le PDF archivé fait foi
    if (!pdf) throw new Error("PDF non disponible chez Pennylane après 60 s");
    await deposerS3(key, pdf, "application/pdf");
    lien = lienS3(key);
    await ecrireFacture(rec.id, { "Lien S3": lien });
    journal.ajouter(`${horodatageParis()} — PDF archivé (S3 ${key})`);
  } catch (e) {
    accrocs.push(`PDF/S3 : ${e instanceof Error ? e.message : e}`);
    journal.ajouter(`${horodatageParis()} — PDF non archivé : ${e instanceof Error ? e.message : e}`);
  }
  let emailEnvoye = false;
  if (envoyer) {
    const to = emailContact(ctx.contact);
    const cc = ctx.copies.map(emailContact).filter((x, i, a) => x && x !== to && a.indexOf(x) === i).join(",");
    if (!to) accrocs.push("email non envoyé : « Destinataire email » sans adresse");
    else if (!pdf) accrocs.push("email non envoyé : pas de PDF à joindre (le cron reprendra)");
    else {
      const { objet, html } = emailPourFacture(ctx, doc, langue);
      const res = await envoyerEmailLocataire({
        usrEmail: ctx.sgn.email, mailTo: to, mailCc: cc, mailReplyTo: ctx.sgn.email, mailSubject: objet, mailHtml: html,
        attachments: [{ name: doc.pdfNom, contentType: "application/pdf", base64: pdf.toString("base64") }], origine: "facture-emettre",
      }).catch((e) => ({ ok: false, erreur: e instanceof Error ? e.message : String(e) }));
      if (res.ok) {
        emailEnvoye = true;
        // L'email est parti : l'horodatage est la toute première écriture qui suit, pour
        // sortir la ligne des candidates au renvoi avant tout autre appel.
        try { await ecrireFacture(rec.id, { "Email envoyé le": new Date().toISOString() }); }
        catch (e) { accrocs.push(`HORODATAGE IMPOSSIBLE après envoi (${e instanceof Error ? e.message.slice(0, 120) : e}) : remplir « Email envoyé le » à la main, sinon l'email repartira`); }
        journal.ajouter(`${horodatageParis()} — Email envoyé à ${to}${cc ? ` (CC ${cc})` : ""} depuis ${ctx.sgn.email}`);
      } else {
        accrocs.push(`email : ${res.erreur ?? "refusé par le relais"}`);
        journal.ajouter(`${horodatageParis()} — Email NON envoyé : ${res.erreur ?? "refus du relais"} (le cron réessaiera)`);
      }
    }
  }
  return { accrocs, emailEnvoye, lienS3: lien };
}

// ── Émission ────────────────────────────────────────────────────────────────
export type Resultat = { ok: boolean; resume: string; accrocs: string[] };

// Crée (ou adopte) le client Pennylane et range son id dans la fiche AVANT tout POST de
// facture. Relit la fiche juste avant, au cas où un autre passage l'aurait déjà rangé.
async function assurerClientPennylane(ctx: Contexte, verif: Verification): Promise<{ id: number; cree: boolean; adopte: boolean }> {
  if (!ctx.conf || !ctx.fiche) throw new Error("fiche facturée absente");
  const relue = await lireEnregistrement(ctx.conf.table, ctx.fiche.id);
  const dejaLa = Number(relue?.fields["Pennylane customer ID"] ?? 0);
  if (dejaLa > 0) return { id: dejaLa, cree: false, adopte: false };
  const cf = ctx.fiche.fields;
  const email = emailClient(ctx);
  if (!email) throw new Error("client sans email : refus de créer un client Pennylane");
  let id = verif.client.id;
  let cree = false;
  if (!id) {
    const trouve = await chercherClientParEmail(email);
    if (trouve) id = trouve.id;
  }
  if (!id) {
    if (!verif.client.adresse) throw new Error("adresse de facturation manquante : refus de créer un client Pennylane sans adresse");
    const commun = { emails: [email], billing_address: verif.client.adresse, billing_language: ctx.conf.langue, ...(ctx.conf.tel(cf) ? { phone: ctx.conf.tel(cf) } : {}) };
    const c = ctx.conf.personne
      ? await creerClientParticulier({ first_name: ctx.conf.prenom(cf) || ctx.conf.nom(cf), last_name: ctx.conf.nom(cf), ...commun })
      : await creerClientSociete({ name: ctx.conf.nom(cf), recipient: [texte(ctx.contact?.fields["Prénom"]), texte(ctx.contact?.fields["Nom"])].filter(Boolean).join(" ") || undefined, ...commun });
    id = Number(c.id);
    if (!id) throw new Error("Pennylane n'a pas renvoyé d'identifiant client");
    cree = true;
  }
  // Même séquence, avant tout POST de facture : la fois suivante retrouve ce client.
  await airtable("PATCH", ctx.conf.table, { records: [{ id: ctx.fiche.id, fields: { "Pennylane customer ID": id } }] });
  return { id, cree, adopte: !cree };
}

export async function emettre(ctx: Contexte, verif: Verification): Promise<Resultat> {
  // Le journal s'AJOUTE, jamais ne se remplace : une consigne « vérifier dans Pennylane »
  // laissée par un passage précédent doit survivre à la nouvelle tentative.
  const journal = new Journal(ctx.f["Journal"]).ajouter(verif.journal);
  const rec = ctx.fac;
  if (!verif.ok) {
    // Refus motivé : rien ne reste en « A envoyer » sans explication.
    await ecrireFacture(rec.id, { Statut: "À préparer", "Vérification demandée": false, "Émission en cours depuis": null, Journal: journal.texte(), ...ctx.deductions });
    return { ok: false, resume: verif.blocages.join(" · "), accrocs: [] };
  }
  return verif.chemin === "auto16" ? emettreParAuto16(ctx, verif, journal) : emettreDirect(ctx, verif, journal);
}

// Chaîne AUTO-16 étape B : on écrit dans Notes le nombre de nuits (regex « (\d+) nuits »
// du nœud « Preparer Contexte Envoi ») et on appelle le webhook public avec {recordId}.
// Le workflow fait le reste (client, PDF, S3, email SMTP avec CC, lien, Statut, Slack).
// Sa garde « DÉJÀ ÉMISE » est la seconde ligne de défense. L'email part de la chaîne :
// « Email envoyé le » est posé avant l'appel, et retiré seulement sur un refus métier.
//
// Durci le 03/09 (contre-expertise). La chaîne n'a pas d'external_reference : si elle
// plante ENTRE « Creer Invoice Pennylane » et « MAJ Facture Lien Pennylane » (PDF pas
// prêt, S3, SMTP — l'incident du 28/08), n8n répond HTTP 500 sans « success » alors
// que la facture Pennylane existe. Trois réponses sont donc distinguées :
//   1. refus MÉTIER avéré : HTTP 2xx + {success:false, error:"…"} (nœud « Repondre
//      Erreur Blocage », émis AVANT tout appel Pennylane) → « À préparer » avec le motif ;
//   2. succès : HTTP 2xx + {success:true} → relecture du lien ;
//   3. tout le reste (HTTP 5xx, corps illisible, réseau, délai) : INDÉTERMINÉ → on garde
//      « A envoyer », le verrou de ligne et « Email envoyé le », on cherche chez Pennylane
//      une facture orpheline (client + date du jour + libellé « Résa <code> — <début> au
//      <fin> ») pour l'adopter ; sinon la route rendra la ligne « À préparer » au passage
//      suivant (verrou > 10 min) avec la consigne de vérifier dans Pennylane. Jamais de
//      second appel de la chaîne sur une réponse indéterminée.
const AUTO16_DELAI_MS = 240_000; // sous les 300 s de maxDuration, pour garder la main sur le journal

// Une facture Pennylane créée par la chaîne pour CETTE ligne, sans lien posé dans Airtable.
async function chercherOrphelineAuto16(ctx: Contexte, verif: Verification): Promise<PlFacture | null> {
  const customerId = verif.client.id;
  if (!customerId) return null;
  const code = codeResa(ctx);
  const debut = texte(ctx.v["Période facturée début"]).slice(0, 10), fin = texte(ctx.v["Période facturée fin"]).slice(0, 10);
  if (!code || !debut || !fin) return null;
  const candidates = await listerFacturesClientDepuis(customerId, aujourdhui()).catch(() => [] as PlFacture[]);
  // Le libellé de la chaîne est « Loyer|Proforma — Résa <code> — <début> au <fin>[ — …] »
  // (nœud « Preparer Invoice Pennylane ») : on exige le code ET les deux dates.
  return candidates.find((c) => {
    const label = texte(c.label);
    return label.includes(`Résa ${code}`) && label.includes(debut) && label.includes(fin) && !c.credited_invoice;
  }) ?? null;
}

// Pose le lien d'une facture retrouvée (chaîne ou orpheline). « Email envoyé le » reste
// tel quel : la chaîne a peut-être envoyé son email, et un email manquant se renvoie d'un
// clic alors qu'un doublon ne se rattrape pas.
async function adopterFactureChaine(ctx: Contexte, journal: Journal, plId: string, comment: string): Promise<Resultat> {
  journal.ajouter(`${horodatageParis()} — ÉMISE par la chaîne AUTO-16 (${comment}) · Pennylane ${plId} · email : envoyé par la chaîne, non confirmé — pour le renvoyer, vider « Email envoyé le »`);
  await ecrireFacture(ctx.fac.id, { "Lien Pennylane": lienPennylane(plId), "Date d'envoi": aujourdhui(), Statut: "Envoyée", Journal: journal.texte(), "Émission en cours depuis": null });
  await journaliserMonitoring("émission", "OK", `${ctx.numero} — chaîne AUTO-16 · Pennylane ${plId} (${comment})`);
  return { ok: true, resume: `${ctx.numero} émise par la chaîne AUTO-16 (${comment}) · Pennylane ${plId} — email non confirmé`, accrocs: [] };
}

async function emettreParAuto16(ctx: Contexte, verif: Verification, journal: Journal): Promise<Resultat> {
  const rec = ctx.fac;
  const prix = (verif.montantHT / verif.nuits).toFixed(2);

  // 0. Avant tout appel : une facture orpheline d'un passage précédent est adoptée, pas recréée.
  const dejaLa = await chercherOrphelineAuto16(ctx, verif);
  if (dejaLa?.id) return adopterFactureChaine(ctx, journal, String(dejaLa.id), "facture déjà créée par un passage précédent, adoptée sans rappeler la chaîne");

  const notes = texte(ctx.f["Notes"]);
  const marque = `[manuel] ${verif.nuits} nuits × ${prix} € HT/nuit`;
  journal.ajouter(`${horodatageParis()} — Transmise à la chaîne AUTO-16 (${marque})`);
  await ecrireFacture(rec.id, {
    Notes: notes.includes(marque) ? notes : [marque, notes].filter(Boolean).join("\n"),
    "Email envoyé le": new Date().toISOString(), "Vérification demandée": false, Journal: journal.texte(), ...ctx.deductions,
  });

  // 1. Appel du webhook, borné dans le temps : un fetch sans délai tué par Vercel
  //    laisserait la chaîne finir dans notre dos avec un verrou périmé.
  let reponse: Dict = {};
  let httpOk = false;
  try {
    const r = await fetch(WEBHOOK_AUTO16, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ recordId: rec.id }),
      cache: "no-store", signal: AbortSignal.timeout(AUTO16_DELAI_MS),
    });
    httpOk = r.ok;
    const t = await r.text();
    try { reponse = t ? (JSON.parse(t) as Dict) : {}; } catch { reponse = { brut: t.slice(0, 200) }; }
    if (!r.ok) reponse = { ...reponse, http: r.status };
  } catch (e) {
    reponse = { erreur: e instanceof Error ? e.message : String(e) };
  }
  const refusMetier = httpOk && reponse.success === false && typeof reponse.error === "string";
  const succes = httpOk && reponse.success === true;

  // 2. Refus métier avéré (avant tout appel Pennylane) : la ligne revient « À préparer ».
  if (refusMetier) {
    const motif = texte(reponse.error);
    const relue = await lireEnregistrement(T_FACTURES, rec.id);
    if (relue && texte(relue.fields["Lien Pennylane"])) {
      // La garde « DÉJÀ ÉMISE » de la chaîne : le lien est là, la facture existe.
      journal.ajouter(`${horodatageParis()} — La chaîne AUTO-16 a répondu « ${motif} » et le lien Pennylane est posé : émise`);
      await ecrireFacture(rec.id, { Journal: journal.texte(), "Émission en cours depuis": null });
      return { ok: true, resume: `${ctx.numero} déjà émise par la chaîne AUTO-16 (${motif})`, accrocs: [] };
    }
    journal.ajouter(`${horodatageParis()} — REFUS de la chaîne AUTO-16 : ${motif}`);
    await ecrireFacture(rec.id, { Statut: "À préparer", "Email envoyé le": null, "Émission en cours depuis": null, Journal: journal.texte() });
    return { ok: false, resume: `chaîne AUTO-16 : ${motif}`, accrocs: [] };
  }

  // 3. Succès ou indéterminé : relecture jusqu'à 60 s pour voir le lien posé par la chaîne
  //    (sur une réponse indéterminée, la chaîne peut encore être en train de finir).
  let lien = "";
  for (let i = 0; i < 12 && !lien; i++) {
    await new Promise((r) => setTimeout(r, 5000));
    lien = texte((await lireEnregistrement(T_FACTURES, rec.id))?.fields["Lien Pennylane"]);
  }
  let plId = texte(reponse.pennylane_id) || idDepuisLien(lien) || "";
  if (!lien && !plId) {
    // Ni lien ni id : la facture existe peut-être quand même (panne après le POST).
    const orpheline = await chercherOrphelineAuto16(ctx, verif);
    if (orpheline?.id) plId = String(orpheline.id);
  }
  if (!lien && plId) {
    return adopterFactureChaine(ctx, journal, plId, succes ? "réponse OK, lien posé par la route" : `réponse indéterminée (${texte(reponse.http) ? `HTTP ${texte(reponse.http)}` : texte(reponse.erreur) || "corps illisible"}), facture retrouvée chez Pennylane`);
  }
  if (lien) {
    journal.ajouter(`${horodatageParis()} — ÉMISE par la chaîne AUTO-16 · Pennylane ${plId} · email envoyé par la chaîne`);
    await ecrireFacture(rec.id, { Journal: journal.texte(), "Émission en cours depuis": null });
    await journaliserMonitoring("émission", "OK", `${ctx.numero} — chaîne AUTO-16 · Pennylane ${plId}`);
    return { ok: true, resume: `${ctx.numero} → chaîne AUTO-16 · ${verif.nuits} nuits × ${prix} € · ${eur(verif.montantHT)} HT · Pennylane ${plId}`, accrocs: [] };
  }

  // 4. Aucun lien, aucune facture retrouvée : état INDÉTERMINÉ. On ne touche ni au Statut,
  //    ni au verrou, ni à « Email envoyé le » : la route jugera le verrou périmé au passage
  //    suivant et rendra la ligne « À préparer » avec la consigne. Personne ne relance.
  const detail = succes
    ? "réponse OK mais aucun lien après 60 s"
    : `réponse indéterminée (${texte(reponse.http) ? `HTTP ${texte(reponse.http)}` : texte(reponse.erreur) || texte(reponse.brut) || "corps illisible"})`;
  journal.ajouter(`${horodatageParis()} — Chaîne AUTO-16 : ${detail} — VÉRIFIER DANS PENNYLANE avant tout renvoi (une facture « Loyer — Résa ${codeResa(ctx)} » peut exister sans lien). Verrou conservé : la ligne sera rendue « À préparer » au passage suivant, jamais relancée automatiquement.`);
  await ecrireFacture(rec.id, { Journal: journal.texte() });
  await slackFacturation(`:rotating_light: *${ctx.numero} — chaîne AUTO-16 : ${detail}*\nVérifier dans Pennylane (client ${verif.client.id ?? "?"}, libellé « Loyer — Résa ${codeResa(ctx)} ») avant tout renvoi. Rien ne sera relancé automatiquement.`);
  return { ok: false, resume: `chaîne AUTO-16 : ${detail} — vérifier dans Pennylane avant tout renvoi`, accrocs: [] };
}

async function emettreDirect(ctx: Contexte, verif: Verification, journal: Journal): Promise<Resultat> {
  const rec = ctx.fac;
  const langue = verif.langue;
  // 1. Client Pennylane (id rangé dans la fiche dans la même séquence).
  const client = await assurerClientPennylane(ctx, verif);
  if (client.cree) journal.ajouter(`${horodatageParis()} — Client Pennylane ${client.id} créé et rangé dans la fiche`);
  else if (client.adopte) journal.ajouter(`${horodatageParis()} — Client Pennylane ${client.id} retrouvé par email et rangé dans la fiche`);
  // 2. Idempotence : une facture déjà créée sous cette référence est adoptée.
  let pl = await chercherParReference(ctx.numero);
  let adoptee = !!pl;
  if (!pl) {
    const cat_ = texte(ctx.v["Catégorie"]);
    const sujet = cat_ === "Loyer" ? "Facture de loyer"
      : cat_ === "Dommage" ? "Facture de dommages"
      : cat_ === "Honoraires" ? "Facture d'honoraires"
      : "Facture";
    pl = await creerFacture({
      customer_id: client.id, date: aujourdhui(), deadline: echeance(), draft: verif.mode === "Proforma", currency: "EUR",
      customer_invoice_template_id: verif.template, ...(verif.mention ? { special_mention: verif.mention } : {}),
      external_reference: ctx.numero, pdf_invoice_subject: verif.mode === "Proforma" ? `Pro forma — ${sujet}` : sujet, language: LANGUE_DOCUMENT,
      invoice_lines: verif.lignes,
    });
    adoptee = false;
  }
  const plId = String(pl.id);
  if (!pl.id) throw new Error("Pennylane n'a pas renvoyé d'identifiant de facture");
  // 3. Écriture Airtable IMMÉDIATE : à partir d'ici Airtable n'est jamais en retard
  //    de plus d'une requête sur Pennylane.
  journal.ajouter(`${horodatageParis()} — ÉMISE (${adoptee ? "facture Pennylane déjà existante, adoptée" : "créée"}) · Pennylane ${plId}${pl.invoice_number ? ` · ${pl.invoice_number}` : " · brouillon"}`);
  await ecrireFacture(rec.id, {
    "Lien Pennylane": lienPennylane(plId), "Date d'envoi": aujourdhui(), Statut: "Envoyée",
    "Vérification demandée": false, Journal: journal.texte(), ...ctx.deductions,
  });
  // 4. PDF, S3, email — tolérants.
  const doc: Doc = {
    type: "facture", numero: ctx.numero, numeroPennylane: texte(pl.invoice_number), montantHT: verif.montantHT, montantTTC: verif.montantTTC,
    tva: verif.tva, mode: verif.mode, echeance: texte(pl.deadline) || echeance(), pdfNom: `${verif.mode === "Proforma" ? "Proforma" : "Facture"}-${ctx.numero}.pdf`,
  };
  const suite = await archiverEtEnvoyer(ctx, rec, plId, pl, doc, verif.envoyerEmail, journal, langue);
  await ecrireFacture(rec.id, { Journal: journal.texte(), "Émission en cours depuis": null }).catch(() => undefined);
  const qui = ctx.conf && ctx.fiche ? `${ctx.conf.cle} « ${[ctx.conf.prenom(ctx.fiche.fields), ctx.conf.nom(ctx.fiche.fields)].filter(Boolean).join(" ")} »` : ctx.factureA;
  const resume = `${ctx.numero} → ${qui} — ${eur(verif.montantHT)} HT — ${verif.mode === "Proforma" ? "proforma (brouillon)" : pl.invoice_number}`
    + `${client.cree ? " — client Pennylane créé" : ""}`
    + ` — ${suite.emailEnvoye ? `email envoyé à ${verif.emailTo}${verif.emailCc ? ` (CC ${verif.emailCc})` : ""}` : verif.envoyerEmail ? "email NON envoyé" : "sans email (choix)"}`
    + ` — ${suite.lienS3 ? "PDF archivé" : "PDF non archivé"}`;
  await journaliserMonitoring("émission", suite.accrocs.length ? "ALERTE" : "OK", `${resume}${suite.accrocs.length ? `\nAccrocs : ${suite.accrocs.join(" · ")}` : ""}`);
  return { ok: true, resume, accrocs: suite.accrocs };
}

// ── Renvoi d'email (bouton « Renvoyer l'email » : « Email envoyé le » vidé) ─
export async function renvoyerEmail(ctx: Contexte): Promise<Resultat> {
  const rec = ctx.fac;
  const journal = new Journal(ctx.f["Journal"]);
  const plId = idDepuisLien(ctx.f["Lien Pennylane"]);
  if (!plId) return { ok: false, resume: "pas d'identifiant Pennylane lisible dans « Lien Pennylane »", accrocs: [] };
  if (!ctx.contact || !emailContact(ctx.contact)) {
    journal.ajouter(`${horodatageParis()} — Renvoi impossible : « Destinataire email » vide ou sans adresse`);
    await ecrireFacture(rec.id, { Journal: journal.texte(), "Émission en cours depuis": null });
    return { ok: false, resume: "« Destinataire email » vide ou sans adresse", accrocs: [] };
  }
  const pl = await getFacture(plId).catch(() => null);
  const estAvoir = texte(ctx.f["Type"]) === "Avoir";
  if (estAvoir && pl?.draft === true) {
    // Un avoir encore brouillon n'est pas lié ni finalisé : son PDF n'a pas de numéro.
    // C'est le mode avoir qui l'envoie une fois finalisé ; jamais un renvoi en parallèle.
    journal.ajouter(`${horodatageParis()} — Renvoi refusé : l'avoir Pennylane ${plId} est encore un brouillon (finalisation en cours ou en échec)`);
    await ecrireFacture(rec.id, { Journal: journal.texte(), "Émission en cours depuis": null });
    return { ok: false, resume: `avoir ${plId} encore brouillon chez Pennylane : pas d'email`, accrocs: [] };
  }
  // Plafond d'échecs : on compte les « Email NON envoyé » depuis le dernier envoi réussi.
  // Au-delà, la case « Envoyer par email » est décochée avec la consigne, sinon la ligne
  // serait rejouée toutes les 10 min (Slack + Monitoring à chaque fois) sans converger.
  const lignesJournal = journal.lignes;
  const dernierSucces = lignesJournal.map((l, i) => (/Email (r)?envoyé à /.test(l) ? i : -1)).filter((i) => i >= 0).pop() ?? -1;
  const echecsPrecedents = lignesJournal.slice(dernierSucces + 1).filter((l) => /Email NON (r)?envoyé|Renvoi impossible/.test(l)).length;
  const montantHT = Math.abs(nombre(ctx.f["Montant total HT"]));
  const tva: "exempt" | "FR_200" = texte(ctx.f["TVA"]) === "20 %" ? "FR_200" : "exempt";
  const mode: "Classique" | "Proforma" = texte(ctx.f["Mode facturation"]) === "Proforma" || pl?.draft === true ? "Proforma" : "Classique";
  let origine: Doc["origine"];
  if (estAvoir) {
    const partiel = liens(ctx.f["Facture d'origine (partiel)"]).length > 0;
    const origRec = await lireEnregistrement(T_FACTURES, premier(ctx.f["Facture d'origine (partiel)"]) || premier(ctx.f["Avoir associé"]));
    const origPl = pl?.credited_invoice?.id ? await getFacture(pl.credited_invoice.id).catch(() => null) : null;
    origine = {
      numero: texte(origRec?.fields["Numéro facture"]), numeroPennylane: texte(origPl?.invoice_number),
      montantHT: nombre(origRec?.fields["Montant total HT"]), resteDu: origPl?.remaining_amount_with_tax != null ? nombre(origPl.remaining_amount_with_tax) : null,
      partiel, motif: texte(ctx.f["Notes"]).replace(/^Avoir\s*[—-]\s*/i, "") || texte(ctx.f["Motif avoir"]),
    };
  }
  const langue: Langue = pl?.language === "en_GB" || pl?.language === "fr_FR" ? pl.language : langueDe(ctx);
  const doc: Doc = {
    type: estAvoir ? "avoir" : "facture", numero: ctx.numero, numeroPennylane: texte(pl?.invoice_number), montantHT,
    montantTTC: Math.round(montantHT * (tva === "FR_200" ? 1.2 : 1) * 100) / 100, tva, mode, echeance: texte(pl?.deadline) || echeance(),
    pdfNom: `${estAvoir ? "Avoir" : mode === "Proforma" ? "Proforma" : "Facture"}-${ctx.numero}.pdf`, origine,
  };
  journal.ajouter(`${horodatageParis()} — Renvoi de l'email demandé`);
  const suite = await archiverEtEnvoyer(ctx, rec, plId, pl, doc, true, journal, langue);
  const abandon = !suite.emailEnvoye && echecsPrecedents + 1 >= MAX_ECHECS_EMAIL;
  if (abandon) journal.ajouter(`${horodatageParis()} — ${MAX_ECHECS_EMAIL} échecs d'envoi : case « Envoyer par email » décochée. Corriger la cause (Journal ci-dessus), recocher la case et vider « Email envoyé le » pour réessayer.`);
  await ecrireFacture(rec.id, { Journal: journal.texte(), "Émission en cours depuis": null, ...(abandon ? { "Envoyer par email": false } : {}) }).catch(() => undefined);
  const resume = `${ctx.numero} — ${suite.emailEnvoye ? `email renvoyé à ${emailContact(ctx.contact)}` : `email NON renvoyé${abandon ? ` (${MAX_ECHECS_EMAIL} échecs : « Envoyer par email » décochée)` : ""}`}${suite.accrocs.length ? ` — ${suite.accrocs.join(" · ")}` : ""}`;
  await journaliserMonitoring("email", suite.emailEnvoye ? "OK" : "ALERTE", resume);
  return { ok: suite.emailEnvoye, resume, accrocs: suite.accrocs };
}

// ── Avoir (total ou partiel) ────────────────────────────────────────────────
export type PlanAvoir = {
  ok: boolean; blocages: string[]; journal: string; partiel: boolean; suppressionBrouillon: boolean;
  origine: PlFacture | null; montantAvoirHT: number; reference: string; lignes: PlLigneEntree[]; langue: Langue; dejaCredite: number;
};

// Analyse sans rien écrire (sert au mode simulation et à la première partie du mode avoir).
export async function preparerAvoir(ctx: Contexte): Promise<PlanAvoir> {
  const blocages: string[] = [];
  const f = ctx.f;
  const motif = texte(f["Motif avoir"]).trim();
  const plId = idDepuisLien(f["Lien Pennylane"]);
  if (texte(f["Type"]) !== "Facture") blocages.push("un avoir ne se crée que sur une ligne de Type « Facture »");
  if (!motif) blocages.push("« Motif avoir » est vide : il est imprimé sur l'avoir et dans l'email");
  if (liens(f["From field: Avoir associé"]).length) blocages.push("cette facture est déjà annulée par un avoir (« From field: Avoir associé »)");
  if (texte(f["Statut"]) === "Avoir") blocages.push("cette facture est déjà au Statut « Avoir »");
  if (!plId) blocages.push("pas d'identifiant Pennylane lisible dans « Lien Pennylane »");
  if (!ctx.contact || !emailContact(ctx.contact)) blocages.push("« Destinataire email » vide ou sans adresse : c'est le contact qui reçoit l'avoir");
  const plan: PlanAvoir = { ok: false, blocages, journal: "", partiel: false, suppressionBrouillon: false, origine: null, montantAvoirHT: 0, reference: "", lignes: [], langue: langueDe(ctx), dejaCredite: 0 };
  if (blocages.length || !plId) { plan.journal = [`AVOIR REFUSÉ le ${horodatageParis()}`, ...blocages.map((b) => `- ${b}`)].join("\n"); return plan; }

  let origine: PlFacture;
  try { origine = await getFacture(plId); } catch (e) { blocages.push(`lecture Pennylane impossible : ${e instanceof Error ? e.message : e}`); plan.journal = blocages.join("\n"); return plan; }
  plan.origine = origine;
  // « Langue du document » choisie à la main l'emporte, y compris sur l'avoir ; sinon on
  // reprend la langue de la facture Pennylane d'origine, sinon la déduction par payeur.
  const langueChoisie = texte(ctx.v["Langue du document"]);
  plan.langue = langueChoisie ? langueDe(ctx)
    : origine.language === "en_GB" || origine.language === "fr_FR" ? origine.language : langueDe(ctx);
  const montantPL = nombre(origine.currency_amount_before_tax);
  const montantAT = nombre(f["Montant total HT"]);
  const notes: string[] = [];
  if (Math.abs(montantPL - montantAT) > 0.01) notes.push(`montant Pennylane ${eur(montantPL)} HT ≠ Airtable ${eur(montantAT)} HT : le montant Pennylane fait foi`);

  if (origine.status === "cancelled" || origine.credited_invoice) {
    blocages.push(`déjà annulée chez Pennylane (statut « ${origine.status} »${origine.credited_invoice ? ", avoir lié" : ""}) : rien à faire, AUTO-17 l'importera`);
  } else if (!origine.customer?.id) {
    // Sans client, le POST de l'avoir partirait avec customer_id 0 → 422 rejoué à chaque
    // passage. On refuse ici, en clair, plutôt que de laisser Pennylane le faire.
    blocages.push(`la facture Pennylane ${origine.id} n'a pas de client rattaché : l'avoir ne peut pas être créé par l'API, le faire dans Pennylane`);
  } else if (origine.draft) {
    // Proforma jamais finalisée : pas d'avoir, on supprime le brouillon (garde L'Oréal).
    plan.suppressionBrouillon = true;
    if (f["Reporté à L'Oréal le"] && f["Confirmer malgré le report L'Oréal"] !== true) {
      blocages.push(`proforma déjà reportée à L'Oréal le ${texte(f["Reporté à L'Oréal le"]).slice(0, 10)} : prévenir Santa Fe / Dwellworks puis cocher « Confirmer malgré le report L'Oréal »`);
    }
  } else {
    const demande = Math.round(nombre(f["Montant avoir HT"]) * 100) / 100;
    const partielsExistants = liens(f["From field: Facture d'origine (partiel)"]);
    let dejaCredite = 0;
    for (const id of partielsExistants) dejaCredite += Math.abs(nombre((await lireEnregistrement(T_FACTURES, id))?.fields["Montant total HT"]));
    plan.dejaCredite = dejaCredite;
    const reste = Math.round((montantPL - dejaCredite) * 100) / 100;
    if (demande < 0) blocages.push("« Montant avoir HT » doit être positif (le signe est posé par la route)");
    else if (demande > 0 && demande > reste + 0.005) blocages.push(`« Montant avoir HT » (${eur(demande)}) dépasse ce qui reste à créditer (${eur(reste)} HT)`);
    // Partiel : montant renseigné et inférieur au reste ; après un premier partiel, tout
    // montant renseigné reste un partiel (même égal au reste : on ne fait jamais une
    // annulation totale par-dessus un partiel, Pennylane ne documente pas ce cas).
    plan.partiel = demande > 0 && (demande < reste - 0.005 || partielsExistants.length > 0);
    if (!plan.partiel && partielsExistants.length) blocages.push(`un avoir partiel existe déjà (${eur(dejaCredite)} HT crédités) : renseigner « Montant avoir HT » (reste ${eur(reste)} HT) pour un second avoir partiel, pas d'annulation totale`);
    plan.montantAvoirHT = plan.partiel ? demande : reste;
    let lignes: PlLigneEntree[] = [];
    try {
      const pl = await getLignes(plId);
      if (!pl.length) blocages.push("la facture Pennylane n'a aucune ligne");
      const taux = [...new Set(pl.map((l) => l.vat_rate))];
      if (plan.partiel) {
        if (taux.length > 1) blocages.push(`l'origine mélange plusieurs taux de TVA (${taux.join(", ")}) : avoir partiel refusé, faire une annulation totale`);
        lignes = [{ label: `Avoir partiel — ${motif}`.slice(0, 250), quantity: 1, unit: "piece", raw_currency_unit_price: (-plan.montantAvoirHT).toFixed(6), vat_rate: taux[0] ?? "exempt" }];
      } else {
        // Lignes inversées, même TVA que l'origine (corrige l'« exempt » en dur d'AUTO-18).
        lignes = pl.map((l) => ({ label: l.label.slice(0, 250), quantity: Number(l.quantity) || 1, unit: l.unit || "piece", raw_currency_unit_price: (-nombre(l.raw_currency_unit_price)).toFixed(6), vat_rate: l.vat_rate }));
      }
    } catch (e) { blocages.push(`lecture des lignes Pennylane impossible : ${e instanceof Error ? e.message : e}`); }
    plan.lignes = lignes;
    plan.reference = plan.partiel ? `AVOIR-${ctx.numero}-P${partielsExistants.length + 1}` : `AVOIR-${ctx.numero}`;
  }
  plan.ok = !blocages.length;
  const quand = horodatageParis();
  plan.journal = blocages.length
    ? [`AVOIR REFUSÉ le ${quand} — ${blocages.length} point(s)`, ...blocages.map((b) => `- ${b}`), ...notes.map((n) => `Note : ${n}`)].join("\n")
    : plan.suppressionBrouillon
      ? [`AVOIR le ${quand} — l'origine est un BROUILLON Pennylane (${origine.status}) : suppression du brouillon, aucun avoir nécessaire`, ...notes.map((n) => `Note : ${n}`)].join("\n")
      : [
        `AVOIR le ${quand} — ${plan.partiel ? `PARTIEL de ${eur(plan.montantAvoirHT)} HT` : `annulation TOTALE (${eur(plan.montantAvoirHT)} HT)`} sur ${origine.invoice_number || ctx.numero} (Pennylane ${origine.id}, ${eur(montantPL)} HT)`,
        `Motif : ${motif}`,
        `Lignes : ${plan.lignes.map((l) => `${l.quantity} × ${l.raw_currency_unit_price} (${l.vat_rate}) ${l.label}`).join(" | ")}`,
        `Référence : ${plan.reference} · IBAN du modèle ${origine.customer_invoice_template?.id ?? TEMPLATE_DEFAUT} · langue ${plan.langue}`,
        `Email à : ${emailContact(ctx.contact)}${ctx.copies.length ? ` · CC : ${ctx.copies.map(emailContact).filter(Boolean).join(",")}` : ""}`,
        ...(plan.dejaCredite ? [`Déjà crédité par avoir(s) partiel(s) : ${eur(plan.dejaCredite)} HT`] : []),
        ...notes.map((n) => `Note : ${n}`),
      ].join("\n");
  return plan;
}

export async function creerAvoir(ctx: Contexte, plan: PlanAvoir): Promise<Resultat> {
  const rec = ctx.fac;
  const journal = new Journal(ctx.f["Journal"]).ajouter(plan.journal);
  if (!plan.ok || !plan.origine) {
    await ecrireFacture(rec.id, { "Créer un avoir": false, "Émission en cours depuis": null, Journal: journal.texte() });
    await journaliserMonitoring("refus", "ALERTE", `${ctx.numero} — avoir refusé : ${plan.blocages.join(" · ")}`);
    return { ok: false, resume: plan.blocages.join(" · "), accrocs: [] };
  }
  const origine = plan.origine;
  const plId = String(origine.id);

  // Brouillon Pennylane (proforma jamais finalisée) : suppression, pas d'avoir.
  if (plan.suppressionBrouillon) {
    await supprimerBrouillon(plId);
    journal.ajouter(`${horodatageParis()} — Brouillon Pennylane ${plId} supprimé, aucun avoir nécessaire (lien conservé pour la trace)`);
    await ecrireFacture(rec.id, { Statut: "Avoir", "Créer un avoir": false, "Émission en cours depuis": null, Journal: journal.texte() });
    const resume = `${ctx.numero} — brouillon Pennylane ${plId} supprimé (proforma jamais finalisée), Statut Avoir${ctx.f["Reporté à L'Oréal le"] ? " — proforma DÉJÀ REPORTÉE À L'ORÉAL : prévenir Santa Fe / Dwellworks à la main" : ""}`;
    await journaliserMonitoring("avoir", "OK", resume);
    return { ok: true, resume, accrocs: [] };
  }

  // 1. Avoir Pennylane en brouillon (adopté s'il existe déjà sous cette référence).
  const motif = texte(ctx.f["Motif avoir"]).trim();
  const numOrig = origine.invoice_number || ctx.numero;
  let avoir = await chercherParReference(plan.reference);
  const adopte = !!avoir;
  if (!avoir) {
    avoir = await creerFacture({
      customer_id: origine.customer?.id ?? 0, date: aujourdhui(), deadline: echeance(), draft: true, currency: "EUR",
      customer_invoice_template_id: origine.customer_invoice_template?.id ?? TEMPLATE_DEFAUT, external_reference: plan.reference,
      pdf_invoice_subject: plan.langue === "fr_FR" ? `Avoir${plan.partiel ? " partiel" : ""} sur facture ${numOrig}` : `Credit note${plan.partiel ? " (partial)" : ""} on invoice ${numOrig}`,
      // Format lu par AUTO-17 pour rattacher un avoir à sa facture.
      special_mention: `Avoir ${plan.partiel ? "partiel sur" : "annulant"} la facture ${numOrig} (${ctx.numero}) — ${motif}`,
      language: LANGUE_DOCUMENT, invoice_lines: plan.lignes,
    });
  }
  if (!avoir.id) throw new Error("Pennylane n'a pas renvoyé d'identifiant d'avoir");
  const avoirId = String(avoir.id);
  journal.ajouter(`${horodatageParis()} — Avoir Pennylane ${avoirId} ${adopte ? "déjà existant, adopté" : "créé (brouillon)"}`);

  // 2. Ligne Airtable Type « Avoir », AUSSITÔT après le POST et AVANT le lien : si le
  //    lien ou la finalisation échoue, le watchdog voit « avoir encore brouillon » et le
  //    cron reprend ; si le POST avait échoué, rien n'aurait été neutralisé.
  // Email de l'avoir au choix de Vincent (défaut : non, il l'envoie à la main).
  const notifierClient = ctx.f["Notifier le client de l'avoir"] === true;
  let ligneAvoir = (await lireTable(T_FACTURES, `FIND('invoice_id=${avoirId}&', {Lien Pennylane})`))[0] ?? null;
  if (!ligneAvoir) {
    const champs: Dict = {
      Type: "Avoir", Statut: "Avoir", "Catégorie": texte(ctx.f["Catégorie"]) || "Autre",
      "Montant total HT": -plan.montantAvoirHT, "Date d'envoi": aujourdhui(),
      "Lien Pennylane": lienPennylane(avoirId), Notes: `Avoir — ${motif}`, "Envoyer par email": notifierClient,
      // Verrou posé DÈS la création : la ligne (lien + « Envoyer par email » + « Email
      // envoyé le » vide) est une candidate « renvoi » que le webhook réveille dans la
      // seconde, alors que l'avoir n'est pas encore lié ni finalisé. Sans verrou, l'email
      // partirait deux fois, dont une avec le PDF brouillon. Levé après l'envoi ci-dessous.
      "Émission en cours depuis": new Date().toISOString(),
      "Facturer à": texte(ctx.v["Facturer à"]) || undefined, TVA: texte(ctx.v["TVA"]) || undefined, "Modèle IBAN": texte(ctx.v["Modèle IBAN"]) || undefined,
      "Réservation liée": liens(ctx.f["Réservation liée"]), "Appartements": liens(ctx.v["Appartements"]),
      "Occupant lié": liens(ctx.v["Occupant lié"]), "Client final liée": liens(ctx.v["Client final liée"]),
      "Agence liée": liens(ctx.v["Agence liée"]), "Propriétaire lié": liens(ctx.v["Propriétaire lié"]),
      "Destinataire email": liens(ctx.v["Destinataire email"]), "Copies (CC)": liens(ctx.v["Copies (CC)"]),
      "Période facturée début": texte(ctx.f["Période facturée début"]).slice(0, 10) || undefined,
      "Période facturée fin": texte(ctx.f["Période facturée fin"]).slice(0, 10) || undefined,
      Journal: `${horodatageParis()} — Avoir ${plan.partiel ? "partiel" : "total"} sur ${ctx.numero} · Pennylane ${avoirId} · motif : ${motif}`,
      ...(plan.partiel ? { "Facture d'origine (partiel)": [rec.id] } : { "Avoir associé": [rec.id] }),
    };
    for (const k of Object.keys(champs)) if (champs[k] === undefined || (Array.isArray(champs[k]) && (champs[k] as unknown[]).length === 0)) delete champs[k];
    const cree = await airtable("POST", T_FACTURES, { records: [{ fields: champs }], typecast: true });
    ligneAvoir = ((cree.records as Rec[] | undefined) ?? [])[0] ?? null;
    if (!ligneAvoir) throw new Error("ligne Airtable de l'avoir non créée");
  } else {
    // Ligne reprise d'un passage interrompu : même verrou, pour la même raison.
    await ecrireFacture(ligneAvoir.id, { "Émission en cours depuis": new Date().toISOString() });
  }
  const relueAvoir = await lireEnregistrement(T_FACTURES, ligneAvoir.id);
  const numeroAvoir = texte(relueAvoir?.fields["Numéro facture"]) || ligneAvoir.id;
  journal.ajouter(`${horodatageParis()} — Ligne Airtable ${numeroAvoir} (Type Avoir, ${eur(-plan.montantAvoirHT)} HT)`);
  await ecrireFacture(rec.id, { Journal: journal.texte() }).catch(() => undefined);

  // 3. Lien puis finalisation (séquence prouvée en production les 28-29/08).
  if (!avoir.credited_invoice) { await lierAvoir(plId, avoir.id); journal.ajouter(`${horodatageParis()} — Avoir lié à la facture ${numOrig}`); }
  if (avoir.draft) { avoir = await finaliser(avoirId); journal.ajouter(`${horodatageParis()} — Avoir finalisé · ${avoir.invoice_number}`); }

  // 4. Relecture de l'origine : le résultat attendu dépend du type d'avoir.
  const apres = await getFacture(plId);
  const resteDu = apres.remaining_amount_with_tax != null ? nombre(apres.remaining_amount_with_tax) : null;
  const accrocs: string[] = [];
  if (!plan.partiel && apres.status !== "cancelled" && !(resteDu != null && Math.abs(resteDu) < 0.005)) {
    journal.ajouter(`${horodatageParis()} — ANOMALIE : après l'avoir, l'origine est « ${apres.status} », reste dû ${resteDu ?? "?"} — arrêt, Airtable non modifié`);
    await ecrireFacture(rec.id, { Journal: journal.texte(), "Émission en cours depuis": null, "Créer un avoir": false }).catch(() => undefined);
    await slackFacturation(`:rotating_light: *Avoir ${numeroAvoir} créé mais l'origine ${ctx.numero} n'est pas annulée chez Pennylane* (statut « ${apres.status} », reste dû ${resteDu ?? "?"}). À regarder dans Pennylane avant toute autre action.`);
    await journaliserMonitoring("avoir", "ALERTE", `${ctx.numero} — origine non annulée après avoir ${avoirId} (statut ${apres.status})`);
    return { ok: false, resume: `avoir ${numeroAvoir} créé mais origine « ${apres.status} » : voir Slack`, accrocs: ["origine non annulée"] };
  }
  if (plan.partiel && apres.status === "cancelled") {
    accrocs.push("ALERTE : avoir partiel mais Pennylane a passé l'origine en « cancelled »");
    await slackFacturation(`:rotating_light: *Avoir partiel ${numeroAvoir} : Pennylane a ANNULÉ entièrement l'origine ${ctx.numero}* (statut cancelled). Vérifier dans Pennylane.`);
  }

  // 5. Airtable : origine neutralisée (total) ou laissée vivante (partiel) ; saisies d'avoir consommées.
  // Finance mensuelle exclut toute ligne Type « Avoir » et ne regarde que « From field:
  // Avoir associé » : un avoir partiel n'y entre pas encore, l'origine y reste comptée en
  // entier. Lot séparé à ouvrir sur finance-mensuelle ; en attendant, on le dit partout.
  const alerteFinance = "non pris en compte dans Finance mensuelle (lot séparé à venir) : corriger le CA du mois à la main";
  if (plan.partiel) {
    journal.ajouter(`${horodatageParis()} — Avoir partiel ${numeroAvoir} (${avoir.invoice_number}) posé · origine « ${apres.status} », reste dû ${resteDu != null ? eur(resteDu) : "?"} TTC · Statut inchangé`);
    journal.ajouter(`${horodatageParis()} — ATTENTION : avoir partiel ${alerteFinance}`);
    accrocs.push(`avoir partiel ${alerteFinance}`);
    await ecrireFacture(rec.id, { "Créer un avoir": false, "Motif avoir": "", "Montant avoir HT": null, "Notifier le client de l'avoir": false, "Émission en cours depuis": null, Journal: journal.texte() });
  } else {
    journal.ajouter(`${horodatageParis()} — Annulée par l'avoir ${numeroAvoir} (${avoir.invoice_number}) · origine « ${apres.status} », reste dû ${resteDu != null ? eur(resteDu) : "?"}`);
    await ecrireFacture(rec.id, { Statut: "Avoir", "Créer un avoir": false, "Émission en cours depuis": null, Journal: journal.texte() });
  }

  // 6. PDF de l'avoir, S3, email au destinataire et aux CC de la facture d'origine.
  const ctxAvoir: Contexte = { ...ctx, fac: relueAvoir ?? ligneAvoir, f: relueAvoir?.fields ?? ligneAvoir.fields, numero: numeroAvoir };
  const tvaOrig: "exempt" | "FR_200" = plan.lignes.some((l) => l.vat_rate === "FR_200") ? "FR_200" : "exempt";
  const journalAvoir = new Journal(ctxAvoir.f["Journal"]);
  const doc: Doc = {
    type: "avoir", numero: numeroAvoir, numeroPennylane: texte(avoir.invoice_number), montantHT: -plan.montantAvoirHT,
    montantTTC: -Math.round(plan.montantAvoirHT * (tvaOrig === "FR_200" ? 1.2 : 1) * 100) / 100, tva: tvaOrig, mode: "Classique",
    echeance: texte(avoir.deadline) || echeance(), pdfNom: `Avoir-${numeroAvoir}.pdf`,
    origine: { numero: ctx.numero, numeroPennylane: numOrig, montantHT: nombre(origine.currency_amount_before_tax), resteDu, partiel: plan.partiel, motif },
  };
  const suite = await archiverEtEnvoyer(ctxAvoir, ctxAvoir.fac, avoirId, avoir, doc, notifierClient, journalAvoir, plan.langue);
  if (!notifierClient) {
    const consigne = `${horodatageParis()} — Email NON envoyé au client (case « Notifier le client de l'avoir » décochée) : PDF archivé ; pour l'envoyer plus tard, bouton « Renvoyer l'email » sur la ligne de l'avoir`;
    journalAvoir.ajouter(consigne); journal.ajouter(consigne);
  }
  accrocs.push(...suite.accrocs);
  if (plan.partiel) journalAvoir.ajouter(`${horodatageParis()} — ATTENTION : avoir partiel ${alerteFinance}`);
  // Verrou de la ligne d'avoir levé : si l'email n'est pas parti, elle redevient une
  // candidate « renvoi » légitime (avoir finalisé, PDF numéroté).
  await ecrireFacture(ctxAvoir.fac.id, { Journal: journalAvoir.texte(), "Émission en cours depuis": null }).catch(() => undefined);

  const resume = `Avoir ${numeroAvoir} (${eur(-plan.montantAvoirHT)} HT) ${plan.partiel ? "partiel" : "créé"} sur ${ctx.numero} — Pennylane ${avoir.invoice_number || avoirId} — ${plan.partiel ? `origine vivante, reste dû ${resteDu != null ? eur(resteDu) : "?"}` : "origine annulée"} — ${suite.emailEnvoye ? `email envoyé à ${emailContact(ctx.contact)}` : "email NON envoyé"}${ctx.f["Reporté à L'Oréal le"] ? " — proforma DÉJÀ REPORTÉE À L'ORÉAL : prévenir Santa Fe / Dwellworks" : ""}`;
  await journaliserMonitoring("avoir", accrocs.length ? "ALERTE" : "OK", `${resume}${accrocs.length ? `\nAccrocs : ${accrocs.join(" · ")}` : ""}`);
  return { ok: true, resume, accrocs };
}
