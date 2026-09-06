// Les deux passes du recouvrement : ENCAISSEMENTS (banque → factures) et RELANCES.
//
// Règle de Vincent (06/09/2026) : « un service comptabilité qui analyse tous les cas de figure
// et ne passe JAMAIS une facture impayée en payée ». Tout ce qui suit en découle :
//   - le moteur n'impute que ce qu'il peut prouver (numéro cité, dossier désigné, montant qui
//     tombe juste et une seule lecture possible) ; sinon le crédit reste « À identifier » avec
//     le diagnostic, et une personne tranche ;
//   - aucune décision n'est silencieuse : chaque crédit est raconté dans #facturation, rapproché
//     ou non, hors client compris ;
//   - la ligne Encaissements est écrite AVANT les factures : c'est la clé de déduplication, un
//     crédit rejoué n'est plus jamais imputé deux fois ; les factures d'un même crédit sont
//     écrites en une seule requête ;
//   - un horodatage de relance est posé AVANT l'envoi : jamais deux fois le même email ;
//   - si la banque n'a pas pu être relue, aucune relance ne part ;
//   - une facture annulée chez Pennylane n'est jamais lue comme réglée ;
//   - une passe à la fois (verrou), et la fenêtre bancaire se rattrape seule après une panne.
import {
  T_FACTURES, T_RELANCES, T_ENCAISSEMENTS, T_HISTORIQUE, T_MONITORING, COMPTES, BASE_ID, GUILLAUME, ECHEANCE_JOURS, DELAI_RELANCE_JOURS,
  lireCredits, horsClient, citeNumero, refsRegistre, facturesOuvertes, decrire, rapprocher, diagnostic, creancesHistoriques, rapprocherHistorique, diagnosticHistorique,
  chargerAnnuaire, reconnaitrePayeur, contactsDuPayeur,
  emailRelance, emailConfirmation, emailDemandeReferences, emailDigestGuillaume, envoyer, signataireGuillaume, slackRecouvrement,
  relanceDe, ecrireRelance, creerRelance, journalRelance, infoDe, monitoring, enModeTest, destinataireTestActuel, pdfFacture, eur, dateCourte, plusJours, joursEntre, aujourdhui, sa, mots,
  nombre, arrondi, echapper, estLoreal,
  chargerContexte, langueRelance, horodatageParis, Journal, ecrireFacture, texte, premier, lireTable, airtable,
  type Credit, type FactureOuverte, type Rapprochement, type CreanceHistorique, type RapprochementHistorique, type Annuaire, type LigneDigest, type Rec, type Dict, type Langue,
} from "./recouvrement";
import { getFacture, idDepuisLien } from "./pennylane";

// Page « Relances » de l'interface Opérations (remplie après création de la page).
export const PAGE_RELANCES = process.env.AIRTABLE_PAGE_RELANCES || "pagS3GPr1tDKdmpZv";
export const URL_PAGE_RELANCES = `https://airtable.com/${BASE_ID}/${PAGE_RELANCES}`;
export const DEMANDES_REFERENCES_A_PARTIR_DU = process.env.RECOUVREMENT_DEMANDES_DEPUIS || "2026-10-01";
// Filet bancaire permanent et premier jour de la plateforme (aucun crédit antérieur n'est lu).
const FILET_JOURS = Number(process.env.RECOUVREMENT_FILET_JOURS || 45);
const PLANCHER_PLATEFORME = process.env.RECOUVREMENT_BANQUE_PLANCHER || "2026-07-22";

const langueDeRelance = (v: unknown): Langue => (texte(v) === "Anglais" ? "en_GB" : "fr_FR");
const libelleLangue = (l: Langue) => (l === "fr_FR" ? "Français" : "Anglais");
const transactionTexte = (c: Credit) => `${dateCourte(c.date)} · ${eur(c.montant)} · ${c.libelle.slice(0, 120)}`;
const payeurDepuisLibelle = (l: string) => {
  const m = /\/FRM\s+(.+?)\s*\/EID/i.exec(l) || /\/ORIG\s+(.+?)\s*\/MOTIF/i.exec(l) || /\/DE\s+(.+?)\//i.exec(l) || /^1\/COSMOPOLITAN[^/]*\/URI\/([A-Z .'-]+)/i.exec(l);
  return (m ? m[1] : l.split(" - ")[0]).replace(/\s+/g, " ").trim().slice(0, 60);
};
const emailContact = (c: Rec | null) => texte(c?.fields["Email"]).trim().toLowerCase();
const message = (e: unknown) => (e instanceof Error ? e.message : String(e));
const idCree = (r: Dict) => texte(((r.records as Rec[] | undefined) ?? [])[0]?.id);

// ── Verrou : une passe d'encaissements à la fois ────────────────────────────
// Deux passes qui se chevauchent (cron horaire lent, cron relances à 5h30) liraient les mêmes
// crédits neufs avant que l'une ait écrit sa ligne Encaissements. Même mécanique que le verrou
// de la finance mensuelle : une ligne Monitoring, une signature, une relecture. Le verrou
// expire seul (VERROU_S) : une fonction tuée en vol ne gèle pas le recouvrement.
const VERROU_ENCAISSEMENTS = "lock:recouvrement";
const VERROU_RELANCES = "lock:recouvrement-relances";
const VERROU_S = 600;
async function ligneVerrou(nom: string): Promise<Rec | undefined> {
  return (await lireTable(T_MONITORING, `{Contrôle}='${nom}'`)).sort((a, b) => a.id.localeCompare(b.id))[0];
}
async function prendreVerrou(nom: string): Promise<boolean> {
  for (let essai = 0; essai < 4; essai++) {
    const row = await ligneVerrou(nom);
    const pose = Date.parse(texte(row?.fields["Détail"]).split("#")[0]);
    if (!(Number.isFinite(pose) && Date.now() - pose < VERROU_S * 1000)) {
      const signature = `${new Date().toISOString()}#${Math.random().toString(36).slice(2, 10)}`;
      const fields = { "Contrôle": nom, Statut: "OK", "Détail": signature, "Dernière vérification": new Date().toISOString() };
      if (row) await airtable("PATCH", `${T_MONITORING}/${row.id}`, { fields, typecast: true });
      else await airtable("POST", T_MONITORING, { records: [{ fields }], typecast: true });
      const relu = await ligneVerrou(nom);
      if (texte(relu?.fields["Détail"]) === signature) return true;
    }
    if (essai < 3) await new Promise((r) => setTimeout(r, 15_000));
  }
  return false;
}
async function libererVerrou(nom: string) {
  try {
    const row = await ligneVerrou(nom);
    if (row) await airtable("PATCH", `${T_MONITORING}/${row.id}`, { fields: { "Détail": `libre depuis ${new Date().toISOString()}`, "Dernière vérification": new Date().toISOString() }, typecast: true });
  } catch { /* le verrou expire seul */ }
}

export type RapportEncaissements = {
  lus: number; nouveaux: number; sansId: number; rapproches: number; partiels: number; historiques: number; demandes: number; aIdentifier: number; horsClient: number;
  confirmations: number; erreurs: string[]; lignes: string[]; dernierCredit: string;
  touchees: Record<string, { encaisse: number; solde: boolean }>;   // factures modifiées (ou qui le seraient, en dry-run)
  aVerifier: string[];                                              // factures liées à une ligne Encaissements « À vérifier » : pas de relance
};
// Une ligne Encaissements dont l'imputation a commencé mais n'a jamais été confirmée (passe
// tuée entre la ligne et l'écriture des factures) : signalée, jamais oubliée.
const STALE_MIN = 20;

