import { NextRequest, NextResponse } from "next/server";
import { getUser, quota } from "@/lib/db";
import { requireUser } from "@/lib/auth";
export const runtime = "nodejs";
export async function GET(req: NextRequest) {
  try {
    const u = requireUser(req);
    const user = getUser(u.telegram_id);
    const q = quota(u.telegram_id);
    return NextResponse.json({ firstName: user.first_name, accessType: user.access_type, accessUntil: user.access_until, usedToday: q.used, freeDaily: q.limit ?? 3 });
  } catch {
    return NextResponse.json({ error: "Открой Mini App из Telegram." }, { status: 401 });
  }
}
