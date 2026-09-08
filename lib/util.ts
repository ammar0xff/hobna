export function uid() {
  return crypto.randomUUID();
}

export function fmtDate(iso: string, withTime = false): string {
  try {
    const d = new Date(iso);
    return new Intl.DateTimeFormat("ar-EG", {
      day: "numeric",
      month: "long",
      year: "numeric",
      ...(withTime ? { hour: "numeric", minute: "2-digit" } : {}),
    }).format(d);
  } catch {
    return iso;
  }
}

export function fmtMonth(iso: string): string {
  try {
    const d = new Date(iso);
    return new Intl.DateTimeFormat("ar-EG", { month: "long", year: "numeric" }).format(d);
  } catch {
    return iso;
  }
}

export function fmtShortMonth(iso: string): string {
  try {
    const d = new Date(iso);
    return new Intl.DateTimeFormat("ar-EG", { day: "numeric", month: "short" }).format(d);
  } catch {
    return iso;
  }
}

export function dayKey(iso: string): string {
  return new Date(iso).toISOString().slice(0, 10);
}

export function toDateInput(iso: string): string {
  return new Date(iso).toISOString().slice(0, 10);
}

export function formatDuration(sec: number): string {
  if (!sec) return "";
  const s = Math.round(sec);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const rem = s % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(rem).padStart(2, "0")}`;
  return `${m}:${String(rem).padStart(2, "0")}`;
}

export function fmtFileSize(bytes: number): string {
  if (!bytes) return "";
  const units = ["B", "KB", "MB", "GB"];
  let i = 0;
  let n = bytes;
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024;
    i++;
  }
  return `${n.toFixed(n >= 100 ? 0 : 1)} ${units[i]}`;
}

export function pluralAr(count: number, forms: [string, string, string]): string {
  if (count === 1) return forms[0];
  if (count === 2) return forms[1];
  if (count >= 3 && count <= 10) return forms[2];
  return forms[2];
}
