import Database from "better-sqlite3";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "hobna.db");
const MEDIA_DIR = path.join(DATA_DIR, "media");

fs.mkdirSync(MEDIA_DIR, { recursive: true });

const db = new Database(DB_PATH);

db.pragma("journal_mode = WAL");
db.pragma("busy_timeout = 5000");
db.pragma("foreign_keys = ON");

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL DEFAULT '',
    password_hash TEXT NOT NULL DEFAULT '',
    google_id TEXT,
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
    created_at TEXT NOT NULL,
    drive_file_id TEXT
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
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS user_tokens (
    user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    access_token TEXT NOT NULL DEFAULT '',
    refresh_token TEXT,
    expires_at INTEGER NOT NULL DEFAULT 0,
    drive_folder_id TEXT DEFAULT ''
  );
`);

// Migration: SQLite can't ADD COLUMN UNIQUE, so uniqueness is a partial index.
const userCols = db.prepare("PRAGMA table_info(users)").all() as { name: string }[];
if (!userCols.some((c) => c.name === "google_id")) {
  db.exec("ALTER TABLE users ADD COLUMN google_id TEXT");
}
db.exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id) WHERE google_id IS NOT NULL");

// Seed default users if none exist.
// next build evaluates route modules in parallel workers, each initializing the
// DB; INSERT OR IGNORE + transaction keeps concurrent seeding from racing on the
// UNIQUE users.username index.
const userCount = (db.prepare("SELECT COUNT(*) as c FROM users").get() as { c: number }).c;
if (userCount === 0) {
  const hash = (pw: string) => {
    const salt = crypto.randomBytes(16).toString("hex");
    const derived = crypto.scryptSync(pw, salt, 64).toString("hex");
    return `${salt}:${derived}`;
  };

  const now = new Date().toISOString();
  const insertUser = db.prepare(
    "INSERT OR IGNORE INTO users (username, name, password_hash, created_at) VALUES (?,?,?,?)"
  );

  const ammarPw = process.env.AMMAR_PASSWORD || "ammar1234";
  const alaaPw = process.env.ALAA_PASSWORD || "alaa1234";

  const seed = db.transaction(() => {
    insertUser.run("ammar", "عمار", hash(ammarPw), now);
    insertUser.run("alaa", "آلاء", hash(alaaPw), now);
  });
  try {
    seed();
    console.log("[hobna] Seeded users: ammar, alaa");
  } catch (e) {
    // Another process already seeded; ignore.
    if (!String(e).includes("UNIQUE")) throw e;
  }
}

function assetDir(id: string): string {
  const dir = path.join(MEDIA_DIR, id);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export { db, assetDir, DATA_DIR, MEDIA_DIR };