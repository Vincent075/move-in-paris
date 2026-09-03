import { NextResponse } from "next/server";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import {
  airtable, lireTable, lireEnregistrement, signataire, htmlEmailLocataire, envoyerEmailLocataire,
  deposerS3, lienS3, slack, texte, premier, dateEN, type Rec,
} from "@/lib/mip/courrier";

// Finalisation du check-in (03/09/2026, demande de Vincent).
//
// L'agent terrain prend les photos de l'appartement au moment du check-in, les dépose
// sur la fiche, note le nombre de clés et passe le statut à « Terminé ». Le bureau
// saisit ensuite les deux relevés de compteur d'après les photos. Dès que les trois
// conditions sont réunies — Terminé, deux compteurs, des photos — ce cron :
//   1. assemble un PDF à en-tête Move In Paris : date, adresse, occupant, compteurs,
//      clés, puis TOUTES les photos, réduites pour rester lisibles et légères ;
//   2. l'archive sur S3 et l'enregistre dans Documents, rattaché à la réservation ;
//   3. l'envoie en anglais à l'occupant, avec le contact relocation et Guillaume en
//      copie — en pièce jointe s'il tient sous 10 Mo, sinon par lien ;
//   4. seulement si l'envoi a réussi : vide les photos de la fiche et horodate
//      « Email check-in envoyé le », ce qui rend l'opération non répétable.
// Le commentaire de l'agent n'est pas repris (décision de Vincent).

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const T_CHECKIN = "tbl8SktZKbyopdQ7l";
const T_RESERVATIONS = "tbl5uN32egP4YCvUi";
const T_OCCUPANTS = "tblgcFnDwxjqVJy8L";
const T_APPARTEMENTS = "tbltFlpzQWXjoWg88";
const T_CONTACTS = "tblCvwLYdXYiZg6pY";
const T_DOCUMENTS = "tblgEbRbSSIy6YfC8";
const CANAL_CHECKIN = "C0BLGARJ8R0";
const GUILLAUME = "guillaume@move-in-paris.com";
const CHAMP_PHOTOS = "Photos du check-in";
const CHAMP_HC = "Relevé compteur heures creuses";
const CHAMP_HP = "Relevé compteur heures pleines";
const CHAMP_ENVOYE = "Email check-in envoyé le";
const PIECE_JOINTE_MAX = 10 * 1024 * 1024;
const LARGEUR_PHOTO = 1600;  // dans images.deviceSizes (next.config.ts), sinon l'optimiseur répond 400
const QUALITE = 75;          // la seule qualité admise par défaut par l'optimiseur (images.qualities)
const MAX_PAR_PASSAGE = 3;

type Photo = { url: string; filename?: string; thumbnails?: { large?: { url: string }; full?: { url: string } } };
type Image = { data: Buffer; type: "jpg" | "png" };

// Lit une image et reconnaît son format aux premiers octets, jamais à l'en-tête HTTP :
// l'optimiseur de Vercel rend un PNG pour un PNG et un JPEG pour un JPEG (03/09/2026,
// premier essai refusé parce qu'on n'attendait que du JPEG). Tout autre format → null.
async function lireImage(url: string, headers?: Record<string, string>): Promise<Image | null> {
  try {
    const r = await fetch(url, { headers, cache: "no-store" });
    if (!r.ok) return null;
    const b = Buffer.from(await r.arrayBuffer());
    if (b[0] === 0xff && b[1] === 0xd8) return { data: b, type: "jpg" };
    if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return { data: b, type: "png" };
    return null;
  } catch { return null; }
}
const OR = rgb(0.72, 0.545, 0.345);
const NOIR = rgb(0.05, 0.05, 0.05);
const GRIS = rgb(0.42, 0.42, 0.42);
const A4 = { w: 595.28, h: 841.89 };

async function logoPng(): Promise<Uint8Array | null> {
  try {
    const r = await fetch("https://www.move-in-paris.com/Logo-gold.png", { cache: "no-store" });
    if (!r.ok) return null;
    // Le logo est or sur fond noir : on le pose sur un bandeau noir dans le PDF.
    return new Uint8Array(await r.arrayBuffer());
  } catch { return null; }
}

