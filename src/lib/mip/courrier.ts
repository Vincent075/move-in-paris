// Briques communes aux automatisations « locataire » côté Vercel (03/09/2026).
//
// Pourquoi ici et pas dans n8n : l'API n8n ne sait pas créer de nœud portant un
// credential, donc un nouveau workflow monté par API ne peut ni lire Airtable, ni
// écrire sur S3, ni envoyer un email. Vercel, lui, a le jeton Airtable, les clés S3
// et le secret du cron. On prépare donc tout ici — données, HTML, pièces jointes —
// et on ne confie à n8n que l'envoi SMTP, par le relais AUTO-41 qui appelle le
// sous-workflow « MIP — Envoi Email (routage par collaborateur) » : l'email part de la
// boîte du collaborateur de la réservation, comme tous les emails locataires.
import { createHash, createHmac } from "crypto";

export type Dict = Record<string, unknown>;
export type Rec = { id: string; fields: Dict };

const AT_BASE = process.env.AIRTABLE_BASE_ID || "";
const AT_TOKEN = process.env.AIRTABLE_WATCHDOG_TOKEN || "";

export const texte = (v: unknown) => (typeof v === "string" ? v : v == null ? "" : String(v));
export const premier = (v: unknown) => (Array.isArray(v) ? texte(v[0]) : texte(v));

// ── Airtable ────────────────────────────────────────────────────────────────
// Trois tentatives sur 429 (5 requêtes/s par base : un ping webhook réveille plusieurs
// crons en parallèle) et sur 5xx, avec une pause croissante. Les 4xx « métier »
// (422 champ inconnu, 404…) restent immédiats : réessayer n'y changerait rien.
export async function airtable(method: string, path: string, body?: unknown): Promise<Dict> {
  let derniere = "";
  for (let tentative = 1; tentative <= 3; tentative++) {
    const r = await fetch(`https://api.airtable.com/v0/${AT_BASE}/${path}`, {
      method,
      headers: { Authorization: `Bearer ${AT_TOKEN}`, "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
      cache: "no-store",
    });
    if (r.ok) return (await r.json()) as Dict;
    derniere = `Airtable ${method} ${path} -> ${r.status} ${(await r.text()).slice(0, 300)}`;
    if (r.status !== 429 && r.status < 500) break;
    await new Promise((res) => setTimeout(res, 1200 * tentative));
  }
  throw new Error(derniere);
}

export async function lireTable(tableId: string, formule?: string): Promise<Rec[]> {
  const out: Rec[] = [];
  let offset = "";
  do {
    const q = new URLSearchParams({ pageSize: "100" });
    if (formule) q.set("filterByFormula", formule);
    if (offset) q.set("offset", offset);
    const page = await airtable("GET", `${tableId}?${q}`);
    out.push(...((page.records as Rec[]) ?? []));
    offset = texte(page.offset);
  } while (offset);
  return out;
}

export async function lireEnregistrement(tableId: string, id: string): Promise<Rec | null> {
  if (!id) return null;
  try {
    return (await airtable("GET", `${tableId}/${id}`)) as Rec;
  } catch {
    return null;
  }
}

// ── Slack ───────────────────────────────────────────────────────────────────
export async function slack(canal: string, message: string): Promise<boolean> {
  const token = process.env.SLACK_BOT_TOKEN_MIP || "";
  if (!token) return false;
  try {
    const r = await fetch("https://slack.com/api/chat.postMessage", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ channel: canal, text: message }),
    });
    return r.ok && ((await r.json()) as Dict).ok === true;
  } catch {
    return false;
  }
}

// ── Expéditeur : la boîte du collaborateur, comme AUTO-08A ──────────────────
// Le sous-workflow d'envoi ne connaît que trois boîtes ; tout le reste retombe sur
// Guillaume, et on le fait ici explicitement plutôt que de laisser le routeur
// choisir Stéphane par défaut.
const ROUTABLES = new Set(["stephane@move-in-paris.com", "guillaume@move-in-paris.com", "vincent@move-in-paris.com"]);
export type Signataire = { prenom: string; nom: string; fonction: string; email: string; tel: string };
const T_UTILISATEURS = "tblCTaXoRZpJGSesQ";

