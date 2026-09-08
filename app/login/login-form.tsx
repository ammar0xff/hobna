"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, Heart, ArrowLeft, Eye, EyeOff } from "lucide-react";

export default function LoginForm() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ username: username.trim(), password }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "حصلت مشكلة، جرب تاني");
        return;
      }
      router.replace("/");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-rosie-soft/30 blur-3xl" />
        <div className="absolute bottom-0 -left-24 h-80 w-80 rounded-full bg-lilac/30 blur-3xl" />
      </div>

      <div className="relative w-full max-w-md animate-rise">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="animate-float">
            <Heart className="h-14 w-14 fill-rosie text-rosie" />
          </div>
          <h1 className="font-display mt-4 text-4xl font-bold text-rosie-strong">حبّنا</h1>
          <p className="mt-2 text-sm text-cocoa-soft">
            هنا بنحفظ أحلى ذكرياتنا… صورنا وفيديوهاتنا ولحظاتنا المخصوصة 💛
          </p>
        </div>

        <form
          onSubmit={submit}
          className="soft-shadow rounded-3xl border border-blush bg-white/80 p-6 backdrop-blur sm:p-8"
        >
          <h2 className="text-lg font-bold">أهلاً بيك تاني يا حبيبي 😍</h2>
          <p className="mt-1 text-sm text-cocoa-soft">سجل دخولك عشان نكمل الحكاية</p>

          <label className="mt-6 block text-sm font-semibold">
            اسم المستخدم
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoFocus
              required
              autoComplete="username"
              className="mt-2 w-full rounded-2xl border border-sand bg-cream px-4 py-3 outline-none transition focus:border-rosie focus:ring-4 focus:ring-rosie/15"
              placeholder="مثال: ammar"
            />
          </label>

          <label className="mt-4 block text-sm font-semibold">
            الباسورد
            <div className="relative mt-2">
              <input
                type={showPw ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="w-full rounded-2xl border border-sand bg-cream px-4 py-3 pl-12 outline-none transition focus:border-rosie focus:ring-4 focus:ring-rosie/15"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPw((s) => !s)}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-cocoa-soft hover:text-rosie"
                aria-label="إظهار الباسورد"
              >
                {showPw ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </label>

          {error && (
            <p className="mt-4 rounded-2xl bg-blush px-4 py-3 text-sm font-semibold text-rosie-strong">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-l from-rosie to-rosie-strong py-3.5 font-bold text-white shadow-lg shadow-rosie/30 transition hover:brightness-105 active:scale-[0.98] disabled:opacity-60"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                لحظة…
              </span>
            ) : (
              <>
                <Lock className="h-5 w-5" />
                ادخل على ذاكرتنا
              </>
            )}
          </button>

          <p className="mt-5 text-center text-xs text-cocoa-soft">
            كل واحد مننا بيدخل بأكونته الخاص 😉
          </p>
        </form>
      </div>
    </div>
  );
}
