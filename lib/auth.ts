import crypto from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import { db } from "./db";

export const SESSION_COOKIE = "hobna_session";
const SESSION_TTL_DAYS = 90;

export interface UserRow {
  id: number;
  username: string;
  name: string;
  created_at: string;
}

export function hashPassword(pw: string) {
  const salt = crypto.randomBytes(16).toString("hex");
  const derived = crypto.scryptSync(pw, salt, 64).toString("hex");
  return `${salt}:${derived}`;
}

export function verifyPassword(pw: string, stored: string) {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const derived = crypto.scryptSync(pw, salt, 64).toString("hex");
  const a = Buffer.from(derived, "hex");
  const b = Buffer.from(hash, "hex");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export function createSession(userId: number) {
  const token = crypto.randomBytes(32).toString("hex");
  const expires = Date.now() + SESSION_TTL_DAYS * 86400000;
  db.prepare("INSERT INTO sessions (token, user_id, expires_at) VALUES (?,?,?)").run(
    token,
    userId,
    expires
  );
  return { token, expires };
}

export function destroySession(token: string) {
  db.prepare("DELETE FROM sessions WHERE token = ?").run(token);
}

export function getSessionUser(token: string): UserRow | null {
  if (!token) return null;
  const row = db
    .prepare(
      `SELECT u.id, u.username, u.name, u.created_at
       FROM sessions s JOIN users u ON u.id = s.user_id
       WHERE s.token = ? AND s.expires_at > ?`
    )
    .get(token, Date.now()) as UserRow | undefined;
  return row ?? null;
}

export function setSessionCookie(res: NextResponse, token: string, expires: number) {
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(expires),
  });
}

export function clearSessionCookie(res: NextResponse) {
  res.cookies.set(SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}

export function getTokenFromCookie(header: string | null): string {
  if (!header) return "";
  const match = header.match(new RegExp(`(?:^|;\\s*)${SESSION_COOKIE}=([^;]+)`));
  return match ? decodeURIComponent(match[1]) : "";
}

/** For API route handlers: reads the cookie from the request, returns user or null. */
export function apiUser(request: Request): UserRow | null {
  return getSessionUser(getTokenFromCookie(request.headers.get("cookie")));
}

/** For pages / server components: redirects to /login when not authenticated. */
export async function requireUser(): Promise<UserRow> {
  const store = await cookies();
  const user = getSessionUser(store.get(SESSION_COOKIE)?.value ?? "");
  if (!user) redirect("/login");
  return user;
}

export function isUnauthorized(request: Request) {
  return new NextResponse(JSON.stringify({ error: "مش مسموح" }), {
    status: 401,
    headers: { "content-type": "application/json" },
  });
}
