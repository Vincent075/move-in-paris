import { NextResponse } from "next/server";
import { lireEnregistrement, lireTable, slack, texte, type Rec } from "@/lib/mip/courrier";
import { getFacture, idDepuisLien, PennylaneError } from "@/lib/mip/pennylane";
import {
  chargerContexte, creerAvoir, deverrouillerFiche, ecrireFacture, emettre, horodatageParis, Journal, journaliserMonitoring,
  preparerAvoir, renvoyerEmail, SLACK_FACTURATION, T_FACTURES, verifier, verrouillerFiche, type Chemin,
} from "@/lib/mip/facturation";

// Émission des factures et des avoirs depuis Airtable (réécriture du 03/09/2026, GO de Vincent).
//
// La version du 31/08 savait créer la facture Pennylane et rien d'autre : ni PDF, ni
// archive S3, ni email, ni avoir, ni verrou — et elle marquait quand même « Envoyée ».
// Celle-ci ne décide de rien : toute la logique est dans src/lib/mip/facturation.ts.
// Elle choisit les lignes, pose les verrous, appelle le bon mode et rend compte.
//
// QUATRE ÉTATS RÉVEILLENT LA ROUTE, et aucun workflow Tech Tribe ne les écrit :
//   A. « Vérification demandée » cochée      → aperçu dans « Journal », case décochée ;
//   B. Statut « A envoyer » sans lien         → émission (chaîne AUTO-16 ou directe) ;
//   C. « Créer un avoir » cochée              → avoir total / partiel, ou suppression du brouillon ;
//   D. « Email envoyé le » vide + « Envoyer par email » + lien → (re)envoi de l'email.
// Réveil : le webhook Airtable de la table Factures (dans la seconde) ; cron */10 en filet.
//
// IDEMPOTENCE : verrou par fiche dans Monitoring (protocole de checkin-finalisation) +
// « Émission en cours depuis » posé sur la ligne + GET Pennylane par external_reference
// avant tout POST, avec adoption. Une ligne « A envoyer » dont le verrou a plus de
// 10 min sans lien n'est JAMAIS relancée : elle repasse « À préparer » avec un message.
//
// MODES DE TEST :
//   ?ligne=recX&simulation=1  → tout calcule et écrit le Journal, n'émet rien
//                               (&mode=avoir : prépare l'avoir sans cocher la case) ;
//   ?ligne=recX               → traite cette ligne selon son état (A, B, C ou D) ;
//   ?simulation=1             → passage à blanc sur toutes les candidates ;
//   ?sonde=1&facture=<id>     → renvoie l'objet Pennylane brut (lecture seule, recette).

export const dynamic = "force-dynamic";
export const maxDuration = 300;

// Une facture émise ne se rattrape pas : jamais beaucoup d'un coup.
const MAX_PAR_PASSAGE = 5;
const VERROU_LIGNE_MS = 10 * 60 * 1000;
// Erreurs successives (5xx, réseau, Airtable) tolérées sur une même ligne avant de la
// sortir de la file : sans plafond, une erreur qui se reproduit à l'identique serait
// rejouée 144 fois par jour avec un Slack et une ligne Monitoring à chaque passage.
const MAX_TENTATIVES = 3;
// Nombre de tentatives déjà notées dans le Journal pour ce mode (marqueur « ERREUR (mode n/3) »),
// depuis le dernier abandon : une relance à la main après correction repart de zéro.
const MARQUE_ABANDON = "relancer à la main";
function tentativesJournal(journal: string, mode: Mode): number {
  const lignes = journal.split("\n");
  const dernierAbandon = lignes.map((l, i) => (l.includes(MARQUE_ABANDON) ? i : -1)).filter((i) => i >= 0).pop() ?? -1;
  let max = 0;
  for (const l of lignes.slice(dernierAbandon + 1)) {
    const m = new RegExp(`ERREUR \\(${mode} (\\d+)/${MAX_TENTATIVES}`).exec(l);
    if (m) max = Math.max(max, Number(m[1]));
  }
  return max;
}

type Mode = "verification" | "emission" | "avoir" | "renvoi" | "rien";
const ageMs = (v: unknown) => { const t = Date.parse(texte(v)); return Number.isFinite(t) ? Date.now() - t : Number.POSITIVE_INFINITY; };

