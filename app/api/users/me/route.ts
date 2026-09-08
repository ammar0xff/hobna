import { NextResponse } from "next/server";
import { apiUser, isUnauthorized } from "@/lib/auth";
import { db } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/auth";

export const runtime = "nodejs";

export async function PATCH(request: Request) {
  const user = apiUser(request);
  if (!user) return isUnauthorized(request);

  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "بيانات ناقصة" }, { status: 400 });

  const fields: string[] = [];
  const args: unknown[] = [];

  if (typeof body.name === "string" && body.name.trim()) {
    const name = body.name.trim().slice(0, 60);
    fields.push("name = ?");
    args.push(name);
  }

  if (typeof body.current_password === "string" && typeof body.new_password === "string") {
    const row = db.prepare("SELECT password_hash FROM users WHERE id = ?").get(user.id) as {
      password_hash: string;
    };
    if (!verifyPassword(body.current_password, row.password_hash)) {
      return NextResponse.json({ error: "الباسورد القديم غلط" }, { status: 400 });
    }
    if (body.new_password.length < 4) {
      return NextResponse.json({ error: "الباسورد الجديد قصير (على الأقل ٤ حروف)" }, { status: 400 });
    }
    fields.push("password_hash = ?");
    args.push(hashPassword(body.new_password));
  }

  if (!fields.length) return NextResponse.json({ error: "مفيش حاجة تتغير" }, { status: 400 });

  args.push(user.id);
  db.prepare(`UPDATE users SET ${fields.join(", ")} WHERE id = ?`).run(...args);

  const updated = db.prepare("SELECT id, username, name FROM users WHERE id = ?").get(user.id);
  return NextResponse.json({ user: updated });
}
