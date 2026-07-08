// Auth de l'espace propriétaire : magic link + session cookie.
// Tokens signés HMAC-SHA256 via node:crypto (aucune dépendance ajoutée).
// Server-only : ne jamais importer depuis un composant client.

import { createHmac, timingSafeEqual, randomBytes } from "node:crypto";
import { cookies } from "next/headers";

export const SESSION_COOKIE = "mip_proprio_session";
const LOGIN_TOKEN_TTL_MS = 15 * 60 * 1000; // 15 minutes
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 jours

function secret(): string {
  const s = process.env.PORTAL_SESSION_SECRET;
  if (!s || s.length < 32) {
    throw new Error(
      "PORTAL_SESSION_SECRET manquant ou trop court (32+ caractères requis). À définir dans .env.local et sur Vercel.",
    );
  }
  return s;
}

const b64url = (buf: Buffer) => buf.toString("base64url");
const sign = (payload: string) =>
  b64url(createHmac("sha256", secret()).update(payload).digest());

function pack(data: Record<string, unknown>): string {
  const payload = b64url(Buffer.from(JSON.stringify(data)));
  return `${payload}.${sign(payload)}`;
}

function unpack<T>(token: string): T | null {
  const dot = token.lastIndexOf(".");
  if (dot < 1) return null;
  const payload = token.slice(0, dot);
  const givenSig = token.slice(dot + 1);
  const expected = sign(payload);
  const a = Buffer.from(givenSig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    return JSON.parse(Buffer.from(payload, "base64url").toString()) as T;
  } catch {
    return null;
  }
}

/* ---------- Magic link ---------- */

type LoginPayload = { t: "login"; e: string; exp: number; n: string };

export function createLoginToken(email: string): string {
  return pack({
    t: "login",
    e: email.trim().toLowerCase(),
    exp: Date.now() + LOGIN_TOKEN_TTL_MS,
    n: b64url(randomBytes(8)),
  } satisfies LoginPayload);
}

export function verifyLoginToken(token: string): string | null {
  const p = unpack<LoginPayload>(token);
  if (!p || p.t !== "login" || typeof p.e !== "string") return null;
  if (Date.now() > p.exp) return null;
  return p.e;
}

/* ---------- Session ---------- */

export type PortalSession = {
  t: "session";
  ownerId: string;
  email: string;
  /** ISO de la connexion PRÉCÉDENTE (affiché "Dernière connexion") */
  prevLogin: string | null;
  iat: number;
  exp: number;
};

export function createSessionToken(
  ownerId: string,
  email: string,
  prevLogin: string | null,
): string {
  const now = Date.now();
  return pack({
    t: "session",
    ownerId,
    email,
    prevLogin,
    iat: now,
    exp: now + SESSION_TTL_MS,
  } satisfies PortalSession);
}

export async function readSession(): Promise<PortalSession | null> {
  const store = await cookies();
  const raw = store.get(SESSION_COOKIE)?.value;
  if (!raw) return null;
  const s = unpack<PortalSession>(raw);
  if (!s || s.t !== "session" || Date.now() > s.exp) return null;
  return s;
}

export const sessionCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: SESSION_TTL_MS / 1000,
};
