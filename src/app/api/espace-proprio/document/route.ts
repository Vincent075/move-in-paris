import { NextRequest, NextResponse } from "next/server";
import { readSession } from "@/lib/espace-proprio/auth";
import { resolveOwnerByEmail, portalGetAttachmentUrl } from "@/lib/espace-proprio/provider";

// Consultation sécurisée d'un document : session requise, contrôle de
// propriété côté serveur, puis redirection vers l'URL fraîche de la pièce
// jointe Airtable (elles expirent en ~2 h, on ne les stocke jamais).
export async function GET(req: NextRequest) {
  const session = await readSession();
  if (!session) {
    return NextResponse.redirect(new URL("/espace-proprio", req.url));
  }

  const owner = await resolveOwnerByEmail(session.email);
  if (!owner) {
    return NextResponse.redirect(new URL("/espace-proprio", req.url));
  }

  const kind = req.nextUrl.searchParams.get("kind");
  const id = req.nextUrl.searchParams.get("id") || undefined;

  if (kind !== "contrat" && kind !== "document" && kind !== "facture") {
    return NextResponse.json({ error: "type de document inconnu" }, { status: 400 });
  }

  try {
    const url = await portalGetAttachmentUrl(owner, kind, id);
    if (!url) {
      return NextResponse.json(
        { error: "document introuvable ou accès refusé" },
        { status: 404 },
      );
    }
    console.log(`[espace-proprio] Document consulté par ${owner.email} : ${kind}${id ? ` (${id})` : ""}`);
    return NextResponse.redirect(url);
  } catch (e) {
    console.error("[espace-proprio] document error:", e);
    return NextResponse.json({ error: "erreur serveur" }, { status: 500 });
  }
}
