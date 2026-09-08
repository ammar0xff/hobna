import { NextResponse } from "next/server";
import { apiUser, clearSessionCookie, destroySession, getTokenFromCookie } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const token = getTokenFromCookie(request.headers.get("cookie"));
  if (token) destroySession(token);
  const res = NextResponse.json({ ok: true });
  clearSessionCookie(res);
  return res;
}
