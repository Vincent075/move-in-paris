import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { createLoginToken } from "@/lib/espace-proprio/auth";
import { resolveOwnerByEmail } from "@/lib/espace-proprio/provider";
import { magicLinkEmail } from "@/lib/espace-proprio/magic-email";

// Anti-rafale par instance : 1 envoi / email / 60 s
const lastSent = new Map<string, number>();

export async function POST(req: NextRequest) {
  try {
    const { email } = (await req.json()) as { email?: string };
    const normalized = (email || "").trim().toLowerCase();

    // Réponse TOUJOURS neutre (pas d'énumération d'emails clients)
    const neutral = NextResponse.json({ ok: true });

    if (!normalized || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(normalized)) return neutral;

    const last = lastSent.get(normalized) || 0;
    if (Date.now() - last < 60_000) return neutral;

    const owner = await resolveOwnerByEmail(normalized);
    if (!owner) return neutral;

    lastSent.set(normalized, Date.now());

    const token = createLoginToken(owner.email);
    const base =
      process.env.NEXT_PUBLIC_PROD_URL ||
      (process.env.NODE_ENV === "production"
        ? "https://www.move-in-paris.com"
        : new URL(req.url).origin);
    const link = `${base}/api/espace-proprio/verify?token=${encodeURIComponent(token)}`;

    if (!process.env.RESEND_API_KEY) {
      // Dev local sans clé Resend : le lien apparaît dans les logs serveur
      console.log(`[espace-proprio] Magic link (dev) pour ${owner.email} : ${link}`);
      return neutral;
    }

    const { subject, html } = magicLinkEmail(link);
    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      from: "Move in Paris <noreply@move-in-paris.com>",
      to: owner.email,
      subject,
      html,
    });

    console.log(`[espace-proprio] Magic link envoyé à ${owner.email}`);
    return neutral;
  } catch (e) {
    console.error("[espace-proprio] login error:", e);
    // Neutre même en erreur, pour ne rien révéler
    return NextResponse.json({ ok: true });
  }
}
