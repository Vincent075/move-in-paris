// Les deux passes du recouvrement : ENCAISSEMENTS (banque → factures) et RELANCES.
// Chaque passe est idempotente et tolère l'interruption : rien n'est envoyé deux fois
// (horodatages écrits AVANT toute autre écriture), rien n'est deviné (un crédit sans
// correspondance sûre reste « À identifier »), et une facture n'est relancée qu'après
// trois vérifications : banque du jour, Pennylane (lettrage manuel), Airtable (statut).
import {
  T_FACTURES, T_RELANCES, T_ENCAISSEMENTS, COMPTES, BASE_ID, GUILLAUME, ECHEANCE_JOURS, DELAI_RELANCE_JOURS,
  lireCredits, horsClient, facturesOuvertes, decrire, rapprocher, chargerAnnuaire, reconnaitrePayeur, contactsDuPayeur,
  emailRelance, emailConfirmation, emailDemandeReferences, emailDigestGuillaume, envoyer, signataireGuillaume, slackRecouvrement,
  relanceDe, ecrireRelance, creerRelance, journalRelance, infoDe, monitoring, enModeTest, pdfFacture, eur, dateCourte, plusJours, joursEntre, aujourdhui, sa, mots,
  nombre, arrondi, echapper, estLoreal,
  chargerContexte, langueDe, horodatageParis, Journal, ecrireFacture, texte, premier, liens, lireTable, lireEnregistrement, airtable,
  type Credit, type FactureOuverte, type Rapprochement, type Annuaire, type LigneDigest, type Rec, type Dict, type Langue,
} from "./recouvrement";
import { getFacture, idDepuisLien } from "./pennylane";

// Page « Relances » de l'interface Opérations (remplie après création de la page).
export const PAGE_RELANCES = process.env.AIRTABLE_PAGE_RELANCES || "pagS3GPr1tDKdmpZv";
export const URL_PAGE_RELANCES = `https://airtable.com/${BASE_ID}/${PAGE_RELANCES}`;
export const DEMANDES_REFERENCES_A_PARTIR_DU = process.env.RECOUVREMENT_DEMANDES_DEPUIS || "2026-10-01";

const langueDeRelance = (v: unknown): Langue => (texte(v) === "Anglais" ? "en_GB" : "fr_FR");
const libelleLangue = (l: Langue) => (l === "fr_FR" ? "Français" : "Anglais");
const transactionTexte = (c: Credit) => `${dateCourte(c.date)} · ${eur(c.montant)} · ${c.libelle.slice(0, 120)}`;
const payeurDepuisLibelle = (l: string) => {
  const m = /\/FRM\s+(.+?)\s*\/EID/i.exec(l) || /\/ORIG\s+(.+?)\s*\/MOTIF/i.exec(l) || /\/DE\s+(.+?)\//i.exec(l) || /^1\/COSMOPOLITAN[^/]*\/URI\/([A-Z .'-]+)/i.exec(l);
  return (m ? m[1] : l.split(" - ")[0]).replace(/\s+/g, " ").trim().slice(0, 60);
};
const emailContact = (c: Rec | null) => texte(c?.fields["Email"]).trim().toLowerCase();

export type RapportEncaissements = {
  lus: number; nouveaux: number; rapproches: number; partiels: number; demandes: number; aIdentifier: number; horsClient: number;
  confirmations: number; erreurs: string[]; lignes: string[];
  touchees: Record<string, { encaisse: number; solde: boolean }>;   // factures modifiées (ou qui le seraient, en dry-run)
};

