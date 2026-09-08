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
  const text = String(body?.text ?? "").trim().slice(0, 500);
  if (!text) return NextResponse.json({ error: "اكتب تعليق الأول" }, { status: 400 });

  const exists = db.prepare("SELECT 1 FROM assets WHERE id = ?").get(id);
  if (!exists) return NextResponse.json({ error: "مش موجود" }, { status: 404 });

  const created_at = new Date().toISOString();
  const info = db
    .prepare("INSERT INTO comments (asset_id, user_id, text, created_at) VALUES (?,?,?,?)")
    .run(id, user.id, text, created_at);

  return NextResponse.json({
    comment: {
      id: info.lastInsertRowid,
      asset_id: id,
      user_id: user.id,
      user_name: user.name,
      text,
      created_at,
    },
  });
}