export async function signataire(collaborateur: unknown): Promise<Signataire> {
  const email = texte((collaborateur as Dict | undefined)?.email).toLowerCase().trim();
  const defaut: Signataire = { prenom: "Guillaume", nom: "Formery", fonction: "Property Manager", email: "guillaume@move-in-paris.com", tel: "+33 7 71 07 51 14" };
  if (!email || !ROUTABLES.has(email)) return defaut;
  try {
    const rows = await lireTable(T_UTILISATEURS, `LOWER({Email}) = '${email}'`);
    const u = rows[0]?.fields;
    if (!u) return { ...defaut, email };
    return {
      prenom: texte(u["Prénom"]) || defaut.prenom,
      nom: texte(u["Nom"]) || defaut.nom,
      fonction: texte(u["Rôle"]) || defaut.fonction,
      email,
      tel: texte(u["Téléphone"]) || defaut.tel,
    };
  } catch {
    return { ...defaut, email };
  }
}

// ── Gabarit email locataire (structure d'AUTO-08A, en anglais) ──────────────
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export type Carte = { label: string; valeur: string; gras?: boolean };
export type EmailLocataire = {
  titre: string;                 // <title> et pré-en-tête
  prenom: string;                // « Dear Prénom, » — prénom seul, jamais de civilité
  intro: string[];               // paragraphes (HTML autorisé)
  cartes?: Carte[];              // bloc à liseré or
  encadre?: { titre: string; corps: string };  // encadré « Important »
  fin: string[];                 // paragraphes de conclusion (HTML autorisé)
  signataire: Signataire;
};

