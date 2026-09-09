import { NextResponse } from "next/server";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { apiUser, isUnauthorized, SESSION_COOKIE } from "@/lib/auth";
import { db, assetDir } from "@/lib/db";
import { writeVariant, getMimeForExt } from "@/lib/storage";
import ffmpeg from "fluent-ffmpeg";

export const runtime = "nodejs";

const MAX_SIZE = 100 * 1024 * 1024;
const ALLOWED = /^(image|video)\//;

function detectType(mime: string): "photo" | "video" {
  return mime.startsWith("video/") ? "video" : "photo";
}

function parseCookies(header: string | null): string {
  if (!header) return "";
  const m = header.match(new RegExp(`(?:^|;\\s*)${SESSION_COOKIE}=([^;]+)`));
  return m ? decodeURIComponent(m[1]) : "";
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
    fs.writeFileSync(path.join(dir, `orig.${ext}`), buf);

    try {
      if (type === "photo") {
        const proc = ffmpeg({ source: buf });
        await Promise.all([
          new Promise<void>((res, rej) =>
            proc
              .clone()
              .outputOptions(["-vf", "scale=600:-1", "-q:v", "80", "-f", "image2pipe"])
              .format("mjpeg")
              .pipe()
              .on("data", (chunk: Buffer) => {
                fs.writeFileSync(path.join(dir, "thumb.webp"), chunk);
              })
              .on("end", () => res())
              .on("error", rej)
          ),
          new Promise<void>((res, rej) =>
            ffmpeg({ source: buf })
              .outputOptions(["-vf", "scale=1200:-1", "-q:v", "82", "-f", "image2pipe"])
              .format("mjpeg")
              .pipe()
              .on("data", (chunk: Buffer) => {
                fs.writeFileSync(path.join(dir, "med.webp"), chunk);
              })
              .on("end", () => res())
              .on("error", rej)
          ),
        ]);
      } else if (type === "video") {
        await new Promise<void>((res, rej) => {
          const cmd = ffmpeg({ source: buf });
          cmd
            .outputOptions(["-vf", "scale=480:-1", "-frames:v", "1", "-q:v", "5"])
            .outputOptions("-f", "image2pipe")
            .format("mjpeg")
            .pipe()
            .on("data", (chunk: Buffer) => {
              fs.writeFileSync(path.join(dir, "poster.jpg"), chunk);
            })
            .on("end", () => res())
            .on("error", rej);
        });

        const outPath = path.join(dir, `out.${ext}`);
        await new Promise<void>((res, rej) => {
          ffmpeg({ source: buf })
            .videoCodec("libx264")
            .audioCodec("aac")
            .outputOptions(["-crf", "28", "-preset", "fast", "-movflags", "+faststart"])
            .save(outPath)
            .on("end", () => res())
            .on("error", rej);
        });

        fs.unlinkSync(path.join(dir, `orig.${ext}`));
        fs.renameSync(outPath, path.join(dir, `orig.${ext}`));
      }
    } catch (e) {
      console.error("[media] processing failed", id, e);
    }

    const fileRow = db
      .prepare("INSERT INTO uploads (id, user_id, filename, original_name, size, mime) VALUES (?, ?, ?, ?, ?, ?)")
      .run(id, user.id, file.name, file.name, file.size, file.type) as any;
    db.prepare("INSERT INTO asset_files (asset_id, upload_id, role) VALUES (?, ?, 'orig')").run(id, id);

    created.push(id);
  }

  return NextResponse.json({ created });
}
