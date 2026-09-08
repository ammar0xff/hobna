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
  const assetId = String(body?.assetId ?? "");

  const event = db.prepare("SELECT id FROM events WHERE id = ?").get(id);
  if (!event) return NextResponse.json({ error: "الحدث مش موجود" }, { status: 404 });

  const member = db
    .prepare("SELECT 1 FROM event_assets WHERE event_id = ? AND asset_id = ?")
    .get(id, assetId);
  if (!member) return NextResponse.json({ error: "الصورة مش في الحدث" }, { status: 400 });

  db.prepare("UPDATE events SET cover_asset_id = ? WHERE id = ?").run(assetId, id);
  return NextResponse.json({ ok: true, cover_asset_id: assetId });
}