// L'état de la ligne décide du mode. Ordre volontaire : un avoir demandé prime sur un
// renvoi d'email ; une vérification ne se fait que si rien d'autre n'est demandé.
function modeDe(f: Rec["fields"]): Mode {
  const lien = !!idDepuisLien(f["Lien Pennylane"]);
  if (f["Créer un avoir"] === true && texte(f["Type"]) === "Facture" && lien) return "avoir";
  if (texte(f["Statut"]) === "A envoyer" && !lien && texte(f["Type"]) !== "Avoir") return "emission";
  if (f["Envoyer par email"] === true && lien && !texte(f["Email envoyé le"])
    && ((texte(f["Type"]) === "Facture" && ["Envoyée", "Payée"].includes(texte(f["Statut"]))) || (texte(f["Type"]) === "Avoir" && texte(f["Statut"]) === "Avoir"))) return "renvoi";
  if (f["Vérification demandée"] === true) return "verification";
  return "rien";
}

export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const url = new URL(request.url);
  const ligne = url.searchParams.get("ligne") || "";
  const simulation = url.searchParams.get("simulation") === "1";
  if (!process.env.PENNYLANE_API_KEY_FACTURATION && !process.env.PENNYLANE_API_KEY) return NextResponse.json({ ok: false, erreur: "PENNYLANE_API_KEY absente" }, { status: 500 });

  // Sonde de recette : l'objet Pennylane brut, sans rien écrire nulle part.
  if (url.searchParams.get("sonde") === "1") {
    const id = url.searchParams.get("facture") || "";
    if (!/^\d+$/.test(id)) return NextResponse.json({ ok: false, erreur: "paramètre facture=<id Pennylane numérique> attendu" }, { status: 400 });
    try { return NextResponse.json({ ok: true, facture: await getFacture(id) }); }
    catch (e) { return NextResponse.json({ ok: false, erreur: e instanceof Error ? e.message : String(e) }, { status: 502 }); }
  }

  const faits: string[] = [];
  const refus: string[] = [];
  const ignorees: string[] = [];
  const compte = { verifications: 0, emissions: 0, avoirs: 0, renvois: 0 };
  let candidats: Array<{ rec: Rec; mode: Mode }> = [];
  try {
    if (ligne) {
      const rec = await lireEnregistrement(T_FACTURES, ligne);
      if (!rec) return NextResponse.json({ ok: false, erreur: `ligne ${ligne} introuvable` }, { status: 404 });
      // Une ligne visée à la main : son état décide. En simulation on vérifie, ou on
      // prépare un avoir si « &mode=avoir » est passé (cocher la case déclencherait le
      // webhook, donc l'avoir réel : la simulation d'avoir ne peut pas passer par elle).
      const m = modeDe(rec.fields);
      const modeSimu: Mode = url.searchParams.get("mode") === "avoir" || m === "avoir" ? "avoir" : "verification";
      candidats = [{ rec, mode: simulation ? modeSimu : (m === "rien" ? "verification" : m) }];
    } else {
      const [verifs, emissions, avoirs, renvois] = await Promise.all([
        lireTable(T_FACTURES, "{Vérification demandée}=1"),
        lireTable(T_FACTURES, "AND({Statut}='A envoyer', {Lien Pennylane}=BLANK(), {Type}!='Avoir')"),
        lireTable(T_FACTURES, "AND({Créer un avoir}=1, {Type}='Facture', {Lien Pennylane}!='')"),
        lireTable(T_FACTURES, "AND({Email envoyé le}=BLANK(), {Envoyer par email}=1, {Lien Pennylane}!='', "
          + "OR(AND({Type}='Facture', OR({Statut}='Envoyée', {Statut}='Payée')), AND({Type}='Avoir', {Statut}='Avoir')))"),
      ]);
      const vus = new Set<string>();
      const pousser = (liste: Rec[], mode: Mode) => { for (const r of liste) if (!vus.has(r.id)) { vus.add(r.id); candidats.push({ rec: r, mode }); } };
      pousser(avoirs, "avoir"); pousser(emissions, "emission"); pousser(renvois, "renvoi"); pousser(verifs, "verification");
    }

    let ecritures = 0;
    for (const { rec, mode } of candidats) {
      if (mode !== "verification" && ecritures >= MAX_PAR_PASSAGE) { ignorees.push(`${texte(rec.fields["Numéro facture"]) || rec.id} — reporté au passage suivant (quota ${MAX_PAR_PASSAGE})`); continue; }
      const num = texte(rec.fields["Numéro facture"]) || rec.id;
      let verrou: string | null = null;
      let chemin: Chemin | null = null; // connu après la vérification, lu dans le catch
      try {
        // ── Simulation : tout calcule, écrit le Journal, n'émet rien ─────────────
        if (simulation) {
          const ctx = await chargerContexte(rec);
          // Le Journal s'AJOUTE toujours : sur une facture déjà émise, le remplacer
          // effacerait la seule trace de l'émission (client créé, id Pennylane, email).
          if (mode === "avoir") {
            const plan = await preparerAvoir(ctx);
            const journal = new Journal(ctx.f["Journal"]).ajouter(`SIMULATION — ${plan.journal}`);
            await ecrireFacture(rec.id, { Journal: journal.texte() });
            (plan.ok ? faits : refus).push(`• ${num} — ${plan.journal.split("\n")[0]}`);
          } else {
            const v = await verifier(ctx, false);
            const journal = new Journal(ctx.f["Journal"]).ajouter(`SIMULATION — ${v.journal}`);
            await ecrireFacture(rec.id, { Journal: journal.texte(), ...ctx.deductions });
            (v.ok ? faits : refus).push(`• ${num} — ${v.ok ? `prête (${v.chemin})` : v.blocages.join(" · ")}`);
          }
          compte.verifications++;
          continue;
        }

        // ── Verrou par fiche, puis relecture sous verrou ─────────────────────────
        verrou = await verrouillerFiche(rec.id);
        if (!verrou) { ignorees.push(`${num} — un autre passage la traite`); continue; }
        const relu = await lireEnregistrement(T_FACTURES, rec.id);
        if (!relu) throw new Error("relecture impossible, reporté au prochain passage");
        const modeRelu = ligne ? mode : modeDe(relu.fields);
        if (modeRelu !== mode && !ligne) { ignorees.push(`${num} — état changé entre-temps (${modeRelu})`); continue; }
        const verrouLigne = relu.fields["Émission en cours depuis"];
        // Un verrou de ligne récent = une autre exécution est dessus (email en cours
        // d'envoi, par exemple) : on passe. Périmé : un avoir ou un renvoi reprend sans
        // risque (référence Pennylane adoptée, « Email envoyé le » relu) ; une émission,
        // JAMAIS — voir ci-dessous.
        if (mode !== "verification" && verrouLigne && ageMs(verrouLigne) < VERROU_LIGNE_MS) { ignorees.push(`${num} — traitement en cours depuis moins de 10 min`); continue; }
        if (mode === "emission" && verrouLigne) {
          // Verrou périmé sans lien : on ne relance JAMAIS (la chaîne AUTO-16 n'a pas
          // d'external_reference, un second appel pourrait créer un second document).
          const journal = new Journal(relu.fields["Journal"]).ajouter(`${horodatageParis()} — Émission interrompue il y a plus de 10 min sans lien Pennylane : remise « À préparer ». Vérifier dans Pennylane qu'aucune facture n'existe avant de renvoyer.`);
          await ecrireFacture(rec.id, { Statut: "À préparer", "Émission en cours depuis": null, Journal: journal.texte() });
          refus.push(`• ${num} — émission interrompue (verrou > 10 min) : vérifier dans Pennylane avant de renvoyer`);
          ecritures++;
          continue;
        }
        if (mode !== "verification") await ecrireFacture(rec.id, { "Émission en cours depuis": new Date().toISOString() });
        const ctx = await chargerContexte(relu);

        if (mode === "verification") {
          const v = await verifier(ctx, false);
          await ecrireFacture(rec.id, { Journal: new Journal(ctx.f["Journal"]).ajouter(v.journal).texte(), "Vérification demandée": false, ...ctx.deductions });
          compte.verifications++;
          (v.ok ? faits : refus).push(`• ${num} — vérification : ${v.ok ? `prête à émettre (${v.chemin === "auto16" ? "chaîne AUTO-16" : "émission directe"})` : v.blocages.join(" · ")}`);
        } else if (mode === "emission") {
          const v = await verifier(ctx, true);
          chemin = v.chemin;
          const r = await emettre(ctx, v);
          ecritures++; compte.emissions++;
          if (r.ok) faits.push(`• ${r.resume}${r.accrocs.length ? ` — :warning: ${r.accrocs.join(" · ")}` : ""}`);
          else { refus.push(`• ${num} — ${r.resume}`); await journaliserMonitoring("refus", "ALERTE", `${num} — ${r.resume}`); }
        } else if (mode === "avoir") {
          const plan = await preparerAvoir(ctx);
          const r = await creerAvoir(ctx, plan);
          ecritures++; compte.avoirs++;
          (r.ok ? faits : refus).push(`• ${r.resume}${r.accrocs.length ? ` — :warning: ${r.accrocs.join(" · ")}` : ""}`);
        } else if (mode === "renvoi") {
          const r = await renvoyerEmail(ctx);
          ecritures++; compte.renvois++;
          (r.ok ? faits : refus).push(`• ${r.resume}`);
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        // Deux familles d'erreurs. Un 4xx Pennylane (hors 429 : 422 champ refusé, 404…)
        // se reproduira à l'identique au passage suivant : la ligne sort de la file tout
        // de suite (« À préparer » / case décochée) avec le motif. Un 5xx, une coupure
        // réseau ou une erreur Airtable méritent une reprise (le GET par external_reference
        // adopte une facture déjà créée), mais pas plus de MAX_TENTATIVES fois.
        const definitive = e instanceof PennylaneError && e.status >= 400 && e.status < 500 && e.status !== 429;
        // Chaîne AUTO-16 appelée sans lien posé : on ne sait pas si un document existe.
        // Le verrou reste : la règle des 10 min rendra la ligne « À préparer » avec la
        // consigne de vérifier dans Pennylane, sans jamais la relancer.
        const chaineIndeterminee = mode === "emission" && chemin === "auto16";
        let sortie = "";
        try {
          const relu = await lireEnregistrement(T_FACTURES, rec.id);
          const journalTexte = texte(relu?.fields["Journal"]);
          const n = tentativesJournal(journalTexte, mode) + 1;
          const abandon = (definitive || n >= MAX_TENTATIVES) && !chaineIndeterminee;
          const champs: Rec["fields"] = {};
          if (abandon) {
            if (mode === "emission") { champs.Statut = "À préparer"; sortie = "remise « À préparer »"; }
            else if (mode === "avoir") { champs["Créer un avoir"] = false; sortie = "case « Créer un avoir » décochée"; }
            else if (mode === "renvoi") { champs["Envoyer par email"] = false; sortie = "case « Envoyer par email » décochée"; }
          }
          const consigne = abandon
            ? `${definitive ? "erreur définitive (Pennylane refuse la demande)" : `${n} tentatives`} : ${sortie || "abandon"} — corriger la cause puis relancer à la main`
            : chaineIndeterminee ? "verrou conservé, VÉRIFIER DANS PENNYLANE avant tout renvoi" : "nouvel essai au passage suivant";
          const journal = new Journal(journalTexte).ajouter(`${horodatageParis()} — ERREUR (${mode} ${n}/${MAX_TENTATIVES}) : ${msg.slice(0, 400)} — ${consigne}`);
          await ecrireFacture(rec.id, {
            ...champs, Journal: journal.texte(),
            ...(chaineIndeterminee ? {} : { "Émission en cours depuis": null }),
            ...(mode === "verification" ? { "Vérification demandée": false } : {}),
          });
        } catch { /* le Journal attendra */ }
        refus.push(`• ${num} — ${msg}${sortie ? ` — ${sortie}` : ""}`);
        await journaliserMonitoring("refus", "ALERTE", `${num} — ${mode} : ${msg.slice(0, 400)}${sortie ? ` — ${sortie}` : ""}`);
      } finally {
        if (verrou) await deverrouillerFiche(verrou);
      }
    }

    if (!simulation && (faits.length || refus.length)) {
      await slack(SLACK_FACTURATION, [
        faits.length ? `:receipt: *Facturation depuis Airtable*\n${faits.join("\n")}` : "",
        refus.length ? `:warning: *Facture(s) non traitée(s) — à corriger*\n${refus.join("\n")}` : "",
      ].filter(Boolean).join("\n\n"));
    }
    return NextResponse.json({
      ok: true, simulation, ligne: ligne || null, candidats: candidats.length, compte,
      faits, refus, ignorees, restantes: ignorees.filter((x) => x.includes("quota")).length,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (!simulation) await slack(SLACK_FACTURATION, `:rotating_light: *Route facture-emettre en échec* : ${msg}`);
    return NextResponse.json({ ok: false, erreur: msg }, { status: 500 });
  }
}
