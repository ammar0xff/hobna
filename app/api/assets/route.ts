import { NextResponse } from "next/server";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { apiUser, isUnauthorized } from "@/lib/auth";
import { db, assetDir } from "@/lib/db";
import { processAsset } from "@/lib/media";

export const runtime = "nodejs";

const MAX_SIZE = 100 * 1024 * 1024;
const ALLOWED = /^(image|video)\//;

function detectType(mime: string): "photo" | "video" {
  return mime.startsWith("video/") ? "video" : "photo";
}

export async function GET(request: Request) {
  const user = apiUser(request);
  if (!user) return isUnauthorized(request);

  const url = new URL(request.url);
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "50"), 100);
  const offset = parseInt(url.searchParams.get("offset") || "0", 10);
  const sort = url.searchParams.get("sort") === "newest" ? "newest" : "oldest";

  const orderBy = sort === "newest" ? "a.date DESC, a.created_at DESC" : "a.date ASC, a.created_at ASC";

  const assets = db
    .prepare(
      `SELECT a.*, u.name as author_name,
        (SELECT COUNT(*) FROM comments WHERE asset_id = a.id) as comment_count,
        (SELECT GROUP_CONCAT(ar.user_id) FROM asset_reactions ar WHERE ar.asset_id = a.id) as reacted_by,
        (SELECT GROUP_CONCAT(ar.emoji) FROM asset_reactions ar WHERE ar.asset_id = a.id) as reaction_emojis
       FROM assets a
       LEFT JOIN users u ON a.added_by = u.id
       ORDER BY ${orderBy}
       LIMIT ? OFFSET ?`
    )
    .all(limit, offset) as any[];

  const assetsWithUser = assets.map((a: any) => {
    const reactions = a.reaction_emojis
      ? a.reaction_emojis.split(",").map((emoji: string, i: number) => ({
          emoji,
          by: parseInt(a.reacted_by.split(",")[i]),
          mine: parseInt(a.reacted_by.split(",")[i]) === user.id,
        }))
      : [];
    return { ...a, reactions, author_name: a.author_name || "مستخدم" };
  });

  return NextResponse.json(assetsWithUser);
}

export async function POST(request: Request) {
  const user = apiUser(request);
  if (!user) return isUnauthorized(request);

  const form = await request.formData();
  const files = form.getAll("files") as File[];
  const dateVal = (form.get("date") as string) || null;

  if (!files.length) {
    return NextResponse.json({ error: "ما اختاريتي شي" }, { status: 400 });
  }

  const created: string[] = [];

  for (const file of files) {
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: `الملف ${file.name} كبير جداً (حد أقصى 100MB)` }, { status: 400 });
    }
    if (!ALLOWED.test(file.type)) {
      return NextResponse.json({ error: `الملف ${file.name} نوعه مش مدعوم` }, { status: 400 });
    }

    const id = crypto.randomUUID();
    const type = detectType(file.type);
    const ext = file.name.split(".").pop()?.toLowerCase() || "bin";

    const assetDate = dateVal || new Date().toISOString().split("T")[0];

    db.prepare(
      "INSERT INTO assets (id, type, title, date, added_by) VALUES (?, ?, ?, ?, ?)"
    ).run(id, type, file.name, assetDate, user.id);

    const buf = Buffer.from(await file.arrayBuffer());
    const dir = assetDir(id);
    const origPath = path.join(dir, `orig.${ext}`);
    fs.writeFileSync(origPath, buf);

    try {
      await processAsset(id, type === "photo" ? "image" : "video", ext, origPath);
    } catch (e) {
      console.error("[media] processing failed", id, e);
    }

    db.prepare("INSERT INTO uploads (id, user_id, filename, original_name, size, mime) VALUES (?, ?, ?, ?, ?, ?)").run(id, user.id, file.name, file.name, file.size, file.type);
    db.prepare("INSERT INTO asset_files (asset_id, upload_id, role) VALUES (?, ?, 'orig')").run(id, id);

    created.push(id);
  }

  return NextResponse.json({ created });
}
