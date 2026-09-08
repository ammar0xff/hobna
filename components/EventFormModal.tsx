"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { X, CalendarHeart, Check } from "lucide-react";
import { fmtDate } from "@/lib/util";

export default function EventFormModal({
  open,
  onClose,
  initial,
}: {
  open: boolean;
  onClose: () => void;
  initial?: { id: string; title: string; start_date: string; end_date: string; description: string } | null;
}) {
  const router = useRouter();
  const [title, setTitle] = useState(initial?.title ?? "");
  const [start, setStart] = useState(initial?.start_date ?? today());
  const [end, setEnd] = useState(initial?.end_date ?? today());
  const [sameDay, setSameDay] = useState(initial ? initial.start_date === initial.end_date : true);
  const [description, setDescription] = useState(initial?.description ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (!open) return null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch(initial ? `/api/events/${initial.id}` : "/api/events", {
        method: initial ? "PATCH" : "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title,
          start_date: start,
          end_date: sameDay ? start : end,
          description,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "حصلت مشكلة");
        return;
      }
      const data = await res.json();
      onClose();
      router.refresh();
      if (!initial) router.push(`/events/${data.event.id}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-cocoa/60 backdrop-blur-sm sm:items-center sm:p-6">
      <form
        onSubmit={submit}
        className="w-full max-w-md rounded-t-3xl bg-white p-6 soft-shadow animate-pop sm:rounded-3xl"
      >
        <div className="flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-lg font-bold text-cocoa">
            <CalendarHeart className="h-5 w-5 text-rosie" />
            {initial ? "عدّل الحدث" : "حدث جديد"}
          </h3>
          <button type="button" onClick={onClose} className="rounded-full p-2 text-cocoa-soft hover:bg-blush">
            <X className="h-5 w-5" />
          </button>
        </div>

        <label className="mt-5 block text-sm font-semibold">
          اسم الحدث
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            autoFocus
            placeholder="مثال: أول موعد لينا 💘"
            className="mt-2 w-full rounded-2xl border border-sand bg-cream px-4 py-3 outline-none transition focus:border-rosie focus:ring-4 focus:ring-rosie/10"
          />
        </label>

        <div className="mt-4 grid grid-cols-1 gap-4">
          <label className="block text-sm font-semibold">
            اليوم
            <input
              type="date"
              value={start}
              onChange={(e) => setStart(e.target.value)}
              className="mt-2 w-full rounded-2xl border border-sand bg-cream px-4 py-3 outline-none focus:border-rosie"
            />
          </label>
          {!sameDay && (
            <label className="block text-sm font-semibold">
              آخر يوم
              <input
                type="date"
                value={end}
                onChange={(e) => setEnd(e.target.value)}
                className="mt-2 w-full rounded-2xl border border-sand bg-cream px-4 py-3 outline-none focus:border-rosie"
              />
            </label>
          )}
          <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-cocoa-soft">
            <input
              type="checkbox"
              checked={sameDay}
              onChange={(e) => setSameDay(e.target.checked)}
              className="h-4 w-4 accent-rosie"
            />
            الحدث يوم واحد بس
          </label>
        </div>

        <label className="mt-4 block text-sm font-semibold">
          وصف (اختياري)
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            placeholder="اكتب عن الحدث ده…"
            className="mt-2 w-full resize-none rounded-2xl border border-sand bg-cream px-4 py-3 outline-none focus:border-rosie"
          />
        </label>

        {error && (
          <p className="mt-3 rounded-2xl bg-blush px-4 py-3 text-sm font-semibold text-rosie-strong">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={busy}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-l from-rosie to-rosie-strong py-3.5 font-bold text-white shadow-lg shadow-rosie/25 transition hover:brightness-105 disabled:opacity-60"
        >
          {busy ? (
            <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
          ) : (
            <>
              <Check className="h-5 w-5" />
              {initial ? "احفظ التعديل" : "عمل الحدث"}
            </>
          )}
        </button>
      </form>
    </div>
  );
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

export { fmtDate };
