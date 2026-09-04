import { NextResponse } from "next/server";
import {
  airtable, lireEnregistrement, signataire, htmlEmailLocataire, envoyerEmailLocataire, slack,
} from "@/lib/mip/courrier";
import {
  T_ABSENCES, CHAMP_STATUT, CHAMP_JETON, CHAMP_DECIDE, CHAMP_MOTIF, CHAMP_CALCUL, CHAMP_COMMENTAIRE,
  texte, nombre, liens, jjmmaaaa, dateLongue, libelleType, rattacherAuMois, utilisateurDe,
} from "@/lib/mip/conges";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

// Décision de Vincent sur une demande de congé, depuis les deux boutons de son email.
//
// Le GET n'écrit RIEN : il affiche un écran de confirmation. C'est indispensable — les
// antivirus et les aperçus de messagerie visitent les liens d'un email sans que personne
// ne clique, et une décision se prendrait toute seule. Seul le POST du bouton tranche.
//
// Le jeton est effacé au moment de la décision : un lien rejoué affiche « décision déjà
// prise », jamais une seconde écriture.

const SITE = "https://www.move-in-paris.com";
const SLACK_MENAGES = "C0BCH7FRDC2";

const page = (titre: string, corps: string, couleur = "#0D0D0D") => new NextResponse(
  `<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${titre} · Move in Paris</title></head>
<body style="margin:0;background:#F5F0EB;font-family:Georgia,'Times New Roman',serif;color:#0D0D0D;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F5F0EB;"><tr><td align="center" style="padding:40px 16px;">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="width:100%;max-width:560px;background:#fff;border:1px solid #E8E4DF;">
<tr><td style="background:#0D0D0D;padding:22px 32px;"><div style="font-family:Arial,Helvetica,sans-serif;font-size:11px;letter-spacing:3px;color:#B88B58;text-transform:uppercase;">Move in Paris</div></td></tr>
<tr><td style="height:3px;background:${couleur};"></td></tr>
<tr><td style="padding:32px;">${corps}</td></tr>
</table></td></tr></table></body></html>`,
  { status: 200, headers: { "content-type": "text/html; charset=utf-8" } });

