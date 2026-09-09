import fs from "node:fs";
import path from "node:path";
import { db, assetDir } from "./db";
import {
  isGoogleEnabled,
  getValidAccessToken,
  uploadToDrive,
  downloadFromDrive,
  deleteFromDrive,
  createDriveFolder,
} from "./google";

const CACHE_DIR = path.join(process.env.DATA_DIR || path.join(process.cwd(), "data"), "cache");

export type Variant = "orig" | "thumb" | "med" | "poster";

const EXT_MAP: Record<Variant, string> = {
  orig: "",
  thumb: ".webp",
  med: ".webp",
  poster: ".jpg",
};

export function variantPath(id: string, variant: Variant, ext = ""): string {
  const dir = assetDir(id);
  fs.mkdirSync(dir, { recursive: true });
  const extStr = variant === "orig" ? `.${ext}` : EXT_MAP[variant];
  return path.join(dir, `${variant}${extStr}`);
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

export function removeAssetFiles(id: string): void {
  const dir = assetDir(id);
  fs.rmSync(dir, { recursive: true, force: true });

  if (isGoogleEnabled()) {
    try {
      removeDriveFiles(id);
    } catch (e) {
      console.error("[storage] failed to remove drive files for", id, e);
    }
  }
}

function getDriveUserId(): number {
  const row = db.prepare("SELECT user_id FROM user_tokens LIMIT 1").get() as { user_id: number } | undefined;
  if (!row) throw new Error("مش متصصل بـ Google Drive");
  return row.user_id;
}

function getDriveFolderId(userId: number): string {
  const row = db.prepare("SELECT drive_folder_id FROM user_tokens WHERE user_id = ?").get(userId) as
    { drive_folder_id: string } | undefined;
  if (!row?.drive_folder_id) throw new Error("مش متصصل بـ Google Drive");
  return row.drive_folder_id;
}

async function removeDriveFiles(id: string): Promise<void> {
  const row = db.prepare("SELECT drive_file_id FROM assets WHERE id = ?").get(id) as
    { drive_file_id: string } | undefined;
  if (!row?.drive_file_id) return;

  const userId = getDriveUserId();
  const token = await getValidAccessToken(userId);
  if (!token) return;
  try {
    await deleteFromDrive(token, row.drive_file_id);
  } catch (e: any) {
    if (e?.code !== 404) throw e;
  }
}

async function ensureDriveFolder(userId: number): Promise<string> {
  let folderId = "";
  try {
    folderId = getDriveFolderId(userId);
  } catch {}
  if (folderId) return folderId;

  const token = await getValidAccessToken(userId);
  if (!token) throw new Error("Google Drive token منتهي");
  folderId = await createDriveFolder(token);
  db.prepare("UPDATE user_tokens SET drive_folder_id = ? WHERE user_id = ?").run(folderId, userId);
  return folderId;
}

// ─── Cache layer ───

function cacheDir(id: string): string {
  const dir = path.join(CACHE_DIR, id);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function cachePath(id: string, variant: Variant, ext?: string): string {
  if (variant === "orig") return path.join(cacheDir(id), `orig.${ext}`);
  return path.join(cacheDir(id), `${variant}${EXT_MAP[variant]}`);
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

// ─── Main interface ───

export interface StorageResult {
  buffer: Buffer;
  mimeType: string;
}

export async function readVariant(id: string, variant: Variant, ext: string, mime: string): Promise<StorageResult> {
  // Check local first
  const localPath = variant === "orig"
    ? path.join(assetDir(id), `orig.${ext}`)
    : path.join(assetDir(id), `${variant}${EXT_MAP[variant]}`);

  if (fs.existsSync(localPath)) {
    return { buffer: fs.readFileSync(localPath), mimeType: mime };
  }

  // Check cache
  const cached = readCache(id, variant, ext);
  if (cached) return { buffer: cached, mimeType: mime };

  // Try Google Drive
  if (isGoogleEnabled()) {
    const row = db.prepare("SELECT drive_file_id FROM assets WHERE id = ?").get(id) as
      { drive_file_id: string } | undefined;
    if (row?.drive_file_id) {
      const userId = getDriveUserId();
      const token = await getValidAccessToken(userId);
      if (token) {
        const data = await downloadFromDrive(token, row.drive_file_id);
        writeCache(id, variant, data, ext);
        return { buffer: data, mimeType: mime };
      }
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
  const localPath = variantPath(id, variant, ext);
  fs.writeFileSync(localPath, data);

  let driveFileId: string | undefined;

  if (isGoogleEnabled()) {
    try {
      const userId = getDriveUserId();
      const folderId = await ensureDriveFolder(userId);
      const token = await getValidAccessToken(userId);
      if (token) {
        const fileName = `${id}/${variant}${variant === "orig" ? `.${ext}` : EXT_MAP[variant]}`;
        const mimeType = variant === "orig" ? getMimeForExt(ext) : (variant === "poster" ? "image/jpeg" : "image/webp");
        driveFileId = await uploadToDrive(token, folderId, fileName, mimeType, data);
      }
    } catch (e) {
      console.error("[storage] drive upload failed for", id, variant, e);
    }
  }

  return { localPath, driveFileId };
}

export { EXT_MAP };
