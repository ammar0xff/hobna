"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Heart, Home, CalendarHeart, Settings, LogOut } from "lucide-react";
import type { User } from "@/lib/types";

export default function Header({ user }: { user: User }) {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }

  const tabs = [
    { href: "/", label: "لحظاتنا", icon: Home },
    { href: "/events", label: "الأحداث", icon: CalendarHeart },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-blush bg-cream/85 backdrop-blur-lg">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
        <Link href="/" className="group flex items-center gap-2.5">
          <Heart className="h-8 w-8 fill-rosie text-rosie transition group-hover:scale-110" />
          <span className="font-display text-2xl font-bold text-rosie-strong">حبّنا</span>
        </Link>

        <nav className="flex items-center gap-1 rounded-full bg-white p-1 shadow-sm ring-1 ring-sand">
          {tabs.map((t) => {
            const active = t.href === "/" ? pathname === "/" : pathname.startsWith(t.href);
            return (
              <Link
                key={t.href}
                href={t.href}
                className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold transition sm:px-4 ${
                  active
                    ? "bg-gradient-to-l from-rosie to-rosie-strong text-white shadow"
                    : "text-cocoa-soft hover:text-rosie"
                }`}
              >
                <t.icon className="h-4 w-4" />
                <span className="hidden sm:inline">{t.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          <Link
            href="/settings"
            className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 ring-1 ring-sand transition hover:ring-rosie"
            title="الإعدادات"
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-rosie to-lilac text-sm font-bold text-white">
              {user.name.charAt(0)}
            </span>
            <span className="hidden text-sm font-semibold text-cocoa sm:inline">
              {user.name}
            </span>
            <Settings className="h-4 w-4 text-cocoa-soft" />
          </Link>
          <button
            onClick={logout}
            className="rounded-full bg-white p-2 ring-1 ring-sand transition hover:text-rosie hover:ring-rosie"
            title="تسجيل الخروج"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
