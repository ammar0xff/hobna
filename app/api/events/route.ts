import { NextResponse } from "next/server";
import { apiUser, isUnauthorized } from "@/lib/auth";
import { db } from "@/lib/db";
import { listEvents } from "@/lib/queries";
import { uid } from "@/lib/util";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const user = apiUser(request);
  if (!user) return isUnauthorized(request);
  return NextResponse.json({ events: listEvents() });
}

export async function POST(request: Request) {
  const user = apiUser(request);
  if (!user) return isUnauthorized(request);

  const body = await request.json().catch(() => null);
  const title = String(body?.title ?? "").trim().slice(0, 120);
  if (!title) return NextResponse.json({ error: "اكتب اسم الحدث" }, { status: 400 });

  const start = String(body?.start_date ?? "");
  const end = String(body?.end_date ?? "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(start) || !/^\d{4}-\d{2}-\d{2}$/.test(end)) {
    return NextResponse.json({ error: "التاريخ مش مظبوط" }, { status: 400 });
  }
  const description = String(body?.description ?? "").slice(0, 500);

  const id = uid();
  const now = new Date().toISOString();
  db.prepare(
    "INSERT INTO events (id, title, start_date, end_date, description, created_by, created_at) VALUES (?,?,?,?,?,?,?)"
  ).run(id, title, start, end, description, user.id, now);

  const created = db
    .prepare(
      `SELECT e.*, (SELECT COUNT(*) FROM event_assets ea WHERE ea.event_id = e.id) AS count
       FROM events e WHERE e.id = ?`
    )
    .get(id) as { id: string; title: string; start_date: string; end_date: string };

  return NextResponse.json({ event: created }, { status: 201 });
}
