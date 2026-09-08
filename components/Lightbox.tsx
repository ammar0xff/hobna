"use client";

import { useEffect, useState, useCallback } from "react";
import {
  X,
  ChevronRight,
  ChevronLeft,
  Heart,
  MessageCircle,
  Download,
  Trash2,
  Camera,
  Check,
  Pencil,
} from "lucide-react";
import type { Asset, AssetDetail, User } from "@/lib/types";
import { fmtDate, fmtFileSize, formatDuration } from "@/lib/util";
import { PersonBadge } from "./AssetCard";

const PERSON_OPTIONS = [
  { value: "ammar", label: "أنا" },
  { value: "alaa", label: "آلاء" },
  { value: "both", label: "إحنا الاتنين" },
  { value: "", label: "مش متحدد" },
];

export default function Lightbox({
  assets,
  initialIndex,
  users,
  eventId,
  onClose,
  onIndexChange,
  onChanged,
}: {
  assets: Asset[];
  initialIndex: number;
  users: Record<string, string>;
  eventId?: string;
  onClose: () => void;
  onIndexChange: (i: number) => void;
  onChanged: () => void;
}) {
  const [index, setIndex] = useState(initialIndex);
  const [detail, setDetail] = useState<AssetDetail | null>(null);
  const [person, setPerson] = useState<string>("");
  const [caption, setCaption] = useState("");
  const [takenAt, setTakenAt] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [coverMsg, setCoverMsg] = useState("");

  const asset = assets[index];

  const load = useCallback(async (id: string) => {
    const res = await fetch(`/api/assets/${id}`);
    if (res.ok) {
      const data = await res.json();
      setDetail(data.asset);
      setPerson(data.asset.person ?? "");
      setCaption(data.asset.caption ?? "");
      setTakenAt(data.asset.taken_at);
    }
  }, []);

  useEffect(() => {
    if (asset) load(asset.id);
  }, [asset?.id, load]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") next();
      if (e.key === "ArrowLeft") prev();
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, assets.length]);

  function next() {
    const i = (index + 1) % assets.length;
    setIndex(i);
    onIndexChange(i);
  }
  function prev() {
    const i = (index - 1 + assets.length) % assets.length;
    setIndex(i);
    onIndexChange(i);
  }

  async function like() {
    if (!detail) return;
    const res = await fetch(`/api/assets/${detail.id}/like`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ on: !detail.liked_by_me }),
    });
    if (res.ok) {
      const data = await res.json();
      setDetail({ ...detail, liked_by_me: data.liked ? 1 : 0, likes: data.count });
    }
  }

  async function save() {
    if (!detail) return;
    setSaving(true);
    try {
      const body: Record<string, unknown> = {};
      if (person !== detail.person) body.person = person || null;
      if (caption !== detail.caption) body.caption = caption;
      if (takenAt !== detail.taken_at) body.taken_at = takenAt;
      if (Object.keys(body).length) {
        const res = await fetch(`/api/assets/${detail.id}`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) return;
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
      onChanged();
    } finally {
      setSaving(false);
    }
  }

  async function addComment() {
    if (!detail || !commentText.trim()) return;
    const res = await fetch(`/api/assets/${detail.id}/comments`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text: commentText }),
    });
    if (res.ok) {
      const data = await res.json();
      setDetail({
        ...detail,
        comments: detail.comments + 1,
        comments_list: [...detail.comments_list, data.comment],
      });
      setCommentText("");
    }
  }

  async function deleteComment(cid: number) {
    if (!detail) return;
    const res = await fetch(`/api/assets/${detail.id}/comments/${cid}`, { method: "DELETE" });
    if (res.ok) {
      setDetail({
        ...detail,
        comments: detail.comments - 1,
        comments_list: detail.comments_list.filter((c) => c.id !== cid),
      });
    }
  }

  async function removeAsset() {
    if (!detail) return;
    if (!confirm("متأكد إنك عايز تحذف الحتة دي نهائي؟ 💔")) return;
    const res = await fetch(`/api/assets/${detail.id}`, { method: "DELETE" });
    if (res.ok) {
      onChanged();
      onClose();
    }
  }

  async function makeCover() {
    if (!detail || !eventId) return;
    const res = await fetch(`/api/events/${eventId}/cover`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ assetId: detail.id }),
    });
    if (res.ok) {
      setCoverMsg("اتحطت كوفر الحدث ✅");
      setTimeout(() => setCoverMsg(""), 2000);
      onChanged();
    }
  }

  if (!asset) return null;

  const mediaSrc =
    asset.type === "image"
      ? `/api/media/${asset.id}?v=med`
      : `/api/media/${asset.id}?v=orig`;
  const downloadSrc = `/api/media/${asset.id}?v=orig`;
  const downloadName = asset.orig_name || `${asset.id}.${asset.ext}`;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-cocoa/95 backdrop-blur-sm md:flex-row">
      <div className="relative flex min-h-0 flex-1 items-center justify-center p-3 sm:p-6">
        <button
          onClick={onClose}
          className="absolute right-3 top-3 z-20 rounded-full bg-white/15 p-2 text-white backdrop-blur transition hover:bg-white/30"
          aria-label="إغلاق"
        >
          <X className="h-5 w-5" />
        </button>

        <button
          onClick={prev}
          className="absolute right-2 top-1/2 z-20 -translate-y-1/2 rounded-full bg-white/15 p-2 text-white backdrop-blur transition hover:bg-white/30 md:right-4"
          aria-label="السابق"
        >
          <ChevronRight className="h-6 w-6" />
        </button>
        <button
          onClick={next}
          className="absolute left-2 top-1/2 z-20 -translate-y-1/2 rounded-full bg-white/15 p-2 text-white backdrop-blur transition hover:bg-white/30 md:left-4"
          aria-label="التالي"
        >
          <ChevronLeft className="h-6 w-6" />
        </button>

        <div className="flex max-h-full max-w-full items-center justify-center">
          {asset.type === "image" ? (
            <img
              src={mediaSrc}
              alt={asset.orig_name}
              className="max-h-[calc(100vh-8rem)] max-w-full rounded-xl object-contain animate-pop md:max-h-[calc(100vh-3rem)]"
              draggable={false}
            />
          ) : (
            <video
              src={mediaSrc}
              controls
              autoPlay
              playsInline
              className="max-h-[calc(100vh-8rem)] max-w-full rounded-xl animate-pop md:max-h-[calc(100vh-3rem)]"
            />
          )}
        </div>
      </div>

      <aside className="flex max-h-[42vh] w-full shrink-0 flex-col overflow-hidden bg-white md:max-h-none md:w-[360px] md:max-w-[360px]">
        <div className="flex items-center gap-3 border-b border-sand/70 p-4">
          <PersonBadge person={asset.person} users={users} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-cocoa">
              {asset.caption || asset.orig_name}
            </p>
            <p className="text-xs text-cocoa-soft">{fmtDate(asset.taken_at)}</p>
          </div>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
          {coverMsg && (
            <p className="rounded-xl bg-emerald-100 px-3 py-2 text-sm font-semibold text-emerald-700">
              {coverMsg}
            </p>
          )}

          <div>
            <label className="text-xs font-bold text-cocoa-soft">اللي في الصورة</label>
            <div className="mt-2 flex flex-wrap gap-2">
              {PERSON_OPTIONS.map((o) => (
                <button
                  key={o.value}
                  onClick={() => setPerson(o.value)}
                  className={`rounded-full px-3 py-1.5 text-xs font-bold transition ${
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

          <div>
            <label className="text-xs font-bold text-cocoa-soft">التاريخ</label>
            <input
              type="datetime-local"
              value={toLocalInput(takenAt)}
              onChange={(e) => setTakenAt(new Date(e.target.value).toISOString())}
              className="mt-2 w-full rounded-xl border border-sand bg-cream px-3 py-2 text-sm outline-none focus:border-rosie"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-cocoa-soft">وصف/كلام حلو</label>
            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              rows={2}
              placeholder="اكتب حاجة حلوة عن اللحظة دي…"
              className="mt-2 w-full resize-none rounded-xl border border-sand bg-cream px-3 py-2 text-sm outline-none focus:border-rosie"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={save}
              disabled={saving}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-l from-rosie to-rosie-strong py-2.5 text-sm font-bold text-white shadow transition hover:brightness-105 disabled:opacity-60"
            >
              {saved ? <Check className="h-4 w-4" /> : <Pencil className="h-4 w-4" />}
              {saved ? "اتحفظت" : "احفظ التعديلات"}
            </button>
            {eventId && (
              <button
                onClick={makeCover}
                className="flex items-center gap-2 rounded-xl bg-goldy/20 px-3 py-2.5 text-sm font-bold text-amber-800 transition hover:bg-goldy/35"
              >
                <Camera className="h-4 w-4" />
                كوفر
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 border-t border-sand/70 pt-3">
            <button
              onClick={like}
              className={`flex items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-bold transition ${
                detail?.liked_by_me
                  ? "bg-rosie text-white shadow"
                  : "bg-blush text-rosie-strong hover:bg-rosie-soft/50"
              }`}
            >
              <Heart className={`h-4 w-4 ${detail?.liked_by_me ? "fill-white animate-heartbeat" : ""}`} />
              {detail?.likes || 0}
            </button>
            <button
              onClick={() => setCommentsOpen((o) => !o)}
              className="flex items-center gap-1.5 rounded-full bg-blush px-3.5 py-2 text-sm font-bold text-rosie-strong transition hover:bg-rosie-soft/50"
            >
              <MessageCircle className="h-4 w-4" />
              {detail?.comments || 0}
            </button>
            <a
              href={downloadSrc}
              download={downloadName}
              className="ml-auto flex items-center gap-1.5 rounded-full bg-blush px-3.5 py-2 text-sm font-bold text-rosie-strong transition hover:bg-rosie-soft/50"
            >
              <Download className="h-4 w-4" />
              تحميل
            </a>
            <button
              onClick={removeAsset}
              className="rounded-full bg-red-50 p-2 text-red-500 transition hover:bg-red-100"
              title="حذف"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>

          <p className="text-[11px] text-cocoa-soft">
            {asset.type === "video"
              ? `🎬 فيديو • ${formatDuration(asset.duration ?? 0)} • ${fmtFileSize(asset.size)}`
              : `📷 صورة • ${asset.width}×${asset.height} • ${fmtFileSize(asset.size)}`}
            {detail && detail.in_events > 0 ? ` • في ${detail.in_events} ${detail.in_events === 1 ? "حدث" : "أحداث"}` : ""}
          </p>

          {commentsOpen && detail && (
            <div className="space-y-3">
              <h4 className="text-sm font-bold text-cocoa">التعليقات 💬</h4>
              <div className="space-y-2">
                {detail.comments_list.length === 0 && (
                  <p className="text-xs text-cocoa-soft">لسه مفيش تعليقات… ابدأ انت 😄</p>
                )}
                {detail.comments_list.map((c) => (
                  <div key={c.id} className="rounded-xl bg-cream p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-rosie-strong">{c.user_name}</span>
                      <button
                        onClick={() => deleteComment(c.id)}
                        className="text-[11px] text-cocoa-soft hover:text-red-500"
                      >
                        حذف
                      </button>
                    </div>
                    <p className="mt-0.5 text-sm">{c.text}</p>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addComment()}
                  placeholder="اكتب تعليق…"
                  className="flex-1 rounded-xl border border-sand bg-cream px-3 py-2 text-sm outline-none focus:border-rosie"
                />
                <button
                  onClick={addComment}
                  className="rounded-xl bg-rosie px-4 text-sm font-bold text-white transition hover:brightness-105"
                >
                  تعليق
                </button>
              </div>
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}

function toLocalInput(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}
