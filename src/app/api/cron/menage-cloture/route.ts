import { NextResponse } from "next/server";
import {
  airtable, lireTable, lireEnregistrement, signataire, htmlEmailLocataire, envoyerEmailLocataire, slack,
} from "@/lib/mip/courrier";
import { texte, nombre, liens, jourParis, jjmmaaaa, dateLongue } from "@/lib/mip/conges";

export const dynamic = "force-dynamic";
export const maxDuration = 240;

// Clôture d'un ménage (04/09/2026, demande de Vincent).
//
// Deux choses se déclenchent quand un ménage passe à « Terminé » :
//   1. DES PHOTOS OU DES DÉGÂTS, quel que soit le type de ménage → alerte à Guillaume.
//      Une photo prise pendant un ménage veut dire un dommage : elle ne doit pas dormir
//      dans Airtable en attendant que quelqu'un pense à regarder.
//   2. UN MÉNAGE DE DÉPART → compte rendu à Guillaume avec le décompte d'électricité.
//      L'objectif est de refacturer la surconsommation du locataire sortant sans avoir à
//      rouvrir trois fiches : le calcul est fait et posé dans l'email.
//
// Le relevé d'ARRIVÉE vit sur la fiche Check-in de la réservation ; le relevé de DÉPART
// est saisi sur le ménage. La provision est celle de l'appartement, au prorata des jours
// du séjour (choix de Vincent).

const T_MENAGES = "tblVE8HEtnuTeCi8r";
const T_CHECKIN = "tbl8SktZKbyopdQ7l";
const T_RESAS = "tbl5uN32egP4YCvUi";
const T_APPARTS = "tbltFlpzQWXjoWg88";
const GUILLAUME = "Guillaume@move-in-paris.com";
const SLACK_ADMIN = "C0BUW51AU77";
const MAX_PAR_PASSAGE = 5;
// Rien d'antérieur à la mise en service n'est un ménage « à clôturer » : sans cette
// barrière, le premier passage enverrait un compte rendu pour chaque ménage déjà terminé.
const MISE_EN_SERVICE = "2026-09-04T12:00:00.000Z";
const PIECE_JOINTE_MAX = 8 * 1024 * 1024;

// Prix du kWh : tarif réglementé EDF « Tarif Bleu », option Heures Creuses, identique de
// 3 à 36 kVA. Relevé le 04/09/2026 sur la grille officielle
// https://particulier.edf.fr/content/dam/2-Actifs/Documents/Offres/Grille_prix_Tarif_Bleu.pdf
// applicable au 1er août 2026 : 21,42 cts TTC en heures pleines, 15,89 en heures creuses.
// Les valeurs vivent dans Vercel pour être changées sans redéployer. Le tarif bouge deux
// fois par an, au 1er février et au 1er août : le watchdog le rappelle (voir contrôle
// « Tarif du kWh »). Sans valeur, le compte rendu donne les kWh et dit qu'il ne chiffre pas.
const PRIX_HC = Number(process.env.PRIX_KWH_HEURES_CREUSES || 0);
const PRIX_HP = Number(process.env.PRIX_KWH_HEURES_PLEINES || 0);
const DATE_GRILLE = process.env.PRIX_KWH_DATE_GRILLE || "";

