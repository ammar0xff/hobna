import { NextResponse } from "next/server";
import { apiUser, isUnauthorized } from "@/lib/auth";
import { db } from "@/lib/db";
import { getAsset } from "@/lib/queries";
import { removeAssetFiles } from "@/lib/storage";

export const runtime = "nodejs";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = apiUser(request);
  if (!user) return isUnauthorized(request);
  const { id } = await params;
  const asset = getAsset(id, user.id);
  if (!asset) return NextResponse.json({ error: "مش موجود" }, { status: 404 });
  return NextResponse.json({ asset });
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

  if (typeof body.taken_at === "string" && !Number.isNaN(Date.parse(body.taken_at))) {
    fields.push("taken_at = ?");
    args.push(body.taken_at);
  }
  if (body.person === null || ["ammar", "alaa", "both"].includes(body.person)) {
    fields.push("person = ?");
    args.push(body.person);
  }
  if (typeof body.caption === "string" && body.caption.length <= 500) {
    fields.push("caption = ?");
    args.push(body.caption.slice(0, 500));
  }

  if (!fields.length) return NextResponse.json({ error: "مفيش حاجة تتغير" }, { status: 400 });

  args.push(id);
  const result = db.prepare(`UPDATE assets SET ${fields.join(", ")} WHERE id = ?`).run(...args);
  if (!result.changes) return NextResponse.json({ error: "مش موجود" }, { status: 404 });

  const asset = getAsset(id, user.id);
  return NextResponse.json({ asset });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = apiUser(request);
  if (!user) return isUnauthorized(request);
  const { id } = await params;

  const result = db.prepare("DELETE FROM assets WHERE id = ?").run(id);
  if (!result.changes) return NextResponse.json({ error: "مش موجود" }, { status: 404 });
  removeAssetFiles(id);

  return NextResponse.json({ ok: true });
}