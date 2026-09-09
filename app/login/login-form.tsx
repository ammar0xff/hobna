"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Heart, Eye, EyeOff } from "lucide-react";
import GoogleButton from "./google-button";

export default function LoginForm() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "حصلت مشكلة");
        return;
      }

      router.push("/");
      router.refresh();
    } catch {
      setError("ما قدرنا نوصل للخادم");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-gradient-to-br from-cream via-white to-blush px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-rosie/10 shadow-lg shadow-rosie/10">
            <Heart className="h-10 w-10 text-rosie" fill="currentColor" />
          </div>
          <h1 className="text-3xl font-bold">هُبنة</h1>
          <p className="mt-2 text-cocoa-soft">ألبوم خاص فينا</p>
        </div>

        <div className="rounded-3xl border border-sand bg-white/80 p-8 shadow-xl backdrop-blur">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="username" className="mb-1.5 block text-sm font-semibold">
                اسم المستخدم
              </label>
              <input
                id="username"
                type="text"
                required
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full rounded-2xl border border-sand bg-white px-4 py-3 outline-none transition focus:border-rosie focus:ring-2 focus:ring-rosie/20"
                placeholder="amine"
              />
            </div>

            <div>
              <label htmlFor="password" className="mb-1.5 block text-sm font-semibold">
                كلمة المرور
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-2xl border border-sand bg-white px-4 py-3 pr-12 outline-none transition focus:border-rosie focus:ring-2 focus:ring-rosie/20"
                  placeholder="••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-cocoa-soft transition hover:text-cocoa"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="rounded-2xl bg-red-50 p-3 text-center text-sm text-red-500">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-2xl bg-gradient-to-l from-rosie to-rosie-strong py-3.5 text-lg font-bold text-white shadow-lg shadow-rosie/25 transition hover:brightness-105 active:scale-[0.98] disabled:opacity-50"
            >
              {loading ? (
                <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
              ) : (
                "ادخل"
              )}
            </button>
          </form>

          <div className="my-5 flex items-center gap-3">
            <div className="h-px flex-1 bg-sand" />
            <span className="text-xs text-cocoa-soft">أو</span>
            <div className="h-px flex-1 bg-sand" />
          </div>

          <GoogleButton />
        </div>

        <p className="mt-6 text-center text-xs text-cocoa-soft/60">
          لو عندك مشكلة تواصل مع مدير السيرفر
        </p>
      </div>
    </div>
  );
}