// ── PASSE 1 : ENCAISSEMENTS ─────────────────────────────────────────────────
export async function passeEncaissements(opts: { depuisJours?: number; dry?: boolean } = {}): Promise<RapportEncaissements> {
  const depuisJours = opts.depuisJours ?? 10;
  const dry = opts.dry === true;
  const R: RapportEncaissements = { lus: 0, nouveaux: 0, sansId: 0, rapproches: 0, partiels: 0, historiques: 0, demandes: 0, aIdentifier: 0, horsClient: 0, confirmations: 0, erreurs: [], lignes: [], dernierCredit: "", touchees: {}, aVerifier: [] };
  if (!dry && !(await prendreVerrou(VERROU_ENCAISSEMENTS))) {
    R.erreurs.push("une autre passe d'encaissements est en cours (verrou) : crédits non relus, nouvel essai au prochain passage");
    return R;
  }
  try {
    // Fenêtre bancaire : la fenêtre nominale (10 j, 4 j pour la passe relances), un filet
    // permanent de 45 j (une banque livre parfois un crédit en retard), et un rattrapage
    // jusqu'au dernier encaissement enregistré (cron arrêté, jeton expiré). Jamais avant le
    // démarrage de la plateforme ni avant 90 j. La déduplication (120 j) couvre tout cela :
    // aucun crédit déjà rangé n'est relu. Avant, un crédit plus vieux que la fenêtre n'était
    // jamais lu ni signalé.
    const today = aujourdhui();
    const recents = await lireTable(T_ENCAISSEMENTS, `IS_AFTER({Date}, DATEADD(TODAY(), -120, 'days'))`);
    const nominale = plusJours(today, -depuisJours);
    const filet = plusJours(today, -Math.max(depuisJours, FILET_JOURS));
    const derniere = recents.map((r) => texte(r.fields["Date"]).slice(0, 10)).filter(Boolean).sort().pop() || "";
    const plancher = [plusJours(today, -90), PLANCHER_PLATEFORME].sort().pop() as string;
    let depuis = [nominale, derniere || filet, filet].sort()[0];
    if (depuis < plancher) depuis = plancher;
    if (derniere && derniere < filet) R.lignes.push(`Fenêtre bancaire remontée au ${dateCourte(depuis)} : dernier encaissement enregistré le ${dateCourte(derniere)}`);
    // Lignes dont l'imputation a commencé sans jamais être confirmée (passe tuée entre la ligne
    // et l'écriture des factures) : passées « À vérifier », signalées, et leurs factures ne sont
    // pas relancées tant qu'une personne n'a pas tranché.
    for (const r of recents) {
      const statut = texte(r.fields["Statut"]);
      const journal = texte(r.fields["Journal"]);
      if (statut === "À vérifier") { R.aVerifier.push(...(Array.isArray(r.fields["Factures"]) ? (r.fields["Factures"] as string[]) : [])); continue; }
      const creeLe = Date.parse(texte((r as unknown as { createdTime?: string }).createdTime ?? ""));
      if (statut === "Rapproché" && journal.includes("imputation en cours") && Number.isFinite(creeLe) && Date.now() - creeLe > STALE_MIN * 60_000) {
        R.aVerifier.push(...(Array.isArray(r.fields["Factures"]) ? (r.fields["Factures"] as string[]) : []));
        R.erreurs.push(`ligne Encaissements ${texte(r.fields["Encaissement"])} : imputation commencée et jamais confirmée (passe interrompue ?) — passée « À vérifier », à contrôler à la main`);
        if (!dry) await airtable("PATCH", `${T_ENCAISSEMENTS}/${r.id}`, { fields: { Statut: "À vérifier", Journal: `${journal}\n${horodatageParis()} — Imputation jamais confirmée : à contrôler à la main` }, typecast: true }).catch(() => undefined);
      }
    }
    const credits = await lireCredits(depuis);
    R.lus = credits.length;
    R.dernierCredit = credits.map((c) => c.date).sort().pop() || "";
    const deja = new Set(recents.map((r) => texte(r.fields["Transaction Pennylane"])).filter(Boolean));
    const vus = new Set<string>();
    const nouveaux: Credit[] = [];
    for (const c of credits) {
      if (!c.id) { R.sansId++; continue; }
      if (deja.has(c.id) || vus.has(c.id)) continue;
      vus.add(c.id);
      nouveaux.push(c);
    }
    if (R.sansId) R.erreurs.push(`${R.sansId} crédit(s) sans identifiant Pennylane : non traités, à vérifier dans Pennylane`);
    const tardifs = nouveaux.filter((c) => c.date < nominale);
    if (tardifs.length) R.lignes.push(`${tardifs.length} règlement(s) livré(s) en retard par la banque, lus par le filet : ${tardifs.map((c) => `${dateCourte(c.date)} ${eur(c.montant)}`).join(", ")}`);
    R.nouveaux = nouveaux.length;
    if (!nouveaux.length) return R;
    const ouvertes = await facturesOuvertes();
    const historiques = await creancesHistoriques();
    let annuaire: Annuaire | null = null;
    const sgn = await signataireGuillaume();

    const creerEncaissement = async (c: Credit, champs: Dict) => {
      if (dry) return;
      await airtable("POST", T_ENCAISSEMENTS, { records: [{ fields: {
        Encaissement: `${dateCourte(c.date)} · ${eur(c.montant)} · ${payeurDepuisLibelle(c.libelle)}`, Date: c.date, Montant: c.montant,
        Compte: COMPTES[c.compte] || undefined, "Libellé bancaire": c.libelle, "Transaction Pennylane": c.id, ...champs,
      } }], typecast: true });
    };

    for (const c of nouveaux) {
      try {
        // 1) Hors client (remboursements, impôts, prêts…), sauf si l'un de nos numéros de facture
        //    figure dans le libellé : un règlement client l'emporte toujours sur la règle.
        if (horsClient(c) && !citeNumero(c.libelle)) {
          R.horsClient++;
          R.lignes.push(`Hors client : ${eur(c.montant)} le ${dateCourte(c.date)} — ${c.libelle.slice(0, 70)}`);
          await creerEncaissement(c, { Statut: "Hors client", Payeur: payeurDepuisLibelle(c.libelle), Journal: `${horodatageParis()} — Mouvement hors règlement client (règle automatique)` });
          continue;
        }
        // 2) L'Oréal : virements groupés, imputés à la main par Vincent. Jamais automatique.
        if (estLoreal(c.libelle)) {
          R.aIdentifier++;
          R.lignes.push(`À identifier (L'Oréal, imputation manuelle) : ${eur(c.montant)} le ${dateCourte(c.date)} — ${c.libelle.slice(0, 70)}`);
          await creerEncaissement(c, { Statut: "À identifier", Payeur: "L'Oréal SA", Journal: `${horodatageParis()} — L'Oréal : imputation manuelle (règle), aucune facture touchée` });
          continue;
        }
        // 3) Factures de la plateforme, puis 4) créances d'avant la plateforme (registre 2025-2026,
        //    table Relances → Historique factures). Un numéro cité dit de quel côté chercher : un
        //    numéro plateforme (FAC-…, F-2026-…) n'ouvre jamais un repli sur une créance historique,
        //    et un numéro du registre (2026-275) n'ouvre jamais un repli au nom sur la plateforme.
        const platCite = citeNumero(c.libelle);
        const regCite = refsRegistre(c.libelle).length > 0;
        const r = platCite || !regCite ? rapprocher(c, ouvertes) : null;
        if (r) { await appliquerRapprochement(c, r, ouvertes, sgn, dry, R); continue; }
        const h = platCite ? null : rapprocherHistorique(c, historiques);
        if (h) { await appliquerHistorique(c, h, historiques, dry, R); continue; }
        // 5) Aucune facture prouvée : on identifie le payeur. L'email de demande de références ne
        //    part que s'il est FORMELLEMENT identifié (tous les mots de son nom dans le libellé, une
        //    seule fiche possible), hors L'Oréal, avec une facture ou une créance ouverte à son nom,
        //    et pour un crédit daté d'au moins RECOUVREMENT_DEMANDES_DEPUIS.
        annuaire = annuaire ?? (await chargerAnnuaire());
        const p = reconnaitrePayeur(c, annuaire);
        const nomPayeur = p?.nom || payeurDepuisLibelle(c.libelle);
        const motsPayeur = p ? [...mots(p.nom)] : [];
        const aDesFactures = p
          ? ouvertes.some((f) => [f.client, f.agence, f.occupants].some((x) => x && motsPayeur.every((w) => mots(x).has(w))))
            || historiques.some((x) => x.noms.some((n) => motsPayeur.every((w) => n.mots.includes(w))))
          : false;
        const dh = diagnosticHistorique(c, historiques);
        const pourquoi = diagnostic(c, ouvertes) + (dh ? ` ; ${dh}` : "");
        // 6) La ligne Encaissements « À identifier » est écrite AVANT tout email : c'est la clé de
        //    déduplication. Un échec d'écriture après l'envoi faisait repartir la même demande de
        //    références à chaque passe horaire.
        R.aIdentifier++;
        R.lignes.push(`À identifier : ${eur(c.montant)} le ${dateCourte(c.date)} — ${c.libelle.slice(0, 70)} → ${pourquoi}`);
        let ligneId = "";
        if (!dry) {
          const cree = await airtable("POST", T_ENCAISSEMENTS, { records: [{ fields: {
            Encaissement: `${dateCourte(c.date)} · ${eur(c.montant)} · ${payeurDepuisLibelle(c.libelle)}`, Date: c.date, Montant: c.montant, Compte: COMPTES[c.compte] || undefined,
            "Libellé bancaire": c.libelle, "Transaction Pennylane": c.id, Statut: "À identifier", Payeur: nomPayeur,
            Journal: `${horodatageParis()} — ${pourquoi}${p ? ` ; payeur ${p.sur ? "identifié" : "probable"} : ${p.nom}${p.loreal ? " (L'Oréal : traitement manuel)" : aDesFactures ? "" : " (aucune facture ni créance ouverte à son nom)"}` : ""}`,
          } }], typecast: true });
          ligneId = idCree(cree);
        }
        if (p && p.sur && !p.loreal && aDesFactures && c.date >= DEMANDES_REFERENCES_A_PARTIR_DU) {
          const dest = await contactsDuPayeur(p);
          if (dest.to) {
            const { objet, html } = emailDemandeReferences(p, c, dest.prenom, dest.langue, sgn);
            const res = dry && !enModeTest() ? { ok: true } : await envoyer({ de: sgn.email, to: dest.to, cc: dest.cc, objet, html, origine: "recouvrement-references" });
            if (res.ok) {
              R.demandes++; R.aIdentifier--;
              R.lignes[R.lignes.length - 1] = `Demande de références → ${nomPayeur} (${dest.to}) pour ${eur(c.montant)} du ${dateCourte(c.date)} — ${pourquoi}`;
              if (!dry && ligneId) await airtable("PATCH", `${T_ENCAISSEMENTS}/${ligneId}`, { fields: { Statut: "Demande envoyée", "Destinataire de la demande": dest.to, "Demande de références envoyée le": new Date().toISOString(),
                Journal: `${horodatageParis()} — ${pourquoi} ; demande de références envoyée à ${dest.to}${dest.cc ? ` (CC ${dest.cc})` : ""} depuis ${sgn.email}` }, typecast: true }).catch((e) => R.erreurs.push(`ligne Encaissements ${ligneId} non mise à jour après la demande (${message(e)})`));
            } else {
              R.erreurs.push(`demande de références non envoyée (${nomPayeur}) : ${"erreur" in res ? res.erreur : "refus du relais"} — le crédit reste « À identifier », aucun renvoi automatique`);
            }
          }
        }
      } catch (e) {
        R.erreurs.push(`${c.date} ${eur(c.montant)} : ${message(e)}`);
      }
    }
    // Chaque nouveau crédit est raconté dans #facturation, rapproché ou non : c'est la vérité
    // de Move in Paris sur les règlements, et aucun mouvement n'est rangé sans un mot.
    if (!dry && (R.nouveaux || R.erreurs.length)) {
      await slackRecouvrement(`:bank: *Encaissements* — ${R.nouveaux} nouveau(x) crédit(s) : ${R.rapproches} rapproché(s), ${R.partiels} partiel(s), ${R.historiques} créance(s) historique(s), ${R.demandes} demande(s) de références, ${R.aIdentifier} à identifier, ${R.horsClient} hors client.` +
        `${R.lignes.length ? `\n${R.lignes.map((l) => `• ${l}`).join("\n")}` : ""}${R.erreurs.length ? `\n:warning: ${R.erreurs.slice(0, 6).join("\n")}` : ""}`);
    }
    return R;
  } finally {
    if (!dry) await libererVerrou(VERROU_ENCAISSEMENTS);
  }
}

