import { NextResponse } from "next/server";
import fs from "node:fs";
import { Readable } from "node:stream";
import { apiUser, isUnauthorized } from "@/lib/auth";
import { db } from "@/lib/db";
import { variantPath, type Variant } from "@/lib/media";

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
  webp2: "image/webp2",
};

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = apiUser(request);
  if (!user) return isUnauthorized(request);
  const { id } = await params;

  const asset = db
    .prepare("SELECT id, type, ext FROM assets WHERE id = ?")
    .get(id) as { id: string; type: "image" | "video"; ext: string } | undefined;
  if (!asset) return NextResponse.json({ error: "مش موجود" }, { status: 404 });

  const url = new URL(request.url);
  const variant = (url.searchParams.get("v") ?? "orig") as Variant;

  let filePath: string;
  let mime: string;

  if (variant === "orig") {
    filePath = variantPath(id, "orig", asset.ext);
    mime = MIME[asset.ext] || (asset.type === "video" ? "video/mp4" : "application/octet-stream");
  } else if (variant === "poster") {
    filePath = variantPath(id, "poster");
    mime = "image/jpeg";
  } else {
    filePath = variantPath(id, variant);
    mime = "image/webp";
  }

  if (!fs.existsSync(filePath)) {
    return NextResponse.json({ error: "الملف لسه بيتجهز" }, { status: 404 });
  }

  const stat = fs.statSync(filePath);
  const cacheHeaders = {
    "cache-control": `private, max-age=${variant === "orig" ? 31536000 : 31536000}, immutable`,
    "accept-ranges": "bytes",
  };

  const range = request.headers.get("range");

  if (range) {
    const match = range.match(/bytes=(\d*)-(\d*)/);
    if (match) {
      const start = match[1] ? parseInt(match[1], 10) : 0;
      const end = match[2] ? Math.min(parseInt(match[2], 10), stat.size - 1) : stat.size - 1;
      if (start < stat.size && start <= end) {
        const headers = new Headers({
          ...cacheHeaders,
          "content-type": mime,
          "content-length": String(end - start + 1),
          "content-range": `bytes ${start}-${end}/${stat.size}`,
        });
        const stream = Readable.toWeb(fs.createReadStream(filePath, { start, end }));
        return new Response(stream as ReadableStream, { status: 206, headers });
      }
    }
  }

  const headers = new Headers({
    ...cacheHeaders,
    "content-type": mime,
    "content-length": String(stat.size),
  });
  const stream = Readable.toWeb(fs.createReadStream(filePath));
  return new Response(stream as ReadableStream, { status: 200, headers });
}
