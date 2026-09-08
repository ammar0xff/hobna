import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getEvent, getUsers, listEventAssets } from "@/lib/queries";
import EventDetailClient from "@/components/EventDetailClient";

export const metadata: Metadata = { title: "حدث | حبّنا" };

export const dynamic = "force-dynamic";

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const event = getEvent(id);
  if (!event) notFound();

  const [users, assets] = await Promise.all([getUsers(), listEventAssets(id, user.id)]);
  const names = Object.fromEntries(users.map((u) => [u.username, u.name]));

  return <EventDetailClient event={event} assets={assets} users={names} />;
}
