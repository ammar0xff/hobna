import type { Metadata, Viewport } from "next";
import { Cairo, Marhey } from "next/font/google";
import "./globals.css";

const cairo = Cairo({
  subsets: ["arabic", "latin"],
  variable: "--font-cairo",
  display: "swap",
});

const marhey = Marhey({
  subsets: ["arabic", "latin"],
  variable: "--font-marhey",
  display: "swap",
});

export const metadata: Metadata = {
  title: "حبّنا | ذاكرتنا الحلوة",
  description: "ذاكرة حلوة بتاعة عمار وآلاء — صور وفيديوهات ولحظات مخصوصة لينا احنا الاتنين.",
  icons: { icon: "/heart.svg" },
};

export const viewport: Viewport = {
  themeColor: "#fdf8f1",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl" className={`${cairo.variable} ${marhey.variable}`}>
      <body>{children}</body>
    </html>
  );
}
