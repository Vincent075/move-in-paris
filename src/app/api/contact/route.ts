import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    const { formType, ...fields } = data;

    let subject = "Nouveau message — Move in Paris";
    let body = "";

    switch (formType) {
      case "contact":
        subject = `Contact — ${fields.prenom} ${fields.nom}`;
        body = `Prénom : ${fields.prenom}\nNom : ${fields.nom}\nEmail : ${fields.email}\nTéléphone : ${fields.telephone}\nProfil : ${fields.profil}\n\nMessage :\n${fields.message}`;
        break;
      case "proposer":
        subject = `Proposition de bien — ${fields.prenom} ${fields.nom}`;
        body = `PROPRIÉTAIRE\nCivilité : ${fields.civilite}\nPrénom : ${fields.prenom}\nNom : ${fields.nom}\nEmail : ${fields.email}\nTéléphone : ${fields.telephone}\n\nAPPARTEMENT\nAdresse : ${fields.adresse}\nSurface : ${fields.surface} m²\nPièces : ${fields.pieces}\nÉtage : ${fields.etage}\nÉtat : ${fields.etat}\nDisponibilité : ${fields.disponibilite}\n\nDescription :\n${fields.description}`;
        break;
      case "visite":
        subject = `Demande de visite — ${fields.appartement}`;
        body = `Appartement : ${fields.appartement}\nNom : ${fields.nom}\nEmail : ${fields.email}\nTéléphone : ${fields.telephone}\n\nMessage :\n${fields.message}`;
        break;
      default:
        body = JSON.stringify(fields, null, 2);
    }

    // Send via FormSubmit (free, no API key needed)
    const res = await fetch("https://formsubmit.co/ajax/contact@move-in-paris.com", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        _subject: subject,
        message: body,
        email: fields.email || "noreply@move-in-paris.com",
        name: fields.prenom ? `${fields.prenom} ${fields.nom}` : fields.nom || "Move in Paris",
      }),
    });

    const result = await res.json();

    if (result.success === "true" || result.success === true) {
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json({ error: "Erreur d'envoi", details: result }, { status: 500 });
    }
  } catch (error) {
    console.error("Erreur envoi email:", error);
    return NextResponse.json({ error: "Erreur d'envoi" }, { status: 500 });
  }
}
