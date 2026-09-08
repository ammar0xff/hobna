import { NextResponse } from "next/server";
import { apiUser, isUnauthorized } from "@/lib/auth";
import { db } from "@/lib/db";
import { getAsset, getEvent } from "@/lib/queries";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = apiUser(request);
  if (!user) return isUnauthorized(request);
  const { id } = await params;
  const event = getEvent(id);
  if (!event) return NextResponse.json({ error: "الحدث مش موجود" }, { status: 404 });

  const assetIds = (db
    .prepare("SELECT asset_id FROM event_assets WHERE event_id = ? ORDER BY added_at ASC")
    .all(id) as { asset_id: string }[]).map((r) => r.asset_id);
  const assets = assetIds
    .map((aid) => getAsset(aid, user.id))
    .filter((a): a is NonNullable<typeof a> => !!a)
    .sort((a, b) => a.taken_at.localeCompare(b.taken_at));

  return NextResponse.json({ event, assets });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = apiUser(request);
  if (!user) return isUnauthorized(request);
  const { id } = await params;

  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "بيانات ناقصة" }, { status: 400 });

  const fields: string[] = [];
  const args: unknown[] = [];

  if (typeof body.title === "string") {
    const t = body.title.trim().slice(0, 120);
    if (t) {
      fields.push("title = ?");
      args.push(t);
    }
  }
  if (typeof body.description === "string") {
    fields.push("description = ?");
    args.push(body.description.slice(0, 500));
  }
  if (
    typeof body.start_date === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(body.start_date)
  ) {
    fields.push("start_date = ?");
    args.push(body.start_date);
  }
  if (typeof body.end_date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.end_date)) {
    fields.push("end_date = ?");
    args.push(body.end_date);
  }

  if (!fields.length) return NextResponse.json({ error: "مفيش حاجة تتغير" }, { status: 400 });
  args.push(id);
  const result = db.prepare(`UPDATE events SET ${fields.join(", ")} WHERE id = ?`).run(...args);
  if (!result.changes) return NextResponse.json({ error: "الحدث مش موجود" }, { status: 404 });

  return NextResponse.json({ event: getEvent(id) });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = apiUser(request);
  if (!user) return isUnauthorized(request);
  const { id } = await params;
  const result = db.prepare("DELETE FROM events WHERE id = ?").run(id);
  if (!result.changes) return NextResponse.json({ error: "الحدث مش موجود" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
