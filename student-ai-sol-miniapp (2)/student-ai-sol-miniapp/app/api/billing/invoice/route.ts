import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { createInvoice } from "@/lib/telegram";
import { CONFIG } from "@/lib/config";
export const runtime = "nodejs";
export async function POST(req: NextRequest) {
  try {
    const u = requireUser(req);
    const { product } = await req.json();
    if (product === "week") {
      const url = await createInvoice({ userId: u.telegram_id, product: "week", title: "Student AI — 7 дней", description: "Доступ к GPT-6.1 Sol на 7 дней", stars: CONFIG.weekPriceStars });
      return NextResponse.json({ url });
    }
    if (product === "month") {
      const url = await createInvoice({ userId: u.telegram_id, product: "month", title: "Student AI — 30 дней", description: "Доступ к GPT-6.1 Sol на 30 дней", stars: CONFIG.monthPriceStars });
      return NextResponse.json({ url });
    }
    return NextResponse.json({ error: "Неизвестный тариф." }, { status: 400 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Не удалось создать счёт." }, { status: 500 });
  }
}
