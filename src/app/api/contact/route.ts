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

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Erreur envoi email:", error);
    const message = error instanceof Error ? error.message : "Erreur inconnue";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
