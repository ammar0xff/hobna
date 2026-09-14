"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Settings, LogOut, HardDrive, CheckCircle2, AlertCircle, Unplug, Loader2 } from "lucide-react";

interface DriveStatus {
  connected: boolean;
  available: boolean;
  email?: string;
  name?: string;
  folderId?: string;
  error?: string;
}

export function SettingsClient() {
  const [drive, setDrive] = useState<DriveStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [disconnecting, setDisconnecting] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetch("/api/settings/drive")
      .then((r) => r.json())
      .then((d) => setDrive(d))
      .catch(() => setDrive({ connected: false, available: false }))
      .finally(() => setLoading(false));
  }, []);

  async function handleDisconnect() {
    setDisconnecting(true);
    try {
      await fetch("/api/settings/drive", { method: "DELETE" });
      setDrive({ connected: false, available: true });
    } finally {
      setDisconnecting(false);
    }
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Settings className="h-6 w-6 text-rosie" />
        <h1 className="text-2xl font-bold">الإعدادات</h1>
      </div>

      {/* Google Drive Section */}
      <section className="rounded-3xl border border-sand bg-white/80 p-6 backdrop-blur">
        <h2 className="flex items-center gap-2 text-lg font-bold text-cocoa">
          <HardDrive className="h-5 w-5 text-rosie" />
          Google Drive
        </h2>

        {loading ? (
          <div className="mt-4 flex items-center gap-2 text-sm text-cocoa-soft">
            <Loader2 className="h-4 w-4 animate-spin" />
            جاري التحميل...
          </div>
        ) : !drive?.available ? (
          <div className="mt-4 rounded-2xl bg-cream p-4 text-sm text-cocoa-soft">
            <AlertCircle className="mb-1 inline h-4 w-4 text-cocoa-soft" />
            Google Drive مش متاح. ضع GOOGLE_CLIENT_ID و GOOGLE_CLIENT_SECRET في .env
          </div>
        ) : drive.connected ? (
          <div className="mt-4 space-y-3">
            <div className="flex items-center gap-2 rounded-2xl bg-emerald-50 p-4 text-sm">
              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              <div>
                <p className="font-semibold text-emerald-700">متصل بـ Google Drive</p>
                <p className="text-emerald-600">{drive.email}</p>
              </div>
            </div>
            <button
              onClick={handleDisconnect}
              disabled={disconnecting}
              className="flex items-center gap-2 rounded-2xl border border-red-200 px-4 py-2.5 text-sm font-semibold text-red-500 transition hover:bg-red-50 disabled:opacity-50"
            >
              {disconnecting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Unplug className="h-4 w-4" />
              )}
              فصل Drive
            </button>
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            <p className="text-sm text-cocoa-soft">
              اتصلي بـ Google Drive عشان الصور والفيديوهات تتخزن هناك.
            </p>
            <a
              href="/api/auth/google"
              className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-l from-rosie to-rosie-strong px-6 py-3 font-bold text-white shadow-lg shadow-rosie/25 transition hover:brightness-105 active:scale-[0.98]"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="white">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              اتصلي بـ Google Drive
            </a>
          </div>
        )}
      </section>

      {/* Account Section */}
      <section className="rounded-3xl border border-sand bg-white/80 p-6 backdrop-blur">
        <h2 className="text-lg font-bold text-cocoa">الحساب</h2>
        <button
          onClick={handleLogout}
          className="mt-4 flex items-center gap-2 rounded-2xl border border-red-200 px-4 py-2.5 text-sm font-semibold text-red-500 transition hover:bg-red-50"
        >
          <LogOut className="h-4 w-4" />
          طلع من الحساب
        </button>
      </section>
    </div>
  );
}