async function construirePdf(args: {
  code: string; date: string; adresse: string; occupant: string; hc: string; hp: string; cles: string;
  photos: Photo[]; logo: Uint8Array | null;
}): Promise<{ pdf: Buffer; nbPhotos: number; ignorees: string[]; reduites: number }> {
  const doc = await PDFDocument.create();
  doc.setTitle(`Check-in ${args.code} — Move In Paris`);
  const serif = await doc.embedFont(StandardFonts.TimesRoman);
  const serifGras = await doc.embedFont(StandardFonts.TimesRomanBold);
  const sans = await doc.embedFont(StandardFonts.Helvetica);
  const logo = args.logo ? await doc.embedPng(args.logo).catch(() => null) : null;

  const entete = (page: ReturnType<typeof doc.addPage>) => {
    page.drawRectangle({ x: 0, y: A4.h - 54, width: A4.w, height: 54, color: NOIR });
    if (logo) {
      const l = logo.scale(46 / logo.height);
      page.drawImage(logo, { x: (A4.w - l.width) / 2, y: A4.h - 50, width: l.width, height: l.height });
    }
    page.drawRectangle({ x: 0, y: A4.h - 56, width: A4.w, height: 2, color: OR });
    page.drawText("Move In Paris · 26 rue de l'Étoile, 75017 Paris · +33 1 45 20 06 03", {
      x: 40, y: 24, size: 8, font: sans, color: GRIS,
    });
  };

  // Page 1 : le relevé.
  const p1 = doc.addPage([A4.w, A4.h]);
  entete(p1);
  let y = A4.h - 100;
  p1.drawText("CHECK-IN REPORT", { x: 40, y, size: 10, font: sans, color: OR });
  y -= 30;
  p1.drawText("Inventory of fixtures — arrival", { x: 40, y, size: 24, font: serif, color: NOIR });
  y -= 18;
  p1.drawText(`Reference ${args.code}`, { x: 40, y, size: 11, font: sans, color: GRIS });
  y -= 36;
  const ligne = (label: string, valeur: string) => {
    p1.drawText(label.toUpperCase(), { x: 40, y, size: 8.5, font: sans, color: GRIS });
    p1.drawText(valeur || "—", { x: 210, y, size: 12, font: serifGras, color: NOIR, maxWidth: 340 });
    p1.drawLine({ start: { x: 40, y: y - 8 }, end: { x: A4.w - 40, y: y - 8 }, thickness: 0.5, color: rgb(0.91, 0.89, 0.87) });
    y -= 30;
  };
  ligne("Date of check-in", args.date);
  ligne("Apartment", args.adresse);
  ligne("Occupant", args.occupant);
  ligne("Keys handed over", args.cles);
  ligne("Electricity meter · off-peak", args.hc ? `${args.hc} kWh` : "");
  ligne("Electricity meter · peak", args.hp ? `${args.hp} kWh` : "");
  y -= 6;
  p1.drawText(`${args.photos.length} photographs taken at check-in follow. They document the condition of the`, { x: 40, y, size: 10.5, font: serif, color: NOIR });
  y -= 15;
  p1.drawText("apartment on the day of arrival and will serve as reference at check-out.", { x: 40, y, size: 10.5, font: serif, color: NOIR });

  // Pages suivantes : les photos, deux par page, réduites.
  let nb = 0;
  let reduites = 0; // photos passées par l'optimiseur ; 0 sur un lot = optimiseur en panne, PDF lourd
  const ignorees: string[] = [];
  let page = null as ReturnType<typeof doc.addPage> | null;
  let slot = 0;
  for (const ph of args.photos) {
    try {
      // Réduction par l'optimiseur d'images de Vercel, à LARGEUR_PHOTO de large, sans
      // binaire natif dans la fonction. S'il refuse (format inattendu, image trop lourde),
      // on prend la vignette « full » d'Airtable, puis l'original tel quel. Une photo
      // qui n'est ni JPEG ni PNG au bout de la chaîne est ignorée et signalée.
      const opt = new URLSearchParams({ url: ph.url, w: String(LARGEUR_PHOTO), q: String(QUALITE) });
      let lue = await lireImage(`https://move-in-paris.vercel.app/_next/image?${opt}`, { Accept: "image/jpeg" });
      if (lue) reduites++;
      else lue = (ph.thumbnails?.full?.url ? await lireImage(ph.thumbnails.full.url) : null) ?? (await lireImage(ph.url));
      if (!lue) { ignorees.push(ph.filename || "sans nom"); continue; }
      const img = lue.type === "jpg" ? await doc.embedJpg(lue.data) : await doc.embedPng(lue.data);
      if (!page || slot === 2) { page = doc.addPage([A4.w, A4.h]); entete(page); slot = 0; }
      const boxW = A4.w - 80, boxH = (A4.h - 140) / 2 - 16;
      const s = Math.min(boxW / img.width, boxH / img.height);
      const w = img.width * s, h = img.height * s;
      const top = slot === 0 ? A4.h - 80 : A4.h - 80 - boxH - 24;
      page.drawImage(img, { x: (A4.w - w) / 2, y: top - h, width: w, height: h });
      page.drawText(`${nb + 1}${ph.filename ? " · " + ph.filename.slice(0, 60) : ""}`, { x: 40, y: top - h - 12, size: 8, font: sans, color: GRIS });
      slot++; nb++;
    } catch { ignorees.push(ph.filename || "sans nom"); /* une photo illisible ne bloque pas le rapport */ }
  }
  const pdf = Buffer.from(await doc.save());
  return { pdf, nbPhotos: nb, ignorees, reduites };
}

