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

  const event = db.prepare("SELECT id FROM events WHERE id = ?").get(id);
  if (!event) return NextResponse.json({ error: "الحدث مش موجود" }, { status: 404 });

  const body = await request.json().catch(() => null);
  const ids: string[] = Array.isArray(body?.assetIds) ? body.assetIds : [];
  if (!ids.length) return NextResponse.json({ error: "اختار على الأقل حاجة واحدة" }, { status: 400 });

  const now = new Date().toISOString();
  const insert = db.prepare(
    "INSERT OR IGNORE INTO event_assets (event_id, asset_id, added_at) VALUES (?,?,?)"
  );
  const tx = db.transaction(() => {
    for (const aid of ids) {
      if (typeof aid === "string") insert.run(id, aid, now);
    }
  });
  tx();

  const count = (db.prepare("SELECT COUNT(*) c FROM event_assets WHERE event_id=?").get(id) as {
    c: number;
  }).c;

  return NextResponse.json({ ok: true, count });
}
