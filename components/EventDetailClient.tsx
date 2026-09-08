"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, CalendarHeart, Sparkles, Images, X, Check, ArrowRight } from "lucide-react";
import type { Asset, EventRow } from "@/lib/types";
import { fmtDate, dayKey, pluralAr } from "@/lib/util";
import AssetCard from "./AssetCard";
import Lightbox from "./Lightbox";
import EventFormModal from "./EventFormModal";

export default function EventDetailClient({
  event,
  assets,
  users,
}: {
  event: EventRow;
  assets: Asset[];
  users: Record<string, string>;
}) {
  const router = useRouter();
  const [lightbox, setLightbox] = useState<number | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);

  async function removeEvent() {
    if (!confirm(`متأكد إنك عايز تحذف حدث "${event.title}"؟`)) return;
    await fetch(`/api/events/${event.id}`, { method: "DELETE" });
    router.push("/events");
    router.refresh();
  }

  async function refresh() {
    router.refresh();
  }

  const range =
    event.start_date === event.end_date
      ? fmtDate(`${event.start_date}T12:00:00`)
      : `${fmtDate(`${event.start_date}T12:00:00`)} — ${fmtDate(`${event.end_date}T12:00:00`)}`;

  return (
    <div className="space-y-6">
      <button
        onClick={() => router.push("/events")}
        className="flex items-center gap-1 text-sm font-bold text-cocoa-soft transition hover:text-rosie"
      >
        <ArrowRight className="h-4 w-4 rotate-180" />
        كل الأحداث
      </button>

      <section className="relative overflow-hidden rounded-3xl bg-white soft-shadow">
        <div className="relative aspect-[16/9] w-full sm:aspect-[21/9]">
          {event.cover_asset_id ? (
            <img
              src={`/api/media/${event.cover_asset_id}?v=med`}
              alt={event.title}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-blush to-lilac/40">
              <CalendarHeart className="h-16 w-16 text-rosie-soft" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-cocoa/75 via-cocoa/20 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 flex flex-wrap items-end justify-between gap-3 p-5 sm:p-7">
            <div>
              <h1 className="font-display text-2xl font-bold text-white text-shadow-soft sm:text-4xl">
                {event.title}
              </h1>
              <p className="mt-1 text-sm font-semibold text-white/90">{range}</p>
              {event.description && (
                <p className="mt-2 max-w-xl text-sm text-white/85">{event.description}</p>
              )}
            </div>
            <span className="rounded-full bg-white/20 px-4 py-2 text-sm font-bold text-white backdrop-blur">
              {assets.length} {pluralAr(assets.length, ["لحظة", "لحظتين", "لحظات"])} 💛
            </span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 border-t border-sand/70 p-4">
          <button
            onClick={() => setAddOpen(true)}
            className="flex items-center gap-1.5 rounded-full bg-gradient-to-l from-rosie to-rosie-strong px-4 py-2 text-sm font-bold text-white shadow transition hover:brightness-105"
          >
            <Plus className="h-4 w-4" />
            زوّد لحظات
          </button>
          <button
            onClick={() => setFormOpen(true)}
            className="flex items-center gap-1.5 rounded-full bg-blush px-4 py-2 text-sm font-bold text-rosie-strong transition hover:bg-rosie-soft/50"
          >
            <Pencil className="h-4 w-4" />
            عدّل
          </button>
          <button
            onClick={removeEvent}
            className="flex items-center gap-1.5 rounded-full bg-red-50 px-4 py-2 text-sm font-bold text-red-500 transition hover:bg-red-100"
          >
            <Trash2 className="h-4 w-4" />
            احذف الحدث
          </button>
        </div>
      </section>

      {assets.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-3xl bg-white p-12 text-center soft-shadow">
          <Images className="h-12 w-12 text-rosie-soft" />
          <h3 className="text-lg font-bold text-cocoa">الحدث لسه فاضي</h3>
          <p className="text-sm text-cocoa-soft">
            اضغط "زوّد لحظات" وهنجيبلك كل اللي اتاخد في يوم الحدث من أوله لآخره 📸
          </p>
        </div>
      ) : (
        <div className="masonry columns-2 sm:columns-3 lg:columns-4">
          {assets.map((a, i) => (
            <AssetCard
              key={a.id}
              asset={a}
              users={users}
              onOpen={() => setLightbox(i)}
            />
          ))}
        </div>
      )}

      {lightbox !== null && assets[lightbox] && (
        <Lightbox
          assets={assets}
          initialIndex={lightbox}
          users={users}
          eventId={event.id}
          onClose={() => setLightbox(null)}
          onIndexChange={setLightbox}
          onChanged={refresh}
        />
      )}

      <EventFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        initial={{
          id: event.id,
          title: event.title,
          start_date: event.start_date,
          end_date: event.end_date,
          description: event.description,
        }}
      />

      {addOpen && (
        <AddMediaModal
          event={event}
          existingIds={new Set(assets.map((a) => a.id))}
          users={users}
          onClose={() => setAddOpen(false)}
          onAdded={() => {
            setAddOpen(false);
            refresh();
          }}
        />
      )}
    </div>
  );
}

