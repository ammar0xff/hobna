import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { assetDir } from "./db";

const THUMB_WIDTH = 480;
const MED_WIDTH = 1400;

export const VARIANTS = ["orig", "thumb", "med", "poster"] as const;
export type Variant = (typeof VARIANTS)[number];

export function variantPath(id: string, variant: Variant, ext = "") {
  const dir = assetDir(id);
  fs.mkdirSync(dir, { recursive: true });
  const extMap: Record<Variant, string> = {
    orig: `.${ext}`,
    thumb: ".webp",
    med: ".webp",
    poster: ".jpg",
  };
  return path.join(dir, `${variant}${extMap[variant]}`);
}

export function variantExists(id: string, variant: Variant) {
  return fs.existsSync(path.join(assetDir(id), variant));
}

export function removeAssetFiles(id: string) {
  fs.rmSync(assetDir(id), { recursive: true, force: true });
}

function run(bin: string, args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(bin, args, { stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (d) => (stdout += d.toString()));
    child.stderr.on("data", (d) => (stderr += d.toString()));
    child.on("error", (e) => reject(new Error(`${bin} failed to start: ${e.message}`)));
    child.on("close", (code) => {
      if (code === 0) resolve(stdout);
      else reject(new Error(`${bin} exited ${code}: ${stderr.slice(-400)}`));
    });
  });
}

export function runFfmpeg(args: string[]): Promise<string> {
  return run("ffmpeg", args);
}

export function runProbe(args: string[]): Promise<string> {
  return run("ffprobe", args);
}

export interface MediaInfo {
  width: number;
  height: number;
  duration: number;
}

export async function probeMedia(src: string): Promise<MediaInfo> {
  const out = await runProbe([
    "-i", src,
    "-hide_banner",
    "-show_entries", "format=duration:stream=width,height,codec_type",
    "-of", "json",
  ]);
  let width = 0;
  let height = 0;
  let duration = 0;
  try {
    const jsonStart = out.indexOf("{");
    const parsed = JSON.parse(jsonStart >= 0 ? out.slice(jsonStart) : out);
    duration = parseFloat(parsed.format?.duration ?? "0") || 0;
    const stream = (parsed.streams ?? []).find(
      (s: { codec_type: string }) => s.codec_type === "video"
    );
    if (stream) {
      width = parseInt(stream.width, 10) || 0;
      height = parseInt(stream.height, 10) || 0;
    }
  } catch {
    // fallback zeros
  }
  return { width, height, duration };
}

function scaleFilter(width: number) {
  return `scale='min(${width},iw)':-2`;
}

export async function processImage(id: string, ext: string, origPath: string): Promise<MediaInfo> {
  const info = await probeMedia(origPath);

  const make = async (targetWidth: number, outPath: string) => {
    await runFfmpeg([
      "-y",
      "-i", origPath,
      "-vf", scaleFilter(targetWidth),
      "-frames:v", "1",
      "-c:v", "libwebp",
      "-q:v", targetWidth === THUMB_WIDTH ? "72" : "80",
      "-loglevel", "error",
      outPath,
    ]);
  };

  await make(THUMB_WIDTH, variantPath(id, "thumb"));
  await make(MED_WIDTH, variantPath(id, "med"));

  return { ...info, duration: 0 };
}

export async function processVideo(id: string, ext: string, origPath: string): Promise<MediaInfo> {
  const info = await probeMedia(origPath);

  await runFfmpeg([
    "-y",
    "-i", origPath,
    "-ss", "1",
    "-vf", scaleFilter(MED_WIDTH),
    "-frames:v", "1",
    "-q:v", "3",
    "-loglevel", "error",
    variantPath(id, "poster"),
  ]);

  await runFfmpeg([
    "-y",
    "-i", origPath,
    "-ss", "1",
    "-vf", scaleFilter(THUMB_WIDTH),
    "-frames:v", "1",
    "-c:v", "libwebp",
    "-q:v", "72",
    "-loglevel", "error",
    variantPath(id, "thumb"),
  ]);

  return info;
}

export async function processAsset(
  id: string,
  type: "image" | "video",
  ext: string,
  origPath: string
): Promise<MediaInfo> {
  if (type === "image") return processImage(id, ext, origPath);
  return processVideo(id, ext, origPath);
}
