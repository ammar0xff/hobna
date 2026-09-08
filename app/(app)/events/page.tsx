import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { listEvents } from "@/lib/queries";
import EventsListClient from "@/components/EventsListClient";

export const metadata: Metadata = { title: "الأحداث | حبّنا" };

export const dynamic = "force-dynamic";

export default async function EventsPage() {
  await requireUser();
  const events = listEvents();
  return <EventsListClient initialEvents={events} />;
}
