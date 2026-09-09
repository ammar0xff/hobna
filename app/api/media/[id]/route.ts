import { NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";
import { apiUser, isUnauthorized } from "@/lib/auth";
import { assetDir, db } from "@/lib/db";
import { readVariant, getMimeForExt, EXT_MAP } from "@/lib/storage";

export const runtime = "nodejs";

const MIME: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  webp: "image/webp",
  heic: "image/heic",
  heif: "image/heif",
  bmp: "image/bmp",
  tiff: "image/tiff",
  mp4: "video/mp4",
  mov: "video/quicktime",
  m4v: "video/mp4",
  webm: "video/webm",
  mkv: "video/x-matroska",
  avi: "video/x-msvideo",
};

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = apiUser(request);
  if (!user) return isUnauthorized(request);

  const { id } = await params;
  const url = new URL(request.url);
  const variant = (url.searchParams.get("variant") || "orig") as "orig" | "thumb" | "med" | "poster";

  const asset = db.prepare("SELECT * FROM assets WHERE id = ?").get(id) as
    | { id: string; type: string }
    | undefined;

  if (!asset) {
    return NextResponse.json({ error: "مش موجود" }, { status: 404 });
  }

  const row = db.prepare(
    "SELECT u.filename FROM asset_files af JOIN uploads u ON af.upload_id = u.id WHERE af.asset_id = ? LIMIT 1"
  ).get(id) as { filename: string } | undefined;

  const ext = row?.filename?.split(".").pop()?.toLowerCase() || "";
  const mime = MIME[ext] || "application/octet-stream";

  // For 'orig', try to serve the actual file
  if (variant === "orig") {
    const localDir = assetDir(id);
    const origPath = path.join(localDir, `orig.${ext}`);
    if (fs.existsSync(origPath)) {
      const data = fs.readFileSync(origPath);
      return new NextResponse(data, {
        headers: {
          "Content-Type": mime,
          "Cache-Control": "public, max-age=86400, immutable",
        },
      });
    }
    return NextResponse.json({ error: "الملف مش موجود" }, { status: 404 });
  }

  // For processed variants
  try {
    const result = await readVariant(id, variant, ext, mime);
    return new NextResponse(result.buffer, {
      headers: {
        "Content-Type": result.mimeType,
        "Cache-Control": "public, max-age=86400, immutable",
      },
    });
  } catch {
    return NextResponse.json({ error: "الملف مش موجود" }, { status: 404 });
  }
}