function AddMediaModal({
  event,
  existingIds,
  users,
  onClose,
  onAdded,
}: {
  event: EventRow;
  existingIds: Set<string>;
  users: Record<string, string>;
  onClose: () => void;
  onAdded: () => void;
}) {
  const [allAssets, setAllAssets] = useState<Asset[] | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [tab, setTab] = useState<"range" | "all">("range");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/assets")
      .then((r) => r.json())
      .then((d) => {
        setAllAssets(d.assets);
      })
      .catch(() => setError("حصلت مشكلة في جلب الصور"));
  }, []);

  const start = `${event.start_date}T00:00:00`;
  const end = `${event.end_date}T23:59:59`;

  const inRange = useMemo(
    () =>
      (allAssets ?? []).filter((a) => {
        const k = dayKey(a.taken_at);
        return k >= event.start_date && k <= event.end_date;
      }),
    [allAssets, event]
  );

  const list = tab === "range" ? inRange : (allAssets ?? []);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function save() {
    const toAdd = Array.from(selected);
    if (!toAdd.length) {
      setError("اختار على الأقل حاجة واحدة");
      return;
    }
    setBusy(true);
    const res = await fetch(`/api/events/${event.id}/assets`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ assetIds: toAdd }),
    });
    if (res.ok) onAdded();
    else {
      setError("حصلت مشكلة");
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-cocoa/60 backdrop-blur-sm sm:items-center sm:p-6">
      <div className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-3xl bg-white soft-shadow animate-pop sm:rounded-3xl">
        <div className="flex items-center justify-between border-b border-sand/70 px-5 py-4">
          <h3 className="flex items-center gap-2 text-lg font-bold text-cocoa">
            <Sparkles className="h-5 w-5 text-goldy" />
            زوّد لحظات في «{event.title}»
          </h3>
          <button onClick={onClose} className="rounded-full p-2 text-cocoa-soft hover:bg-blush">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex gap-2 border-b border-sand/70 px-5 py-3">
          <button
            onClick={() => setTab("range")}
            className={`rounded-full px-4 py-1.5 text-sm font-bold transition ${
              tab === "range" ? "bg-gradient-to-l from-rosie to-rosie-strong text-white shadow" : "bg-blush text-cocoa-soft"
            }`}
          >
            من يوم الحدث ({inRange.length})
          </button>
          <button
            onClick={() => setTab("all")}
            className={`rounded-full px-4 py-1.5 text-sm font-bold transition ${
              tab === "all" ? "bg-gradient-to-l from-rosie to-rosie-strong text-white shadow" : "bg-blush text-cocoa-soft"
            }`}
          >
            كل الذاكرة ({allAssets?.length ?? 0})
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          {!allAssets ? (
            <p className="py-10 text-center text-cocoa-soft">بنحضّر الصور…</p>
          ) : list.length === 0 ? (
            <p className="py-10 text-center text-cocoa-soft">
              {tab === "range" ? "مفيش صور متاخدة في يوم الحدث ده" : "الذاكرة فاضية"}
            </p>
          ) : (
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
              {list.map((a) => {
                const already = existingIds.has(a.id);
                const isSel = selected.has(a.id) || already;
                return (
                  <button
                    key={a.id}
                    onClick={() => !already && toggle(a.id)}
                    className={`relative aspect-square w-full overflow-hidden rounded-2xl transition ${
                      isSel ? "ring-3 ring-rosie ring-offset-2" : "ring-1 ring-sand"
                    } ${already ? "opacity-60" : "hover:ring-rosie/60"}`}
                    title={already ? "مضاف قبل كده ✓" : a.caption || a.orig_name}
                  >
                    <img
                      src={`/api/media/${a.id}?v=thumb`}
                      alt=""
                      loading="lazy"
                      className="h-full w-full object-cover"
                    />
                    {isSel && (
                      <span className="absolute left-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-rosie text-white shadow">
                        <Check className="h-4 w-4" />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="border-t border-sand/70 p-4">
          {error && (
            <p className="mb-2 rounded-xl bg-blush px-3 py-2 text-sm font-semibold text-rosie-strong">
              {error}
            </p>
          )}
          <button
            onClick={save}
            disabled={busy || !allAssets}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-l from-rosie to-rosie-strong py-3.5 font-bold text-white shadow-lg shadow-rosie/25 transition hover:brightness-105 disabled:opacity-60"
          >
            {busy ? (
              <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
            ) : (
              <>
                <Plus className="h-5 w-5" />
                ضيف {selected.size} {pluralAr(selected.size, ["لحظة", "لحظتين", "لحظات"])}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
