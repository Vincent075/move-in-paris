import { NextResponse } from "next/server";
import {
  airtable, lireTable, lireEnregistrement, signataire, htmlEmailLocataire, envoyerEmailLocataire, slack,
} from "@/lib/mip/courrier";
import {
  T_ABSENCES, CHAMP_STATUT, CHAMP_JETON, CHAMP_DEMANDE, CHAMP_CALCUL, CHAMP_COMMENTAIRE,
  texte, nombre, liens, jjmmaaaa, dateLongue, libelleType, estConge, joursOuvrables, jeton,
  rattacherAuMois, utilisateurDe, soldeDe,
} from "@/lib/mip/conges";

export const dynamic = "force-dynamic";
export const maxDuration = 180;

// Demandes de congé : envoi à Vincent de l'email de validation, et rattrapage du
// rattachement au mois de paie.
//
// Une demande naît « En attente » sans « Demandé le » : c'est ce couple qui la rend
// candidate. On horodate AVANT d'envoyer, pour qu'un second passage ne renvoie jamais
// deux fois la même demande — un email de trop chez Vincent, et il ne sait plus laquelle
// des deux il a déjà tranchée.

const SITE = "https://www.move-in-paris.com";
const VINCENT = "vincent@move-in-paris.com";
const SLACK_MENAGES = "C0BCH7FRDC2";
const MAX_PAR_PASSAGE = 10;

const bouton = (url: string, txt: string, fond: string) =>
  `<a href="${url}" style="display:inline-block;background:${fond};color:#FFFFFF;`
  + `font-family:Georgia,'Times New Roman',serif;font-size:16px;text-decoration:none;`
  + `padding:15px 34px;margin:0 8px 10px 0;">${txt}</a>`;

