import { NextResponse } from "next/server";
import { apiUser, isUnauthorized } from "@/lib/auth";
import { db } from "@/lib/db";
import { removeAssetFiles } from "@/lib/storage";

export const runtime = "nodejs";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = apiUser(request);
  if (!user) return isUnauthorized(request);

  const { id } = await params;

  const asset = db.prepare("SELECT * FROM assets WHERE id = ?").get(id) as
    | { id: string; type: string }
    | undefined;

  if (!asset) {
    return NextResponse.json({ error: "مش موجود" }, { status: 404 });
  }

  // Remove files from storage (local + Drive)
  removeAssetFiles(id);

  // Remove from database
  db.prepare("DELETE FROM asset_reactions WHERE asset_id = ?").run(id);
  db.prepare("DELETE FROM comments WHERE asset_id = ?").run(id);
  db.prepare("DELETE FROM asset_files WHERE asset_id = ?").run(id);
  db.prepare("DELETE FROM assets WHERE id = ?").run(id);

  return NextResponse.json({ ok: true });
}
