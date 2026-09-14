import { NextResponse } from "next/server";
import { apiUser, isUnauthorized } from "@/lib/auth";
import { db } from "@/lib/db";
import { isGoogleEnabled, getValidAccessToken, getUserInfo } from "@/lib/google";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const user = apiUser(request);
  if (!user) return isUnauthorized(request);

  if (!isGoogleEnabled()) {
    return NextResponse.json({ connected: false, available: false });
  }

  const token = await getValidAccessToken(user.id);
  if (!token) {
    return NextResponse.json({ connected: false, available: true });
  }

  try {
    const info = await getUserInfo(token);
    const tokenRow = db
      .prepare("SELECT drive_folder_id FROM user_tokens WHERE user_id = ?")
      .get(user.id) as { drive_folder_id: string } | undefined;

    return NextResponse.json({
      connected: true,
      available: true,
      email: info.email,
      name: info.name,
      folderId: tokenRow?.drive_folder_id || null,
    });
  } catch (e) {
    console.error("[drive/status]", e);
    return NextResponse.json({ connected: false, available: true, error: "Token منتهي" });
  }
}

export async function DELETE(request: Request) {
  const user = apiUser(request);
  if (!user) return isUnauthorized(request);

  db.prepare("DELETE FROM user_tokens WHERE user_id = ?").run(user.id);

  return NextResponse.json({ ok: true, connected: false });
}
