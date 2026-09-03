// Rapport de check-in : assemblage du PDF (fiche + toutes les photos).
//
// Mise en page « grille dense » retenue le 03/09/2026 après le refus de Vincent sur
// la première version (« la forme n'est pas bonne, je veux voir des photos, j'en
// veux un max ») : bandeau noir, fiche compacte sur deux colonnes en haut de la
// page 1, puis les photos aussitôt, sur DEUX colonnes, en rangées de hauteur
// variable (une rangée de paysages est basse, une rangée contenant un portrait est
// plus haute), remplies jusqu'en bas de page. Chaque photo porte une pastille or
// numérotée : c'est ce numéro que l'on cite au check-out.
//
// Module AUTONOME, volontairement sans accès disque ni réseau : tout arrive dans
// `args`. C'est ce qui permet de le rendre en local avec les mêmes octets que la
// production (scratchpad : `node rendre_variante.ts <ce fichier> sortie.pdf 33`).
// Contraintes : Vercel (Node) sans binaire natif → pdf-lib + fontkit seulement ;
// les photos arrivent déjà réduites (optimiseur d'images) en JPEG ou PNG.
//
// Polices : Playfair Display + Inter, PRÉ-DÉCOUPÉES en Latin par fontTools
// (public/fonts, ≈48 Ko chacune). Les fichiers Inter servis tels quels par Google
// Fonts rendent des glyphes manquants au sous-ensemble dans pdf-lib : ne pas les
// remplacer par les originaux.
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFImage, type PDFPage } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";

export type PhotoLue = {
  data: Uint8Array;          // octets JPEG ou PNG, déjà réduits (1200-1600 px de large en production)
  type: "jpg" | "png";
  nom?: string;              // nom de fichier d'origine — non affiché, gardé pour le diagnostic
};

export type Polices = {
  playfairRegular?: Uint8Array;
  playfairSemiBold?: Uint8Array;
  playfairBold?: Uint8Array;
  interRegular?: Uint8Array;
  interMedium?: Uint8Array;
  interSemiBold?: Uint8Array;
};

export type ArgsRapport = {
  code: string;              // CHK-2026-0010
  date: string;              // "2 September 2026"
  adresse: string;           // "25 rue Marbeuf, 75008 Paris"
  nomCourt: string;          // "2P rue Marbeuf"
  occupant: string;          // "Giuseppe D'AVANZO"
  agence?: string;           // "Santa Fe Relocation" — peut être vide
  hc: string;                // relevé heures creuses (chiffres, sans unité)
  hp: string;                // relevé heures pleines
  cles: string;              // nombre de clés remises
  logo: Uint8Array | null;   // PNG or (Logo-gold.png du site), peut être null
  polices: Polices;          // une police absente = repli sur TimesRoman / Helvetica
  photos: PhotoLue[];        // de 0 à ~80 photos, paysage ET portrait mélangés
};

export type ResultatRapport = {
  pdf: Uint8Array;
  nbPhotos: number;          // photos effectivement intégrées
  nbPages: number;
};

const A4 = { w: 595.28, h: 841.89 };
const MARGE = 26;
const GOUTTIERE = 7;
const NOIR = rgb(0.051, 0.051, 0.051);      // #0D0D0D
const OR = rgb(0.773, 0.627, 0.349);        // #C5A059
const OR_CHAUD = rgb(0.651, 0.525, 0.349);  // #A68659
const CREME = rgb(0.961, 0.941, 0.922);     // #F5F0EB
const GRIS = rgb(0.42, 0.42, 0.42);         // #6B6B6B
const FILET = rgb(0.85, 0.82, 0.78);
const BLANC = rgb(1, 1, 1);
const H_BANDEAU = 42;
const H_PIED = 28;