export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const url = new URL(request.url);
  const ligneTest = url.searchParams.get("ligne") || "";   // une fiche précise
  const test = url.searchParams.get("test") === "1";        // email à Vincent, fiche non modifiée

  const faits: string[] = [];
  const refus: string[] = [];
  try {
    let candidats: Rec[];
    if (ligneTest) {
      const r = await lireEnregistrement(T_CHECKIN, ligneTest);
      candidats = r ? [r] : [];
    } else {
      candidats = (await lireTable(T_CHECKIN, `AND({Statut}='Terminé', {${CHAMP_ENVOYE}}=BLANK())`))
        .filter((r) => texte(r.fields[CHAMP_HC]) !== "" && texte(r.fields[CHAMP_HP]) !== "" && Array.isArray(r.fields[CHAMP_PHOTOS]) && (r.fields[CHAMP_PHOTOS] as Photo[]).length > 0)
        .slice(0, MAX_PAR_PASSAGE);
    }

    const logo = candidats.length ? await logoPng() : null;
    for (const ch of candidats) {
      const f = ch.fields;
      const code = texte(f["Code check-in"]) || ch.id;
      try {
        const photos = (Array.isArray(f[CHAMP_PHOTOS]) ? f[CHAMP_PHOTOS] : []) as Photo[];
        if (!photos.length) throw new Error("aucune photo sur la fiche");
        if (texte(f[CHAMP_HC]) === "" || texte(f[CHAMP_HP]) === "") throw new Error("compteurs non renseignés");
        const resa = await lireEnregistrement(T_RESERVATIONS, premier(f["Réservation liée"]));
        if (!resa) throw new Error("pas de réservation liée");
        const occ = await lireEnregistrement(T_OCCUPANTS, premier(resa.fields["Occupant"]));
        const emailOcc = texte(occ?.fields["Email"]).trim();
        if (!occ || !emailOcc) throw new Error("occupant sans email");
        const appt = await lireEnregistrement(T_APPARTEMENTS, premier(resa.fields["Appartement"]) || premier(f["Appartement"]));
        const adresse = texte(appt?.fields["adresse complète"]) || texte(appt?.fields["Adresse"]) || premier(f["Adresse appartement"]);
        const nomCourt = texte(appt?.fields["Nom / Référence"]) || adresse;
        const prenom = texte(occ.fields["Prénom"]).trim().split(/\s+/)[0] || "Guest";
        const nomComplet = [texte(occ.fields["Prénom"]), texte(occ.fields["Nom"]).toUpperCase()].filter(Boolean).join(" ");
        const sgn = await signataire(resa.fields["Collaborateur"]);
        const resaCode = texte(resa.fields["Code réservation"]).split(" · ")[0].trim();
        // Copie : le contact relocation qui suit la réservation, et Guillaume.
        const contact = await lireEnregistrement(T_CONTACTS, premier(resa.fields["Contacts agence"]));
        const cc = [texte(contact?.fields["Email"]).trim(), GUILLAUME].filter((x, i, a) => x && a.indexOf(x) === i && x !== emailOcc).join(",");
        const dateCheckin = dateEN(f["Date du check-in"]) || dateEN(new Date().toISOString());

        const { pdf, nbPhotos, ignorees, reduites } = await construirePdf({
          code, date: dateCheckin, adresse, occupant: nomComplet,
          hc: texte(f[CHAMP_HC]), hp: texte(f[CHAMP_HP]), cles: texte(f["Nb de clés remises"]), photos, logo,
        });
        if (!nbPhotos) throw new Error("aucune photo n'a pu être lue");

        // Archivage S3 + dossier Documents (même convention que les documents post-signature).
        const key = `documents-generes/${resaCode || code}/check-in-${code}.pdf`;
        if (!test) await deposerS3(key, pdf, "application/pdf");
        const lien = lienS3(key);
        const joint = pdf.length <= PIECE_JOINTE_MAX;

        const html = htmlEmailLocataire({
          titre: `Your check-in report · ${nomCourt}`,
          prenom,
          intro: [
            `Welcome to <strong>${adresse}</strong>. Your check-in is now complete, and we have prepared your <strong>check-in report</strong>: the inventory of fixtures, the electricity meter readings and the ${nbPhotos} photographs taken on arrival.`,
            joint
              ? "You will find the report attached to this email as a PDF. Please keep it: it will serve as the reference at check-out."
              : `The report is available here: <a href="${lien}" style="color:#B88B58;">download your check-in report (PDF)</a>. The link is valid for 7 days, so please save the file. It will serve as the reference at check-out.`,
          ],
          cartes: [
            { label: "Apartment", valeur: nomCourt },
            { label: "Check-in date", valeur: dateCheckin, gras: true },
            { label: "Keys handed over", valeur: texte(f["Nb de clés remises"]) || "—" },
            { label: "Meter · off-peak", valeur: `${texte(f[CHAMP_HC])} kWh` },
            { label: "Meter · peak", valeur: `${texte(f[CHAMP_HP])} kWh` },
          ],
          encadre: {
            titre: "Anything to add?",
            corps: "If you notice anything not shown in the report during your first days, simply reply to this email with a photo. We will add it to your file.",
          },
          fin: ["We hope you will feel at home right away.", "Enjoy your stay in Paris."],
          signataire: sgn,
        });
        const res = await envoyerEmailLocataire({
          usrEmail: sgn.email,
          mailTo: test ? "vincent@move-in-paris.com" : emailOcc,
          mailCc: test ? "" : cc,
          mailReplyTo: sgn.email,
          mailSubject: `${test ? "[TEST] " : ""}Your check-in report · ${nomCourt}`,
          mailHtml: html,
          attachments: joint ? [{ name: `Check-in report ${code} - Move In Paris.pdf`, contentType: "application/pdf", base64: pdf.toString("base64") }] : [],
          origine: "checkin-finalisation",
        });
        if (!res.ok) throw new Error(`envoi refusé : ${res.erreur}`);

        if (!test) {
          await airtable("POST", T_DOCUMENTS, { records: [{ fields: {
            "Nom document": `Check-in report · ${code}`,
            Type: "Check-in",
            "Lien externe": lien,
            Statut: "Validé",
            "Date d'expiration": new Date(Date.now() + 7 * 86400_000).toISOString().slice(0, 10),
            "Réservation liée": [resa.id],
            "Occupant lié": [occ.id],
            Commentaire: `${nbPhotos} photos · compteurs HC ${texte(f[CHAMP_HC])} / HP ${texte(f[CHAMP_HP])} · clés ${texte(f["Nb de clés remises"]) || "—"}`,
          } }], typecast: true });
          // L'envoi a réussi : les photos quittent Airtable, la fiche est horodatée.
          await airtable("PATCH", T_CHECKIN, { records: [{ id: ch.id, fields: { [CHAMP_PHOTOS]: [], [CHAMP_ENVOYE]: new Date().toISOString() } }] });
        }
        faits.push(`• ${code} — ${nomComplet}, ${nomCourt} · ${nbPhotos} photos · ${(pdf.length / 1048576).toFixed(1)} Mo ${joint ? "en pièce jointe" : "par lien"} → ${test ? "vincent@ (test)" : emailOcc}${cc && !test ? ` (cc ${cc})` : ""}${ignorees.length ? ` · ${ignorees.length} photo(s) illisible(s) ignorée(s) : ${ignorees.slice(0, 5).join(", ")}` : ""}${reduites < nbPhotos ? ` · :warning: ${nbPhotos - reduites}/${nbPhotos} photos NON réduites (optimiseur d'images en défaut)` : ""}`);
      } catch (e) {
        refus.push(`• ${code} — ${e instanceof Error ? e.message : e}`);
      }
    }
    if (!test && (faits.length || refus.length)) {
      await slack(CANAL_CHECKIN, [
        faits.length ? `:clipboard: *Rapport de check-in envoyé au locataire*\n${faits.join("\n")}\n_PDF archivé dans Documents, photos retirées de la fiche._` : "",
        refus.length ? `:warning: *Rapport de check-in non envoyé — à corriger*\n${refus.join("\n")}` : "",
      ].filter(Boolean).join("\n\n"));
    }
    return NextResponse.json({ ok: true, test, candidats: candidats.length, envoyes: faits, refuses: refus });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await slack(CANAL_CHECKIN, `:warning: *Finalisation des check-ins en échec* : ${msg}`);
    return NextResponse.json({ ok: false, erreur: msg }, { status: 500 });
  }
}