// ── PASSE 1 : ENCAISSEMENTS ─────────────────────────────────────────────────
export async function passeEncaissements(opts: { depuisJours?: number; dry?: boolean } = {}): Promise<RapportEncaissements> {
  const depuisJours = opts.depuisJours ?? 10;
  const dry = opts.dry === true;
  const R: RapportEncaissements = { lus: 0, nouveaux: 0, rapproches: 0, partiels: 0, demandes: 0, aIdentifier: 0, horsClient: 0, confirmations: 0, erreurs: [], lignes: [], touchees: {} };
  const depuis = plusJours(aujourdhui(), -depuisJours);
  const credits = await lireCredits(depuis);
  R.lus = credits.length;
  const deja = new Set(
    (await lireTable(T_ENCAISSEMENTS, `IS_AFTER({Date}, DATEADD(TODAY(), -${depuisJours + 3}, 'days'))`)).map((r) => texte(r.fields["Transaction Pennylane"])).filter(Boolean),
  );
  const nouveaux = credits.filter((c) => c.id && !deja.has(c.id));
  R.nouveaux = nouveaux.length;
  if (!nouveaux.length) return R;
  const ouvertes = await facturesOuvertes();
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
      if (horsClient(c)) {
        R.horsClient++;
        await creerEncaissement(c, { Statut: "Hors client", Payeur: payeurDepuisLibelle(c.libelle), Journal: `${horodatageParis()} — Mouvement hors règlement client (règle automatique)` });
        continue;
      }
      const r = rapprocher(c, ouvertes);
      if (r) {
        await appliquerRapprochement(c, r, ouvertes, sgn, dry, R);
        continue;
      }
      // Aucune facture reconnue : on identifie le payeur et on lui demande ses références,
      // sauf L'Oréal (Vincent gère à la main) et sauf s'il n'a aucune facture ouverte
      // (un acompte pour une réservation à venir n'appelle pas de question).
      annuaire = annuaire ?? (await chargerAnnuaire());
      const p = reconnaitrePayeur(c, annuaire);
      const nomPayeur = p?.nom || payeurDepuisLibelle(c.libelle);
      const aDesFactures = p ? ouvertes.some((f) => [f.client, f.agence, f.occupants].some((x) => x && [...mots(p.nom)].every((w) => mots(x).has(w)))) : false;
      // Période de transition : jusqu'au 30/09/2026, des règlements de factures de l'ancien
      // système (hors plateforme) arrivent encore. On ne demande ses références à un client
      // qu'à partir d'octobre — avant, un crédit non reconnu reste « À identifier » (Slack).
      if (p && !p.loreal && aDesFactures && c.date >= DEMANDES_REFERENCES_A_PARTIR_DU) {
        const dest = await contactsDuPayeur(p);
        if (dest.to) {
          const { objet, html } = emailDemandeReferences(p, c, dest.prenom, dest.langue, sgn);
          const res = dry && !enModeTest() ? { ok: true } : await envoyer({ de: sgn.email, to: dest.to, cc: dest.cc, objet, html, origine: "recouvrement-references" });
          if (res.ok) {
            R.demandes++;
            R.lignes.push(`Demande de références → ${nomPayeur} (${dest.to}) pour ${eur(c.montant)} du ${dateCourte(c.date)}`);
            await creerEncaissement(c, { Statut: "Demande envoyée", Payeur: nomPayeur, "Destinataire de la demande": dest.to, "Demande de références envoyée le": new Date().toISOString(),
              Journal: `${horodatageParis()} — Aucune facture ouverte au montant : demande de références envoyée à ${dest.to}${dest.cc ? ` (CC ${dest.cc})` : ""} depuis ${sgn.email}` });
            continue;
          }
          R.erreurs.push(`demande de références non envoyée (${nomPayeur}) : ${"erreur" in res ? res.erreur : "refus du relais"}`);
        }
      }
      R.aIdentifier++;
      R.lignes.push(`À identifier : ${eur(c.montant)} le ${dateCourte(c.date)} — ${c.libelle.slice(0, 70)}`);
      await creerEncaissement(c, { Statut: "À identifier", Payeur: nomPayeur,
        Journal: `${horodatageParis()} — Aucune facture ouverte ne correspond${p ? ` ; payeur reconnu : ${p.nom}${p.loreal ? " (L'Oréal : traitement manuel)" : aDesFactures ? "" : " (aucune facture ouverte à son nom)"}` : " ; payeur inconnu"}` });
    } catch (e) {
      R.erreurs.push(`${c.date} ${eur(c.montant)} : ${e instanceof Error ? e.message : String(e)}`);
    }
  }
  if (!dry && (R.aIdentifier || R.demandes)) {
    await slackRecouvrement(`:bank: *Encaissements* — ${R.rapproches} rapproché(s), ${R.partiels} partiel(s), ${R.demandes} demande(s) de références, ${R.aIdentifier} à identifier.\n${R.lignes.filter((l) => l.startsWith("À identifier") || l.startsWith("Demande")).map((l) => `• ${l}`).join("\n")}`);
  }
  return R;
}