// Imputation d'un crédit sur une ou plusieurs factures de la plateforme.
async function appliquerRapprochement(c: Credit, r: Rapprochement, ouvertes: FactureOuverte[], sgn: Awaited<ReturnType<typeof signataireGuillaume>>, dry: boolean, R: RapportEncaissements) {
  // 1) Calcul complet AVANT toute écriture.
  const imput: Array<{ f: FactureOuverte; part: number; encaisse: number; reste: number; solde: boolean }> = [];
  for (let i = 0; i < r.factures.length; i++) {
    const f = r.factures[i];
    const part = arrondi(r.parts[i]);
    if (part <= 0) continue;
    const encaisse = arrondi(f.encaisse + part);
    const reste = arrondi(f.montant - f.credite - encaisse);
    imput.push({ f, part, encaisse, reste, solde: reste <= 0.009 });
  }
  if (!imput.length) return;
  const refs = imput.map((x) => x.f.numero).join(", ");
  const payeur = r.factures[0].client || r.factures[0].agence || r.factures[0].occupants || payeurDepuisLibelle(c.libelle);
  const methode = r.methode + (r.note ? ` — ${r.note}` : "");
  const totalParts = arrondi(imput.reduce((s, x) => s + x.part, 0));

  // 1 bis) Le même virement (montant + libellé) déjà inscrit dans le journal d'une de ces
  //    factures : un crédit réimporté sous un autre identifiant (ligne supprimée à la main,
  //    réimport Pennylane) ne s'impute pas deux fois. Il est rangé « À vérifier ».
  const empreinte = `${eur(c.montant)} · ${c.libelle.slice(0, 120)}`;
  const dejaVu = imput.filter((x) => texte(x.f.rec.fields["Journal"]).includes(empreinte));
  if (dejaVu.length) {
    R.erreurs.push(`${refs} : ce virement (${empreinte.slice(0, 80)}) figure déjà dans le journal de ${dejaVu.map((x) => x.f.numero).join(", ")} — non imputé, ligne « À vérifier »`);
    if (!dry) await airtable("POST", T_ENCAISSEMENTS, { records: [{ fields: {
      Encaissement: `${dateCourte(c.date)} · ${eur(c.montant)} · ${payeur}`, Date: c.date, Montant: c.montant, Compte: COMPTES[c.compte] || undefined,
      "Libellé bancaire": c.libelle, "Transaction Pennylane": c.id, Statut: "À vérifier", Payeur: payeur, Factures: imput.map((x) => x.f.rec.id),
      Journal: `${horodatageParis()} — Même virement déjà imputé sur ${dejaVu.map((x) => x.f.numero).join(", ")} (réimport ?) : non imputé, à contrôler à la main`,
    } }], typecast: true }).catch((e) => R.erreurs.push(`ligne « À vérifier » non créée : ${message(e)}`));
    return;
  }

  // 2) La ligne Encaissements d'abord : c'est la clé de déduplication. Un crédit rejoué (passe
  //    interrompue, chevauchement) trouve sa ligne et n'est plus jamais imputé deux fois.
  let ligneId = "";
  if (!dry) {
    const cree = await airtable("POST", T_ENCAISSEMENTS, { records: [{ fields: {
      Encaissement: `${dateCourte(c.date)} · ${eur(c.montant)} · ${payeur}`, Date: c.date, Montant: c.montant, Compte: COMPTES[c.compte] || undefined,
      "Libellé bancaire": c.libelle, "Transaction Pennylane": c.id, Statut: "Rapproché", Payeur: payeur, Factures: imput.map((x) => x.f.rec.id), "Méthode": methode,
      Journal: `${horodatageParis()} — ${refs} : ${methode} — imputation en cours`,
    } }], typecast: true });
    ligneId = idCree(cree);
  }
  // 3) Les factures en UNE requête : tout ou rien. Une écriture partielle laissait une facture
  //    « Payée » et les autres dues, avec le crédit perdu entre les deux.
  const records = imput.map((x) => ({
    id: x.f.rec.id,
    fields: {
      "Montant encaissé": x.encaisse, "Transaction Pennylane": transactionTexte(c),
      Journal: new Journal(x.f.rec.fields["Journal"]).ajouter(`${horodatageParis()} — Règlement détecté en banque : ${transactionTexte(c)} (${methode}) → ${x.solde ? "facture soldée" : `encaissé ${eur(x.encaisse)}, reste ${eur(x.reste)}`}`).texte(),
      ...(x.solde ? { Statut: "Payée", "Date de paiement": c.date } : {}),
    },
  }));
  try {
    if (!dry) await airtable("PATCH", T_FACTURES, { records, typecast: true });
  } catch (e) {
    R.erreurs.push(`${refs} : imputation NON écrite (${message(e)}) — ligne Encaissements « À vérifier », à imputer à la main`);
    if (!dry && ligneId) await airtable("PATCH", `${T_ENCAISSEMENTS}/${ligneId}`, { fields: { Statut: "À vérifier", Journal: `${horodatageParis()} — ${refs} : écriture des factures en échec (${message(e)}), imputation à refaire à la main` }, typecast: true }).catch(() => undefined);
    return;
  }
  // 4) Mémoire de la passe, compteurs, récit.
  for (const x of imput) {
    x.f.encaisse = x.encaisse; x.f.reste = x.reste;
    R.touchees[x.f.rec.id] = { encaisse: x.encaisse, solde: x.solde };
    if (x.solde) { const k = ouvertes.indexOf(x.f); if (k >= 0) ouvertes.splice(k, 1); }
    if (x.solde) R.rapproches++; else R.partiels++;
    R.lignes.push(`${x.solde ? "Rapproché" : "Partiel"} : ${x.f.numero} ${payeur} ← ${eur(x.part)} (${methode})${x.solde ? "" : ` — reste ${eur(x.reste)}`}`);
  }
  // 5) Relance ouverte sur chaque facture : on la solde, et on confirme la bonne réception de
  //    la PART imputée (jamais le virement entier : l'accusé de réception est un écrit).
  for (const x of imput) {
    try {
      const rel = await relanceDe(x.f.numero);
      if (!rel || texte(rel.fields["Statut"]) !== "En cours") continue;
      const relancee = !!texte(rel.fields["Relance 1 envoyée le"]);
      const champs: Dict = { "Montant encaissé": x.encaisse, Transaction: transactionTexte(c) };
      let ligne = `Règlement détecté : ${transactionTexte(c)} (part imputée ${eur(x.part)})`;
      if (x.solde) {
        Object.assign(champs, { "Étape": "Règlement reçu", Statut: "Réglée", "Règlement détecté le": c.date, "Prochaine action": `Aucune : réglée le ${dateCourte(c.date)}` });
        ligne += " → facture soldée, relance clôturée";
      } else {
        champs["Prochaine action"] = `Règlement partiel reçu : reste ${eur(x.reste)} — relances poursuivies sur le solde`;
      }
      if (x.solde && relancee && !texte(rel.fields["Confirmation envoyée le"])) {
        try {
          const ctx = await chargerContexte(x.f.rec);
          const to = texte(rel.fields["Destinataire"]).trim().toLowerCase() || emailContact(ctx.contact);
          const langue = langueDeRelance(rel.fields["Langue"]);
          if (to) {
            // Montant REÇU pour cette facture : la part imputée, moins la part de commission
            // écrite si le partenaire l'a retenue (l'accusé de réception dit ce que la banque a
            // reçu, jamais le reste dû brut).
            const recu = arrondi(x.part - (r.commission ? (r.commission * x.part) / totalParts : 0));
            const { objet, html } = emailConfirmation(ctx, { ...infoDe(ctx, x.f), reste: x.reste }, { date: c.date, montant: recu }, langue);
            const res = dry && !enModeTest() ? { ok: true } : await envoyer({ de: ctx.sgn.email, to, cc: texte(rel.fields["Copies"]), objet, html, origine: "recouvrement-confirmation" });
            if (res.ok) { champs["Confirmation envoyée le"] = new Date().toISOString(); ligne += ` ; confirmation de réception envoyée à ${to}`; R.confirmations++; }
            else ligne += ` ; confirmation NON envoyée (${"erreur" in res ? res.erreur : "refus du relais"})`;
          }
        } catch (e) { ligne += ` ; confirmation impossible : ${message(e)}`; }
      }
      champs.Journal = journalRelance(rel, ligne);
      if (!dry) await ecrireRelance(rel.id, champs);
    } catch (e) {
      R.erreurs.push(`${x.f.numero} : relance non mise à jour après règlement (${message(e)})`);
    }
  }
  // 6) Journal final de la ligne Encaissements.
  if (!dry && ligneId) await airtable("PATCH", `${T_ENCAISSEMENTS}/${ligneId}`, { fields: { Journal: `${horodatageParis()} — ${refs} : ${methode}${r.partiel ? " (partiel)" : ""}` }, typecast: true }).catch(() => undefined);
}

