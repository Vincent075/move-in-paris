import { NextResponse } from "next/server";
import { construirePdf, type PhotoLue, type Polices } from "@/lib/mip/rapport-checkin";
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
const CHAMP_RAPPORT_RESA = "Rapport de check-in";   // pièce jointe sur Réservations, comme « PDF contrat signé »
const T_MONITORING = "tblDEkjIyKoKJG5Yj";           // porte les verrous « verrou:checkin:<fiche> »
const VERROU_PERIME_MS = 10 * 60 * 1000;
const DOSSIER_S3 = "check-in-inspection";           // dossier S3 voulu par Vincent (03/09/2026)
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
const SITE = "https://move-in-paris.vercel.app";

async function logoPng(): Promise<Uint8Array | null> {
  try {
    const r = await fetch("https://www.move-in-paris.com/Logo-gold.png", { cache: "no-store" });
    if (!r.ok) return null;
    // Le logo est or sur fond noir : on le pose sur un bandeau noir dans le PDF.
    return new Uint8Array(await r.arrayBuffer());
  } catch { return null; }
}

// Polices du site (Playfair Display + Inter, TTF dans public/fonts), gardées en
// mémoire tant que la fonction reste chaude. Une police absente = repli sur les
// polices standard, jamais un échec.
const POLICES: Array<[keyof Polices, string]> = [
  ["playfairRegular", "PlayfairDisplay-400.ttf"], ["playfairSemiBold", "PlayfairDisplay-600.ttf"], ["playfairBold", "PlayfairDisplay-700.ttf"],
  ["interRegular", "Inter-400.ttf"], ["interMedium", "Inter-500.ttf"], ["interSemiBold", "Inter-600.ttf"],
];
let policesCache: Polices | null = null;
async function polices(): Promise<Polices> {
  if (policesCache) return policesCache;
  const p: Polices = {};
  await Promise.all(POLICES.map(async ([cle, fichier]) => {
    try {
      const r = await fetch(`${SITE}/fonts/${fichier}`, { cache: "no-store" });
      if (r.ok) p[cle] = new Uint8Array(await r.arrayBuffer());
    } catch { /* repli sur les polices standard */ }
  }));
  if (Object.keys(p).length === POLICES.length) policesCache = p;
  return p;
}

// Lit toutes les photos d'une fiche, réduites par l'optimiseur d'images de Vercel
// (sans binaire natif dans la fonction). S'il refuse une image (format inattendu,
// trop lourde), on prend la vignette « full » d'Airtable, puis l'original tel quel.
// Une photo qui n'est ni JPEG ni PNG au bout de la chaîne est ignorée et signalée.
// Au-delà de 40 photos la largeur descend à 1200 px : sur une grille dense, c'est
// encore net, et le PDF reste envoyable en pièce jointe.
async function lirePhotos(photos: Photo[]): Promise<{ lues: PhotoLue[]; ignorees: string[]; reduites: number; brutes: number }> {
  const largeur = photos.length > 40 ? 1200 : LARGEUR_PHOTO;
  const lues: PhotoLue[] = [];
  const ignorees: string[] = [];
  let reduites = 0; // passées par l'optimiseur
  let brutes = 0;   // originaux tels quels (ni optimiseur, ni vignette) : PDF lourd → alerte
  for (const ph of photos) {
    const opt = new URLSearchParams({ url: ph.url, w: String(largeur), q: String(QUALITE) });
    let lue = await lireImage(`${SITE}/_next/image?${opt}`, { Accept: "image/jpeg" });
    if (lue) reduites++;
    else {
      // La vignette « full » d'Airtable est le chemin normal d'un HEIC : réduite, pas une anomalie.
      lue = ph.thumbnails?.full?.url ? await lireImage(ph.thumbnails.full.url) : null;
      if (!lue) { lue = await lireImage(ph.url); if (lue) brutes++; }
    }
    if (!lue) { ignorees.push(ph.filename || "sans nom"); continue; }
    lues.push({ data: lue.data, type: lue.type, nom: ph.filename });
  }
  return { lues, ignorees, reduites, brutes };
}

