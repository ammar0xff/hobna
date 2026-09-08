import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), "data");
const MEDIA_DIR = path.join(DATA_DIR, "media");
const DB_PATH = path.join(DATA_DIR, "hobna.db");

fs.mkdirSync(MEDIA_DIR, { recursive: true });

export const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");
db.pragma("busy_timeout = 5000");
db.pragma("foreign_keys = ON");

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS assets (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('image','video')),
  ext TEXT NOT NULL,
  orig_name TEXT NOT NULL,
  size INTEGER NOT NULL DEFAULT 0,
  width INTEGER,
  height INTEGER,
  duration REAL,
  taken_at TEXT NOT NULL,
  person TEXT CHECK (person IN ('ammar','alaa','both')),
  caption TEXT DEFAULT '',
  created_by INTEGER REFERENCES users(id),
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_assets_taken_at ON assets (taken_at);
CREATE INDEX IF NOT EXISTS idx_assets_type ON assets (type);
CREATE INDEX IF NOT EXISTS idx_assets_person ON assets (person);

CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  description TEXT DEFAULT '',
  cover_asset_id TEXT REFERENCES assets(id) ON DELETE SET NULL,
  created_by INTEGER REFERENCES users(id),
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS event_assets (
  event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  asset_id TEXT NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  added_at TEXT NOT NULL,
  PRIMARY KEY (event_id, asset_id)
);

CREATE TABLE IF NOT EXISTS likes (
  asset_id TEXT NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  PRIMARY KEY (asset_id, user_id)
);

CREATE TABLE IF NOT EXISTS comments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  asset_id TEXT NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS meta (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
`);

export function seedIfEmpty() {
  const seeded = db.prepare("SELECT 1 FROM meta WHERE key = 'seeded'").get();
  if (seeded) return;

  const hash = (pw: string) => {
    const salt = crypto.randomBytes(16).toString("hex");
    const derived = crypto.scryptSync(pw, salt, 64).toString("hex");
    return `${salt}:${derived}`;
  };

  const now = new Date().toISOString();
  const seed = db.prepare(
    "INSERT OR IGNORE INTO users (username, name, password_hash, created_at) VALUES (?,?,?,?)"
  );

  const ammarPw = process.env.AMMAR_PASSWORD || "ammar1234";
  const alaaPw = process.env.ALAA_PASSWORD || "alaa1234";

  seed.run("ammar", "عمار", hash(ammarPw), now);
  seed.run("alaa", "آلاء", hash(alaaPw), now);

  db.prepare("INSERT OR IGNORE INTO meta (key, value) VALUES ('seeded', '1')").run();

  console.log("[hobna] Seeded users: ammar, alaa");
}

seedIfEmpty();

export function assetDir(id: string) {
  return path.join(MEDIA_DIR, id);
}

export { MEDIA_DIR, DATA_DIR };
