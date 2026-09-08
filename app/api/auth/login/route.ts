import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createSession, setSessionCookie, verifyPassword } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const username = String(body?.username ?? "").trim();
    const password = String(body?.password ?? "");

    if (!username || !password) {
      return NextResponse.json(
        { error: "اكتب اسم المستخدم والباسورد كمان" },
        { status: 400 }
      );
    }

    const user = db
      .prepare("SELECT * FROM users WHERE username = ?")
      .get(username) as
      | { id: number; username: string; name: string; password_hash: string }
      | undefined;

    if (!user || !verifyPassword(password, user.password_hash)) {
      return NextResponse.json(
        { error: "اسم المستخدم أو الباسورد غلط، جرب تاني" },
        { status: 401 }
      );
    }

    const session = createSession(user.id);
    const res = NextResponse.json({
      user: { id: user.id, username: user.username, name: user.name },
    });
    setSessionCookie(res, session.token, session.expires);
    return res;
  } catch (e) {
    console.error("login error", e);
    return NextResponse.json({ error: "حصلت مشكلة في الدخول" }, { status: 500 });
  }
}