// Un refus (fiche sans occupant, sans réservation…) reste candidat tant qu'il n'est pas
// corrigé : on ne le crie dans Slack qu'une fois par jour, mémorisé dans Monitoring.
async function dejaCrieAujourdhui(ficheId: string): Promise<boolean> {
  const cle = `cri:checkin:${ficheId}`;
  const jour = new Date().toISOString().slice(0, 10);
  try {
    const lignes = await lireTable(T_MONITORING, `{Contrôle}='${cle}'`);
    if (lignes.some((r) => texte(r.fields["Détail"]) === jour)) return true;
    for (const r of lignes) await airtable("DELETE", `${T_MONITORING}/${r.id}`).catch(() => undefined);
    await airtable("POST", T_MONITORING, { records: [{ fields: { "Contrôle": cle, Statut: "ALERTE", "Détail": jour, "Dernière vérification": new Date().toISOString() } }], typecast: true });
  } catch { /* en cas de doute, on crie */ }
  return false;
}

// VERROU PAR FICHE. Le 03/09/2026, deux réveils à deux secondes d'écart (saisie du
// second compteur + mise à jour du statut par un autre cron, chacun pingant le webhook)
// ont lu la même fiche avant qu'aucun ne l'ait horodatée : le rapport de CHK-2026-0021
// est parti en double. Airtable n'a pas d'écriture atomique, d'où ce protocole :
// chaque passage pose une ligne « verrou:checkin:<fiche> » dans Monitoring avec un
// jeton (horodatage ms + aléa), relit toutes les lignes de cette clé, et seul le plus
// petit jeton (puis le plus petit id, pour départager une égalité) continue ; les
// autres effacent leur ligne et passent. Un verrou de plus de 10 minutes est réputé
// abandonné (fonction interrompue) et ne bloque plus.
async function verrouiller(ficheId: string): Promise<string | null> {
  const cle = `verrou:checkin:${ficheId}`;
  const jeton = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const cree = await airtable("POST", T_MONITORING, { records: [{ fields: {
    "Contrôle": cle, Statut: "OK", "Détail": jeton, "Dernière vérification": new Date().toISOString(),
  } }], typecast: true });
  const monId = String(((cree.records as Rec[] | undefined) ?? [])[0]?.id ?? "");
  if (!monId) throw new Error("verrou non créé");
  // On laisse 1,5 s à un réveil quasi simultané pour poser sa propre ligne : sans cette
  // pause, deux passages pourraient chacun relire avant de voir la ligne de l'autre.
  await new Promise((r) => setTimeout(r, 1500));
  const lignes = await lireTable(T_MONITORING, `{Contrôle}='${cle}'`);
  const horodatage = (r: Rec) => Number(texte(r.fields["Détail"]).split("-")[0]) || 0;
  const vivantes = lignes.filter((r) => Date.now() - horodatage(r) < VERROU_PERIME_MS);
  vivantes.sort((a, b) => (horodatage(a) - horodatage(b)) || a.id.localeCompare(b.id));
  if (!vivantes.length || vivantes[0].id !== monId) {
    await airtable("DELETE", `${T_MONITORING}/${monId}`).catch(() => undefined);
    return null;
  }
  // Les verrous périmés d'un passage interrompu sont nettoyés au passage.
  for (const r of lignes) if (!vivantes.includes(r)) await airtable("DELETE", `${T_MONITORING}/${r.id}`).catch(() => undefined);
  return monId;
}
async function deverrouiller(verrouId: string) {
  await airtable("DELETE", `${T_MONITORING}/${verrouId}`).catch(() => undefined);
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
  const refusParFiche = new Map<string, string>(); // pour ne crier chaque refus qu'une fois par jour
  try {
    let candidats: Rec[];
    const eligible = (r: Rec) => texte(r.fields[CHAMP_HC]) !== "" && texte(r.fields[CHAMP_HP]) !== ""
      && Array.isArray(r.fields[CHAMP_PHOTOS]) && (r.fields[CHAMP_PHOTOS] as Photo[]).length > 0;
    if (ligneTest) {
      const r = await lireEnregistrement(T_CHECKIN, ligneTest);
      // Une fiche visée à la main obéit aux mêmes règles qu'au cron, sauf en mode test
      // (où rien n'est écrit) : pas d'envoi réel d'une fiche non terminée ou déjà envoyée.
      if (r && !test && (texte(r.fields["Statut"]) !== "Terminé" || texte(r.fields[CHAMP_ENVOYE]))) {
        return NextResponse.json({ ok: false, erreur: "fiche non éligible : statut ≠ Terminé ou rapport déjà envoyé (ajouter &test=1 pour un essai)" }, { status: 400 });
      }
      candidats = r ? [r] : [];
    } else {
      // Toutes les fiches éligibles sont parcourues ; le quota ne compte que les ENVOIS
      // réussis, pour qu'une fiche en refus permanent ne bloque jamais les suivantes.
      candidats = (await lireTable(T_CHECKIN, `AND({Statut}='Terminé', {${CHAMP_ENVOYE}}=BLANK())`)).filter(eligible);
    }

    const logo = candidats.length ? await logoPng() : null;
    const ttf = candidats.length ? await polices() : {};
    for (const ch of candidats) {
      if (faits.length >= MAX_PAR_PASSAGE) break;
      const f = ch.fields;
      const code = texte(f["Code check-in"]) || ch.id;
      let verrou: string | null = null;
      if (!test) {
        try { verrou = await verrouiller(ch.id); } catch (e) { refus.push(`• ${code} — verrou impossible : ${e instanceof Error ? e.message : e}`); continue; }
        if (!verrou) continue; // un autre passage traite déjà cette fiche
      }
      try {
        if (!test) {
          // Relecture sous verrou : si un autre passage vient de terminer, on s'arrête là.
          // Et si la relecture échoue (429, réseau), on ne prend AUCUN risque : passage suivant.
          const relu = await lireEnregistrement(T_CHECKIN, ch.id);
          if (!relu) throw new Error("relecture de la fiche impossible, envoi reporté au prochain passage");
          if (texte(relu.fields[CHAMP_ENVOYE])) continue;
        }
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

        const { lues, ignorees, reduites, brutes } = await lirePhotos(photos);
        const { pdf: pdfOctets, nbPhotos } = await construirePdf({
          code, date: dateCheckin, adresse, nomCourt, occupant: nomComplet,
          agence: premier(f["Nom agence"]),
          hc: texte(f[CHAMP_HC]), hp: texte(f[CHAMP_HP]), cles: texte(f["Nb de clés remises"]),
          logo, polices: ttf, photos: lues,
        });
        const pdf = Buffer.from(pdfOctets);
        if (!nbPhotos) throw new Error("aucune photo n'a pu être lue");

        // Archivage S3 dans le dossier « check-in-inspection », un sous-dossier par réservation.
        const key = `${DOSSIER_S3}/${resaCode || code}/check-in-report-${code}.pdf`;
        if (!test) await deposerS3(key, pdf, "application/pdf");
        const lien = lienS3(key);
        // En test rien n'est déposé sur S3 : on joint toujours, sinon le lien serait mort.
        const joint = test || pdf.length <= PIECE_JOINTE_MAX;
        const nomFichier = `Check-in report ${code} - Move In Paris.pdf`;

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
          attachments: joint ? [{ name: nomFichier, contentType: "application/pdf", base64: pdf.toString("base64") }] : [],
          origine: "checkin-finalisation",
        });
        if (!res.ok) throw new Error(`envoi refusé : ${res.erreur}`);

        let rangement = "";
        if (!test) {
          // L'EMAIL EST PARTI : la toute première écriture est l'horodatage (+ photos vidées),
          // pour que la fiche sorte des candidates avant tout autre appel Airtable. Si cette
          // écriture échoue malgré les tentatives, on crie fort : c'est le seul cas où un
          // doublon redevient possible au passage suivant, et il faut horodater à la main.
          try {
            await airtable("PATCH", T_CHECKIN, { records: [{ id: ch.id, fields: { [CHAMP_PHOTOS]: [], [CHAMP_ENVOYE]: new Date().toISOString() } }] });
          } catch (e) {
            rangement += ` · :rotating_light: HORODATAGE IMPOSSIBLE (${e instanceof Error ? e.message.slice(0, 120) : e}) — remplir « ${CHAMP_ENVOYE} » À LA MAIN sinon le rapport repartira au prochain passage`;
          }
          // Le PDF est rangé SUR la réservation (pièce jointe « Rapport de check-in »), comme le
          // contrat signé : Airtable va chercher le fichier par le lien S3 (valide 7 jours) et le
          // garde ensuite pour toujours — au check-out, des mois plus tard, il sera là sans lien
          // expiré. Ajout aux pièces existantes, jamais remplacement. Un échec ne bloque rien :
          // il est signalé dans Slack pour rattrapage à la main.
          try {
            const existants = (Array.isArray(resa.fields[CHAMP_RAPPORT_RESA]) ? (resa.fields[CHAMP_RAPPORT_RESA] as Array<{ id: string }>) : []).map((a) => ({ id: a.id }));
            await airtable("PATCH", T_RESERVATIONS, { records: [{ id: resa.id, fields: { [CHAMP_RAPPORT_RESA]: [...existants, { url: lien, filename: nomFichier }] } }] });
          } catch (e) {
            rangement += ` · :warning: PDF NON rangé sur la réservation (${e instanceof Error ? e.message.slice(0, 140) : e})`;
          }
          try {
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
          } catch (e) {
            rangement += ` · :warning: ligne Documents NON créée (${e instanceof Error ? e.message.slice(0, 140) : e})`;
          }
        }
        const alertePhotos = brutes > 0 ? ` · :warning: ${brutes} photo(s) intégrée(s) sans réduction (PDF plus lourd)` : (nbPhotos && reduites === 0 && !brutes ? " · vignettes Airtable utilisées (optimiseur d'images indisponible)" : "");
        faits.push(`• ${code} — ${nomComplet}, ${nomCourt} · ${nbPhotos} photos · ${(pdf.length / 1048576).toFixed(1)} Mo ${joint ? "en pièce jointe" : "par lien"} → ${test ? "vincent@ (test)" : emailOcc}${cc && !test ? ` (cc ${cc})` : ""}${ignorees.length ? ` · ${ignorees.length} photo(s) illisible(s) ignorée(s) : ${ignorees.slice(0, 5).join(", ")}` : ""}${alertePhotos}${rangement}`);
      } catch (e) {
        refus.push(`• ${code} — ${e instanceof Error ? e.message : e}`);
        refusParFiche.set(ch.id, `• ${code} — ${e instanceof Error ? e.message : e}`);
      } finally {
        if (verrou) await deverrouiller(verrou);
      }
    }
    if (!test && (faits.length || refus.length)) {
      // Un refus n'est crié qu'une fois par jour et par fiche (elle reste candidate à chaque passage).
      const refusACrier: string[] = [];
      for (const [id, ligne] of refusParFiche) if (!(await dejaCrieAujourdhui(id))) refusACrier.push(ligne);
      const sansAccroc = faits.every((l) => !l.includes(":warning:") && !l.includes(":rotating_light:"));
      await slack(CANAL_CHECKIN, [
        faits.length ? `:clipboard: *Rapport de check-in envoyé au locataire*\n${faits.join("\n")}\n_${sansAccroc ? "PDF rangé sur la réservation (S3 check-in-inspection + pièce jointe) et dans Documents, photos retirées de la fiche." : "Voir les avertissements ligne par ligne."}_` : "",
        refusACrier.length ? `:warning: *Rapport de check-in non envoyé — à corriger*\n${refusACrier.join("\n")}` : "",
      ].filter(Boolean).join("\n\n"));
    }
    return NextResponse.json({ ok: true, test, candidats: candidats.length, envoyes: faits, refuses: refus });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await slack(CANAL_CHECKIN, `:warning: *Finalisation des check-ins en échec* : ${msg}`);
    return NextResponse.json({ ok: false, erreur: msg }, { status: 500 });
  }
}