export async function construirePdf(args: ArgsRapport): Promise<ResultatRapport> {
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  doc.setTitle(`Check-in report ${args.code} — Move In Paris`);
  doc.setAuthor("Move In Paris");

  const police = async (ttf: Uint8Array | undefined, std: StandardFonts): Promise<PDFFont> =>
    ttf ? doc.embedFont(ttf, { subset: true }).catch(() => doc.embedFont(std)) : doc.embedFont(std);
  const titre = await police(args.polices.playfairRegular, StandardFonts.TimesRoman);
  const titreGras = await police(args.polices.playfairSemiBold ?? args.polices.playfairBold, StandardFonts.TimesRomanBold);
  const texte = await police(args.polices.interRegular, StandardFonts.Helvetica);
  const texteMoyen = await police(args.polices.interMedium ?? args.polices.interSemiBold, StandardFonts.HelveticaBold);
  const logo = args.logo ? await doc.embedPng(args.logo).catch(() => null) : null;

  const total = args.photos.length;
  const largeurCellule = (A4.w - 2 * MARGE - GOUTTIERE) / 2;
  // Un portrait est plafonné à 75 % de la largeur de cellule : encore lisible (et
  // zoomable, la photo garde ses 1200-1600 px), son voisin paysage n'est pas noyé
  // dans le crème, et une page garde ses 4 rangées même avec une rangée de portraits.
  const hauteurMax = largeurCellule * 0.73;
  const largeurTexte = (font: PDFFont, s: string, taille: number) => font.widthOfTextAtSize(s, taille);
  const tronque = (font: PDFFont, s: string, taille: number, max: number) => {
    if (largeurTexte(font, s, taille) <= max) return s;
    let t = s;
    while (t.length > 1 && largeurTexte(font, t + "…", taille) > max) t = t.slice(0, -1);
    return t + "…";
  };

  // ── Habillage de page ───────────────────────────────────────────────────────
  let numeroPage = 0;
  const bandeau = (page: PDFPage) => {
    numeroPage++;
    page.drawRectangle({ x: 0, y: A4.h - H_BANDEAU, width: A4.w, height: H_BANDEAU, color: NOIR });
    page.drawRectangle({ x: 0, y: A4.h - H_BANDEAU - 1.5, width: A4.w, height: 1.5, color: OR });
    if (logo) {
      const l = logo.scale(36 / logo.height);
      page.drawImage(logo, { x: MARGE, y: A4.h - H_BANDEAU + (H_BANDEAU - l.height) / 2, width: l.width, height: l.height });
    } else {
      page.drawText("MOVE IN PARIS", { x: MARGE, y: A4.h - 26, size: 9, font: texteMoyen, color: OR });
    }
    const droite = `Check-in report · ${args.code}`;
    page.drawText(droite, { x: A4.w - MARGE - largeurTexte(texteMoyen, droite, 8.5), y: A4.h - 21, size: 8.5, font: texteMoyen, color: BLANC });
  };
  const sousTitre = (page: PDFPage, s: string) => {
    page.drawText(s, { x: A4.w - MARGE - largeurTexte(texte, s, 7.5), y: A4.h - 33, size: 7.5, font: texte, color: OR });
  };
  const pied = (page: PDFPage, n: number) => {
    page.drawLine({ start: { x: MARGE, y: H_PIED + 4 }, end: { x: A4.w - MARGE, y: H_PIED + 4 }, thickness: 0.5, color: FILET });
    page.drawText("Move In Paris · 26 rue de l'Étoile, 75017 Paris · +33 1 45 20 06 03", { x: MARGE, y: H_PIED - 8, size: 7, font: texte, color: GRIS });
    const slogan = "The art of Parisian living";
    page.drawText(slogan, { x: A4.w - MARGE - largeurTexte(titre, slogan, 7.5), y: H_PIED - 8, size: 7.5, font: titre, color: OR_CHAUD });
    const num = `${n}`;
    page.drawText(num, { x: (A4.w - largeurTexte(texte, num, 7)) / 2, y: H_PIED - 8, size: 7, font: texte, color: GRIS });
  };

  // ── Page 1 : fiche compacte ─────────────────────────────────────────────────
  const p1 = doc.addPage([A4.w, A4.h]);
  bandeau(p1);
  sousTitre(p1, args.date);
  let y = A4.h - H_BANDEAU - 32;
  p1.drawText("Check-in report", { x: MARGE, y, size: 21, font: titre, color: NOIR });
  const sous = "Inventory of fixtures on arrival";
  p1.drawText(sous, { x: A4.w - MARGE - largeurTexte(titre, sous, 10), y: y + 3, size: 10, font: titre, color: GRIS });
  y -= 12;
  p1.drawLine({ start: { x: MARGE, y }, end: { x: A4.w - MARGE, y }, thickness: 0.8, color: OR });

  const infos: Array<[string, string]> = [
    ["Apartment", args.nomCourt && args.nomCourt !== args.adresse ? `${args.nomCourt} — ${args.adresse}` : args.adresse],
    ["Occupant", args.agence ? `${args.occupant} · ${args.agence}` : args.occupant],
    ["Date of check-in", args.date],
    ["Keys handed over", args.cles || "—"],
    ["Electricity meter · off-peak (HC)", args.hc ? `${args.hc} kWh` : "—"],
    ["Electricity meter · peak (HP)", args.hp ? `${args.hp} kWh` : "—"],
  ];
  const colonne = largeurCellule;
  y -= 17;
  for (let i = 0; i < infos.length; i++) {
    const col = i % 2, rang = Math.floor(i / 2);
    const x = MARGE + col * (colonne + GOUTTIERE);
    const yy = y - rang * 31;
    p1.drawText(infos[i][0].toUpperCase(), { x, y: yy, size: 6.5, font: texteMoyen, color: GRIS });
    p1.drawText(tronque(titreGras, infos[i][1], 10.5, colonne), { x, y: yy - 13, size: 10.5, font: titreGras, color: NOIR });
  }
  y -= 3 * 31 - 2;
  p1.drawLine({ start: { x: MARGE, y }, end: { x: A4.w - MARGE, y }, thickness: 0.5, color: FILET });
  y -= 13;
  const note = total
    ? `${total} photograph${total > 1 ? "s" : ""} taken on the day of arrival. They document the condition of the apartment and will serve as the reference at check-out.`
    : "No photograph was attached to this check-in.";
  p1.drawText(tronque(texte, note, 8, A4.w - 2 * MARGE), { x: MARGE, y, size: 8, font: texte, color: GRIS });
  y -= 14;

  // ── Photos : rangées de deux, hauteur variable, pages remplies jusqu'en bas ──
  const bas = H_PIED + 4;
  const pastille = (page: PDFPage, x: number, yHaut: number, numero: number) => {
    const etiquette = String(numero);
    const w = Math.max(16, largeurTexte(texteMoyen, etiquette, 7.5) + 8);
    page.drawRectangle({ x: x + 6, y: yHaut - 6 - 13, width: w, height: 13, color: OR });
    page.drawText(etiquette, { x: x + 6 + (w - largeurTexte(texteMoyen, etiquette, 7.5)) / 2, y: yHaut - 6 - 13 + 3.5, size: 7.5, font: texteMoyen, color: NOIR });
  };
  // Hauteur naturelle d'une image dans sa cellule : largeur pleine pour un paysage,
  // hauteur plafonnée pour un portrait.
  const hauteurPour = (img: PDFImage) => Math.min(largeurCellule * img.height / img.width, hauteurMax);
  const poser = (page: PDFPage, img: PDFImage, x: number, yHaut: number, hRangee: number, numero: number) => {
    const s = Math.min(largeurCellule / img.width, hRangee / img.height);
    const w = img.width * s, h = img.height * s;
    if (w < largeurCellule - 0.5 || h < hRangee - 0.5) {
      page.drawRectangle({ x, y: yHaut - hRangee, width: largeurCellule, height: hRangee, color: CREME });
    }
    page.drawImage(img, { x: x + (largeurCellule - w) / 2, y: yHaut - hRangee + (hRangee - h) / 2, width: w, height: h });
    pastille(page, x, yHaut, numero);
  };

  // Toutes les images lisibles sont embarquées d'abord ; une illisible est ignorée.
  const images: PDFImage[] = [];
  for (const ph of args.photos) {
    try { images.push(ph.type === "jpg" ? await doc.embedJpg(ph.data) : await doc.embedPng(ph.data)); } catch { /* ignorée */ }
  }
  const nb = images.length;

  let page: PDFPage = p1;
  let yCourant = y;
  let premierSurPage = 1;
  let i = 0;
  const cloreLaPage = () => {
    if (page !== p1) sousTitre(page, `Photos ${premierSurPage}–${i} of ${nb}`);
    pied(page, numeroPage);
  };
  while (i < nb) {
    const paire = images.slice(i, i + 2);
    const hRangee = Math.max(...paire.map(hauteurPour));
    if (yCourant - hRangee < bas) {
      cloreLaPage();
      page = doc.addPage([A4.w, A4.h]);
      bandeau(page);
      yCourant = A4.h - H_BANDEAU - 10;
      premierSurPage = i + 1;
    }
    paire.forEach((img, k) => poser(page, img, MARGE + k * (largeurCellule + GOUTTIERE), yCourant, hRangee, i + k + 1));
    i += paire.length;
    yCourant -= hRangee + GOUTTIERE;
  }
  cloreLaPage();

  const pdf = await doc.save();
  return { pdf, nbPhotos: nb, nbPages: doc.getPageCount() };
}
