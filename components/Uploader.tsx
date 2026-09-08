"use client";

import { useEffect, useRef, useState } from "react";
import exifr from "exifr";
import { UploadCloud, X, Plus, Heart, ImagePlus, Film, CheckCircle2, AlertCircle } from "lucide-react";

interface QueuedFile {
  key: string;
  file: File;
  preview: string;
  takenAt: string;
  status: "pending" | "uploading" | "done" | "error";
  progress: number;
  error?: string;
}

const PERSON_OPTIONS = [
  { value: "", label: "مش متحدد" },
  { value: "ammar", label: "أنا" },
  { value: "alaa", label: "آلاء" },
  { value: "both", label: "إحنا الاتنين" },
];

export default function Uploader({ onUploaded }: { onUploaded: () => void }) {
  const [open, setOpen] = useState(false);
  const [files, setFiles] = useState<QueuedFile[]>([]);
  const [person, setPerson] = useState("");
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function extractDate(file: File): Promise<string> {
    try {
      if (file.type.startsWith("image/")) {
        const exif = await exifr.parse(file, {
          pick: ["DateTimeOriginal", "CreateDate", "ModifyDate", "GPSDateStamp"],
          translateValues: true,
        });
        const date =
          (exif as any)?.DateTimeOriginal ??
          (exif as any)?.CreateDate ??
          (exif as any)?.ModifyDate;
        if (date) return new Date(date).toISOString();
      }
    } catch {
      // fall through to lastModified
    }
    return new Date(file.lastModified || Date.now()).toISOString();
  }

  async function addFiles(list: FileList | File[]) {
    const queue: QueuedFile[] = [];
    for (const file of Array.from(list)) {
      if (!file.type.startsWith("image/") && !file.type.startsWith("video/")) continue;
      queue.push({
        key: `${file.name}-${file.size}-${Date.now()}-${Math.random()}`,
        file,
        preview: URL.createObjectURL(file),
        takenAt: await extractDate(file),
        status: "pending",
        progress: 0,
      });
    }
    setFiles((prev) => [...prev, ...queue]);
  }

  function removeFile(key: string) {
    setFiles((prev) => prev.filter((f) => f.key !== key));
  }

  function uploadFile(item: QueuedFile, personTag: string): Promise<void> {
    return new Promise((resolve) => {
      const xhr = new XMLHttpRequest();
      xhr.open("POST", "/api/assets");
      xhr.setRequestHeader("x-file-name", encodeURIComponent(item.file.name));
      xhr.setRequestHeader("x-taken-at", item.takenAt);
      xhr.setRequestHeader("x-person", personTag);
      xhr.setRequestHeader("x-type", item.file.type.startsWith("video/") ? "video" : "image");
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          const pct = Math.round((e.loaded / e.total) * 100);
          setFiles((prev) => prev.map((f) => (f.key === item.key ? { ...f, progress: pct } : f)));
        }
      };
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          setFiles((prev) => prev.map((f) => (f.key === item.key ? { ...f, status: "done", progress: 100 } : f)));
        } else {
          let msg = "حصلت مشكلة في الرفع";
          try {
            msg = JSON.parse(xhr.responseText)?.error || msg;
          } catch {}
          setFiles((prev) => prev.map((f) => (f.key === item.key ? { ...f, status: "error", error: msg } : f)));
        }
        resolve();
      };
      xhr.onerror = () => {
        setFiles((prev) => prev.map((f) => (f.key === item.key ? { ...f, status: "error", error: "الاتصال وقع" } : f)));
        resolve();
      };
      setFiles((prev) => prev.map((f) => (f.key === item.key ? { ...f, status: "uploading" } : f)));
      xhr.send(item.file);
    });
  }

  async function startUpload() {
    const pending = files.filter((f) => f.status !== "done");
    if (!pending.length) return;
    setBusy(true);
    for (const item of pending) {
      await uploadFile(item, person);
    }
    setBusy(false);
    onUploaded();
  }

  function close() {
    if (busy) return;
    setOpen(false);
    setFiles([]);
    setDragging(false);
  }

  const doneCount = files.filter((f) => f.status === "done").length;
  const errorCount = files.filter((f) => f.status === "error").length;
  const allDone = files.length > 0 && files.every((f) => f.status === "done");

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 left-6 z-40 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-rosie to-rosie-strong text-white shadow-2xl shadow-rosie/40 transition hover:scale-105 active:scale-95"
        aria-label="رفع صور"
      >
        <Plus className="h-8 w-8" />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-cocoa/60 p-0 backdrop-blur-sm sm:items-center sm:p-6">
          <div className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-3xl bg-white soft-shadow animate-pop sm:rounded-3xl">
            <div className="flex items-center justify-between border-b border-sand/70 px-5 py-4">
              <h3 className="flex items-center gap-2 text-lg font-bold text-cocoa">
                <Heart className="h-5 w-5 fill-rosie text-rosie" />
                زوّد ذاكرتنا
              </h3>
              <button onClick={close} className="rounded-full p-2 text-cocoa-soft hover:bg-blush">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-5">
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragging(false);
                  addFiles(e.dataTransfer.files);
                }}
                onClick={() => inputRef.current?.click()}
                className={`flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed px-6 py-10 text-center transition ${
                  dragging
                    ? "border-rosie bg-blush"
                    : "border-rosie-soft/60 bg-cream hover:border-rosie hover:bg-blush/60"
                }`}
              >
                <UploadCloud className="h-12 w-12 text-rosie" />
                <p className="font-bold text-cocoa">اسحب الصور والفيديوهات هنا</p>
                <p className="text-sm text-cocoa-soft">أو اضغط واختار من الجهاز</p>
                <p className="rounded-full bg-white px-3 py-1 text-xs text-cocoa-soft">
                  التوقيت بيتاخد أوتوماتيك من بيانات الصورة 📸
                </p>
                <input
                  ref={inputRef}
                  type="file"
                  accept="image/*,video/*"
                  multiple
                  hidden
                  onChange={(e) => e.target.files && addFiles(e.target.files)}
                />
              </div>

              {files.length > 0 && (
                <>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-bold text-cocoa-soft">اللي في الملفات دي:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {PERSON_OPTIONS.map((o) => (
                        <button
                          key={o.value}
                          onClick={() => setPerson(o.value)}
                          className={`rounded-full px-3 py-1 text-xs font-bold transition ${
                            person === o.value
                              ? "bg-gradient-to-l from-rosie to-rosie-strong text-white shadow"
                              : "bg-blush text-cocoa-soft hover:bg-rosie-soft/50"
                          }`}
                        >
                          {o.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <ul className="space-y-2">
                    {files.map((f) => (
                      <li
                        key={f.key}
                        className="flex items-center gap-3 rounded-2xl border border-sand/70 bg-cream p-2.5"
                      >
                        <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-white">
                          {f.file.type.startsWith("video/") ? (
                            <video src={f.preview} className="h-full w-full object-cover" muted />
                          ) : (
                            <img src={f.preview} alt="" className="h-full w-full object-cover" />
                          )}
                          {f.file.type.startsWith("video/") && (
                            <Film className="absolute bottom-1 left-1 h-3.5 w-3.5 text-white drop-shadow" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-cocoa">{f.file.name}</p>
                          <input
                            type="datetime-local"
                            value={toLocalInput(f.takenAt)}
                            onChange={(e) =>
                              setFiles((prev) =>
                                prev.map((x) =>
                                  x.key === f.key
                                    ? { ...x, takenAt: new Date(e.target.value).toISOString() }
                                    : x
                                )
                              )
                            }
                            className="mt-1 w-full max-w-[200px] rounded-lg border border-sand bg-white px-2 py-1 text-xs outline-none focus:border-rosie"
                          />
                          {f.status === "uploading" && (
                            <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-sand">
                              <div
                                className="h-full rounded-full bg-gradient-to-l from-rosie to-rosie-strong transition-all"
                                style={{ width: `${f.progress}%` }}
                              />
                            </div>
                          )}
                          {f.status === "error" && (
                            <p className="mt-1 flex items-center gap-1 text-xs font-semibold text-red-500">
                              <AlertCircle className="h-3.5 w-3.5" /> {f.error}
                            </p>
                          )}
                        </div>
                        {f.status === "done" ? (
                          <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500" />
                        ) : (
                          <button
                            onClick={() => removeFile(f.key)}
                            disabled={f.status === "uploading"}
                            className="rounded-full p-1.5 text-cocoa-soft hover:bg-white hover:text-red-500"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>

            {files.length > 0 && (
              <div className="border-t border-sand/70 p-4">
                <button
                  onClick={startUpload}
                  disabled={busy}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-l from-rosie to-rosie-strong py-3.5 font-bold text-white shadow-lg shadow-rosie/25 transition hover:brightness-105 disabled:opacity-60"
                >
                  {busy ? (
                    <span className="flex items-center gap-2">
                      <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                      بنرفع… {doneCount + (files.some((f) => f.status === "uploading") ? 1 : 0)}/{files.length}
                    </span>
                  ) : allDone ? (
                    <>
                      <CheckCircle2 className="h-5 w-5" />
                      كله اتحط ✅
                    </>
                  ) : errorCount > 0 ? (
                    <>جرب تاني للملفات الغلط ({errorCount})</>
                  ) : (
                    <>
                      <ImagePlus className="h-5 w-5" />
                      ارفع {files.length} {files.length === 1 ? "ملف" : "ملفات"}
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

function toLocalInput(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}
