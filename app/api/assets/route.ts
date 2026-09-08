import { NextResponse } from "next/server";
import { Readable } from "node:stream";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { apiUser, isUnauthorized } from "@/lib/auth";
import { db, assetDir } from "@/lib/db";
import { listAssets } from "@/lib/queries";
import { processAsset, variantPath } from "@/lib/media";
import { uid } from "@/lib/util";

export const runtime = "nodejs";

const MAX_BYTES = 2 * 1024 * 1024 * 1024; // 2GB per file

function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

export async function GET(request: Request) {
  const user = apiUser(request);
  if (!user) return isUnauthorized(request);

  const url = new URL(request.url);
  const params = {
    type: url.searchParams.get("type") ?? undefined,
    person: url.searchParams.get("person") ?? undefined,
    search: url.searchParams.get("search") ?? undefined,
    eventId: url.searchParams.get("event") ?? undefined,
    yearMonth: url.searchParams.get("month") ?? undefined,
  };
  const assets = listAssets(params);
  return NextResponse.json({ assets });
}

export async function POST(request: Request) {
  const user = apiUser(request);
  if (!user) return isUnauthorized(request);

  if (!request.body) return badRequest("مفيش ملف وصل");
  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > MAX_BYTES) {
    return badRequest("الملف كبير قوي (أقصى حاجة ٢ جيجا)");
  }

  const decode = (h: string | null) =>
    h ? decodeURIComponent(h).slice(0, 300) : "";
  const origName = decode(request.headers.get("x-file-name"));
  if (!origName) return badRequest("مفيش اسم للملف");
  const takenAt = request.headers.get("x-taken-at") || new Date().toISOString();
  const person = request.headers.get("x-person") || "";
  const caption = decode(request.headers.get("x-caption"));
  const typeHeader = request.headers.get("x-type") || "";
  const contentType = request.headers.get("content-type") || "";

  const ext = path.extname(origName).toLowerCase().replace(".", "").slice(0, 8);
  const type: "image" | "video" =
    typeHeader === "video" ||
    (contentType.startsWith("video/") && typeHeader !== "image")
      ? "video"
      : "image";

  const id = uid();
  const dir = assetDir(id);
  fs.mkdirSync(dir, { recursive: true });
  const origPath = variantPath(id, "orig", ext);

  let size = 0;
  try {
    const ws = fs.createWriteStream(origPath, { flags: "wx" });
    await new Promise<void>((resolve, reject) => {
      const stream = Readable.fromWeb(request.body as any);
      stream.on("data", (chunk) => {
        size += chunk.length;
        if (size > MAX_BYTES) {
          ws.destroy();
          reject(new Error("ملف كبير جداً"));
        }
      });
      stream.on("error", (e) => {
        ws.destroy();
        reject(e);
      });
      ws.on("error", reject);
      ws.on("finish", resolve);
      stream.pipe(ws);
    });

    if (size === 0) {
      fs.rmSync(dir, { recursive: true, force: true });
      return badRequest("الملف فاضي");
    }

    let info: { width: number; height: number; duration: number } = {
      width: 0,
      height: 0,
      duration: 0,
    };
    try {
      info = await processAsset(id, type, ext, origPath);
    } catch (e) {
      console.error("process asset failed", e);
    }

    const validPerson = ["ammar", "alaa", "both"].includes(person) ? person : null;
    const now = new Date().toISOString();
    db.prepare(
      `INSERT INTO assets (id, type, ext, orig_name, size, width, height, duration,
        taken_at, person, caption, created_by, created_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`
    ).run(
      id,
      type,
      ext,
      origName,
      size,
      info.width || null,
      info.height || null,
      info.duration || null,
      takenAt,
      validPerson,
      caption,
      user.id,
      now
    );

    return NextResponse.json({
      asset: {
        id,
        type,
        ext,
        orig_name: origName,
        size,
        width: info.width,
        height: info.height,
        duration: info.duration,
        taken_at: takenAt,
        person: validPerson,
        caption,
        created_by: user.id,
        created_at: now,
      },
    });
  } catch (e: any) {
    fs.rmSync(dir, { recursive: true, force: true });
    console.error("upload error", e);
    return NextResponse.json(
      { error: "حصلت مشكلة في الرفع، جرب تاني" },
      { status: 500 }
    );
  }
}
