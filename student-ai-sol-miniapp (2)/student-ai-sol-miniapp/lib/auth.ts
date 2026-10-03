import crypto from "node:crypto";
import { NextRequest } from "next/server";
import { CONFIG } from "./config";
import { upsertUser } from "./db";

export function validateTelegramInitData(initData: string) {
  const p = new URLSearchParams(initData);
  const received = p.get("hash");
  if (!received) return null;
  p.delete("hash");
  const check = [...p.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `${k}=${v}`).join("\n");
  const secret = crypto.createHash("sha256").update(CONFIG.botToken).digest();
  const calculated = crypto.createHmac("sha256", secret).update(check).digest("hex");
  if (received.length !== calculated.length || !crypto.timingSafeEqual(Buffer.from(received), Buffer.from(calculated))) return null;
  const authDate = Number(p.get("auth_date") || 0);
  if (!authDate || Math.floor(Date.now() / 1000) - authDate > 86400) return null;
  const raw = p.get("user");
  if (!raw) return null;
  return JSON.parse(raw) as { id: number; username?: string; first_name?: string };
}

export function requireUser(req: NextRequest) {
  const initData = req.headers.get("x-telegram-init-data");
  if (!initData) throw new Error("TELEGRAM_AUTH_REQUIRED");
  const user = validateTelegramInitData(initData);
  if (!user) throw new Error("INVALID_TELEGRAM_INIT_DATA");
  return upsertUser(user);
}