const eur = (v: number) => `${v.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
const kwh = (v: number) => `${v.toLocaleString("fr-FR", { maximumFractionDigits: 0 })} kWh`;
const joursEntre = (a: string, b: string) => {
  if (!a || !b) return 0;
  return Math.max(0, Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86400000));
};

type Piece = { name: string; contentType: string; base64: string };
async function telecharger(photos: { url?: string; filename?: string; type?: string; size?: number }[]): Promise<{ pieces: Piece[]; ignorees: string[] }> {
  const pieces: Piece[] = [];
  const ignorees: string[] = [];
  let total = 0;
  for (const p of photos) {
    if (!p.url) continue;
    if (total + (p.size ?? 0) > PIECE_JOINTE_MAX) { ignorees.push(p.filename || "photo"); continue; }
    try {
      const r = await fetch(p.url, { cache: "no-store" });
      if (!r.ok) { ignorees.push(p.filename || "photo"); continue; }
      const b = Buffer.from(await r.arrayBuffer());
      total += b.length;
      pieces.push({ name: p.filename || `photo-${pieces.length + 1}.jpg`, contentType: p.type || "image/jpeg", base64: b.toString("base64") });
    } catch { ignorees.push(p.filename || "photo"); }
  }
  return { pieces, ignorees };
}

// Décompte d'électricité du locataire sortant.
async function electricite(men: { fields: Record<string, unknown> }): Promise<{ lignes: { label: string; valeur: string; gras?: boolean }[]; resume: string; manque: string[] }> {
  const manque: string[] = [];
  const resaId = liens(men.fields["Réservation liée"])[0];
  const resa = resaId ? await lireEnregistrement(T_RESAS, resaId) : null;
  if (!resa) return { lignes: [], resume: "", manque: ["aucune réservation liée au ménage : pas de décompte possible"] };

  const hcDepart = nombre(men.fields["Relevé compteur heures creuses (départ)"]);
  const hpDepart = nombre(men.fields["Relevé compteur heures pleines (départ)"]);
  if (!hcDepart && !hpDepart) manque.push("relevés de départ non saisis sur le ménage");

  // Relevé d'arrivée : la fiche Check-in de la même réservation.
  const checkins = await lireTable(T_CHECKIN);
  const chk = checkins.find((c) => liens(c.fields["Réservation liée"]).includes(resaId));
  const hcArrivee = nombre(chk?.fields["Relevé compteur heures creuses"]);
  const hpArrivee = nombre(chk?.fields["Relevé compteur heures pleines"]);
  if (!chk) manque.push("aucune fiche Check-in pour cette réservation : relevé d'arrivée inconnu");
  else if (!hcArrivee && !hpArrivee) manque.push("relevés d'arrivée vides sur la fiche Check-in");

  const apptId = liens(men.fields["Appartement"])[0] || liens(resa.fields["Appartement"])[0];
  const appt = apptId ? await lireEnregistrement(T_APPARTS, apptId) : null;
  const provisionMois = nombre(appt?.fields["Charges électriques"]);
  if (!provisionMois) manque.push("aucune provision d'électricité sur la fiche appartement");

  const entree = jourParis(resa.fields["Date d'entrée"]);
  const sortie = jourParis(resa.fields["Date de sortie"]);
  const jours = joursEntre(entree, sortie);
  const provisionDue = provisionMois && jours ? Math.round((provisionMois * 12 / 365) * jours * 100) / 100 : 0;

  const consoHC = hcDepart && hcArrivee ? Math.max(0, hcDepart - hcArrivee) : 0;
  const consoHP = hpDepart && hpArrivee ? Math.max(0, hpDepart - hpArrivee) : 0;
  const chiffrable = PRIX_HC > 0 && PRIX_HP > 0 && (consoHC > 0 || consoHP > 0);
  const cout = chiffrable ? Math.round((consoHC * PRIX_HC + consoHP * PRIX_HP) * 100) / 100 : 0;
  const ecart = chiffrable && provisionDue ? Math.round((cout - provisionDue) * 100) / 100 : 0;

  const lignes = [
    { label: "Séjour", valeur: entree && sortie ? `${jjmmaaaa(entree)} → ${jjmmaaaa(sortie)} (${jours} jours)` : "dates inconnues" },
    { label: "Heures creuses", valeur: hcArrivee || hcDepart ? `${hcArrivee} → ${hcDepart}  =  ${kwh(consoHC)}` : "non relevé", gras: true },
    { label: "Heures pleines", valeur: hpArrivee || hpDepart ? `${hpArrivee} → ${hpDepart}  =  ${kwh(consoHP)}` : "non relevé", gras: true },
    { label: "Consommation totale", valeur: kwh(consoHC + consoHP) },
    { label: "Provision de l'appartement", valeur: provisionMois ? `${eur(provisionMois)} par mois` : "non renseignée" },
    { label: "Provision due au prorata", valeur: provisionDue ? eur(provisionDue) : "—", gras: true },
    ...(chiffrable
      ? [{ label: "Tarif appliqué", valeur: `${(PRIX_HC * 100).toFixed(2).replace(".", ",")} cts creuses · ${(PRIX_HP * 100).toFixed(2).replace(".", ",")} cts pleines${DATE_GRILLE ? ` (grille EDF du ${jjmmaaaa(DATE_GRILLE)})` : ""}` },
         { label: "Coût réel estimé", valeur: eur(cout) },
         { label: ecart > 0 ? "SURCONSOMMATION" : "Écart", valeur: eur(ecart), gras: true }]
      : []),
  ];
  const resume = chiffrable
    ? `${kwh(consoHC + consoHP)} · coût ${eur(cout)} · provision ${eur(provisionDue)} · ${ecart > 0 ? `surconsommation ${eur(ecart)}` : "dans la provision"}`
    : `${kwh(consoHC + consoHP)} · provision due ${provisionDue ? eur(provisionDue) : "?"} · valorisation impossible`;
  if (!chiffrable && (consoHC > 0 || consoHP > 0)) {
    manque.push("prix du kWh non renseigné (PRIX_KWH_HEURES_CREUSES / PRIX_KWH_HEURES_PLEINES) : l'écart en euros ne peut pas être calculé");
  }
  return { lignes, resume, manque };
}

export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const url = new URL(request.url);
  const simulation = url.searchParams.get("simulation") === "1";
  const ligneTest = url.searchParams.get("ligne") || "";
  const faits: string[] = [];
  const refus: string[] = [];

  try {
    const candidats = ligneTest
      ? [await lireEnregistrement(T_MENAGES, ligneTest)].filter(Boolean) as { id: string; fields: Record<string, unknown> }[]
      : (await lireTable(T_MENAGES,
          `AND({Statut} = 'Terminé', {Compte rendu envoyé le} = BLANK(), {Envoi compte rendu en cours depuis} = BLANK(), `
          + `IS_AFTER(CREATED_TIME(), '${MISE_EN_SERVICE}'))`)).slice(0, MAX_PAR_PASSAGE);

    for (const men of candidats) {
      const f = men.fields;
      const code = texte(f["Code ménage"]) || men.id;
      const type = texte(f["Type"]);
      const photos = (Array.isArray(f["Photos"]) ? f["Photos"] : []) as { url?: string; filename?: string; type?: string; size?: number }[];
      const degats = texte(f["Notes / Dégâts"]).trim();
      const depart = type === "Départ";
      // Un ménage régulier sans photo ni dégât n'intéresse personne : on le marque traité
      // pour qu'il ne repasse pas à chaque tour, et on n'envoie rien.
      if (!photos.length && !degats && !depart) {
        if (!simulation) await airtable("PATCH", T_MENAGES, { records: [{ id: men.id, fields: { "Compte rendu envoyé le": new Date().toISOString() } }] });
        continue;
      }

      const occupant = texte(f["Nom occupant"]) || [texte(f["Prénom (from Nom occupant)"]), texte(f["Nom (from Nom occupant)"])].filter(Boolean).join(" ");
      const adresse = texte(f["Adresse appartement"]);
      const elec = depart ? await electricite(men) : { lignes: [], resume: "", manque: [] };

      if (simulation) {
        faits.push(`• ${code} — ${type}${photos.length ? ` · ${photos.length} photo(s)` : ""}${degats ? " · dégâts notés" : ""}${depart ? ` · ${elec.resume}` : ""} (simulation)`);
        continue;
      }

      await airtable("PATCH", T_MENAGES, { records: [{ id: men.id, fields: { "Envoi compte rendu en cours depuis": new Date().toISOString() } }] });
      let horodate = false;
      try {
        const { pieces, ignorees } = photos.length ? await telecharger(photos) : { pieces: [], ignorees: [] };
        const sgn = await signataire(f["Collaborateur"]);
        const titre = depart
          ? `Compte rendu de départ · ${adresse || code}`
          : `Dommages constatés · ${adresse || code}`;
        const intro: string[] = [];
        if (depart) {
          intro.push(`Le ménage de départ de <strong>${adresse || "l'appartement"}</strong> est terminé${occupant ? `, après le séjour de <strong>${occupant}</strong>` : ""}.`);
          if (photos.length || degats) intro.push(`<strong style="color:#B02A00;">Des dommages ont été constatés.</strong>`);
        } else {
          intro.push(`Pendant le ménage de <strong>${adresse || "l'appartement"}</strong>${occupant ? ` (séjour de ${occupant})` : ""}, l'équipe a pris ${photos.length} photo(s) : c'est le signe d'un dommage.`);
        }
        if (degats) intro.push(`Commentaire de l'équipe : « ${degats} »`);
        if (photos.length) intro.push(pieces.length ? `Les ${pieces.length} photo(s) sont jointes à cet email.` : "Les photos n'ont pas pu être jointes : les ouvrir depuis la fiche du ménage.");
        if (ignorees.length) intro.push(`<span style="color:#6B6B6B;font-size:13px;">${ignorees.length} photo(s) trop lourde(s) pour l'email, à voir sur la fiche.</span>`);
        if (elec.manque.length) intro.push(`<span style="color:#B02A00;font-size:13px;">À compléter : ${elec.manque.join(" · ")}.</span>`);

        const html = htmlEmailLocataire({
          titre, prenom: "Guillaume", intro,
          cartes: [
            { label: "Ménage", valeur: `${code} · ${type}` },
            { label: "Appartement", valeur: adresse || "—" },
            ...(occupant ? [{ label: "Occupant sortant", valeur: occupant }] : []),
            { label: "Terminé le", valeur: dateLongue(new Date().toISOString()) },
            ...elec.lignes,
          ],
          encadre: depart
            ? { titre: "À quoi ça sert", corps: "Ce décompte compare la consommation réelle du locataire sortant à la provision prévue au contrat, au prorata de son séjour. Il donne les éléments pour facturer une surconsommation sans rouvrir les fiches." }
            : undefined,
          fin: [depart ? "Le détail reste consultable sur la fiche du ménage." : "À traiter avant la prochaine entrée."],
          signataire: sgn,
        });
        const res = await envoyerEmailLocataire({
          usrEmail: sgn.email, mailTo: GUILLAUME, mailReplyTo: sgn.email,
          mailSubject: `${depart ? "Compte rendu de départ" : "Dommages constatés"} · ${adresse || code}${occupant ? ` · ${occupant}` : ""}`,
          mailHtml: html, attachments: pieces, origine: "menage-cloture",
        }).catch((e) => ({ ok: false, erreur: e instanceof Error ? e.message : String(e) }));
        if (!res.ok) throw new Error(`email refusé : ${("erreur" in res && res.erreur) || "relais"}`);

        await airtable("PATCH", T_MENAGES, { records: [{ id: men.id, fields: {
          "Compte rendu envoyé le": new Date().toISOString(), "Envoi compte rendu en cours depuis": null,
        } }] });
        horodate = true;
        faits.push(`• ${code} — ${type}${photos.length ? ` · ${pieces.length}/${photos.length} photo(s) jointes` : ""}${degats ? " · dégâts" : ""}${depart ? ` · ${elec.resume}` : ""} → Guillaume`);
      } catch (e) {
        refus.push(`• ${code} — ${e instanceof Error ? e.message : e}`);
      } finally {
        if (!horodate) {
          refus.push(`• ${code} — :rotating_light: ENVOI INCERTAIN : le compte rendu est peut-être parti sans que la fiche ait pu être horodatée. Elle est mise de côté (« Envoi compte rendu en cours depuis » rempli) et ne repartira pas.`);
        }
      }
    }

    if (!simulation && (faits.length || refus.length)) {
      await slack(SLACK_ADMIN, `:broom: *Clôtures de ménage*\n${[...faits, ...refus].join("\n")}`).catch(() => undefined);
    }
    return NextResponse.json({ ok: !refus.length, simulation, traites: faits.length, faits, refus });
  } catch (e) {
    return NextResponse.json({ ok: false, erreur: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
