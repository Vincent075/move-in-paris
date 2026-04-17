import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    const { formType, ...fields } = data;

    const resend = new Resend(process.env.RESEND_API_KEY);

    let subject = "Nouveau message — Move in Paris";
    let htmlContent = "";

    switch (formType) {
      case "contact":
        subject = `Contact — ${fields.prenom} ${fields.nom}`;
        htmlContent = `
          <h2>Nouveau message de contact</h2>
          <p><strong>Prénom :</strong> ${fields.prenom || ""}</p>
          <p><strong>Nom :</strong> ${fields.nom || ""}</p>
          <p><strong>Email :</strong> ${fields.email || ""}</p>
          <p><strong>Téléphone :</strong> ${fields.telephone || ""}</p>
          <p><strong>Profil :</strong> ${fields.profil || ""}</p>
          <p><strong>Message :</strong></p>
          <p>${fields.message || ""}</p>
        `;
        break;

      case "proposer":
        subject = `Proposition de bien — ${fields.prenom} ${fields.nom}`;
        htmlContent = `
          <h2>Nouvelle proposition d'appartement</h2>
          <h3>Propriétaire</h3>
          <p><strong>Civilité :</strong> ${fields.civilite || ""}</p>
          <p><strong>Prénom :</strong> ${fields.prenom || ""}</p>
          <p><strong>Nom :</strong> ${fields.nom || ""}</p>
          <p><strong>Email :</strong> ${fields.email || ""}</p>
          <p><strong>Téléphone :</strong> ${fields.telephone || ""}</p>
          <h3>Appartement</h3>
          <p><strong>Adresse :</strong> ${fields.adresse || ""}</p>
          <p><strong>Surface :</strong> ${fields.surface || ""} m²</p>
          <p><strong>Pièces :</strong> ${fields.pieces || ""}</p>
          <p><strong>Étage :</strong> ${fields.etage || ""}</p>
          <p><strong>État :</strong> ${fields.etat || ""}</p>
          <p><strong>Disponibilité :</strong> ${fields.disponibilite || ""}</p>
          <p><strong>Description :</strong></p>
          <p>${fields.description || ""}</p>
        `;
        break;

      case "visite":
        subject = `Demande de visite — ${fields.appartement}`;
        htmlContent = `
          <h2>Demande de visite</h2>
          <p><strong>Appartement :</strong> ${fields.appartement || ""}</p>
          <p><strong>Nom :</strong> ${fields.nom || ""}</p>
          <p><strong>Email :</strong> ${fields.email || ""}</p>
          <p><strong>Téléphone :</strong> ${fields.telephone || ""}</p>
          <p><strong>Message :</strong></p>
          <p>${fields.message || ""}</p>
        `;
        break;

      default:
        subject = "Nouveau message — Move in Paris";
        htmlContent = `<pre>${JSON.stringify(fields, null, 2)}</pre>`;
    }

    await resend.emails.send({
      from: "Move in Paris <onboarding@resend.dev>",
      to: "contact@move-in-paris.com",
      subject,
      html: htmlContent,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Erreur envoi email:", error);
    return NextResponse.json({ error: "Erreur d'envoi" }, { status: 500 });
  }
}