export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const url = new URL(request.url);
  const simulation = url.searchParams.get("simulation") === "1";
  const faits: string[] = [];
  const refus: string[] = [];
  const rattrapages: string[] = [];

  try {
    // 1. Demandes à soumettre à Vincent.
    // Une ligne créée par le formulaire de l'interface n'a pas toujours son statut posé :
    // on prend donc aussi les demandes SANS statut, et c'est cette route qui l'écrit. Une
    // absence saisie à la main par Vincent, déjà décidée, n'est jamais reprise puisqu'elle
    // porte « Acceptée » ou « Refusée ». Le garde-fou reste « Demandé le » vide.
    const aEnvoyer = (await lireTable(T_ABSENCES,
      `AND(OR({${CHAMP_STATUT}} = 'En attente', {${CHAMP_STATUT}} = BLANK()), {${CHAMP_DEMANDE}} = BLANK(), {Date de debut} != BLANK())`)).slice(0, MAX_PAR_PASSAGE);

    for (const abs of aEnvoyer) {
      const f = abs.fields;
      const d1 = texte(f["Date de debut"]).slice(0, 10);
      const d2 = texte(f["Date de fin"]).slice(0, 10) || d1;
      const type = texte(f["Type d'absence"]);
      const user = await utilisateurDe(abs);
      const nom = texte(user?.fields["Nom complet"]) || texte(f["Salarié"]);
      if (!d1 || !nom) {
        refus.push(`• ${abs.id} — demande incomplète (dates ou salarié manquants) : ignorée`);
        continue;
      }
      if (d2 < d1) { refus.push(`• ${nom} — la date de fin précède la date de début : à corriger`); continue; }
      const jours = joursOuvrables(d1, d2);
      const { solde, mois } = await soldeDe(liens(f["Employé liée"])[0]);
      const jt = jeton();

      if (simulation) {
        faits.push(`• ${nom} — ${libelleType(type)} du ${jjmmaaaa(d1)} au ${jjmmaaaa(d2)} · ${jours} j ouvrables${solde != null ? ` · solde ${solde} j` : ""} (simulation, rien envoyé)`);
        continue;
      }

      // Horodatage AVANT l'envoi : la demande sort des candidates tout de suite.
      await airtable("PATCH", T_ABSENCES, { records: [{ id: abs.id, fields: {
        [CHAMP_STATUT]: "En attente", [CHAMP_DEMANDE]: new Date().toISOString(), [CHAMP_JETON]: jt, [CHAMP_CALCUL]: jours,
      } }], typecast: true });

      const lien = (action: string) =>
        `${SITE}/api/conges/decision?id=${abs.id}&jeton=${jt}&action=${action}`;
      const commentaire = texte(f[CHAMP_COMMENTAIRE]).trim();
      const alerte = estConge(type) && solde != null && jours > solde
        ? `<strong style="color:#B02A00;">Attention : ${jours} jours demandés pour un solde de ${solde} jours.</strong>` : "";

      const sgn = await signataire(null);
      const html = htmlEmailLocataire({
        titre: `Demande de ${libelleType(type)} · ${nom}`,
        prenom: "Vincent",
        intro: [
          `<strong>${nom}</strong> demande ${estConge(type) ? "des congés payés" : "une absence sans solde"} du <strong>${dateLongue(d1)}</strong> au <strong>${dateLongue(d2)}</strong>.`,
          ...(commentaire ? [`Son commentaire : « ${commentaire} »`] : []),
          ...(alerte ? [alerte] : []),
          `${bouton(lien("accepter"), "Accepter", "#1E7A3C")}${bouton(lien("refuser"), "Refuser", "#B02A00")}`,
          `<span style="font-size:13px;color:#6B6B6B;">Chaque bouton ouvre un écran de confirmation : rien n'est décidé tant que vous n'avez pas confirmé.</span>`,
        ],
        cartes: [
          { label: "Salarié", valeur: nom, gras: true },
          { label: "Type", valeur: libelleType(type) },
          { label: "Du", valeur: dateLongue(d1) },
          { label: "Au", valeur: dateLongue(d2) },
          { label: "Jours ouvrables", valeur: `${jours}`, gras: true },
          ...(solde != null ? [{ label: `Solde connu (${mois})`, valeur: `${solde} jours` }] : []),
        ],
        encadre: {
          titre: "Comment c'est décompté",
          corps: "Du lundi au samedi, dimanches et jours fériés exclus. C'est le régime des 2,5 jours acquis par mois, soit 30 jours par an. Le nombre peut être corrigé à la main sur la fiche avant d'accepter.",
        },
        fin: ["La demande est déjà visible en rouge clair sur le calendrier de l'équipe. Elle passera au vert dès votre acceptation."],
        signataire: sgn,
      });
      const res = await envoyerEmailLocataire({
        usrEmail: sgn.email, mailTo: VINCENT, mailReplyTo: sgn.email,
        mailSubject: `Demande de ${libelleType(type)} · ${nom} · ${jjmmaaaa(d1)} → ${jjmmaaaa(d2)}`,
        mailHtml: html, origine: "conges-demande",
      }).catch((e) => ({ ok: false, erreur: e instanceof Error ? e.message : String(e) }));

      if (res.ok) faits.push(`• ${nom} — ${libelleType(type)} du ${jjmmaaaa(d1)} au ${jjmmaaaa(d2)} · ${jours} j · email de validation envoyé`);
      else {
        refus.push(`• ${nom} — email de validation NON envoyé (${("erreur" in res && res.erreur) || "refus du relais"}) : décider depuis Airtable`);
        await slack(SLACK_MENAGES, `:warning: *Demande de congé de ${nom}* : l'email de validation n'a pas pu être envoyé. La demande est enregistrée, à trancher depuis Airtable.`).catch(() => undefined);
      }
    }

    // 2. Rattrapage : les demandes acceptées qui attendaient l'ouverture de leur mois.
    if (!simulation) {
      const orphelines = await lireTable(T_ABSENCES,
        `AND({${CHAMP_STATUT}} = 'Acceptée', COUNTA({Congé mensuel lié}) = 0)`);
      for (const abs of orphelines) {
        const r = await rattacherAuMois(abs);
        const user = await utilisateurDe(abs);
        const nom = texte(user?.fields["Nom complet"]) || abs.id;
        if (r.fait) rattrapages.push(`• ${nom} — ${r.detail}`);
      }
    }

    if (!simulation && (faits.length || refus.length)) {
      await slack(SLACK_MENAGES,
        `:palm_tree: *Demandes de congé*\n${[...faits, ...refus].join("\n")}`).catch(() => undefined);
    }
    return NextResponse.json({ ok: !refus.length, simulation, envoyees: faits.length, faits, refus, rattrapages });
  } catch (e) {
    return NextResponse.json({ ok: false, erreur: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
