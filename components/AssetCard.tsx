"use client";

import { Play, Heart, MessageCircle, User as UserIcon } from "lucide-react";
import type { Asset } from "@/lib/types";
import { fmtShortMonth, formatDuration } from "@/lib/util";

const PERSON_STYLES: Record<string, string> = {
  ammar: "bg-sky-200/90 text-sky-800",
  alaa: "bg-rosie-soft/90 text-rosie-strong",
  both: "bg-goldy/90 text-amber-900",
};

export function PersonBadge({ person, users, small }: { person: Asset["person"]; users: Record<string, string>; small?: boolean }) {
  if (!person) return null;
  const labels: Record<string, string> = {
    ammar: users["ammar"] ?? "عمار",
    alaa: users["alaa"] ?? "آلاء",
    both: "إحنا الاتنين",
  };
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-bold backdrop-blur-sm ${small ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-xs"} ${PERSON_STYLES[person] ?? "bg-white/80 text-cocoa"}`}
    >
      <UserIcon className="h-3 w-3" />
      {labels[person]}
    </span>
  );
}

export default function AssetCard({
  asset,
  users,
  onOpen,
}: {
  asset: Asset;
  users: Record<string, string>;
  onOpen: () => void;
}) {
  const ratio = asset.width && asset.height ? asset.width / asset.height : 4 / 3;
  const src = `/api/media/${asset.id}?v=thumb`;

  return (
    <div
      className="card-hover group relative w-full overflow-hidden rounded-2xl bg-white soft-shadow cursor-pointer"
      onClick={onOpen}
    >
      <div style={{ aspectRatio: `${ratio}` }}>
        {asset.type === "image" ? (
          <img
            src={src}
            alt={asset.caption || asset.orig_name}
            loading="lazy"
            className="h-full w-full object-cover"
            draggable={false}
          />
        ) : (
          <div className="relative h-full w-full">
            <img
              src={`/api/media/${asset.id}?v=poster`}
              alt={asset.caption || asset.orig_name}
              loading="lazy"
              className="h-full w-full object-cover"
              draggable={false}
            />
            <div className="absolute inset-0 flex items-center justify-center bg-cocoa/20">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white/85 text-rosie shadow-lg backdrop-blur transition group-hover:scale-110">
                <Play className="h-6 w-6 translate-x-[1px] fill-rosie" />
              </span>
            </div>
          </div>
        )}
      </div>

      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between p-2">
        <PersonBadge person={asset.person} users={users} small />
        {asset.type === "video" && asset.duration ? (
          <span className="rounded-full bg-cocoa/70 px-2 py-0.5 text-[11px] font-bold text-white backdrop-blur-sm">
            {formatDuration(asset.duration)}
          </span>
        ) : null}
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 bg-gradient-to-t from-cocoa/70 via-cocoa/25 to-transparent p-2.5 pt-8 text-white">
        <span className="text-[11px] font-semibold">{fmtShortMonth(asset.taken_at)}</span>
        <span className="flex items-center gap-2 text-xs font-bold">
          <span className="flex items-center gap-1">
            <Heart className="h-3.5 w-3.5 fill-rosie-soft" />
            {asset.likes}
          </span>
          <span className="flex items-center gap-1">
            <MessageCircle className="h-3.5 w-3.5" />
            {asset.comments}
          </span>
        </span>
      </div>
    </div>
  );
}