const h1 = (s: string) => `<h1 style="margin:0 0 18px 0;font-size:22px;font-weight:normal;">${s}</h1>`;
const p_ = (s: string) => `<p style="margin:0 0 14px 0;font-size:15px;line-height:1.65;">${s}</p>`;
const echapper = (s: string) => s.replace(/[<>&"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c] as string));

function resume(f: Record<string, unknown>, nom: string) {
  const t = texte(f["Type d'absence"]);
  return `<table role="presentation" width="100%" style="background:#F5F0EB;border-left:3px solid #B88B58;margin:0 0 22px 0;"><tr><td style="padding:18px 22px;font-size:15px;line-height:1.8;">`
    + `<strong>${echapper(nom)}</strong><br>${libelleType(t)}<br>`
    + `du ${dateLongue(f["Date de debut"])} au ${dateLongue(f["Date de fin"])}<br>`
    + `<span style="color:#6B6B6B;font-size:14px;">${nombre(f[CHAMP_CALCUL])} jour(s) ouvrable(s)</span></td></tr></table>`;
}

async function charger(id: string, jetonRecu: string) {
  const abs = id ? await lireEnregistrement(T_ABSENCES, id) : null;
  if (!abs) return { erreur: page("Demande introuvable", h1("Demande introuvable") + p_("Ce lien ne correspond à aucune demande. Elle a peut-être été supprimée."), "#B02A00") };
  const statut = texte(abs.fields[CHAMP_STATUT]);
  if (statut && statut !== "En attente") {
    const quand = jjmmaaaa(abs.fields[CHAMP_DECIDE]);
    return { erreur: page("Décision déjà prise", h1(`Demande déjà ${statut.toLowerCase()}`)
      + p_(`Cette demande a été traitée${quand ? ` le ${quand}` : ""}. Rien n'a été modifié.`)
      + p_(`<a href="https://airtable.com/appcLt70GQiR1FAbT/${T_ABSENCES}/${abs.id}" style="color:#B88B58;">Ouvrir la fiche dans Airtable</a>`), "#6B6B6B") };
  }
  const attendu = texte(abs.fields[CHAMP_JETON]);
  if (!attendu || attendu !== jetonRecu) {
    return { erreur: page("Lien invalide", h1("Lien invalide ou expiré")
      + p_("Ce lien ne permet plus de décider. Ouvrez la fiche dans Airtable pour trancher à la main."), "#B02A00") };
  }
  return { abs };
}

export async function GET(request: Request) {
  const u = new URL(request.url);
  const id = u.searchParams.get("id") || "";
  const jetonRecu = u.searchParams.get("jeton") || "";
  const action = u.searchParams.get("action") === "refuser" ? "refuser" : "accepter";
  const { erreur, abs } = await charger(id, jetonRecu);
  if (erreur || !abs) return erreur!;
  const user = await utilisateurDe(abs);
  const nom = texte(user?.fields["Nom complet"]) || texte(abs.fields["Salarié"]) || "Le salarié";
  const cache = `<input type="hidden" name="id" value="${echapper(id)}"><input type="hidden" name="jeton" value="${echapper(jetonRecu)}"><input type="hidden" name="action" value="${action}">`;
  const bouton = (txt: string, fond: string) =>
    `<button type="submit" style="background:${fond};color:#fff;border:0;padding:15px 30px;font-family:Georgia,'Times New Roman',serif;font-size:16px;cursor:pointer;">${txt}</button>`;
  if (action === "accepter") {
    return page("Accepter la demande", h1("Accepter cette demande ?") + resume(abs.fields, nom)
      + p_("Le congé sera enregistré, il passera au vert sur le calendrier et le salarié recevra un email d'acceptation.")
      + `<form method="POST" action="${SITE}/api/conges/decision">${cache}${bouton("Confirmer l'acceptation", "#1E7A3C")}</form>`, "#1E7A3C");
  }
  return page("Refuser la demande", h1("Refuser cette demande ?") + resume(abs.fields, nom)
    + p_("Le salarié recevra un email de refus. Vous pouvez lui expliquer pourquoi, ce texte lui sera transmis tel quel.")
    + `<form method="POST" action="${SITE}/api/conges/decision">${cache}`
    + `<textarea name="motif" rows="3" placeholder="Motif du refus (facultatif)" style="width:100%;box-sizing:border-box;padding:12px;font-family:Georgia,'Times New Roman',serif;font-size:15px;border:1px solid #E8E4DF;margin:0 0 16px 0;"></textarea>`
    + bouton("Confirmer le refus", "#B02A00") + `</form>`, "#B02A00");
}

export async function POST(request: Request) {
  const form = await request.formData();
  const id = String(form.get("id") || "");
  const jetonRecu = String(form.get("jeton") || "");
  const action = String(form.get("action") || "") === "refuser" ? "refuser" : "accepter";
  const motif = String(form.get("motif") || "").trim().slice(0, 500);
  const { erreur, abs } = await charger(id, jetonRecu);
  if (erreur || !abs) return erreur!;

  const user = await utilisateurDe(abs);
  const nom = texte(user?.fields["Nom complet"]) || texte(abs.fields["Salarié"]) || "";
  const prenom = texte(user?.fields["Prénom"]) || nom.split(" ")[0];
  const email = texte(user?.fields["Email"]).trim();
  const type = texte(abs.fields["Type d'absence"]);
  const accepte = action === "accepter";

  // La décision d'abord, l'email ensuite : le jeton est brûlé dans la même écriture, donc
  // un second clic ne peut plus rien changer même si l'envoi échoue juste après.
  await airtable("PATCH", T_ABSENCES, { records: [{ id: abs.id, fields: {
    [CHAMP_STATUT]: accepte ? "Acceptée" : "Refusée",
    [CHAMP_DECIDE]: new Date().toISOString(),
    [CHAMP_JETON]: "",
    ...(motif ? { [CHAMP_MOTIF]: motif } : {}),
  } }], typecast: true });

  let rattachement = "";
  if (accepte) {
    const relue = await lireEnregistrement(T_ABSENCES, abs.id);
    const r = await rattacherAuMois(relue ?? abs);
    rattachement = r.detail;
  }

  let envoye = false;
  if (email) {
    const sgn = await signataire(null);
    const html = htmlEmailLocataire({
      titre: accepte ? "Votre demande est acceptée" : "Votre demande n'a pas été retenue",
      prenom,
      intro: accepte
        ? [`Bonne nouvelle : votre demande de <strong>${libelleType(type)}</strong> est acceptée.`,
           "Elle apparaît désormais en vert sur votre calendrier."]
        : [`Votre demande de <strong>${libelleType(type)}</strong> n'a pas pu être acceptée.`,
           ...(motif ? [`Motif : <strong>${echapper(motif)}</strong>`] : []),
           "N'hésitez pas à en reparler avec Vincent pour trouver d'autres dates."],
      cartes: [
        { label: "Type", valeur: libelleType(type) },
        { label: "Du", valeur: dateLongue(abs.fields["Date de debut"]), gras: true },
        { label: "Au", valeur: dateLongue(abs.fields["Date de fin"]), gras: true },
        { label: "Jours ouvrables", valeur: String(nombre(abs.fields[CHAMP_CALCUL])) },
        { label: "Décision", valeur: accepte ? "Acceptée" : "Refusée" },
      ],
      fin: accepte ? ["Bon repos."] : ["Merci de votre compréhension."],
      signataire: sgn,
    });
    const res = await envoyerEmailLocataire({
      usrEmail: sgn.email, mailTo: email, mailReplyTo: sgn.email,
      mailSubject: accepte ? `Votre demande de ${libelleType(type)} est acceptée` : `Votre demande de ${libelleType(type)} n'a pas été retenue`,
      mailHtml: html, origine: "conges-decision",
    }).catch(() => ({ ok: false }));
    envoye = res.ok === true;
  }

  await slack(SLACK_MENAGES, `${accepte ? ":white_check_mark:" : ":x:"} *${nom}* — ${libelleType(type)} du ${jjmmaaaa(abs.fields["Date de debut"])} au ${jjmmaaaa(abs.fields["Date de fin"])} : *${accepte ? "acceptée" : "refusée"}*`
    + `${motif ? ` — ${motif}` : ""}${envoye ? "" : " · :warning: email NON envoyé au salarié, le prévenir à la main"}${rattachement && !rattachement.startsWith("rattachée") ? ` · ${rattachement}` : ""}`).catch(() => undefined);

  const suite = [
    envoye ? `${prenom} vient de recevoir l'email ${accepte ? "d'acceptation" : "de refus"}.`
           : `<strong style="color:#B02A00;">L'email n'a pas pu être envoyé${email ? "" : " (aucune adresse sur sa fiche)"} : prévenez ${prenom || "le salarié"} vous-même.</strong>`,
    ...(accepte && rattachement && !rattachement.startsWith("rattachée")
        ? [`<span style="color:#6B6B6B;">${echapper(rattachement)}. Le congé est bien enregistré et visible au calendrier ; il entrera dans la paie dès que le mois sera ouvert.</span>`] : []),
  ].map(p_).join("");

  return page(accepte ? "Demande acceptée" : "Demande refusée",
    h1(accepte ? "Demande acceptée" : "Demande refusée") + resume(abs.fields, nom) + suite
    + p_(`<a href="https://airtable.com/appcLt70GQiR1FAbT/${T_ABSENCES}/${abs.id}" style="color:#B88B58;">Ouvrir la fiche dans Airtable</a>`),
    accepte ? "#1E7A3C" : "#B02A00");
}
