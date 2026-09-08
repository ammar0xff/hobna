import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import SettingsClient from "@/components/SettingsClient";

export const metadata: Metadata = { title: "الإعدادات | حبّنا" };

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const user = await requireUser();
  return (
    <SettingsClient user={{ id: user.id, username: user.username, name: user.name }} />
  );
}
