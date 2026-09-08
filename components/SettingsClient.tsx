"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Save, Heart, KeyRound, UserRound, Check, LogOut } from "lucide-react";
import type { User } from "@/lib/types";

export default function SettingsClient({ user }: { user: User }) {
  const router = useRouter();
  const [name, setName] = useState(user.name);
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setMsg("");
    try {
      const body: Record<string, string> = { name };
      if (newPw) {
        body.current_password = currentPw;
        body.new_password = newPw;
      }
      const res = await fetch("/api/users/me", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "حصلت مشكلة");
        return;
      }
      setMsg("اتحفظ ✅");
      setCurrentPw("");
      setNewPw("");
      setTimeout(() => setMsg(""), 2500);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-cocoa">
          <Heart className="h-6 w-6 fill-rosie text-rosie" />
          الإعدادات
        </h1>
        <p className="mt-1 text-sm text-cocoa-soft">
          غيّر اسمك والباسورد عشان الدنيا تفضل حلوة زي ما هي 😄
        </p>
      </div>

      <form onSubmit={save} className="space-y-5 rounded-3xl bg-white p-6 soft-shadow">
        <label className="block text-sm font-semibold">
          <span className="flex items-center gap-1.5">
            <UserRound className="h-4 w-4 text-rosie" />
            الاسم
          </span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-2 w-full rounded-2xl border border-sand bg-cream px-4 py-3 outline-none transition focus:border-rosie focus:ring-4 focus:ring-rosie/10"
          />
        </label>

        <div className="border-t border-sand/70 pt-5">
          <p className="flex items-center gap-1.5 text-sm font-semibold">
            <KeyRound className="h-4 w-4 text-rosie" />
            تغيير الباسورد
          </p>
          <p className="mt-1 text-xs text-cocoa-soft">لو مش عايز تغيّره، سيب الخانتين فاضيين.</p>
          <div className="mt-3 space-y-3">
            <input
              type="password"
              value={currentPw}
              onChange={(e) => setCurrentPw(e.target.value)}
              placeholder="الباسورد القديم"
              className="w-full rounded-2xl border border-sand bg-cream px-4 py-3 text-sm outline-none transition focus:border-rosie"
            />
            <input
              type="password"
              value={newPw}
              onChange={(e) => setNewPw(e.target.value)}
              placeholder="الباسورد الجديد"
              className="w-full rounded-2xl border border-sand bg-cream px-4 py-3 text-sm outline-none transition focus:border-rosie"
            />
          </div>
        </div>

        {error && (
          <p className="rounded-2xl bg-blush px-4 py-3 text-sm font-semibold text-rosie-strong">
            {error}
          </p>
        )}
        {msg && (
          <p className="flex items-center gap-2 rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-600">
            <Check className="h-4 w-4" />
            {msg}
          </p>
        )}

        <button
          type="submit"
          disabled={busy}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-l from-rosie to-rosie-strong py-3.5 font-bold text-white shadow-lg shadow-rosie/25 transition hover:brightness-105 disabled:opacity-60"
        >
          {busy ? (
            <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
          ) : (
            <>
              <Save className="h-5 w-5" />
              احفظ
            </>
          )}
        </button>
      </form>

      <button
        onClick={logout}
        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-white py-3 text-sm font-bold text-cocoa-soft ring-1 ring-sand transition hover:text-rosie hover:ring-rosie"
      >
        <LogOut className="h-4 w-4" />
        سجل الخروج
      </button>
    </div>
  );
}
