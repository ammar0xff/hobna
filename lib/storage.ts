import fs from "node:fs";
import path from "node:path";
import { assetDir } from "./db";
import {
  isGoogleEnabled,
  getValidAccessToken,
  uploadToDrive,
  downloadFromDrive,
  deleteFromDrive,
  createDriveFolder,
} from "./google";

const MEDIA_DIR = path.join(process.env.DATA_DIR || path.join(process.cwd(), "data"), "media");
const CACHE_DIR = path.join(process.env.DATA_DIR || path.join(process.cwd(), "data"), "cache");

export type Variant = "orig" | "thumb" | "med" | "poster";

const EXT_MAP: Record<Variant, string> = {
  orig: "", // set dynamically
  thumb: ".webp",
  med: ".webp",
  poster: ".jpg",
};

// ─── Local helpers ───

export function variantPath(id: string, variant: Variant, ext = ""): string {
  const dir = assetDir(id);
  fs.mkdirSync(dir, { recursive: true });
  const extStr = variant === "orig" ? `.${ext}` : EXT_MAP[variant];
  return path.join(dir, `${variant}${extStr}`);
}

export function variantExists(id: string, variant: Variant): boolean {
  return fs.existsSync(path.join(assetDir(id), `${variant}${variant === "orig" ? ".*" : EXT_MAP[variant]}`));
}

export function localVariantExists(id: string, variant: Variant, ext?: string): boolean {
  if (variant === "orig") {
    return fs.existsSync(path.join(assetDir(id), `orig.${ext}`));
  }
  return fs.existsSync(path.join(assetDir(id), `${variant}${EXT_MAP[variant]}`));
}

export function removeAssetFiles(id: string): void {
  const dir = assetDir(id);
  fs.rmSync(dir, { recursive: true, force: true });

  // Also remove from Drive if connected
  if (isGoogleEnabled()) {
    try {
      removeDriveFiles(id);
    } catch (e) {
      console.error("[storage] failed to remove drive files for", id, e);
    }
  }
}

// ─── Drive helpers ───

function getDriveUserId(): number {
  // Shared drive: use the first user with a connected Drive
  const { db } = require("./db");
  const row = db.prepare("SELECT user_id FROM user_tokens LIMIT 1").get() as { user_id: number } | undefined;
  if (!row) throw new Error("مش متصصل بـ Google Drive");
  return row.user_id;
}

function getDriveFolderId(userId: number): string {
  const { db } = require("./db");
  const row = db.prepare("SELECT drive_folder_id FROM user_tokens WHERE user_id = ?").get(userId) as
    { drive_folder_id: string } | undefined;
  if (!row?.drive_folder_id) throw new Error("مش متصصل بـ Google Drive");
  return row.drive_folder_id;
}

function getDriveAccessToken(userId: number): string {
  const token = getValidAccessToken(userId);
  if (!token) throw new Error("Google Drive token منتهي، رجع اتصلي من الإعدادات");
  return token;
}

async function ensureDriveFolder(userId: number): Promise<string> {
  let folderId = "";
  try {
    folderId = getDriveFolderId(userId);
  } catch {}
  if (folderId) return folderId;

  const token = getDriveAccessToken(userId);
  folderId = await createDriveFolder(token);
  const { db } = require("./db");
  db.prepare("UPDATE user_tokens SET drive_folder_id = ? WHERE user_id = ?").run(folderId, userId);
  return folderId;
}

async function removeDriveFiles(id: string): Promise<void> {
  const { db } = require("./db");
  const row = db.prepare("SELECT drive_file_id FROM assets WHERE id = ?").get(id) as
    { drive_file_id: string } | undefined;
  if (!row?.drive_file_id) return;

  const userId = getDriveUserId();
  const token = getDriveAccessToken(userId);
  try {
    await deleteFromDrive(token, row.drive_file_id);
  } catch (e: any) {
    // File might already be deleted, don't throw
    if (e?.code !== 404) throw e;
  }
}

