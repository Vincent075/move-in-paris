import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { readSession } from "@/lib/espace-proprio/auth";
import { resolveOwnerByEmail } from "@/lib/espace-proprio/provider";
import { NOTIFY_CATEGORIES } from "@/lib/espace-proprio/notify-categories";

// Anti-rafale par instance : 1 signalement / propriétaire / 60 s
const lastSent = new Map<string, number>();

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function row(label: string, value: string) {
  return `
    <tr>
      <td style="padding:9px 12px;font-family:Arial,Helvetica,sans-serif;font-size:11px;letter-spacing:1.5px;text-transform:uppercase;color:#6B6B6B;border-bottom:1px solid #F5F0EB;width:170px;vertical-align:top;">${label}</td>
      <td style="padding:9px 12px;font-size:14px;color:#1A1A1A;border-bottom:1px solid #F5F0EB;">${value || "·"}</td>
    </tr>`;
}

export async function POST(req: NextRequest) {
  try {
    const session = await readSession();
    if (!session) {
      return NextResponse.json({ ok: false, error: "session" }, { status: 401 });
    }

    const owner = await resolveOwnerByEmail(session.email);
    if (!owner) {
      return NextResponse.json({ ok: false, error: "session" }, { status: 401 });
    }

    const last = lastSent.get(owner.email) || 0;
    if (Date.now() - last < 60_000) {
      return NextResponse.json({ ok: false, error: "trop-rapide" }, { status: 429 });
    }

    const body = (await req.json()) as {
      category?: string;
      date?: string;
      message?: string;
      apartment?: string;
    };
    const category = (body.category || "").trim();
    const date = (body.date || "").trim().slice(0, 40);
    const message = (body.message || "").trim().slice(0, 2000);
    const apartment = (body.apartment || "").trim().slice(0, 120);

    if (!(NOTIFY_CATEGORIES as readonly string[]).includes(category)) {
      return NextResponse.json({ ok: false, error: "categorie" }, { status: 400 });
    }
    if (category === "Autre" && message.length < 5) {
      return NextResponse.json({ ok: false, error: "message" }, { status: 400 });
    }

    lastSent.set(owner.email, Date.now());

    const to = process.env.PORTAL_NOTIFY_TO || "guillaume@move-in-paris.com";
    const subject = `Espace Propriétaire · ${category}${apartment ? ` · ${apartment}` : ""}`;

    const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8" /></head>
<body style="margin:0;padding:0;background-color:#F5F0EB;font-family:Georgia,'Times New Roman',serif;">
  <div style="max-width:600px;margin:0 auto;background-color:#ffffff;border:1px solid #E8E4DF;">
    <div style="background-color:#0D0D0D;padding:8px 40px;text-align:center;">
      <img src="https://www.move-in-paris.com/Logo-gold.png" alt="Move in Paris" width="120" style="display:block;margin:0 auto;height:auto;" />
    </div>
    <div style="background-color:#B88B58;padding:14px 40px;">
      <div style="font-family:Georgia,serif;font-size:17px;color:#0D0D0D;font-weight:bold;">
        Signalement propriétaire · Espace Propriétaire
      </div>
    </div>
    <div style="padding:28px 40px;">
      <table style="width:100%;border-collapse:collapse;">
        ${row("Propriétaire", `${esc(owner.chipName)}`)}
        ${row("Email", `<a href="mailto:${esc(owner.email)}" style="color:#B88B58;">${esc(owner.email)}</a>`)}
        ${row("Appartement", esc(apartment))}
        ${row("Catégorie", `<strong>${esc(category)}</strong>`)}
        ${row("Date concernée", esc(date))}
        ${row("Message", esc(message).replace(/\n/g, "<br />"))}
      </table>
      <div style="margin-top:20px;background-color:#F5F0EB;padding:14px 18px;border-left:3px solid #B88B58;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#6B6B6B;">
        Répondre à cet email écrit directement au propriétaire.
      </div>
    </div>
    <div style="background-color:#0D0D0D;padding:20px 40px;text-align:center;">
      <div style="color:#B88B58;font-style:italic;font-size:11px;letter-spacing:2px;text-transform:uppercase;">The art of Parisian living</div>
    </div>
  </div>
</body></html>`;

    if (!process.env.RESEND_API_KEY) {
      console.log(`[espace-proprio] Signalement (dev) de ${owner.email} : ${category} · ${apartment} · ${date} · ${message.slice(0, 80)}`);
      return NextResponse.json({ ok: true });
    }

    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      from: "Move in Paris <noreply@move-in-paris.com>",
      to,
      replyTo: owner.email,
      subject,
      html,
    });

    console.log(`[espace-proprio] Signalement envoyé à ${to} : ${owner.email} · ${category}`);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[espace-proprio] notify error:", e);
    return NextResponse.json({ ok: false, error: "serveur" }, { status: 500 });
  }
}
