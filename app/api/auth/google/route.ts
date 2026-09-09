import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { getAuthUrl, isGoogleEnabled } from "@/lib/google";

export const runtime = "nodejs";

export async function GET(request: Request) {
  if (!isGoogleEnabled()) {
    return NextResponse.json({ error: "Google Drive مش متاح" }, { status: 503 });
  }

  const state = crypto.randomBytes(16).toString("hex");
  const url = getAuthUrl(state);

  const res = NextResponse.redirect(url);
  // Store state in cookie to verify callback
  res.cookies.set("google_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600, // 10 minutes
    path: "/",
  });

  return res;
}
