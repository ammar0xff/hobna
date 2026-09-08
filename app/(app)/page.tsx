import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { listAssets, getStats, monthIndexes, getUsers } from "@/lib/queries";
import LibraryClient from "@/components/LibraryClient";

export const metadata: Metadata = { title: "لحظاتنا | حبّنا" };

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const user = await requireUser();
  const [assets, stats, months, users] = await Promise.all([
    listAssets({}),
    getStats(),
    monthIndexes(),
    getUsers(),
  ]);

  const names = Object.fromEntries(users.map((u) => [u.username, u.name]));

  return (
    <LibraryClient
      initialAssets={assets}
      users={names}
      stats={stats}
      months={months}
    />
  );
}
