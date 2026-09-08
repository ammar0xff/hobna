import { NextResponse } from "next/server";
import { apiUser, isUnauthorized } from "@/lib/auth";
import { db } from "@/lib/db";

export const runtime = "nodejs";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; cid: string }> }
) {
  const user = apiUser(request);
  if (!user) return isUnauthorized(request);
  const { id, cid } = await params;

  const row = db
    .prepare("SELECT user_id FROM comments WHERE id = ? AND asset_id = ?")
    .get(cid, id) as { user_id: number } | undefined;
  if (!row) return NextResponse.json({ error: "مش موجود" }, { status: 404 });
  if (row.user_id !== user.id) {
    return NextResponse.json({ error: "مش عايزين نفضل نمسح تعليقات بعض 😅" }, { status: 403 });
  }
  db.prepare("DELETE FROM comments WHERE id = ?").run(cid);
  return NextResponse.json({ ok: true });
}