async function appliquerRapprochement(c: Credit, r: Rapprochement, ouvertes: FactureOuverte[], sgn: Awaited<ReturnType<typeof signataireGuillaume>>, dry: boolean, R: RapportEncaissements) {
  const ids: string[] = [];
  for (let i = 0; i < r.factures.length; i++) {
    const f = r.factures[i];
    const part = arrondi(r.parts[i]);
    if (part <= 0) continue;   // imputation dans l'ordre : le virement était épuisé avant cette facture
    const encaisse = arrondi(f.encaisse + part);
    const reste = arrondi(f.montant - encaisse);
    const solde = reste <= 0.009;
    const journal = new Journal(f.rec.fields["Journal"]).ajouter(
      `${horodatageParis()} — Règlement détecté en banque : ${transactionTexte(c)} (${r.methode}${r.note ? ` ; ${r.note}` : ""}) → ${solde ? "facture soldée" : `encaissé ${eur(encaisse)}, reste ${eur(reste)}`}`);
    if (!dry) {
      await ecrireFacture(f.rec.id, {
        "Montant encaissé": encaisse, "Transaction Pennylane": transactionTexte(c), Journal: journal.texte(),
        ...(solde ? { Statut: "Payée", "Date de paiement": c.date } : {}),
      });
    }
    f.encaisse = encaisse; f.reste = reste;
    R.touchees[f.rec.id] = { encaisse, solde };
    if (solde) { const k = ouvertes.indexOf(f); if (k >= 0) ouvertes.splice(k, 1); }
    ids.push(f.rec.id);
    if (solde) R.rapproches++; else R.partiels++;
    R.lignes.push(`${solde ? "Rapproché" : "Partiel"} : ${f.numero} ${f.client || f.agence || f.occupants} ← ${eur(part)} (${r.methode})`);
    // Relance ouverte sur cette facture : on la solde et on confirme la bonne réception.
    const rel = await relanceDe(f.numero);
    if (rel && texte(rel.fields["Statut"]) === "En cours") {
      const relancee = !!texte(rel.fields["Relance 1 envoyée le"]);
      const champs: Dict = { "Montant encaissé": encaisse, Transaction: transactionTexte(c) };
      let ligne = `Règlement détecté : ${transactionTexte(c)}`;
      if (solde) {
        Object.assign(champs, { "Étape": "Règlement reçu", Statut: "Réglée", "Règlement détecté le": c.date, "Prochaine action": `Aucune : réglée le ${dateCourte(c.date)}` });
        ligne += " → facture soldée, relance clôturée";
      } else {
        champs["Prochaine action"] = `Règlement partiel reçu : reste ${eur(reste)} — relances poursuivies sur le solde`;
      }
      if (solde && relancee && !texte(rel.fields["Confirmation envoyée le"])) {
        try {
          const ctx = await chargerContexte(f.rec);
          const to = texte(rel.fields["Destinataire"]).trim().toLowerCase() || emailContact(ctx.contact);
          const langue = langueDeRelance(rel.fields["Langue"]);
          if (to) {
            const { objet, html } = emailConfirmation(ctx, { ...infoDe(ctx, f), reste }, { date: c.date, montant: c.montant }, langue);
            const res = dry && !enModeTest() ? { ok: true } : await envoyer({ de: ctx.sgn.email, to, cc: texte(rel.fields["Copies"]), objet, html, origine: "recouvrement-confirmation" });
            if (res.ok) { champs["Confirmation envoyée le"] = new Date().toISOString(); ligne += ` ; confirmation de réception envoyée à ${to}`; R.confirmations++; }
            else ligne += ` ; confirmation NON envoyée (${"erreur" in res ? res.erreur : "refus du relais"})`;
          }
        } catch (e) { ligne += ` ; confirmation impossible : ${e instanceof Error ? e.message : e}`; }
      }
      champs.Journal = journalRelance(rel, ligne);
      if (!dry) await ecrireRelance(rel.id, champs);
    }
  }
  if (!dry) {
    await airtable("POST", T_ENCAISSEMENTS, { records: [{ fields: {
      Encaissement: `${dateCourte(c.date)} · ${eur(c.montant)} · ${r.factures[0].client || r.factures[0].agence || r.factures[0].occupants || payeurDepuisLibelle(c.libelle)}`,
      Date: c.date, Montant: c.montant, Compte: COMPTES[c.compte] || undefined, "Libellé bancaire": c.libelle, "Transaction Pennylane": c.id,
      Statut: "Rapproché", Payeur: r.factures[0].client || r.factures[0].agence || r.factures[0].occupants || payeurDepuisLibelle(c.libelle),
      Factures: ids, "Méthode": r.methode + (r.note ? ` — ${r.note}` : ""),
      Journal: `${horodatageParis()} — ${r.factures.map((f) => f.numero).join(", ")} : ${r.methode}${r.partiel ? " (partiel)" : ""}`,
    } }], typecast: true });
  }
}