// Imputation d'un crédit sur une ou plusieurs créances d'AVANT la plateforme : la ligne
// Relances et la ligne Historique factures sont mises à jour, jamais une facture plateforme.
// Pas de confirmation email (ces créances n'ont pas de destinataire), Guillaume voit la ligne
// passer « Réglée » et le récit dans #facturation.
async function appliquerHistorique(c: Credit, h: RapprochementHistorique, historiques: CreanceHistorique[], dry: boolean, R: RapportEncaissements) {
  const imput = h.creances.map((x, i) => {
    const part = arrondi(h.parts[i]);
    const encaisse = arrondi(x.encaisse + part);
    const reste = arrondi(x.montant - encaisse);
    return { x, part, encaisse, reste, solde: reste <= 0.009 };
  }).filter((y) => y.part > 0);
  if (!imput.length) return;
  const refs = imput.map((y) => y.x.ref).join(", ");
  const payeur = h.creances[0].client || h.creances[0].occupant || payeurDepuisLibelle(c.libelle);
  const methode = `créance historique — ${h.methode}`;
  let ligneId = "";
  if (!dry) {
    const cree = await airtable("POST", T_ENCAISSEMENTS, { records: [{ fields: {
      Encaissement: `${dateCourte(c.date)} · ${eur(c.montant)} · ${payeur}`, Date: c.date, Montant: c.montant, Compte: COMPTES[c.compte] || undefined,
      "Libellé bancaire": c.libelle, "Transaction Pennylane": c.id, Statut: "Rapproché", Payeur: payeur, "Méthode": methode,
      Journal: `${horodatageParis()} — ${refs} : ${methode} — imputation en cours`,
    } }], typecast: true });
    ligneId = idCree(cree);
  }
  try {
    if (!dry) {
      await airtable("PATCH", T_RELANCES, { records: imput.map((y) => ({ id: y.x.rel.id, fields: {
        "Montant encaissé": y.encaisse, Transaction: transactionTexte(c),
        ...(y.solde ? { "Étape": "Règlement reçu", Statut: "Réglée", "Règlement détecté le": c.date, "Prochaine action": `Aucune : réglée le ${dateCourte(c.date)}` }
          : { "Prochaine action": `Règlement partiel reçu : reste ${eur(y.reste)}` }),
        Journal: journalRelance(y.x.rel, `Règlement détecté en banque : ${transactionTexte(c)} (${methode}) → ${y.solde ? "créance soldée" : `encaissé ${eur(y.encaisse)}, reste ${eur(y.reste)}`}`),
      } })), typecast: true });
      const hist = imput.filter((y) => y.x.factureHistId);
      if (hist.length) await airtable("PATCH", T_HISTORIQUE, { records: hist.map((y) => ({ id: y.x.factureHistId, fields: {
        "Montant encaissé": y.encaisse, "Reste dû": y.reste, "Encaissé le": c.date, "Libellé bancaire": c.libelle.slice(0, 250),
        Situation: y.solde ? "Payée" : "Partiellement payée",
      } })), typecast: true });
    }
  } catch (e) {
    R.erreurs.push(`${refs} : créance historique NON mise à jour (${message(e)}) — ligne Encaissements « À vérifier »`);
    if (!dry && ligneId) await airtable("PATCH", `${T_ENCAISSEMENTS}/${ligneId}`, { fields: { Statut: "À vérifier", Journal: `${horodatageParis()} — ${refs} : écriture en échec (${message(e)}), imputation à refaire à la main` }, typecast: true }).catch(() => undefined);
    return;
  }
  for (const y of imput) {
    y.x.encaisse = y.encaisse; y.x.reste = y.reste;
    if (y.solde) { const k = historiques.indexOf(y.x); if (k >= 0) historiques.splice(k, 1); }
    R.historiques++;
    R.lignes.push(`Rapproché (créance historique) : ${y.x.ref} ${payeur} ← ${eur(y.part)} (${h.methode})${y.solde ? "" : ` — reste ${eur(y.reste)}`}`);
  }
  if (!dry && ligneId) await airtable("PATCH", `${T_ENCAISSEMENTS}/${ligneId}`, { fields: { Journal: `${horodatageParis()} — ${refs} : ${methode}` }, typecast: true }).catch(() => undefined);
}

