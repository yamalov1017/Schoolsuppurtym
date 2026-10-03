import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { CONFIG } from "./config";

const dbFile = path.resolve(CONFIG.databasePath);
fs.mkdirSync(path.dirname(dbFile), { recursive: true });
const db = new Database(dbFile);
db.pragma("journal_mode = WAL");

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  telegram_id INTEGER PRIMARY KEY,
  username TEXT,
  first_name TEXT,
  access_type TEXT NOT NULL DEFAULT 'free',
  access_until INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS daily_usage (
  telegram_id INTEGER NOT NULL,
  day_key TEXT NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (telegram_id, day_key)
);
CREATE TABLE IF NOT EXISTS purchases (
  telegram_payment_charge_id TEXT PRIMARY KEY,
  telegram_id INTEGER NOT NULL,
  product TEXT NOT NULL,
  price_stars INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  access_until INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS tasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  telegram_id INTEGER NOT NULL,
  recognized_task TEXT NOT NULL,
  answer TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
`);

type AccessType = "free" | "week" | "month";
export type User = {
  telegram_id: number;
  username: string | null;
  first_name: string | null;
  access_type: AccessType;
  access_until: number | null;
  created_at: number;
  updated_at: number;
};

const now = () => Math.floor(Date.now() / 1000);
const dayKey = () => new Date().toISOString().slice(0, 10);

export function upsertUser(user: { id: number; username?: string; first_name?: string }) {
  const ts = now();
  db.prepare(`
    INSERT INTO users (telegram_id, username, first_name, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(telegram_id) DO UPDATE SET
      username=excluded.username,
      first_name=excluded.first_name,
      updated_at=excluded.updated_at
  `).run(user.id, user.username ?? null, user.first_name ?? null, ts, ts);
  return getUser(user.id);
}

export function getUser(id: number): User {
  let user = db.prepare("SELECT * FROM users WHERE telegram_id=?").get(id) as User | undefined;
  if (!user) {
    upsertUser({ id });
    user = db.prepare("SELECT * FROM users WHERE telegram_id=?").get(id) as User;
  }

  if (user.access_type !== "free" && (!user.access_until || user.access_until <= now())) {
    db.prepare(`UPDATE users SET access_type='free', access_until=NULL, updated_at=? WHERE telegram_id=?`)
      .run(now(), id);
    user = db.prepare("SELECT * FROM users WHERE telegram_id=?").get(id) as User;
  }
  return user;
}

function dailyUsed(id: number) {
  const row = db.prepare("SELECT count FROM daily_usage WHERE telegram_id=? AND day_key=?")
    .get(id, dayKey()) as { count: number } | undefined;
  return row?.count ?? 0;
}

export function quota(id: number) {
  const user = getUser(id);
  const paid = user.access_type !== "free" && !!user.access_until && user.access_until > now();
  if (paid) {
    return { allowed: true, used: 0, limit: null as number | null, accessType: user.access_type, accessUntil: user.access_until };
  }
  const used = dailyUsed(id);
  return { allowed: used < CONFIG.freeDailyRequests, used, limit: CONFIG.freeDailyRequests, accessType: "free" as const, accessUntil: null };
}

export function consumeFree(id: number) {
  db.prepare(`
    INSERT INTO daily_usage (telegram_id, day_key, count) VALUES (?, ?, 1)
    ON CONFLICT(telegram_id, day_key) DO UPDATE SET count=count+1
  `).run(id, dayKey());
}

export function activateAccess(params: {
  telegramId: number;
  type: "week" | "month";
  until: number;
  chargeId: string;
  priceStars: number;
}) {
  const tx = db.transaction(() => {
    db.prepare(`UPDATE users SET access_type=?, access_until=?, updated_at=? WHERE telegram_id=?`)
      .run(params.type, params.until, now(), params.telegramId);
    db.prepare(`
      INSERT OR IGNORE INTO purchases
      (telegram_payment_charge_id, telegram_id, product, price_stars, created_at, access_until)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(params.chargeId, params.telegramId, params.type, params.priceStars, now(), params.until);
  });
  tx();
}

export function saveTask(id: number, task: string, answer: string) {
  db.prepare("INSERT INTO tasks (telegram_id, recognized_task, answer, created_at) VALUES (?, ?, ?, ?)")
    .run(id, task, answer, now());
}
