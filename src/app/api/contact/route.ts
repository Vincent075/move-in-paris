import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

function emailTemplate(title: string, content: string, replyEmail?: string) {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /></head>
<body style="margin:0;padding:0;background-color:#F5F0EB;font-family:Arial,Helvetica,sans-serif;">
  <div style="max-width:600px;margin:0 auto;background-color:#ffffff;">

    <!-- Header -->
    <div style="background-color:#0D0D0D;padding:12px 40px;text-align:center;">
      <img src="https://move-in-paris.vercel.app/Logo-gold.png" alt="Move in Paris" width="120" height="120" style="display:block;margin:0 auto;" />
    </div>

    <!-- Title bar -->
    <div style="background-color:#B88B58;padding:14px 40px;">
      <div style="font-family:Georgia,serif;font-size:18px;color:#0D0D0D;font-weight:bold;">
        ${title}
      </div>
    </div>

    <!-- Content -->
    <div style="padding:30px 40px;">
      ${content}
    </div>

    <!-- Reply info -->
    ${replyEmail ? `
    <div style="padding:0 40px 20px;">
      <div style="background-color:#F5F0EB;padding:16px 20px;border-left:3px solid #B88B58;">
        <div style="font-size:12px;color:#6B6B6B;margin-bottom:4px;">Répondre directement à :</div>
        <a href="mailto:${replyEmail}" style="color:#B88B58;font-size:14px;text-decoration:none;font-weight:bold;">${replyEmail}</a>
      </div>
    </div>
    ` : ""}

    <!-- Footer -->
    <div style="background-color:#0D0D0D;padding:24px 40px;text-align:center;">
      <div style="font-size:12px;color:#ffffff80;margin-bottom:8px;">
        Move in Paris — 26, rue de l'Étoile, 75017 Paris
      </div>
      <div style="font-size:12px;color:#ffffff40;">
        +33 1 45 20 06 03 — contact@move-in-paris.com
      </div>
    </div>
  </div>
</body>
</html>`;
}

function row(label: string, value: string) {
  return `
    <tr>
      <td style="padding:8px 12px;font-size:13px;color:#6B6B6B;border-bottom:1px solid #F5F0EB;width:140px;vertical-align:top;">${label}</td>
      <td style="padding:8px 12px;font-size:14px;color:#1A1A1A;border-bottom:1px solid #F5F0EB;">${value || "—"}</td>
    </tr>`;
}

function formatEuro(n: number) {
  return n.toLocaleString("fr-FR");
}

function propositionEmail(fields: Record<string, string>) {
  const civilite = (fields.civilite || "").trim();
  const prenom = (fields.prenom || "").trim();
  const nom = (fields.nom || "").trim();
  const greeting = `${civilite ? civilite + " " : ""}${prenom} ${nom}`.trim() || prenom || "Madame, Monsieur";
  const zone = fields.zone || "";
  const adresse = fields.adresse || zone;
  const surface = parseFloat(fields.surface || "0") || 0;
  const pieces = fields.pieces || "";
  const piecesLabel =
    pieces === "1" ? "Studio / 1 pièce" :
    pieces === "2" ? "2 pièces" :
    pieces === "3" ? "3 pièces" :
    pieces === "4+" ? "4 pièces et plus" : pieces;
  const loyerMajore = parseFloat(fields.loyerMajore || "0") || 0;
  const loyerMIP = parseFloat(fields.loyerMoveInParis || "0") || 0;
  const pricePerM2 = parseFloat(fields.pricePerM2 || "0") || 0;
  const gainMensuel = Math.max(loyerMIP - loyerMajore, 0);
  const gain2ans = gainMensuel * 24;
  const gain3ans = gainMensuel * 36;

  const now = new Date();
  const monthName = now.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
  const monthCap = monthName.charAt(0).toUpperCase() + monthName.slice(1);

  return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><title>Proposition Move In Paris</title></head>
<body style="margin:0;padding:0;background:#f5f4f0;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f5f4f0;padding:32px 16px;"><tr><td align="center">
<table width="620" cellpadding="0" cellspacing="0" border="0" style="max-width:620px;width:100%;">

  <!-- Header -->
  <tr><td style="background:#111;border-radius:12px 12px 0 0;padding:28px 40px 24px;">
    <table width="100%" cellpadding="0" cellspacing="0"><tr>
      <td valign="middle"><img src="https://move-in-paris.vercel.app/Logo-gold.png" alt="Move In Paris" height="48" style="display:block;height:48px;border:0;"/></td>
      <td align="right" valign="middle">
        <span style="color:#aaa;font-size:12px;letter-spacing:.06em;text-transform:uppercase;display:block;">Proposition commerciale</span>
        <span style="color:#666;font-size:11px;display:block;margin-top:4px;">${monthCap}</span>
      </td>
    </tr></table>
  </td></tr>

  <!-- Intro -->
  <tr><td style="background:#fff;padding:32px 40px 24px;">
    <p style="font-size:16px;color:#111;margin:0 0 16px;font-weight:500;">Bonjour ${greeting},</p>
    <p style="font-size:15px;color:#444;line-height:1.7;margin:0 0 10px;">Nous faisons suite à votre demande d'estimation et vous adressons ci-dessous notre proposition de mise en location de votre bien auprès de notre clientèle d'entreprise.</p>
    <p style="font-size:15px;color:#444;line-height:1.7;margin:0;">Vous trouverez une synthèse des conditions proposées, ainsi qu'une comparaison avec les loyers de référence du marché locatif parisien.</p>
  </td></tr>

  <!-- Appartement -->
  <tr><td style="background:#fff;padding:0 40px 24px;">
    <div style="background:#f8f7f4;border-radius:10px;padding:24px;">
      <p style="font-size:11px;font-weight:600;letter-spacing:.1em;text-transform:uppercase;color:#888;margin:0 0 14px;">Votre appartement</p>
      <table width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;">
        <tr><td style="color:#888;padding:4px 0;width:38%;">Adresse / zone</td><td style="color:#111;font-weight:500;padding:4px 0;">${adresse || "—"}</td></tr>
        <tr><td style="color:#888;padding:4px 0;">Superficie</td><td style="color:#111;font-weight:500;padding:4px 0;">${surface} m²</td></tr>
        <tr><td style="color:#888;padding:4px 0;">Typologie</td><td style="color:#111;font-weight:500;padding:4px 0;">${piecesLabel || "—"}</td></tr>
        <tr><td style="color:#888;padding:4px 0;">Bail</td><td style="color:#111;font-weight:500;padding:4px 0;">Bail Code Civil corporate (art. 1714-1762)</td></tr>
      </table>
    </div>
  </td></tr>

  <!-- Comparaison -->
  <tr><td style="background:#fff;padding:0 40px 24px;">
    <p style="font-size:11px;font-weight:600;letter-spacing:.1em;text-transform:uppercase;color:#888;margin:0 0 16px;">Loyer de marché vs Move In Paris</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;"><tr>
      <td width="48%" style="background:#f8f7f4;border-radius:10px;padding:20px;text-align:center;vertical-align:top;">
        <p style="font-size:11px;color:#888;text-transform:uppercase;letter-spacing:.08em;margin:0 0 8px;">Loyer de marché</p>
        <p style="font-size:28px;font-weight:700;color:#888;margin:0;">${formatEuro(loyerMajore)} €</p>
        <p style="font-size:12px;color:#aaa;margin:4px 0 0;">/ mois</p>
        <p style="font-size:11px;color:#ccc;margin:8px 0 0;">Loyer de référence majoré<br/>${pricePerM2} €/m² × ${surface} m²</p>
      </td>
      <td width="4%"></td>
      <td width="48%" style="background:#111;border-radius:10px;padding:20px;text-align:center;vertical-align:top;">
        <p style="font-size:11px;color:#c8a84b;text-transform:uppercase;letter-spacing:.08em;margin:0 0 8px;">Move In Paris</p>
        <p style="font-size:28px;font-weight:700;color:#fff;margin:0;">${formatEuro(loyerMIP)} €</p>
        <p style="font-size:12px;color:#aaa;margin:4px 0 0;">/ mois, charges comprises</p>
        <p style="font-size:11px;color:#888;margin:8px 0 0;">Service 100 % gratuit<br/>Zéro frais, zéro impayé</p>
      </td>
    </tr></table>

    <p style="font-size:11px;font-weight:600;letter-spacing:.1em;text-transform:uppercase;color:#888;margin:0 0 12px;">Ce que vous gagnez en plus</p>
    <table width="100%" cellpadding="0" cellspacing="0"><tr>
      <td width="31%" style="text-align:center;padding:16px 8px;background:#e8f5e0;border-radius:10px;">
        <p style="color:#2d6a0f;font-size:22px;font-weight:700;margin:0;">+${formatEuro(gainMensuel)} €</p>
        <p style="color:#5a9a3a;font-size:12px;font-weight:500;margin:5px 0 0;">par mois</p>
      </td>
      <td width="3%"></td>
      <td width="31%" style="text-align:center;padding:16px 8px;background:#e8f5e0;border-radius:10px;">
        <p style="color:#2d6a0f;font-size:22px;font-weight:700;margin:0;">+${formatEuro(gain2ans)} €</p>
        <p style="color:#5a9a3a;font-size:12px;font-weight:500;margin:5px 0 0;">sur 2 ans</p>
      </td>
      <td width="3%"></td>
      <td width="31%" style="text-align:center;padding:16px 8px;background:#e8f5e0;border-radius:10px;">
        <p style="color:#2d6a0f;font-size:22px;font-weight:700;margin:0;">+${formatEuro(gain3ans)} €</p>
        <p style="color:#5a9a3a;font-size:12px;font-weight:500;margin:5px 0 0;">sur 3 ans</p>
      </td>
    </tr></table>
  </td></tr>

  <!-- Inclus -->
  <tr><td style="background:#fff;padding:0 40px 28px;">
    <p style="font-size:11px;font-weight:600;letter-spacing:.1em;text-transform:uppercase;color:#888;margin:0 0 14px;">Ce qui est inclus</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;color:#444;">
      <tr><td style="padding:5px 0;"><span style="color:#c8a84b;margin-right:8px;">&#9670;</span><strong style="color:#111;">Service 100 % gratuit</strong> — zéro frais de gestion, zéro commission prélevée</td></tr>
      <tr><td style="padding:5px 0;"><span style="color:#c8a84b;margin-right:8px;">&#9670;</span><strong style="color:#111;">Loyer tout inclus</strong> — électricité, gaz, internet + TV, charges d'immeuble, entretien chaudière, TEOM</td></tr>
      <tr><td style="padding:5px 0;"><span style="color:#c8a84b;margin-right:8px;">&#9670;</span><strong style="color:#111;">Gestion opérationnelle complète</strong> — entrées/sorties, comptabilité, reporting trimestriel</td></tr>
      <tr><td style="padding:5px 0;"><span style="color:#c8a84b;margin-right:8px;">&#9670;</span><strong style="color:#111;">Ménage hebdomadaire</strong> — personnel qualifié et salarié</td></tr>
      <tr><td style="padding:5px 0;"><span style="color:#c8a84b;margin-right:8px;">&#9670;</span><strong style="color:#111;">Assistance technique 7j/7</strong> — chaque problème traité immédiatement</td></tr>
      <tr><td style="padding:5px 0;"><span style="color:#c8a84b;margin-right:8px;">&#9670;</span><strong style="color:#111;">Clientèle corporate premium</strong> — L'Oréal, LVMH, AXA, Sanofi, Goldman Sachs… loyers garantis par l'employeur</td></tr>
      <tr><td style="padding:5px 0;"><span style="color:#c8a84b;margin-right:8px;">&#9670;</span><strong style="color:#111;">Taux d'occupation +95 %</strong> — revenu stable, zéro impayé</td></tr>
    </table>
  </td></tr>

  <!-- Source -->
  <tr><td style="background:#fff;padding:0 40px 24px;">
    <div style="border-left:3px solid #eee;padding-left:14px;">
      <p style="font-size:11px;color:#ccc;margin:0;line-height:1.7;">Source : barèmes DRIHL Île-de-France 2025 — ${zone}. Loyer de référence majoré : ${pricePerM2} €/m² × ${surface} m² = ${formatEuro(loyerMajore)} €/mois. Estimation indicative — un conseiller Move in Paris validera après visite.</p>
    </div>
  </td></tr>

  <!-- Closing -->
  <tr><td style="background:#fff;padding:0 40px 36px;border-radius:0 0 12px 12px;">
    <p style="font-size:15px;color:#444;line-height:1.7;margin:0 0 20px;">Nous restons disponibles pour échanger sur cette proposition à votre convenance et pouvons vous faire parvenir notre contrat type ainsi que toute documentation complémentaire.</p>
    <table cellpadding="0" cellspacing="0"><tr>
      <td style="padding-right:20px;vertical-align:top;">
        <img src="https://move-in-paris.vercel.app/Logo-gold.png" alt="Move In Paris" height="36" style="display:block;height:36px;border:0;margin-bottom:10px;"/>
      </td>
      <td style="border-left:1px solid #eee;padding-left:20px;vertical-align:top;">
        <p style="font-size:13px;color:#444;font-weight:500;margin:0 0 6px;">Move In Paris</p>
        <p style="font-size:12px;color:#888;margin:0 0 3px;">26, rue de l'Étoile — 75017 Paris</p>
        <p style="font-size:12px;color:#888;margin:0 0 3px;">+33 1 45 20 06 03</p>
        <p style="font-size:12px;color:#888;margin:0 0 3px;">contact@move-in-paris.com</p>
        <p style="font-size:12px;color:#888;margin:0;">www.move-in-paris.com</p>
      </td>
    </tr></table>
  </td></tr>

  <!-- Footer -->
  <tr><td style="padding:20px 40px;text-align:center;">
    <p style="font-size:11px;color:#bbb;margin:0;">Move In Paris — Proposition confidentielle — ${monthCap}</p>
  </td></tr>

</table>
</td></tr></table>
</body></html>`;
}

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get("content-type") || "";
    let formType = "";
    let fields: Record<string, string> = {};
    const attachments: { filename: string; content: Buffer }[] = [];

    if (contentType.includes("multipart/form-data")) {
      // Form with file uploads (proposer page)
      const formData = await req.formData();
      formType = formData.get("formType") as string;

      let totalSize = 0;
      const MAX_TOTAL_SIZE = 3.5 * 1024 * 1024; // 3.5 Mo max pour les PJ
      const MAX_PHOTOS = 5;
      let photoCount = 0;

      for (const [key, value] of formData.entries()) {
        if (key === "photos") {
          const file = value as File;
          if (file.size > 0 && photoCount < MAX_PHOTOS) {
            const buffer = Buffer.from(await file.arrayBuffer());
            totalSize += buffer.length;
            if (totalSize <= MAX_TOTAL_SIZE) {
              attachments.push({ filename: file.name, content: buffer });
              photoCount++;
            }
          }
        } else {
          fields[key] = value as string;
        }
      }
    } else {
      // JSON (contact, visite)
      const data = await req.json();
      formType = data.formType;
      const { formType: _, ...rest } = data;
      fields = rest;
    }

    const resend = new Resend(process.env.RESEND_API_KEY);

    let subject = "";
    let content = "";

    switch (formType) {
      case "contact":
        subject = `📩 Contact — ${fields.prenom} ${fields.nom}`;
        content = `
          <table style="width:100%;border-collapse:collapse;">
            ${row("Prénom", fields.prenom)}
            ${row("Nom", fields.nom)}
            ${row("Email", `<a href="mailto:${fields.email}" style="color:#B88B58;">${fields.email}</a>`)}
            ${row("Téléphone", fields.telephone ? `<a href="tel:${fields.telephone}" style="color:#B88B58;">${fields.telephone}</a>` : "")}
            ${row("Profil", fields.profil)}
          </table>
          <div style="margin-top:24px;padding:20px;background-color:#F5F0EB;border-radius:4px;">
            <div style="font-size:12px;color:#6B6B6B;margin-bottom:8px;text-transform:uppercase;letter-spacing:1px;">Message</div>
            <div style="font-size:14px;color:#1A1A1A;line-height:1.6;">${(fields.message || "").replace(/\n/g, "<br/>")}</div>
          </div>`;
        break;

      case "proposer":
        subject = `🏠 Proposition de bien — ${fields.prenom} ${fields.nom}`;
        content = `
          <div style="font-family:Georgia,serif;font-size:16px;color:#B88B58;margin-bottom:12px;">Propriétaire</div>
          <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
            ${row("Civilité", fields.civilite)}
            ${row("Prénom", fields.prenom)}
            ${row("Nom", fields.nom)}
            ${row("Email", `<a href="mailto:${fields.email}" style="color:#B88B58;">${fields.email}</a>`)}
            ${row("Téléphone", fields.telephone ? `<a href="tel:${fields.telephone}" style="color:#B88B58;">${fields.telephone}</a>` : "")}
          </table>
          <div style="font-family:Georgia,serif;font-size:16px;color:#B88B58;margin-bottom:12px;">Appartement</div>
          <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
            ${row("Adresse", fields.adresse)}
            ${row("Surface", fields.surface ? fields.surface + " m²" : "")}
            ${row("Pièces", fields.pieces)}
            ${row("Étage", fields.etage)}
            ${row("État du bien", fields.etat)}
            ${row("Disponibilité", fields.disponibilite)}
          </table>
          ${fields.description ? `
          <div style="padding:20px;background-color:#F5F0EB;border-radius:4px;">
            <div style="font-size:12px;color:#6B6B6B;margin-bottom:8px;text-transform:uppercase;letter-spacing:1px;">Description</div>
            <div style="font-size:14px;color:#1A1A1A;line-height:1.6;">${fields.description.replace(/\n/g, "<br/>")}</div>
          </div>` : ""}
          ${attachments.length > 0 ? `
          <div style="margin-top:16px;padding:12px 20px;background-color:#0D0D0D;border-radius:4px;">
            <div style="font-size:13px;color:#B88B58;">📎 ${attachments.length} photo${attachments.length > 1 ? "s" : ""} jointe${attachments.length > 1 ? "s" : ""}</div>
          </div>` : ""}`;
        break;

      case "visite":
        subject = `🔑 Demande de visite — ${fields.appartement}`;
        content = `
          <div style="background-color:#0D0D0D;padding:16px 20px;margin-bottom:20px;border-radius:4px;">
            <div style="font-size:12px;color:#B88B58;letter-spacing:1px;text-transform:uppercase;margin-bottom:4px;">Appartement</div>
            <div style="font-family:Georgia,serif;font-size:20px;color:#ffffff;">${fields.appartement}</div>
          </div>
          <table style="width:100%;border-collapse:collapse;">
            ${row("Nom", fields.nom)}
            ${row("Email", `<a href="mailto:${fields.email}" style="color:#B88B58;">${fields.email}</a>`)}
            ${row("Téléphone", fields.telephone ? `<a href="tel:${fields.telephone}" style="color:#B88B58;">${fields.telephone}</a>` : "")}
          </table>
          <div style="margin-top:24px;padding:20px;background-color:#F5F0EB;border-radius:4px;">
            <div style="font-size:12px;color:#6B6B6B;margin-bottom:8px;text-transform:uppercase;letter-spacing:1px;">Message</div>
            <div style="font-size:14px;color:#1A1A1A;line-height:1.6;">${(fields.message || "").replace(/\n/g, "<br/>")}</div>
          </div>`;
        break;

      case "estimation":
        subject = `💰 Lead estimation — ${fields.prenom} ${fields.nom} (${fields.zone})`;
        content = `
          <div style="font-family:Georgia,serif;font-size:16px;color:#B88B58;margin-bottom:12px;">Contact</div>
          <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
            ${row("Civilité", fields.civilite)}
            ${row("Prénom", fields.prenom)}
            ${row("Nom", fields.nom)}
            ${row("Email", `<a href="mailto:${fields.email}" style="color:#B88B58;">${fields.email}</a>`)}
            ${row("Téléphone", fields.telephone ? `<a href="tel:${fields.telephone}" style="color:#B88B58;">${fields.telephone}</a>` : "")}
          </table>
          <div style="font-family:Georgia,serif;font-size:16px;color:#B88B58;margin-bottom:12px;">Bien</div>
          <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
            ${row("Adresse", fields.adresse)}
            ${row("Zone", fields.zone)}
            ${row("Surface", fields.surface ? fields.surface + " m²" : "")}
            ${row("Pièces", fields.pieces)}
            ${row("Époque", fields.epoch)}
          </table>
          <div style="background-color:#0D0D0D;padding:20px;border-radius:4px;margin-bottom:16px;">
            <div style="font-size:11px;color:#B88B58;letter-spacing:1px;text-transform:uppercase;margin-bottom:6px;">Estimation communiquée</div>
            <div style="font-family:Georgia,serif;font-size:28px;color:#B88B58;font-weight:bold;">${fields.loyerMoveInParis ? Number(fields.loyerMoveInParis).toLocaleString("fr-FR") + " €/mois" : "—"}</div>
            <div style="font-size:12px;color:#ffffff80;margin-top:4px;">
              Loyer majoré (encadrement) : ${fields.loyerMajore ? Number(fields.loyerMajore).toLocaleString("fr-FR") + " €" : "—"}
              — ${fields.pricePerM2 ? fields.pricePerM2 + " €/m²" : ""}
            </div>
          </div>`;
        break;

      default:
        subject = "Nouveau message — Move in Paris";
        content = `<pre style="font-size:13px;">${JSON.stringify(fields, null, 2)}</pre>`;
    }

    const titleMap: Record<string, string> = {
      contact: "Nouveau message de contact",
      proposer: "Nouvelle proposition de bien",
      visite: "Demande de visite",
      estimation: "Nouveau lead — Estimation de loyer",
    };

    const result = await resend.emails.send({
      from: "Move in Paris <noreply@move-in-paris.com>",
      to: "contact@move-in-paris.com",
      replyTo: fields.email || undefined,
      subject,
      html: emailTemplate(titleMap[formType] || "Nouveau message", content, fields.email),
      attachments: attachments.length > 0 ? attachments : undefined,
    });

    if (result.error) {
      console.error("Resend error:", result.error);
      return NextResponse.json({ error: result.error.message }, { status: 500 });
    }

    // Lead-facing email for estimation: send the HTML proposal to the prospect
    if (formType === "estimation" && fields.email) {
      try {
        await resend.emails.send({
          from: "Move in Paris <noreply@move-in-paris.com>",
          to: fields.email,
          replyTo: "contact@move-in-paris.com",
          subject: `Votre estimation Move in Paris — ${fields.zone || "Paris"}`,
          html: propositionEmail(fields),
        });
      } catch (err) {
        console.error("Erreur envoi proposition au lead:", err);
        // On ne bloque pas la réponse — l'email interne a déjà été envoyé
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Erreur envoi email:", error);
    const message = error instanceof Error ? error.message : "Erreur inconnue";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
