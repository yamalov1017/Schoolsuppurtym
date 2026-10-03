import { NextResponse } from "next/server";
import { setWebhook } from "@/lib/telegram";
export const runtime = "nodejs";
export async function POST() {
  if (process.env.NODE_ENV === "production") return NextResponse.json({ error: "Не используйте этот endpoint в production без защиты." }, { status: 403 });
  try { return NextResponse.json({ ok: true, result: await setWebhook() }); }
  catch { return NextResponse.json({ error: "Не удалось установить webhook." }, { status: 500 }); }
}
