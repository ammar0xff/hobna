"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, CalendarHeart, Pencil, Trash2, ArrowRight } from "lucide-react";
import type { EventRow } from "@/lib/types";
import { fmtDate } from "@/lib/util";
import EventFormModal from "./EventFormModal";

export default function EventsListClient({ initialEvents }: { initialEvents: EventRow[] }) {
  const router = useRouter();
  const [formOpen, setFormOpen] = useState(false);

  async function removeEvent(e: EventRow) {
    if (!confirm(`متأكد إنك عايز تحذف حدث "${e.title}"؟ الصور نفسها مش هتتحذف، بس الحدث هيروح.`))
      return;
    await fetch(`/api/events/${e.id}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-cocoa">
            <CalendarHeart className="h-6 w-6 text-rosie" />
            الأحداث
          </h1>
          <p className="mt-1 text-sm text-cocoa-soft">
            كل حدث بيلمّ لحظات يومه من أوله لآخره… أول موعد، العيد، الرحلة، وأي حاجة كده 💛
          </p>
        </div>
        <button
          onClick={() => setFormOpen(true)}
          className="flex shrink-0 items-center gap-2 rounded-2xl bg-gradient-to-l from-rosie to-rosie-strong px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-rosie/25 transition hover:brightness-105"
        >
          <Plus className="h-5 w-5" />
          حدث جديد
        </button>
      </div>

      {initialEvents.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-3xl bg-white p-12 text-center soft-shadow">
          <CalendarHeart className="h-12 w-12 text-rosie-soft" />
          <h3 className="text-lg font-bold text-cocoa">لسه مفيش أحداث</h3>
          <p className="text-sm text-cocoa-soft">اعمل أول حدث واحفظ فيه لحظات يومك كله 📸</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {initialEvents.map((e) => (
            <EventCard key={e.id} event={e} onRemove={() => removeEvent(e)} />
          ))}
        </div>
      )}

      <EventFormModal open={formOpen} onClose={() => setFormOpen(false)} />
    </div>
  );
}

function EventCard({ event, onRemove }: { event: EventRow; onRemove: () => void }) {
  const router = useRouter();
  const range = event.start_date === event.end_date
    ? fmtDate(`${event.start_date}T12:00:00`)
    : `${fmtDate(`${event.start_date}T12:00:00`)} — ${fmtDate(`${event.end_date}T12:00:00`)}`;

  const cover = event.cover_asset_id
    ? `/api/media/${event.cover_asset_id}?v=med`
    : null;

  return (
    <article className="card-hover group cursor-pointer overflow-hidden rounded-3xl bg-white soft-shadow" onClick={() => router.push(`/events/${event.id}`)}>
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-blush">
        {cover ? (
          <img src={cover} alt={event.title} loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-blush to-lilac/40">
            <CalendarHeart className="h-12 w-12 text-rosie-soft" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-cocoa/60 via-transparent to-transparent" />
        <span className="absolute bottom-3 right-3 rounded-full bg-white/90 px-3 py-1 text-xs font-bold text-rosie-strong backdrop-blur">
          {event.count} {event.count === 1 ? "حاجة" : event.count === 2 ? "حاجتين" : "حاجات"}
        </span>
      </div>
      <div className="p-4">
        <h3 className="font-display text-lg font-bold text-cocoa">{event.title}</h3>
        <p className="mt-1 text-sm text-cocoa-soft">{range}</p>
        {event.description && <p className="mt-2 line-clamp-2 text-sm text-cocoa-soft">{event.description}</p>}
        <div className="mt-3 flex items-center gap-2 border-t border-sand/70 pt-3">
          <button
            onClick={(e) => {
              e.stopPropagation();
              router.push(`/events/${event.id}`);
            }}
            className="flex items-center gap-1 text-xs font-bold text-rosie hover:underline"
          >
            افتح الحدث
            <ArrowRight className="h-3.5 w-3.5 rotate-180" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            className="mr-auto rounded-full p-1.5 text-cocoa-soft transition hover:bg-red-50 hover:text-red-500"
            title="حذف الحدث"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </article>
  );
}
