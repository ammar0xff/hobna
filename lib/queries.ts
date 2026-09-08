import { db } from "./db";
import type { Asset, AssetDetail, CommentRow, EventRow, Stats } from "./types";
import type { UserRow } from "./auth";

const ASSET_SELECT = `
  SELECT a.*,
    (SELECT COUNT(*) FROM likes l WHERE l.asset_id = a.id) AS likes,
    (SELECT COUNT(*) FROM comments c WHERE c.asset_id = a.id) AS comments,
    (SELECT COUNT(*) FROM event_assets e WHERE e.asset_id = a.id) AS in_events
  FROM assets a
`;

export function listAssets(params: {
  type?: string;
  person?: string;
  search?: string;
  eventId?: string;
  yearMonth?: string;
}): Asset[] {
  const conds: string[] = [];
  const args: unknown[] = [];

  if (params.type) {
    conds.push("a.type = ?");
    args.push(params.type);
  }
  if (params.person) {
    conds.push("a.person = ?");
    args.push(params.person);
  }
  if (params.search) {
    conds.push("(a.caption LIKE ? OR a.orig_name LIKE ?)");
    args.push(`%${params.search}%`, `%${params.search}%`);
  }
  if (params.yearMonth) {
    conds.push("strftime('%Y-%m', a.taken_at) = ?");
    args.push(params.yearMonth);
  }
  if (params.eventId) {
    conds.push(
      "a.id IN (SELECT asset_id FROM event_assets WHERE event_id = ?)"
    );
    args.push(params.eventId);
  }

  const where = conds.length ? `WHERE ${conds.join(" AND ")}` : "";
  return db
    .prepare(`${ASSET_SELECT} ${where} ORDER BY a.taken_at DESC, a.created_at DESC`)
    .all(...args) as Asset[];
}

export function getAsset(id: string, userId?: number): AssetDetail | null {
  const row = db.prepare(`${ASSET_SELECT} WHERE a.id = ?`).get(id) as AssetDetail | null;
  if (!row) return null;
  const likedByMe = userId
    ? db.prepare("SELECT 1 FROM likes WHERE asset_id = ? AND user_id = ?").get(id, userId)
    : null;
  row.liked_by_me = likedByMe ? 1 : 0;

  row.comments_list = db
    .prepare(
      `SELECT c.id, c.asset_id, c.user_id, u.name AS user_name, c.text, c.created_at
       FROM comments c JOIN users u ON u.id = c.user_id
       WHERE c.asset_id = ? ORDER BY c.created_at ASC`
    )
    .all(id) as CommentRow[];

  row.event_ids = (db
    .prepare("SELECT event_id FROM event_assets WHERE asset_id = ?")
    .all(id) as { event_id: string }[]).map((r) => r.event_id);

  return row;
}

export function monthIndexes(): { ym: string; label: string; count: number }[] {
  const rows = db
    .prepare(
      `SELECT strftime('%Y-%m', taken_at) AS ym, COUNT(*) AS count
       FROM assets GROUP BY ym ORDER BY ym DESC`
    )
    .all() as { ym: string; count: number }[];
  return rows.map((r) => ({
    ym: r.ym,
    label: new Intl.DateTimeFormat("ar-EG", { month: "long", year: "numeric" }).format(
      new Date(`${r.ym}-01T12:00:00`)
    ),
    count: r.count,
  }));
}

export function listEvents(): EventRow[] {
  return db
    .prepare(
      `SELECT e.*,
        (SELECT COUNT(*) FROM event_assets ea WHERE ea.event_id = e.id) AS count
       FROM events e ORDER BY e.start_date DESC, e.created_at DESC`
    )
    .all() as EventRow[];
}

export function getEvent(id: string): EventRow | null {
  const row = db
    .prepare(
      `SELECT e.*,
        (SELECT COUNT(*) FROM event_assets ea WHERE ea.event_id = e.id) AS count
       FROM events e WHERE e.id = ?`
    )
    .get(id) as EventRow | null;
  if (!row) return null;
  if (row.cover_asset_id) {
    row.cover = db
      .prepare(`${ASSET_SELECT} WHERE a.id = ?`)
      .get(row.cover_asset_id) as Asset | null;
  }
  return row;
}

export function getEventAssetIds(eventId: string): string[] {
  return (db
    .prepare("SELECT asset_id FROM event_assets WHERE event_id = ? ORDER BY added_at ASC")
    .all(eventId) as { asset_id: string }[]).map((r) => r.asset_id);
}

export function listEventAssets(eventId: string, userId: number): Asset[] {
  const ids = getEventAssetIds(eventId);
  const assets = ids
    .map((aid) => getAsset(aid, userId))
    .filter((a): a is NonNullable<typeof a> => !!a)
    .sort((a, b) => a.taken_at.localeCompare(b.taken_at));
  return assets;
}

export function getStats(): Stats {
  const img = db.prepare("SELECT COUNT(*) c FROM assets WHERE type='image'").get() as {
    c: number;
  };
  const vid = db.prepare("SELECT COUNT(*) c FROM assets WHERE type='video'").get() as {
    c: number;
  };
  const ev = db.prepare("SELECT COUNT(*) c FROM events").get() as { c: number };
  const days = db
    .prepare("SELECT COUNT(DISTINCT strftime('%Y-%m-%d', taken_at)) c FROM assets")
    .get() as { c: number };
  return {
    images: img.c,
    videos: vid.c,
    events: ev.c,
    days: days.c,
  };
}

export function getUsers(): UserRow[] {
  return db.prepare("SELECT id, username, name, created_at FROM users").all() as UserRow[];
}
