import { requireUser } from "@/lib/auth";
import Header from "@/components/Header";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  return (
    <div className="min-h-screen">
      <Header user={{ id: user.id, username: user.username, name: user.name }} />
      <main className="mx-auto max-w-6xl px-4 pb-24 pt-6">{children}</main>
    </div>
  );
}
