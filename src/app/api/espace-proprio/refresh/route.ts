import { NextResponse } from "next/server";
import {
  readSession,
  refreshSessionToken,
  SESSION_COOKIE,
  sessionCookieOptions,
} from "@/lib/espace-proprio/auth";

// Session glissante : chaque visite de l'espace prolonge la session de 90 jours.
export async function POST() {
  const session = await readSession();
  if (!session) return NextResponse.json({ ok: false }, { status: 401 });

  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, refreshSessionToken(session), sessionCookieOptions);
  return res;
}
