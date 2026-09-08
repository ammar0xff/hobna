import { NextResponse } from "next/server";
import { apiUser, isUnauthorized } from "@/lib/auth";
import { db } from "@/lib/db";

export const runtime = "nodejs";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; assetId: string }> }
) {
  const user = apiUser(request);
  if (!user) return isUnauthorized(request);
  const { id, assetId } = await params;

  db.prepare("DELETE FROM event_assets WHERE event_id = ? AND asset_id = ?").run(id, assetId);

  const count = (db.prepare("SELECT COUNT(*) c FROM event_assets WHERE event_id=?").get(id) as {
    c: number;
  }).c;
  return NextResponse.json({ ok: true, count });
}
