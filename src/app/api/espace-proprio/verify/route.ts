import { NextRequest, NextResponse } from "next/server";
import {
  verifyLoginToken,
  createSessionToken,
  readSession,
  SESSION_COOKIE,
  sessionCookieOptions,
} from "@/lib/espace-proprio/auth";
import { resolveOwnerByEmail } from "@/lib/espace-proprio/provider";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token") || "";
  const email = verifyLoginToken(token);

  if (!email) {
    return NextResponse.redirect(new URL("/espace-proprio?erreur=lien-expire", req.url));
  }

  const owner = await resolveOwnerByEmail(email);
  if (!owner) {
    return NextResponse.redirect(new URL("/espace-proprio?erreur=lien-expire", req.url));
  }

  // "Dernière connexion" = session précédente si elle existait (log RGPD affiché à l'utilisateur)
  const prev = await readSession();
  const prevLogin = prev && prev.email === owner.email ? new Date(prev.iat).toISOString() : null;

  console.log(`[espace-proprio] Connexion de ${owner.email} (${owner.id}) le ${new Date().toISOString()}`);

  const res = NextResponse.redirect(new URL("/espace-proprio/mon-espace", req.url));
  res.cookies.set(SESSION_COOKIE, createSessionToken(owner.id, owner.email, prevLogin), sessionCookieOptions);
  return res;
}