// ── PASSE 2 : RELANCES ──────────────────────────────────────────────────────
export type RapportRelances = {
  examinees: number; nonEchues: number; nouvelles: number; relance1: number; relance2: number; passeesJ14: number; regleesPennylane: number; regleesAirtable: number;
  annuleesPennylane: number; sansDateEnvoi: number; sansEmailEnvoye: number; sansDestinataire: number; exclues: number; enAttenteManuelle: number; digest: boolean; erreurs: string[]; lignes: string[];
};
export async function passeRelances(opts: { dry?: boolean } = {}): Promise<RapportRelances> {
  const dry = opts.dry === true;
  const R: RapportRelances = { examinees: 0, nonEchues: 0, nouvelles: 0, relance1: 0, relance2: 0, passeesJ14: 0, regleesPennylane: 0, regleesAirtable: 0, annuleesPennylane: 0, sansDateEnvoi: 0, sansEmailEnvoye: 0, sansDestinataire: 0, exclues: 0, enAttenteManuelle: 0, digest: false, erreurs: [], lignes: [] };
  const today = aujourdhui();
  const nouvellesJ14 = new Set<string>();

  // 1) Rien n'est relancé sans avoir relu la banque du jour. Si la banque n'a pas pu être lue
  //    (jeton, panne), la passe S'ARRÊTE : relancer à l'aveugle, c'est relancer un client qui a
  //    peut-être payé hier. En dry-run, rien n'est écrit : on reporte en mémoire ce que la passe
  //    aurait écrit, pour que l'aperçu soit fidèle.
  let touchees: RapportEncaissements["touchees"] = {};
  let aVerifier = new Set<string>();
  try {
    const enc = await passeEncaissements({ depuisJours: dry ? 45 : 4, dry });
    touchees = enc.touchees;
    aVerifier = new Set(enc.aVerifier);
    const verrou = enc.erreurs.find((e) => e.includes("verrou"));
    if (verrou) throw new Error(verrou);
    // Flux bancaire mort mais API vivante (consentement bancaire à renouveler chez Pennylane) :
    // aucun crédit depuis une semaine, ce n'est pas normal pour Move in Paris. On ne relance
    // pas des clients dont le règlement n'a peut-être pas été vu.
    if (!enc.dernierCredit || joursEntre(enc.dernierCredit, today) > FLUX_MORT_JOURS) throw new Error(`aucun crédit bancaire lu depuis ${enc.dernierCredit ? dateCourte(enc.dernierCredit) : "toujours"} : flux Pennylane/banque à vérifier`);
  } catch (e) {
    R.erreurs.push(`banque non relue : ${message(e)} — AUCUNE relance envoyée ce matin`);
    if (!dry) await slackRecouvrement(`:warning: *Relances du ${dateCourte(today)} suspendues* — ${message(e)}. Aucune relance n'est partie.`);
    return R;
  }
  if (!dry && !(await prendreVerrou(VERROU_RELANCES))) {
    R.erreurs.push("une autre passe de relances est en cours (verrou) : aucune relance envoyée par ce passage");
    return R;
  }
  try {

  // 2) Factures « Envoyée » de la plateforme, hors proformas et avoirs. Une facture sans date
  //    d'envoi n'est plus écartée en silence : la date du document Pennylane fait foi.
  const rows = await lireTable(T_FACTURES, `AND({Statut}='Envoyée', {Type}!='Avoir', {Mode facturation}!='Proforma', {Montant total HT}>1, {Sans relance}!=TRUE())`);
  const ouvertes = await facturesOuvertes();
  const parId = new Map(ouvertes.map((f) => [f.rec.id, f]));
  R.examinees = rows.length;
  for (const rec of rows) {
    // Absente de facturesOuvertes() = reste dû nul (encaissé + avoirs partiels ≥ montant) : réglée.
    const f = parId.get(rec.id) ?? { ...decrire(rec), reste: 0 };
    const t = touchees[rec.id];
    if (t) { f.encaisse = t.encaisse; f.reste = arrondi(f.montant - f.credite - t.encaisse); }
    try {
      if (f.loreal) { R.exclues++; continue; }                       // L'Oréal : hors circuit, à la main
      if (aVerifier.has(rec.id)) { R.exclues++; R.lignes.push(`Imputation à vérifier : ${f.numero} — un règlement est en attente de contrôle, pas de relance`); continue; }
      if (!texte(rec.fields["Email envoyé le"])) R.sansEmailEnvoye++;
      if (!f.dateEnvoi) {
        const plId0 = idDepuisLien(rec.fields["Lien Pennylane"]);
        const pl0 = plId0 ? await getFacture(plId0).catch(() => null) : null;
        const datePl = texte(pl0?.date).slice(0, 10);
        if (!datePl) { R.sansDateEnvoi++; R.lignes.push(`Sans date d'envoi ni date Pennylane : ${f.numero} ${f.client || f.agence || f.occupants} — à renseigner, jamais relancée`); continue; }
        f.dateEnvoi = datePl;
        if (!dry) await ecrireFacture(rec.id, { "Date d'envoi": datePl, Journal: new Journal(rec.fields["Journal"]).ajouter(`${horodatageParis()} — Date d'envoi absente : date de la facture Pennylane (${dateCourte(datePl)}) reprise par le cron relances`).texte() });
      }
      const echeance = plusJours(f.dateEnvoi, ECHEANCE_JOURS);
      const retard = joursEntre(echeance, today);
      if (retard < 1) { R.nonEchues++; continue; }

      // 3) Déjà réglée sans que la fiche le sache ? Airtable d'abord, Pennylane ensuite.
      if (f.reste <= 0.009) {
        if (!dry) await ecrireFacture(rec.id, { Statut: "Payée", Journal: new Journal(rec.fields["Journal"]).ajouter(`${horodatageParis()} — Montant encaissé (et avoirs partiels) ≥ montant : passée « Payée » par le cron relances`).texte() });
        await cloturerRelanceSiOuverte(f, "réglée (montant encaissé complet)", dry);
        R.regleesAirtable++; R.lignes.push(`Réglée (montant encaissé complet) : ${f.numero}`); continue;
      }
      const plId = idDepuisLien(rec.fields["Lien Pennylane"]);
      if (plId) {
        const pl = await getFacture(plId).catch(() => null);
        const plx = (pl ?? {}) as unknown as Dict;   // `paid` et `amount` existent dans la réponse, pas dans le type minimal PlFacture
        const statut = texte(pl?.status);
        // L'annulation se teste AVANT le paiement. Une facture annulée par un avoir a un reste à
        // payer nul : lue après coup, elle passait « Payée » avec le montant total encaissé
        // (prouvé le 06/09/2026 sur F-2026-09-0332 et 0335). Le même défaut avait déjà coûté
        // trois fausses « Payée » à AUTO-17 le 29/08 ; sa correction n'avait pas été reprise ici.
        if (pl && (statut === "cancelled" || statut === "credit_note" || statut === "archived")) {
          R.annuleesPennylane++;
          R.lignes.push(`Annulée côté Pennylane (${statut}) mais « Envoyée » dans Airtable : ${f.numero} ${f.client || f.agence || f.occupants} — statut à corriger, aucune relance`);
          continue;
        }
        // Le reste à payer doit être PRÉSENT et nul. Absent, on ne sait pas : on ne touche à rien.
        const restePl = pl?.remaining_amount_with_tax;
        const restePresent = restePl !== null && restePl !== undefined && String(restePl).trim() !== "" && Number.isFinite(Number(restePl));
        if (pl && (plx.paid === true || statut === "paid" || (restePresent && statut !== "draft" && nombre(restePl) === 0 && nombre(plx.amount) > 0))) {
          if (!dry) await ecrireFacture(rec.id, { Statut: "Payée", "Date de paiement": today, "Montant encaissé": arrondi(f.montant - f.credite), Journal: new Journal(rec.fields["Journal"]).ajouter(`${horodatageParis()} — Réglée selon Pennylane (lettrage manuel) : passée « Payée », aucune relance`).texte() });
          await cloturerRelanceSiOuverte(f, "réglée selon Pennylane (lettrage manuel)", dry);
          R.regleesPennylane++; R.lignes.push(`Réglée selon Pennylane (lettrage manuel) : ${f.numero} ${f.client || f.agence || f.occupants}`); continue;
        }
      }

      // 4) La ligne de relance, créée au premier retard.
      let rel = await relanceDe(f.numero);
      const base: Dict = {
        "Référence": f.numero, Facture: [rec.id], Client: f.client || f.agence || "", Occupant: f.occupants, "Montant dû": arrondi(f.montant - f.credite), "Montant encaissé": f.encaisse,
        "Date d'échéance": echeance, "Date d'envoi de la facture": f.dateEnvoi, "Facture Pennylane": texte(rec.fields["Lien Pennylane"]) || undefined,
      };
      if (!rel) {
        rel = dry
          ? ({ id: "dry", fields: { ...base, Statut: "En cours" } } as Rec)
          : await creerRelance({ ...base, Statut: "En cours", Journal: `${horodatageParis()} — Facture échue depuis ${retard} j (échéance ${dateCourte(echeance)}) : entrée dans le circuit de relance` });
        R.nouvelles++;
        if (dry) R.lignes.push(`[dry] nouvelle relance ${f.numero} (${retard} j de retard)`);
      }
      const rf = rel.fields;
      if (rf["Exclure des relances"] === true || texte(rf["Statut"]) !== "En cours") {
        if (!dry) await ecrireRelance(rel.id, { "Montant dû": base["Montant dû"], "Montant encaissé": f.encaisse });
        R.exclues++; continue;
      }
      const r1 = texte(rf["Relance 1 envoyée le"]).slice(0, 10), r2 = texte(rf["Relance 2 envoyée le"]).slice(0, 10);
      const etape = texte(rf["Étape"]);
      const champs: Dict = { ...base };
      let ligne = "";

      if (!r1 || (r1 && !r2 && joursEntre(r1, today) >= DELAI_RELANCE_JOURS)) {
        const niveau: 1 | 2 = r1 ? 2 : 1;
        const champHoro = niveau === 1 ? "Relance 1 envoyée le" : "Relance 2 envoyée le";
        const ctx = await chargerContexte(rec);
        const to = emailContact(ctx.contact);
        const cc = ctx.copies.map(emailContact).filter((x, i, a) => x && x !== to && a.indexOf(x) === i).join(",");
        const langue = texte(rf["Langue"]) ? langueDeRelance(rf["Langue"]) : langueRelance(ctx);
        const interne = /@move-in-paris\.com$/i.test(to);
        Object.assign(champs, { Destinataire: to && !interne ? to : undefined, Copies: cc, Langue: libelleLangue(langue) });
        if (!to || interne) {
          // Un contact interne (« Vincent Pro Forma ») n'est pas un client : la relance ne part pas,
          // et la facture est signalée jusqu'à ce qu'un vrai destinataire soit renseigné.
          R.sansDestinataire++;
          champs["Prochaine action"] = interne ? `Destinataire interne (${to}) sur la facture : renseigner le contact client, puis la relance partira` : "Destinataire email manquant sur la facture : à renseigner, puis la relance partira";
          ligne = `Relance ${niveau} impossible : ${interne ? `destinataire interne ${to}` : "aucun destinataire email"} sur la facture`;
          R.lignes.push(`Sans destinataire client : ${f.numero} ${f.client || f.agence || f.occupants}${interne ? ` (contact interne ${to})` : ""}`);
        } else {
          const { objet, html } = emailRelance(ctx, infoDe(ctx, f), niveau, langue, r1);
          const pj = await pdfFacture(rec, f.numeroPl || f.numero);
          const quand = new Date().toISOString();
          // L'horodatage est posé AVANT l'envoi. Si cette écriture échoue, rien ne part ; si
          // l'envoi échoue, on efface l'horodatage. Avant, l'horodatage était écrit après, et un
          // échec d'écriture faisait repartir le même email chaque matin.
          if (!dry) await ecrireRelance(rel.id, { [champHoro]: quand, Journal: journalRelance(rel, `Relance ${niveau} : envoi en cours vers ${to}`) });
          const res = dry && !enModeTest() ? { ok: true } : await envoyer({ de: ctx.sgn.email, to, cc, objet, html, origine: `recouvrement-relance-${niveau}`, attachments: pj ? [pj] : undefined });
          if (res.ok) {
            champs[champHoro] = quand;
            if (niveau === 1) { champs["Étape"] = "J+0 · 1re relance"; champs["Prochaine action"] = `2e relance automatique le ${dateCourte(plusJours(today, DELAI_RELANCE_JOURS))} sans règlement`; R.relance1++; }
            else { champs["Étape"] = "J+7 · 2e relance"; champs["Prochaine action"] = `Relance manuelle par Guillaume à partir du ${dateCourte(plusJours(today, DELAI_RELANCE_JOURS))} sans règlement`; R.relance2++; }
            ligne = `Relance ${niveau} envoyée à ${to}${cc ? ` (CC ${cc})` : ""} depuis ${ctx.sgn.email}, réponses vers ${GUILLAUME}${pj ? ", PDF joint" : ", sans PDF (introuvable)"} — retard ${retard} j, reste ${eur(f.reste)}`;
            R.lignes.push(`R${niveau} ${f.numero} ${f.client || f.agence || f.occupants} → ${to}`);
          } else {
            // Un refus NET du relais (4xx, réponse « ok:false ») : l'email n'est pas parti, on efface
            // l'horodatage, nouvel essai demain. Un échec AMBIGU (5xx, coupure, réponse illisible) :
            // l'email est peut-être parti après remise au serveur, on GARDE l'horodatage et on le
            // dit ; une personne vérifie plutôt que le client reçoive deux fois le même rappel.
            const erreur = "erreur" in res ? String(res.erreur) : "refus du relais";
            const ambigu = /relais 5\d\d|fetch failed|timeout|ECONN|socket|Unexpected token|network/i.test(erreur);
            if (ambigu) {
              champs[champHoro] = quand;
              ligne = `Relance ${niveau} : envoi INCERTAIN (${erreur}) — horodatage conservé, pas de renvoi automatique, à vérifier dans la boîte d'envoi`;
            } else {
              champs[champHoro] = null;
              ligne = `Relance ${niveau} NON envoyée : ${erreur} (nouvel essai au prochain passage)`;
            }
            R.erreurs.push(`${f.numero} : ${ligne}`);
          }
        }
      } else if (r2 && etape !== "J+14 · relance manuelle" && joursEntre(r2, today) >= DELAI_RELANCE_JOURS) {
        champs["Étape"] = "J+14 · relance manuelle";
        champs["Prochaine action"] = "Relance manuelle (appel ou email personnel de Guillaume), puis cocher « Relance 3 faite »";
        ligne = `Deux relances sans règlement : passage en relance manuelle (retard ${retard} j, reste ${eur(f.reste)})`;
        nouvellesJ14.add(rel.id); R.passeesJ14++;
      } else if (etape === "J+14 · relance manuelle" && rf["Relance 3 faite"] === true) {
        champs["Prochaine action"] = `Relance manuelle faite${texte(rf["Relance 3 faite le"]) ? ` le ${dateCourte(texte(rf["Relance 3 faite le"]))}` : ""} : en attente du règlement`;
      } else if (r1 && !r2) {
        champs["Prochaine action"] = `2e relance automatique le ${dateCourte(plusJours(r1, DELAI_RELANCE_JOURS))} sans règlement`;
      } else if (r2 && etape !== "J+14 · relance manuelle") {
        champs["Prochaine action"] = `Relance manuelle par Guillaume à partir du ${dateCourte(plusJours(r2, DELAI_RELANCE_JOURS))} sans règlement`;
      }
      if (ligne) champs.Journal = journalRelance(rel, ligne);
      if (!dry) await ecrireRelance(rel.id, champs);
    } catch (e) {
      R.erreurs.push(`${f.numero} : ${message(e)}`);
    }
  }

  // 5) Relances encore « En cours » dont la facture plateforme est sortie du circuit : payée ou
  //    créditée à la main, passée « Sans relance », ou supprimée. Avant, seule « Payée » clôturait :
  //    une facture annulée par un avoir gardait sa relance ouverte à vie, et Guillaume recevait
  //    chaque lundi l'ordre de réclamer une facture que Move in Paris avait elle-même annulée.
  try {
    const encours = await lireTable(T_RELANCES, `{Statut}='En cours'`);
    for (const rel of encours) {
      const facId = premier(rel.fields["Facture"]);
      if (!facId) continue;   // créance d'avant la plateforme : réglée par la passe encaissements ou à la main
      // lireEnregistrement rend null sur TOUTE erreur (503 comme 404) : une panne Airtable
      // passagère aurait clôturé la relance d'une facture bien vivante « supprimée ». On ne
      // conclut à la suppression que sur une recherche qui, elle, lève en cas de panne.
      const fac = (await lireTable(T_FACTURES, `RECORD_ID()='${facId}'`))[0] ?? null;
      const statut = texte(fac?.fields["Statut"]);
      const motif = !fac ? "facture supprimée d'Airtable" : statut === "Payée" ? "facture passée « Payée » dans Airtable" : statut === "Avoir" ? "facture annulée par un avoir" : fac.fields["Sans relance"] === true ? "facture passée « Sans relance »" : "";
      if (!motif) continue;
      const champs: Dict = { "Étape": statut === "Payée" ? "Règlement reçu" : "Clôturée", Statut: statut === "Payée" ? "Réglée" : "Clôturée à la main", "Prochaine action": `Aucune : ${motif}`, Journal: journalRelance(rel, `Clôturée : ${motif}`) };
      if (statut === "Payée") { champs["Montant encaissé"] = arrondi(nombre(fac?.fields["Montant encaissé"])); if (!texte(rel.fields["Règlement détecté le"])) champs["Règlement détecté le"] = today; }
      if (!dry) await ecrireRelance(rel.id, champs);
      R.regleesAirtable++; R.lignes.push(`Relance clôturée : ${texte(rel.fields["Référence"])} — ${motif}`);
    }
  } catch (e) { R.erreurs.push(`clôture des relances : ${message(e)}`); }

  // 6) Digest HTML à Guillaume : les relances manuelles à faire, hors exclusions, hors L'Oréal,
  //    échues seulement. Dès qu'il y en a une nouvelle, et chaque lundi pour mémoire.
  try {
    const j14 = (await lireTable(T_RELANCES, `AND({Statut}='En cours', {Étape}='J+14 · relance manuelle', {Relance 3 faite}!=TRUE(), {Exclure des relances}!=TRUE())`))
      .filter((r) => !estLoreal(r.fields["Client"]) && (!texte(r.fields["Date d'échéance"]) || texte(r.fields["Date d'échéance"]).slice(0, 10) < today));
    R.enAttenteManuelle = j14.length;
    const lundi = new Date().getUTCDay() === 1;
    if (j14.length && (nouvellesJ14.size || lundi)) {
      const lignes: LigneDigest[] = j14.map((r) => ({
        id: r.id, reference: texte(r.fields["Référence"]), client: texte(r.fields["Client"]), occupant: texte(r.fields["Occupant"]),
        reste: arrondi(nombre(r.fields["Montant dû"]) - nombre(r.fields["Montant encaissé"])), echeance: texte(r.fields["Date d'échéance"]),
        retard: texte(r.fields["Date d'échéance"]) ? joursEntre(texte(r.fields["Date d'échéance"]), today) : 0,
        destinataire: texte(r.fields["Destinataire"]) || (premier(r.fields["Facture historique"]) ? "contact : voir la fiche client" : ""),
        relance1: dateCourte(texte(r.fields["Relance 1 envoyée le"])), relance2: dateCourte(texte(r.fields["Relance 2 envoyée le"])),
        pennylane: texte(r.fields["Facture Pennylane"]), nouvelle: nouvellesJ14.has(r.id),
      })).sort((a, b) => b.reste - a.reste);
      const sgn = await signataireGuillaume();
      const { objet, html } = emailDigestGuillaume(lignes, URL_PAGE_RELANCES, sgn);
      const res = dry && !enModeTest() ? { ok: true } : await envoyer({ de: sgn.email, to: GUILLAUME, objet, html, origine: "recouvrement-digest" });
      if (res.ok) R.digest = true; else R.erreurs.push(`digest Guillaume non envoyé : ${"erreur" in res ? res.erreur : "refus du relais"}`);
    }
  } catch (e) { R.erreurs.push(`digest : ${message(e)}`); }

  // Compte rendu du matin dans #facturation, même sans relance : l'encours manuel et les
  // anomalies (annulées chez Pennylane, sans date, sans destinataire) y sont chaque jour.
  if (!dry) {
    const annulees = R.lignes.filter((l) => l.startsWith("Annulée côté Pennylane"));
    const sansDate = R.lignes.filter((l) => l.startsWith("Sans date d'envoi"));
    const enAttente = j14Montant(await lireTable(T_RELANCES, `AND({Statut}='En cours', {Étape}='J+14 · relance manuelle', {Relance 3 faite}!=TRUE(), {Exclure des relances}!=TRUE())`).then((rs) => rs.filter((r) => !estLoreal(r.fields["Client"]))));
    await slackRecouvrement(`:incoming_envelope: *Relances du ${dateCourte(today)}* — ${R.examinees} facture(s) examinée(s) : ${R.relance1} première(s), ${R.relance2} seconde(s), ${R.passeesJ14} passée(s) en manuel${R.digest ? " (digest envoyé à Guillaume)" : ""}, ${R.regleesPennylane + R.regleesAirtable} réglée(s) ou clôturée(s) sans relance, ${R.nonEchues} pas encore échue(s). ` +
      `En attente de relance manuelle : ${enAttente.n} dossier(s), ${eur(enAttente.total)}.` +
      `${annulees.length ? `\n:x: ${annulees.length} facture(s) annulée(s) chez Pennylane mais encore « Envoyée » dans Airtable, à corriger à la main :\n${annulees.map((l) => `• ${l}`).join("\n")}` : ""}` +
      `${sansDate.length ? `\n:grey_question: ${sansDate.map((l) => `• ${l}`).join("\n")}` : ""}` +
      `${R.sansDestinataire ? `\n:grey_question: ${R.sansDestinataire} facture(s) échue(s) sans destinataire client : relance impossible tant que le contact n'est pas renseigné\n${R.lignes.filter((l) => l.startsWith("Sans destinataire")).map((l) => `• ${l}`).join("\n")}` : ""}` +
      `${R.lignes.some((l) => l.startsWith("Imputation à vérifier")) ? `\n:grey_question: ${R.lignes.filter((l) => l.startsWith("Imputation à vérifier")).map((l) => `• ${l}`).join("\n")}` : ""}` +
      `${R.erreurs.length ? `\n:warning: ${R.erreurs.slice(0, 6).join("\n")}` : ""}`);
  }
  return R;
  } finally {
    if (!dry) await libererVerrou(VERROU_RELANCES);
  }
}
const FLUX_MORT_JOURS = Number(process.env.RECOUVREMENT_FLUX_MORT_JOURS || 7);
const j14Montant = (rows: Rec[]) => ({ n: rows.length, total: arrondi(rows.reduce((s, r) => s + nombre(r.fields["Montant dû"]) - nombre(r.fields["Montant encaissé"]), 0)) });

