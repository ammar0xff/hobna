"use client";

import { useMemo, useState } from "react";
import { Search, CalendarDays, Images, Film, Heart, Sparkles } from "lucide-react";
import type { Asset, Stats, User } from "@/lib/types";
import AssetCard from "./AssetCard";
import Lightbox from "./Lightbox";
import Uploader from "./Uploader";
import { fmtMonth, pluralAr } from "@/lib/util";

type TypeFilter = "all" | "image" | "video";
type PersonFilter = "all" | "ammar" | "alaa" | "both";

export default function LibraryClient({
  initialAssets,
  users,
  stats,
  months,
}: {
  initialAssets: Asset[];
  users: Record<string, string>;
  stats: Stats;
  months: { ym: string; label: string; count: number }[];
}) {
  const [assets, setAssets] = useState<Asset[]>(initialAssets);
  const [typeF, setTypeF] = useState<TypeFilter>("all");
  const [personF, setPersonF] = useState<PersonFilter>("all");
  const [search, setSearch] = useState("");
  const [monthF, setMonthF] = useState("");
  const [lightbox, setLightbox] = useState<number | null>(null);

  const filtered = useMemo(() => {
    return assets.filter((a) => {
      if (typeF !== "all" && a.type !== typeF) return false;
      if (personF !== "all" && (a.person ?? null) !== personF) return false;
      if (monthF && a.taken_at.slice(0, 7) !== monthF) return false;
      if (search) {
        const q = search.trim();
        if (!a.caption.includes(q) && !a.orig_name.toLowerCase().includes(q.toLowerCase()))
          return false;
      }
      return true;
    });
  }, [assets, typeF, personF, search, monthF]);

  const groups = useMemo(() => {
    const map = new Map<string, Asset[]>();
    for (const a of filtered) {
      const key = a.taken_at.slice(0, 7);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(a);
    }
    return Array.from(map.entries());
  }, [filtered]);

  async function refresh() {
    const res = await fetch("/api/assets");
    if (res.ok) setAssets((await res.json()).assets);
  }

  const typeChips: { value: TypeFilter; label: string; icon: React.ElementType }[] = [
    { value: "all", label: "الكل", icon: Images },
    { value: "image", label: "صور", icon: Images },
    { value: "video", label: "فيديوهات", icon: Film },
  ];

  const personChips: { value: PersonFilter; label: string }[] = [
    { value: "all", label: "الكل" },
    { value: "ammar", label: users["ammar"] ?? "عمار" },
    { value: "alaa", label: users["alaa"] ?? "آلاء" },
    { value: "both", label: "إحنا الاتنين" },
  ];

  const hasAny = assets.length > 0;

  return (
    <div className="space-y-5">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-l from-rosie via-rosie-strong to-lilac p-6 text-white soft-shadow sm:p-8">
        <div className="pointer-events-none absolute -left-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-16 -right-8 h-48 w-48 rounded-full bg-white/10 blur-3xl" />
        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-bold sm:text-4xl">
              أهلاً بيك في ذاكرتنا 💛
            </h1>
            <p className="mt-2 max-w-xl text-sm text-white/90">
              كل لحظة مع بعض ليها حكاية… ودي خزانة الحكايات بتاعتنا احنا الاتنين.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <StatChip icon={<Images className="h-4 w-4" />} value={stats.images} label="صورة" />
            <StatChip icon={<Film className="h-4 w-4" />} value={stats.videos} label="فيديو" />
            <StatChip icon={<Heart className="h-4 w-4" />} value={stats.days} label="يوم" />
          </div>
        </div>
      </section>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-cocoa-soft" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="دوّر على لحظة معينة…"
            className="w-full rounded-full border border-sand bg-white py-2.5 pr-10 pl-4 text-sm outline-none transition focus:border-rosie focus:ring-4 focus:ring-rosie/10"
          />
        </div>
        <div className="relative">
          <CalendarDays className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-cocoa-soft" />
          <select
            value={monthF}
            onChange={(e) => setMonthF(e.target.value)}
            className="w-full appearance-none rounded-full border border-sand bg-white py-2.5 pr-10 pl-4 text-sm font-semibold text-cocoa outline-none transition focus:border-rosie sm:w-auto"
          >
            <option value="">كل الشهور</option>
            {months.map((m) => (
              <option key={m.ym} value={m.ym}>
                {m.label} ({m.count})
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="no-scrollbar flex items-center gap-2 overflow-x-auto">
        {typeChips.map((c) => (
          <button
            key={c.value}
            onClick={() => setTypeF(c.value)}
            className={`flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-sm font-bold transition ${
              typeF === c.value
                ? "bg-gradient-to-l from-rosie to-rosie-strong text-white shadow"
                : "bg-white text-cocoa-soft ring-1 ring-sand hover:text-rosie"
            }`}
          >
            <c.icon className="h-4 w-4" />
            {c.label}
          </button>
        ))}
        <span className="mx-1 h-6 w-px shrink-0 bg-sand" />
        {personChips.map((c) => (
          <button
            key={c.value}
            onClick={() => setPersonF(c.value)}
            className={`shrink-0 rounded-full px-4 py-2 text-sm font-bold transition ${
              personF === c.value
                ? "bg-gradient-to-l from-lilac to-rosie-strong text-white shadow"
                : "bg-white text-cocoa-soft ring-1 ring-sand hover:text-rosie"
            }`}
          >
            {c.label}
          </button>
        ))}
        {(typeF !== "all" || personF !== "all" || search || monthF) && (
          <button
            onClick={() => {
              setTypeF("all");
              setPersonF("all");
              setSearch("");
              setMonthF("");
            }}
            className="shrink-0 rounded-full px-3 py-2 text-xs font-bold text-rosie-strong hover:bg-blush"
          >
            مسح الفلاتر ✕
          </button>
        )}
      </div>

      {!hasAny ? (
        <EmptyState onUpload={() => {}} />
      ) : filtered.length === 0 ? (
        <p className="rounded-3xl bg-white p-10 text-center text-cocoa-soft soft-shadow">
          مفيش نتيجة للفلترة دي… جرب فلاتر تانية 😅
        </p>
      ) : (
        <div className="space-y-8">
          {groups.map(([ym, list]) => (
            <section key={ym}>
              <div className="mb-3 flex items-center gap-3">
                <Sparkles className="h-4 w-4 text-goldy" />
                <h2 className="text-lg font-bold text-cocoa">{fmtMonth(`${ym}-01T12:00:00`)}</h2>
                <span className="rounded-full bg-blush px-2.5 py-0.5 text-xs font-bold text-rosie-strong">
                  {list.length} {pluralAr(list.length, ["حاجة", "حاجتين", "حاجات"])}
                </span>
              </div>
              <div className="masonry columns-2 sm:columns-3 lg:columns-4">
                {list.map((a, i) => (
                  <AssetCard
                    key={a.id}
                    asset={a}
                    users={users}
                    onOpen={() => {
                      const realIndex = filtered.indexOf(a);
                      setLightbox(realIndex);
                    }}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {lightbox !== null && filtered[lightbox] && (
        <Lightbox
          assets={filtered}
          initialIndex={lightbox}
          users={users}
          onClose={() => setLightbox(null)}
          onIndexChange={(i) => setLightbox(i)}
          onChanged={refresh}
        />
      )}

      <Uploader onUploaded={refresh} />
    </div>
  );
}

function StatChip({ icon, value, label }: { icon: React.ReactNode; value: number; label: string }) {
  return (
    <div className="flex items-center gap-2 rounded-2xl bg-white/15 px-4 py-2.5 backdrop-blur">
      {icon}
      <span className="text-lg font-bold">{value}</span>
      <span className="text-xs text-white/85">{label}</span>
    </div>
  );
}

function EmptyState({ onUpload }: { onUpload: () => void }) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-3xl bg-white p-12 text-center soft-shadow">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-blush">
        <Heart className="h-10 w-10 fill-rosie-soft text-rosie" />
      </div>
      <div>
        <h3 className="text-lg font-bold text-cocoa">لسه مفيش حاجة هنا 💛</h3>
        <p className="mt-1 text-sm text-cocoa-soft">
          ابدأ ارفع أول صورة ليكوا… الذاكرة بتتعمل من لحظة للي بعده.
        </p>
      </div>
    </div>
  );
}
