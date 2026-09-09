import Database from "better-sqlite3";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "hobna.db");
const MEDIA_DIR = path.join(DATA_DIR, "media");

fs.mkdirSync(DATA_DIR, { recursive: true });
fs.mkdirSync(MEDIA_DIR, { recursive: true });

const db = new Database(DB_PATH);

db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL DEFAULT '',
    password_hash TEXT NOT NULL DEFAULT '',
    google_id TEXT UNIQUE,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

// Migration: add google_id if missing (SQLite can't ADD COLUMN UNIQUE)
const userCols = db.prepare("PRAGMA table_info(users)").all() as { name: string }[];
if (!userCols.some((c) => c.name === "google_id")) {
  db.exec("ALTER TABLE users ADD COLUMN google_id TEXT");
}
db.exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id) WHERE google_id IS NOT NULL");

db.exec(`
  CREATE TABLE IF NOT EXISTS uploads (
    id TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL,
    filename TEXT NOT NULL,
    original_name TEXT NOT NULL,
    size INTEGER NOT NULL DEFAULT 0,
    mime TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS assets (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL DEFAULT 'photo',
    title TEXT NOT NULL DEFAULT '',
    caption TEXT NOT NULL DEFAULT '',
    date TEXT,
    added_by INTEGER,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (added_by) REFERENCES users(id) ON DELETE SET NULL
  );
`);

// Migration: add drive_file_id if missing
const assetCols = db.prepare("PRAGMA table_info(assets)").all() as { name: string }[];
if (!assetCols.some((c) => c.name === "drive_file_id")) {
  db.exec("ALTER TABLE assets ADD COLUMN drive_file_id TEXT");
}

db.exec(`
  CREATE TABLE IF NOT EXISTS asset_files (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    asset_id TEXT NOT NULL,
    upload_id TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'orig',
    UNIQUE(asset_id, upload_id),
    FOREIGN KEY (asset_id) REFERENCES assets(id) ON DELETE CASCADE,
    FOREIGN KEY (upload_id) REFERENCES uploads(id) ON DELETE CASCADE
  );
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    asset_id TEXT NOT NULL,
    user_id INTEGER NOT NULL,
    text TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (asset_id) REFERENCES assets(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS asset_reactions (
    asset_id TEXT NOT NULL,
    user_id INTEGER NOT NULL,
    emoji TEXT NOT NULL DEFAULT '❤️',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (asset_id, user_id),
    FOREIGN KEY (asset_id) REFERENCES assets(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );
`);

// Sessions table
db.exec(`
  CREATE TABLE IF NOT EXISTS sessions (
    token TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL,
    expires_at INTEGER NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );
`);

// User tokens for Google Drive
db.exec(`
  CREATE TABLE IF NOT EXISTS user_tokens (
    user_id INTEGER PRIMARY KEY,
    access_token TEXT NOT NULL DEFAULT '',
    refresh_token TEXT,
    expires_at INTEGER NOT NULL DEFAULT 0,
    drive_folder_id TEXT DEFAULT '',
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );
`);

// Migration: ensure refresh_token column exists (for older DBs)
const tokenCols = db.prepare("PRAGMA table_info(user_tokens)").all() as { name: string }[];
if (!tokenCols.some((c) => c.name === "refresh_token")) {
  db.exec("ALTER TABLE user_tokens ADD COLUMN refresh_token TEXT");
}

// Seed default users if none exist
const userCount = (db.prepare("SELECT COUNT(*) as c FROM users").get() as { c: number }).c;
if (userCount === 0) {
  const now = new Date().toISOString();
  const insertUser = db.prepare(
    "INSERT INTO users (username, name, password_hash, created_at) VALUES (?, ?, ?, ?)"
  );

  const users = [
    { username: "ammar", name: "Ammar" },
    { username: "laila", name: "Laila" },
  ];

  for (const u of users) {
    const pw = "1234";
    const salt = crypto.randomBytes(16).toString("hex");
    const derived = crypto.scryptSync(pw, salt, 64).toString("hex");
    const hash = `${salt}:${derived}`;
    insertUser.run(u.username, u.name, hash, now);
  }
}

function assetDir(id: string): string {
  const dir = path.join(MEDIA_DIR, id);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export { db, assetDir, DATA_DIR, MEDIA_DIR };