async function cloturerRelanceSiOuverte(f: FactureOuverte, motif: string, dry: boolean, rel?: Rec | null) {
  const r = rel ?? (await relanceDe(f.numero));
  if (!r || texte(r.fields["Statut"]) !== "En cours") return;
  const champs: Dict = { "Étape": "Règlement reçu", Statut: "Réglée", "Montant encaissé": arrondi(f.montant - f.credite), "Prochaine action": `Aucune : ${motif}`, Journal: journalRelance(r, `Clôturée : ${motif}`) };
  if (!texte(r.fields["Règlement détecté le"])) champs["Règlement détecté le"] = aujourdhui();
  if (!dry) await ecrireRelance(r.id, champs);
}

export { monitoring, sa, echapper, estLoreal };

// ── Aperçu des gabarits (mode test uniquement) ──────────────────────────────
// Envoie à l'adresse de test un exemplaire de chaque email du circuit, construit sur une
// vraie facture ouverte : 1re relance, 2e relance, confirmation de règlement, demande de
// références, digest Guillaume. Rien n'est écrit. Refuse de tourner hors mode test.
export async function apercuGabarits(): Promise<string[]> {
  const test = destinataireTestActuel();
  if (!test) return ["aperçu refusé : aucune adresse de test dans le contexte de la requête"];
  const out: string[] = [];
  const rows = await lireTable(T_FACTURES, `AND({Statut}='Envoyée', {Type}!='Avoir', {Mode facturation}!='Proforma', {Montant total HT}>1, {Date d'envoi}!='')`);
  const cand = rows.map(decrire).filter((f) => !f.loreal).sort((a, b) => a.dateEnvoi.localeCompare(b.dateEnvoi))[0];
  if (!cand) return ["aucune facture ouverte pour construire l'aperçu"];
  const ctx = await chargerContexte(cand.rec);
  const langue = langueRelance(ctx);
  const autre: Langue = langue === "fr_FR" ? "en_GB" : "fr_FR";
  const info = infoDe(ctx, cand);
  const pj = await pdfFacture(cand.rec, cand.numeroPl || cand.numero);
  const to = emailContact(ctx.contact) || "destinataire@exemple.com";
  const sgn = await signataireGuillaume();
  const envois: Array<[string, { objet: string; html: string }, string]> = [
    ["1re relance", emailRelance(ctx, info, 1, langue), to],
    ["2e relance", emailRelance(ctx, { ...info, retard: info.retard + DELAI_RELANCE_JOURS }, 2, langue, aujourdhui()), to],
    ["confirmation de règlement", emailConfirmation(ctx, { ...info, reste: 0 }, { date: aujourdhui(), montant: cand.reste }, langue), to],
    ["demande de références", emailDemandeReferences({ type: "Client final", rec: cand.rec, nom: cand.client || cand.occupants, loreal: false, sur: true },
      { id: "apercu", date: aujourdhui(), montant: cand.reste, libelle: "VIR SEPA RECU /FRM EXEMPLE /RNF SANS REFERENCE", compte: "1848853" }, texte(ctx.contact?.fields["Prénom"]).split(/\s+/)[0], langue, sgn), to],
    [`1re relance (${autre === "fr_FR" ? "français" : "anglais"})`, emailRelance(ctx, info, 1, autre), to],
    [`2e relance (${autre === "fr_FR" ? "français" : "anglais"})`, emailRelance(ctx, { ...info, retard: info.retard + DELAI_RELANCE_JOURS }, 2, autre, aujourdhui()), to],
    ["digest Guillaume", emailDigestGuillaume([{ id: cand.rec.id, reference: cand.numero, client: cand.client || cand.agence, occupant: cand.occupants, reste: cand.reste, echeance: info.echeance, retard: info.retard + 14, destinataire: to, relance1: dateCourte(plusJours(aujourdhui(), -14)), relance2: dateCourte(plusJours(aujourdhui(), -7)), pennylane: texte(cand.rec.fields["Lien Pennylane"]), nouvelle: true }], URL_PAGE_RELANCES, sgn), GUILLAUME],
  ];
  // En aperçu, l'expéditeur est toujours une autre boîte que celle qui reçoit : un message
  // envoyé de soi à soi est parfois filtré ou rangé ailleurs par la messagerie.
  const de = test === ctx.sgn.email ? (test === GUILLAUME ? "vincent@move-in-paris.com" : GUILLAUME) : ctx.sgn.email;
  for (const [nom, e, dest] of envois) {
    // Sept emails d'affilée vers la même boîte : on espace les envois, certains serveurs
    // entrants écartent une rafale venant du même expéditeur.
    await new Promise((r) => setTimeout(r, 2000));
    const res = await envoyer({ de, to: dest, objet: `[APERÇU ${nom}] ${e.objet}`, html: e.html, origine: "recouvrement-apercu", attachments: nom.includes("relance") && pj ? [pj] : undefined });
    out.push(`${nom} : ${res.ok ? "envoyé" : `échec (${res.erreur})`} (facture ${cand.numero}, ${langue === "fr_FR" ? "français" : "anglais"})`);
  }
  return out;
}