export function htmlEmailLocataire(e: EmailLocataire): string {
  const p = (s: string) => `<p style="margin:0 0 16px 0;">${s}</p>`;
  const ligne = (c: Carte) =>
    `<tr><td width="42%" class="text-mid label-mob label-col" style="padding:9px 0;font-family:Arial,Helvetica,sans-serif;font-size:11px;letter-spacing:1.5px;color:#6B6B6B;text-transform:uppercase;vertical-align:middle;line-height:1.5;">${esc(c.label)}</td>` +
    `<td class="text-dark value-mob" style="padding:9px 0;font-family:Georgia,'Times New Roman',serif;font-size:15px;color:#0D0D0D;${c.gras ? "font-weight:bold;" : ""}vertical-align:middle;line-height:1.5;">${esc(c.valeur)}</td></tr>`;
  const cartes = e.cartes?.length
    ? `<tr><td class="pad-x-lg" style="padding:24px 40px 8px 40px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="card-bg" style="background-color:#F5F0EB;border-left:3px solid #B88B58;"><tr><td class="pad-card" style="padding:22px 26px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${e.cartes.map(ligne).join("")}</table></td></tr></table></td></tr>`
    : "";
  const encadre = e.encadre
    ? `<tr><td class="pad-x-lg" style="padding:24px 40px 0 40px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#FFF8E8;border:2px solid #B88B58;"><tr><td style="padding:22px 26px;"><div class="text-gold" style="font-family:Arial,Helvetica,sans-serif;font-size:11px;letter-spacing:2.5px;color:#B88B58;text-transform:uppercase;font-weight:bold;margin-bottom:10px;">${esc(e.encadre.titre)}</div><p class="text-dark" style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:15px;line-height:1.6;color:#0D0D0D;">${e.encadre.corps}</p></td></tr></table></td></tr>`
    : "";
  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><meta name="x-apple-disable-message-reformatting"><meta name="color-scheme" content="light only"><meta name="supported-color-schemes" content="light"><title>${esc(e.titre)}</title>
<style type="text/css">@media (prefers-color-scheme: dark){.body-bg{background-color:#F5F0EB!important;}.container{background-color:#FFFFFF!important;}.header-blk{background-color:#0D0D0D!important;}.gold-bar{background-color:#B88B58!important;}.text-dark{color:#0D0D0D!important;}.text-mid{color:#6B6B6B!important;}.text-gold{color:#B88B58!important;}.card-bg{background-color:#F5F0EB!important;}.border-soft{border-color:#E8E4DF!important;}}
[data-ogsc] .body-bg{background-color:#F5F0EB!important;}[data-ogsc] .container{background-color:#FFFFFF!important;}[data-ogsc] .text-dark{color:#0D0D0D!important;}[data-ogsc] .text-mid{color:#6B6B6B!important;}[data-ogsc] .text-gold{color:#B88B58!important;}[data-ogsc] .card-bg{background-color:#F5F0EB!important;}
@media screen and (max-width:480px){.container{width:100%!important;max-width:100%!important;}.pad-x-lg{padding-left:24px!important;padding-right:24px!important;}.pad-card{padding:20px 18px!important;}.label-mob{font-size:10px!important;letter-spacing:1.2px!important;padding-right:8px!important;}.value-mob{font-size:14px!important;}.body-text{font-size:15px!important;line-height:1.65!important;}.label-col{width:42%!important;}.header-pad{padding:4px 24px!important;}.logo-img{width:130px!important;max-width:130px!important;}}</style></head>
<body class="body-bg" style="margin:0;padding:0;background-color:#F5F0EB;font-family:Georgia,'Times New Roman',serif;color:#0D0D0D;-webkit-font-smoothing:antialiased;">
<div style="display:none;max-height:0;overflow:hidden;font-size:1px;line-height:1px;color:#F5F0EB;opacity:0;">${esc(e.titre)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="body-bg" style="background-color:#F5F0EB;"><tr><td align="center" style="padding:32px 16px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" class="container" style="width:100%;max-width:600px;background-color:#FFFFFF;border:1px solid #E8E4DF;">
<tr><td align="center" class="header-blk header-pad" style="background-color:#0D0D0D;padding:2px 40px;"><a href="https://www.move-in-paris.com" style="text-decoration:none;display:inline-block;"><img src="https://www.move-in-paris.com/Logo-gold.png" alt="Move in Paris" width="150" class="logo-img" style="display:block;border:0;height:auto;max-width:150px;"></a></td></tr>
<tr><td class="gold-bar" style="background-color:#B88B58;height:2px;line-height:2px;font-size:0;">&nbsp;</td></tr>
<tr><td class="pad-x-lg text-dark body-text" style="padding:36px 40px 8px 40px;font-family:Georgia,'Times New Roman',serif;font-size:16px;line-height:1.75;color:#0D0D0D;">${p(`Dear ${esc(e.prenom || "Guest")},`)}${e.intro.map(p).join("")}</td></tr>
${cartes}${encadre}
<tr><td class="pad-x-lg text-dark body-text" style="padding:32px 40px 8px 40px;font-family:Georgia,'Times New Roman',serif;font-size:16px;line-height:1.75;color:#0D0D0D;">${e.fin.map(p).join("")}<p style="margin:0;">Kind regards,</p></td></tr>
<tr><td class="pad-x-lg text-dark" style="padding:8px 40px 40px 40px;font-family:Georgia,'Times New Roman',serif;font-size:15px;color:#0D0D0D;line-height:1.5;"><p style="margin:0;font-weight:bold;">${esc(e.signataire.prenom)} ${esc(e.signataire.nom)}</p><p class="text-mid" style="margin:4px 0 0 0;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#6B6B6B;">${esc(e.signataire.fonction)}</p><p class="text-mid" style="margin:8px 0 0 0;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#6B6B6B;"><a href="mailto:${esc(e.signataire.email)}" style="color:#6B6B6B;text-decoration:none;">${esc(e.signataire.email)}</a> &nbsp;·&nbsp; ${esc(e.signataire.tel)}</p></td></tr>
<tr><td align="center" class="card-bg pad-x-lg border-soft" style="background-color:#F5F0EB;padding:18px 40px;text-align:center;font-family:Arial,Helvetica,sans-serif;font-size:11px;letter-spacing:1px;color:#6B6B6B;line-height:1.7;border-top:1px solid #E8E4DF;"><div class="text-gold" style="color:#B88B58;font-family:Georgia,'Times New Roman',serif;font-style:italic;font-size:12px;letter-spacing:0.5px;">The art of Parisian living</div><div style="margin-top:6px;">Move In Paris · 26 rue de l'Étoile, 75017 Paris · +33 1 45 20 06 03</div></td></tr>
<tr><td class="gold-bar" style="background-color:#B88B58;height:2px;line-height:2px;font-size:0;">&nbsp;</td></tr>
</table></td></tr></table></body></html>`;
}

// ── Envoi par le relais n8n (AUTO-41) → SMTP du collaborateur ────────────────
export type PieceJointe = { name: string; contentType: string; base64: string };
export async function envoyerEmailLocataire(args: {
  usrEmail: string; mailTo: string; mailCc?: string; mailReplyTo?: string;
  mailSubject: string; mailHtml: string; attachments?: PieceJointe[]; origine: string;
}): Promise<{ ok: boolean; erreur?: string }> {
  const url = process.env.N8N_RELAIS_EMAIL_URL || "";
  if (!url) return { ok: false, erreur: "N8N_RELAIS_EMAIL_URL absente" };
  const r = await fetch(url, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...args, mailFrom: `Move In Paris <${args.usrEmail}>` }),
    cache: "no-store",
  });
  let j: Dict = {};
  try { j = (await r.json()) as Dict; } catch { /* réponse vide */ }
  if (!r.ok || j.ok !== true) return { ok: false, erreur: texte(j.erreur) || `relais ${r.status}` };
  return { ok: true };
}

// ── S3 Scaleway (mêmes clés, même bucket, mêmes conventions que n8n) ─────────
const S3 = {
  host: "s3.fr-par.scw.cloud", region: "fr-par", bucket: "move-in-paris-buckets",
  access: process.env.SCW_S3_ACCESS_KEY || "", secret: process.env.SCW_S3_SECRET_KEY || "",
};
const sha256 = (d: string | Buffer) => createHash("sha256").update(d).digest("hex");
const hmac = (k: string | Buffer, d: string) => createHmac("sha256", k).update(d).digest();
function signature(dateStamp: string, stringToSign: string) {
  const kDate = hmac("AWS4" + S3.secret, dateStamp);
  const kRegion = hmac(kDate, S3.region);
  const kService = hmac(kRegion, "s3");
  const kSigning = hmac(kService, "aws4_request");
  return createHmac("sha256", kSigning).update(stringToSign).digest("hex");
}
const encKey = (key: string) => key.split("/").map(encodeURIComponent).join("/");
function dates() {
  const amzDate = new Date().toISOString().replace(/[:-]/g, "").replace(/\.\d{3}Z$/, "Z");
  return { amzDate, dateStamp: amzDate.slice(0, 8) };
}

// Lien de téléchargement signé, 7 jours — même durée que les liens des documents
// produits par n8n, et même format d'URL (clé extractible par AUTO-04C).
export function lienS3(key: string, expiresSeconds = 604800): string {
  const { amzDate, dateStamp } = dates();
  const scope = `${dateStamp}/${S3.region}/s3/aws4_request`;
  const qs = [
    "X-Amz-Algorithm=AWS4-HMAC-SHA256",
    `X-Amz-Credential=${encodeURIComponent(`${S3.access}/${scope}`)}`,
    `X-Amz-Date=${amzDate}`,
    `X-Amz-Expires=${expiresSeconds}`,
    "X-Amz-SignedHeaders=host",
  ].join("&");
  const uri = `/${S3.bucket}/${encKey(key)}`;
  const canonical = `GET\n${uri}\n${qs}\nhost:${S3.host}\n\nhost\nUNSIGNED-PAYLOAD`;
  const sts = `AWS4-HMAC-SHA256\n${amzDate}\n${scope}\n${sha256(canonical)}`;
  return `https://${S3.host}${uri}?${qs}&X-Amz-Signature=${signature(dateStamp, sts)}`;
}

export async function deposerS3(key: string, corps: Buffer, contentType: string): Promise<void> {
  if (!S3.access || !S3.secret) throw new Error("clés S3 absentes (SCW_S3_ACCESS_KEY / SCW_S3_SECRET_KEY)");
  const { amzDate, dateStamp } = dates();
  const scope = `${dateStamp}/${S3.region}/s3/aws4_request`;
  const uri = `/${S3.bucket}/${encKey(key)}`;
  const payloadHash = sha256(corps);
  const headers: Record<string, string> = {
    host: S3.host, "content-type": contentType, "x-amz-content-sha256": payloadHash, "x-amz-date": amzDate,
  };
  const signed = Object.keys(headers).sort();
  const canonicalHeaders = signed.map((h) => `${h}:${headers[h].trim()}\n`).join("");
  const canonical = `PUT\n${uri}\n\n${canonicalHeaders}\n${signed.join(";")}\n${payloadHash}`;
  const sts = `AWS4-HMAC-SHA256\n${amzDate}\n${scope}\n${sha256(canonical)}`;
  const auth = `AWS4-HMAC-SHA256 Credential=${S3.access}/${scope}, SignedHeaders=${signed.join(";")}, Signature=${signature(dateStamp, sts)}`;
  const r = await fetch(`https://${S3.host}${uri}`, {
    method: "PUT",
    headers: { "Content-Type": contentType, "x-amz-content-sha256": payloadHash, "x-amz-date": amzDate, Authorization: auth },
    body: new Uint8Array(corps),
  });
  if (!r.ok) throw new Error(`S3 PUT ${key} -> ${r.status} ${(await r.text()).slice(0, 200)}`);
}

export async function telechargerS3(key: string): Promise<Buffer | null> {
  const r = await fetch(lienS3(key, 600), { cache: "no-store" });
  if (!r.ok) return null;
  return Buffer.from(await r.arrayBuffer());
}

// ── Dates ────────────────────────────────────────────────────────────────────
export const jourParis = (v: unknown): string => {
  const t = Date.parse(texte(v));
  if (!Number.isFinite(t)) return "";
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(t));
};
export const dateEN = (v: unknown): string => {
  const t = Date.parse(texte(v));
  if (!Number.isFinite(t)) return "";
  return new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Paris", weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(new Date(t));
};
export const maintenantParisISO = () => new Date().toISOString();
