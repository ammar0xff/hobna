import { NextResponse } from "next/server";
import { apiUser, isUnauthorized } from "@/lib/auth";
import { db } from "@/lib/db";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = apiUser(request);
  if (!user) return isUnauthorized(request);
  const { id } = await params;
  const body = await request.json().catch(() => null);
  const on = body?.on === false ? false : true;

  const exists = db.prepare("SELECT 1 FROM assets WHERE id = ?").get(id);
  if (!exists) return NextResponse.json({ error: "مش موجود" }, { status: 404 });

  if (on) {
    db.prepare("INSERT OR IGNORE INTO likes (asset_id, user_id) VALUES (?,?)").run(id, user.id);
  } else {
    db.prepare("DELETE FROM likes WHERE asset_id = ? AND user_id = ?").run(id, user.id);
  }
  const count = (db.prepare("SELECT COUNT(*) c FROM likes WHERE asset_id=?").get(id) as {
    c: number;
  }).c;
  return NextResponse.json({ liked: on, count });
}