// ── PASSE 2 : RELANCES ──────────────────────────────────────────────────────
export type RapportRelances = {
  examinees: number; nonEchues: number; nouvelles: number; relance1: number; relance2: number; passeesJ14: number; regleesPennylane: number; regleesAirtable: number;
  sansEmailEnvoye: number; sansDestinataire: number; exclues: number; digest: boolean; erreurs: string[]; lignes: string[];
};
export async function passeRelances(opts: { dry?: boolean } = {}): Promise<RapportRelances> {
  const dry = opts.dry === true;
  const R: RapportRelances = { examinees: 0, nonEchues: 0, nouvelles: 0, relance1: 0, relance2: 0, passeesJ14: 0, regleesPennylane: 0, regleesAirtable: 0, sansEmailEnvoye: 0, sansDestinataire: 0, exclues: 0, digest: false, erreurs: [], lignes: [] };
  const today = aujourdhui();
  const nouvellesJ14 = new Set<string>();

  // 1) Rien n'est relancé sans avoir relu la banque du jour. En dry-run, rien n'est écrit :
  //    on reporte en mémoire ce que la passe aurait écrit, pour que l'aperçu soit fidèle.
  let touchees: RapportEncaissements["touchees"] = {};
  try { touchees = (await passeEncaissements({ depuisJours: dry ? 45 : 4, dry })).touchees; } catch (e) { R.erreurs.push(`banque non relue : ${e instanceof Error ? e.message : e}`); }

  // 2) Factures « Envoyée » de la plateforme, hors proformas et avoirs.
  const rows = await lireTable(T_FACTURES, `AND({Statut}='Envoyée', {Type}!='Avoir', {Mode facturation}!='Proforma', {Montant total HT}>1, {Sans relance}!=TRUE(), {Date d'envoi}!='')`);
  R.examinees = rows.length;
  for (const rec of rows) {
    const f = decrire(rec);
    const t = touchees[rec.id];
    if (t) { f.encaisse = t.encaisse; f.reste = arrondi(f.montant - t.encaisse); }
    try {
      if (f.loreal) { R.exclues++; continue; }                       // L'Oréal : hors circuit, à la main
      // Les factures d'août sont parties par l'ancienne chaîne n8n, sans horodatage dans
      // Airtable : l'absence d'« Email envoyé le » est comptée, pas bloquante. Le PDF est
      // joint à chaque relance, le client a donc toujours la facture sous les yeux.
      if (!texte(rec.fields["Email envoyé le"])) R.sansEmailEnvoye++;
      if (!f.dateEnvoi) {
        // Facture importée de Pennylane sans date d'envoi : la date du document fait foi.
        const plId0 = idDepuisLien(rec.fields["Lien Pennylane"]);
        const pl0 = plId0 ? await getFacture(plId0).catch(() => null) : null;
        const datePl = texte(pl0?.date).slice(0, 10);
        if (!datePl) continue;
        f.dateEnvoi = datePl;
        if (!dry) await ecrireFacture(rec.id, { "Date d'envoi": datePl, Journal: new Journal(rec.fields["Journal"]).ajouter(`${horodatageParis()} — Date d'envoi absente : date de la facture Pennylane (${dateCourte(datePl)}) reprise par le cron relances`).texte() });
      }
      const echeance = plusJours(f.dateEnvoi, ECHEANCE_JOURS);
      const retard = joursEntre(echeance, today);
      if (retard < 1) { R.nonEchues++; continue; }

      // 3) Déjà réglée sans que la fiche le sache ? Airtable d'abord, Pennylane ensuite.
      if (f.reste <= 0.009) {
        if (!dry) await ecrireFacture(rec.id, { Statut: "Payée", Journal: new Journal(rec.fields["Journal"]).ajouter(`${horodatageParis()} — Montant encaissé ≥ montant : passée « Payée » par le cron relances`).texte() });
        await cloturerRelanceSiOuverte(f, "réglée (montant encaissé complet)", dry);
        R.regleesAirtable++; R.lignes.push(`Réglée (montant encaissé complet) : ${f.numero}`); continue;
      }
      const plId = idDepuisLien(rec.fields["Lien Pennylane"]);
      if (plId) {
        const pl = await getFacture(plId).catch(() => null);
        const plx = (pl ?? {}) as unknown as Dict;   // `paid` et `amount` existent dans la réponse, pas dans le type minimal PlFacture
        const statut = texte(pl?.status);
        if (pl && (plx.paid === true || statut === "paid" || (statut !== "draft" && nombre(pl.remaining_amount_with_tax) === 0 && nombre(plx.amount) > 0))) {
          if (!dry) await ecrireFacture(rec.id, { Statut: "Payée", "Date de paiement": today, "Montant encaissé": f.montant, Journal: new Journal(rec.fields["Journal"]).ajouter(`${horodatageParis()} — Réglée selon Pennylane (lettrage manuel) : passée « Payée », aucune relance`).texte() });
          await cloturerRelanceSiOuverte(f, "réglée selon Pennylane (lettrage manuel)", dry);
          R.regleesPennylane++; R.lignes.push(`Réglée selon Pennylane (lettrage manuel) : ${f.numero} ${f.client || f.agence || f.occupants}`); continue;
        }
        if (statut === "cancelled") { R.exclues++; continue; }
      }

      // 4) La ligne de relance, créée au premier retard.
      let rel = await relanceDe(f.numero);
      const base: Dict = {
        "Référence": f.numero, Facture: [rec.id], Client: f.client || f.agence || "", Occupant: f.occupants, "Montant dû": f.montant, "Montant encaissé": f.encaisse,
        "Date d'échéance": echeance, "Date d'envoi de la facture": f.dateEnvoi, "Facture Pennylane": texte(rec.fields["Lien Pennylane"]) || undefined,
      };
      if (!rel) {
        // En dry-run la ligne n'est pas créée : on la simule pour dérouler (et prévisualiser) la suite.
        rel = dry
          ? ({ id: "dry", fields: { ...base, Statut: "En cours" } } as Rec)
          : await creerRelance({ ...base, Statut: "En cours", Journal: `${horodatageParis()} — Facture échue depuis ${retard} j (échéance ${dateCourte(echeance)}) : entrée dans le circuit de relance` });
        R.nouvelles++;
        if (dry) R.lignes.push(`[dry] nouvelle relance ${f.numero} (${retard} j de retard)`);
      }
      const rf = rel.fields;
      if (rf["Exclure des relances"] === true || texte(rf["Statut"]) !== "En cours") {
        if (!dry) await ecrireRelance(rel.id, { "Montant dû": f.montant, "Montant encaissé": f.encaisse });
        R.exclues++; continue;
      }
      const r1 = texte(rf["Relance 1 envoyée le"]).slice(0, 10), r2 = texte(rf["Relance 2 envoyée le"]).slice(0, 10);
      const etape = texte(rf["Étape"]);
      const champs: Dict = { ...base };
      let ligne = "";

      if (!r1 || (r1 && !r2 && joursEntre(r1, today) >= DELAI_RELANCE_JOURS)) {
        const niveau: 1 | 2 = r1 ? 2 : 1;
        const ctx = await chargerContexte(rec);
        const to = emailContact(ctx.contact);
        const cc = ctx.copies.map(emailContact).filter((x, i, a) => x && x !== to && a.indexOf(x) === i).join(",");
        const langue = texte(rf["Langue"]) ? langueDeRelance(rf["Langue"]) : langueDe(ctx);
        Object.assign(champs, { Destinataire: to || undefined, Copies: cc, Langue: libelleLangue(langue) });
        if (!to) {
          R.sansDestinataire++;
          champs["Prochaine action"] = "Destinataire email manquant sur la facture : à renseigner, puis la relance partira";
          ligne = `Relance ${niveau} impossible : aucun destinataire email sur la facture`;
        } else {
          const { objet, html } = emailRelance(ctx, infoDe(ctx, f), niveau, langue, r1);
          const pj = await pdfFacture(rec, f.numeroPl || f.numero);
          const res = dry && !enModeTest() ? { ok: true } : await envoyer({ de: ctx.sgn.email, to, cc, objet, html, origine: `recouvrement-relance-${niveau}`, attachments: pj ? [pj] : undefined });
          if (res.ok) {
            const quand = new Date().toISOString();
            if (niveau === 1) { champs["Relance 1 envoyée le"] = quand; champs["Étape"] = "J+0 · 1re relance"; champs["Prochaine action"] = `2e relance automatique le ${dateCourte(plusJours(today, DELAI_RELANCE_JOURS))} sans règlement`; R.relance1++; }
            else { champs["Relance 2 envoyée le"] = quand; champs["Étape"] = "J+7 · 2e relance"; champs["Prochaine action"] = `Relance manuelle par Guillaume à partir du ${dateCourte(plusJours(today, DELAI_RELANCE_JOURS))} sans règlement`; R.relance2++; }
            ligne = `Relance ${niveau} envoyée à ${to}${cc ? ` (CC ${cc})` : ""} depuis ${ctx.sgn.email}, réponses vers ${GUILLAUME}${pj ? ", PDF joint" : ", sans PDF (introuvable)"} — retard ${retard} j, reste ${eur(f.reste)}`;
            R.lignes.push(`R${niveau} ${f.numero} ${f.client || f.agence || f.occupants} → ${to}`);
          } else {
            ligne = `Relance ${niveau} NON envoyée : ${"erreur" in res ? res.erreur : "refus du relais"} (nouvel essai au prochain passage)`;
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
      R.erreurs.push(`${f.numero} : ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  // 5) Relances encore « En cours » dont la facture est passée « Payée » à la main : on clôture.
  try {
    const ouvertes = await lireTable(T_RELANCES, `{Statut}='En cours'`);
    for (const rel of ouvertes) {
      const fac = await lireEnregistrement(T_FACTURES, premier(rel.fields["Facture"]));
      if (fac && texte(fac.fields["Statut"]) === "Payée") {
        const f = decrire(fac);
        await cloturerRelanceSiOuverte(f, "facture passée « Payée » dans Airtable", dry, rel);
        R.regleesAirtable++;
      }
    }
  } catch (e) { R.erreurs.push(`clôture des relances réglées : ${e instanceof Error ? e.message : e}`); }

  // 6) Digest HTML à Guillaume : les J+14 non faites — dès qu'il y en a une nouvelle, et chaque lundi pour mémoire.
  try {
    const j14 = await lireTable(T_RELANCES, `AND({Statut}='En cours', {Étape}='J+14 · relance manuelle', {Relance 3 faite}!=TRUE())`);
    const lundi = new Date().getUTCDay() === 1;
    if (j14.length && (nouvellesJ14.size || lundi)) {
      const lignes: LigneDigest[] = j14.map((r) => ({
        id: r.id, reference: texte(r.fields["Référence"]), client: texte(r.fields["Client"]), occupant: texte(r.fields["Occupant"]),
        reste: arrondi(nombre(r.fields["Montant dû"]) - nombre(r.fields["Montant encaissé"])), echeance: texte(r.fields["Date d'échéance"]),
        retard: texte(r.fields["Date d'échéance"]) ? joursEntre(texte(r.fields["Date d'échéance"]), today) : 0, destinataire: texte(r.fields["Destinataire"]),
        relance1: dateCourte(texte(r.fields["Relance 1 envoyée le"])), relance2: dateCourte(texte(r.fields["Relance 2 envoyée le"])),
        pennylane: texte(r.fields["Facture Pennylane"]), nouvelle: nouvellesJ14.has(r.id),
      })).sort((a, b) => b.reste - a.reste);
      const sgn = await signataireGuillaume();
      const { objet, html } = emailDigestGuillaume(lignes, URL_PAGE_RELANCES, sgn);
      const res = dry && !enModeTest() ? { ok: true } : await envoyer({ de: sgn.email, to: GUILLAUME, objet, html, origine: "recouvrement-digest" });
      if (res.ok) R.digest = true; else R.erreurs.push(`digest Guillaume non envoyé : ${"erreur" in res ? res.erreur : "refus du relais"}`);
    }
  } catch (e) { R.erreurs.push(`digest : ${e instanceof Error ? e.message : e}`); }

  if (!dry && (R.relance1 || R.relance2 || R.passeesJ14 || R.erreurs.length)) {
    await slackRecouvrement(`:incoming_envelope: *Relances du ${dateCourte(today)}* — ${R.relance1} première(s), ${R.relance2} seconde(s), ${R.passeesJ14} passée(s) en manuel${R.digest ? " (digest envoyé à Guillaume)" : ""}, ${R.regleesPennylane + R.regleesAirtable} réglée(s) sans relance.${R.erreurs.length ? `\n:warning: ${R.erreurs.slice(0, 5).join("\n")}` : ""}`);
  }
  return R;
}

async function cloturerRelanceSiOuverte(f: FactureOuverte, motif: string, dry: boolean, rel?: Rec | null) {
  const r = rel ?? (await relanceDe(f.numero));
  if (!r || texte(r.fields["Statut"]) !== "En cours") return;
  const champs: Dict = { "Étape": "Règlement reçu", Statut: "Réglée", "Montant encaissé": f.montant, "Prochaine action": `Aucune : ${motif}`, Journal: journalRelance(r, `Clôturée : ${motif}`) };
  if (!texte(r.fields["Règlement détecté le"])) champs["Règlement détecté le"] = aujourdhui();
  if (!dry) await ecrireRelance(r.id, champs);
}

export { monitoring, sa, echapper, estLoreal };

// ── Aperçu des gabarits (mode test uniquement) ──────────────────────────────
// Envoie à l'adresse de test un exemplaire de chaque email du circuit, construit sur une
// vraie facture ouverte : 1re relance, 2e relance, confirmation de règlement, demande de
// références, digest Guillaume. Rien n'est écrit.
export async function apercuGabarits(): Promise<string[]> {
  const out: string[] = [];
  const rows = await lireTable(T_FACTURES, `AND({Statut}='Envoyée', {Type}!='Avoir', {Mode facturation}!='Proforma', {Montant total HT}>1, {Date d'envoi}!='')`);
  const cand = rows.map(decrire).filter((f) => !f.loreal).sort((a, b) => a.dateEnvoi.localeCompare(b.dateEnvoi))[0];
  if (!cand) return ["aucune facture ouverte pour construire l'aperçu"];
  const ctx = await chargerContexte(cand.rec);
  const langue = langueDe(ctx);
  const info = infoDe(ctx, cand);
  const pj = await pdfFacture(cand.rec, cand.numeroPl || cand.numero);
  const to = emailContact(ctx.contact) || "destinataire@exemple.com";
  const sgn = await signataireGuillaume();
  const envois: Array<[string, { objet: string; html: string }, string]> = [
    ["1re relance", emailRelance(ctx, info, 1, langue), to],
    ["2e relance", emailRelance(ctx, { ...info, retard: info.retard + DELAI_RELANCE_JOURS }, 2, langue, aujourdhui()), to],
    ["confirmation de règlement", emailConfirmation(ctx, { ...info, reste: 0 }, { date: aujourdhui(), montant: cand.reste }, langue), to],
    ["demande de références", emailDemandeReferences({ type: "Client final", rec: cand.rec, nom: cand.client || cand.occupants, loreal: false },
      { id: "apercu", date: aujourdhui(), montant: cand.reste, libelle: "VIR SEPA RECU /FRM EXEMPLE /RNF SANS REFERENCE", compte: "1848853" }, texte(ctx.contact?.fields["Prénom"]).split(/\s+/)[0], langue, sgn), to],
    ["digest Guillaume", emailDigestGuillaume([{ id: cand.rec.id, reference: cand.numero, client: cand.client || cand.agence, occupant: cand.occupants, reste: cand.reste, echeance: info.echeance, retard: info.retard + 14, destinataire: to, relance1: dateCourte(plusJours(aujourdhui(), -14)), relance2: dateCourte(plusJours(aujourdhui(), -7)), pennylane: texte(cand.rec.fields["Lien Pennylane"]), nouvelle: true }], URL_PAGE_RELANCES, sgn), GUILLAUME],
  ];
  for (const [nom, e, dest] of envois) {
    const res = await envoyer({ de: ctx.sgn.email, to: dest, objet: `[APERÇU ${nom}] ${e.objet}`, html: e.html, origine: "recouvrement-apercu", attachments: nom.includes("relance") && pj ? [pj] : undefined });
    out.push(`${nom} : ${res.ok ? "envoyé" : `échec (${res.erreur})`} (facture ${cand.numero}, ${langue === "fr_FR" ? "français" : "anglais"})`);
  }
  return out;
}
