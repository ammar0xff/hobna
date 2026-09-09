import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { exchangeCode, getUserInfo, createDriveFolder, isGoogleEnabled } from "@/lib/google";
import { db } from "@/lib/db";
import { createSession, setSessionCookie, SESSION_COOKIE } from "@/lib/auth";

export const runtime = "nodejs";

function getTokenFromCookieLocal(cookieHeader: string | null): string {
  if (!cookieHeader) return "";
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${SESSION_COOKIE}=([^;]+)`));
  return match ? decodeURIComponent(match[1]) : "";
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  if (error) {
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent("الدخول بالغوقل مش ناجح: " + error)}`, url.origin)
    );
  }

  if (!code || !state) {
    return NextResponse.redirect(new URL("/login?error=missing_code", url.origin));
  }

  // Verify state
  const cookieHeader = request.headers.get("cookie");
  const stateCookie = cookieHeader?.match(/(?:^|;\s*)google_oauth_state=([^;]+)/)?.[1];
  if (!stateCookie || stateCookie !== state) {
    return NextResponse.redirect(new URL("/login?error=invalid_state", url.origin));
  }

  try {
    const tokens = await exchangeCode(code);
    const googleUser = await getUserInfo(tokens.access_token);

    let driveFolderId = "";
    try {
      driveFolderId = await createDriveFolder(tokens.access_token);
    } catch (e) {
      console.error("[google/callback] failed to create drive folder", e);
    }

    let user = db.prepare("SELECT * FROM users WHERE google_id = ?").get(googleUser.id) as
      | { id: number; username: string; name: string; password_hash: string }
      | undefined;

    if (!user) {
      const emailPrefix = googleUser.email.split("@")[0];
      user = db.prepare("SELECT * FROM users WHERE username = ?").get(emailPrefix) as
        | { id: number; username: string; name: string; password_hash: string }
        | undefined;

      if (user) {
        db.prepare("UPDATE users SET google_id = ? WHERE id = ?").run(googleUser.id, user.id);
      } else {
        const now = new Date().toISOString();
        const randomPw = crypto.randomBytes(16).toString("hex");
        const salt = crypto.randomBytes(16).toString("hex");
        const derived = crypto.scryptSync(randomPw, salt, 64).toString("hex");
        const hash = `${salt}:${derived}`;

        const info = db
          .prepare(
            "INSERT INTO users (username, name, password_hash, created_at, google_id) VALUES (?,?,?,?,?)"
          )
          .run(emailPrefix, googleUser.name, hash, now, googleUser.id);

        user = db.prepare("SELECT * FROM users WHERE id = ?").get(info.lastInsertRowid) as typeof user;
      }
    }

    if (!user) {
      return NextResponse.redirect(new URL("/login?error=create_failed", url.origin));
    }

    const expiresAt = tokens.expiry_date || Date.now() + 3600_000;
    db.prepare(
      `INSERT INTO user_tokens (user_id, access_token, refresh_token, expires_at, drive_folder_id)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(user_id) DO UPDATE SET
         access_token = excluded.access_token,
         refresh_token = COALESCE(excluded.refresh_token, user_tokens.refresh_token),
         expires_at = excluded.expires_at,
         drive_folder_id = COALESCE(excluded.drive_folder_id, user_tokens.drive_folder_id)`
    ).run(user.id, tokens.access_token, tokens.refresh_token, expiresAt, driveFolderId || null);

    const session = createSession(user.id);
    const existingToken = getTokenFromCookieLocal(cookieHeader);

    const redirectUrl = existingToken ? "/settings?connected=google" : "/";
    const res = NextResponse.redirect(new URL(redirectUrl, url.origin));
    setSessionCookie(res, session.token, session.expires);
    res.cookies.set("google_oauth_state", "", { maxAge: 0, path: "/" });
    return res;
  } catch (e: any) {
    console.error("[google/callback]", e);
    const msg = e?.message || "حصلت مشكلة";
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(msg)}`, url.origin)
    );
  }
}