// ─── Cache layer ───

function cachePath(id: string, variant: Variant, ext?: string): string {
  const dir = path.join(CACHE_DIR, id);
  fs.mkdirSync(dir, { recursive: true });
  if (variant === "orig") return path.join(dir, `orig.${ext}`);
  return path.join(dir, `${variant}${EXT_MAP[variant]}`);
}

function cacheExists(id: string, variant: Variant, ext?: string): boolean {
  return fs.existsSync(cachePath(id, variant, ext));
}

function readCache(id: string, variant: Variant, ext?: string): Buffer | null {
  try {
    return fs.readFileSync(cachePath(id, variant, ext));
  } catch {
    return null;
  }
}

function writeCache(id: string, variant: Variant, data: Buffer, ext?: string): void {
  fs.writeFileSync(cachePath(id, variant, ext), data);
}

// ─── Main storage interface ───

export interface StorageResult {
  buffer: Buffer;
  mimeType: string;
}

export async function readVariant(id: string, variant: Variant, ext: string, mime: string): Promise<StorageResult> {
  // Always check local first (for locally uploaded files or cached)
  const localPath = variant === "orig"
    ? path.join(assetDir(id), `orig.${ext}`)
    : path.join(assetDir(id), `${variant}${EXT_MAP[variant]}`);

  if (fs.existsSync(localPath)) {
    return { buffer: fs.readFileSync(localPath), mimeType: mime };
  }

  // Check cache
  if (cacheExists(id, variant, ext)) {
    const cached = readCache(id, variant, ext);
    if (cached) return { buffer: cached, mimeType: mime };
  }

  // Try Google Drive
  if (isGoogleEnabled()) {
    const { db } = require("./db");
    const row = db.prepare("SELECT drive_file_id FROM assets WHERE id = ?").get(id) as
      { drive_file_id: string } | undefined;
    if (row?.drive_file_id) {
      const userId = getDriveUserId();
      const token = getDriveAccessToken(userId);
      const data = await downloadFromDrive(token, row.drive_file_id);
      // Cache for next time
      writeCache(id, variant, data, ext);
      return { buffer: data, mimeType: mime };
    }
  }

  throw new Error("الملف مش موجود");
}

export async function writeVariant(
  id: string,
  variant: Variant,
  ext: string,
  data: Buffer
): Promise<{ localPath: string; driveFileId?: string }> {
  // Always write locally
  const localPath = variantPath(id, variant, ext);
  fs.writeFileSync(localPath, data);

  let driveFileId: string | undefined;

  // Also upload to Drive if enabled
  if (isGoogleEnabled()) {
    try {
      const userId = getDriveUserId();
      const folderId = await ensureDriveFolder(userId);
      const token = getDriveAccessToken(userId);
      const fileName = `${id}/${variant}${variant === "orig" ? `.${ext}` : EXT_MAP[variant]}`;
      const mimeType = variant === "orig" ? getMimeForExt(ext) : (variant === "poster" ? "image/jpeg" : "image/webp");
      driveFileId = await uploadToDrive(token, folderId, fileName, mimeType, data);
    } catch (e) {
      console.error("[storage] drive upload failed for", id, variant, e);
      // Don't throw — local write succeeded
    }
  }

  return { localPath, driveFileId };
}

export function getMimeForExt(ext: string): string {
  const mimes: Record<string, string> = {
    jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", gif: "image/gif",
    webp: "image/webp", heic: "image/heic", heif: "image/heif", bmp: "image/bmp",
    tiff: "image/tiff", mp4: "video/mp4", mov: "video/quicktime", m4v: "video/mp4",
    webm: "video/webm", mkv: "video/x-matroska", avi: "video/x-msvideo",
  };
  return mimes[ext.toLowerCase()] || "application/octet-stream";
}

export function getVariantMime(variant: Variant): string {
  if (variant === "poster") return "image/jpeg";
  if (variant === "orig") return "application/octet-stream";
  return "image/webp";
}

export { EXT_MAP };
