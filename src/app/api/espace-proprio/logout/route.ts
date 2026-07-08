import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/espace-proprio/auth";

export async function GET(req: NextRequest) {
  const res = NextResponse.redirect(new URL("/espace-proprio", req.url));
  res.cookies.set(SESSION_COOKIE, "", { path: "/", maxAge: 0 });
  return res;
}
