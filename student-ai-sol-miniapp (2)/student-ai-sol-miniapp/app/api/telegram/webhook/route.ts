import { NextRequest, NextResponse } from "next/server";
import { activateAccess, upsertUser } from "@/lib/db";
import { CONFIG } from "@/lib/config";
import { sendMessage } from "@/lib/telegram";
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  if (req.headers.get("x-telegram-bot-api-secret-token") !== CONFIG.webhookSecret) return NextResponse.json({ ok: false }, { status: 401 });
  try {
    const update = await req.json();

    if (update.pre_checkout_query) {
      await fetch(`https://api.telegram.org/bot${CONFIG.botToken}/answerPreCheckoutQuery`, {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ pre_checkout_query_id: update.pre_checkout_query.id, ok: true })
      });
    }

    const message = update.message;
    if (message?.successful_payment) {
      const p = message.successful_payment;
      const parts = String(p.invoice_payload || "").split(":");
      const product = parts[1];
      const userId = Number(parts[2]);
      const expected = product === "week" ? CONFIG.weekPriceStars : product === "month" ? CONFIG.monthPriceStars : -1;
      if ((product === "week" || product === "month") && userId === message.from.id && Number(p.total_amount) === expected) {
        upsertUser({ id: message.from.id, username: message.from.username, first_name: message.from.first_name });
        const days = product === "week" ? CONFIG.weekDays : CONFIG.monthDays;
        activateAccess({ telegramId: userId, type: product, until: Math.floor(Date.now() / 1000) + days * 86400, chargeId: p.telegram_payment_charge_id, priceStars: Number(p.total_amount) });
        await sendMessage(message.chat.id, product === "week" ? "✅ Оплата получена. Доступ к GPT-6.1 Sol активен на 7 дней." : "✅ Оплата получена. Доступ к GPT-6.1 Sol активен на 30 дней.");
      }
    }

    if (message?.text === "/start") {
      upsertUser({ id: message.from.id, username: message.from.username, first_name: message.from.first_name });
      await sendMessage(message.chat.id, "📚 Student AI\n\nРешай школьные задачи по фото или тексту. Сначала я перепишу условие и спрошу, правильно ли его понял.", true);
    }

    if (message?.text === "/terms") await sendMessage(message.chat.id, "Student AI — цифровая услуга. 59 ⭐ дают доступ к GPT-6.1 Sol на 7 дней, 149 ⭐ — на 30 дней. Доступ не продлевается автоматически. AI может ошибаться, поэтому проверяй решения. Поддержка: /paysupport.");
    if (message?.text === "/support" || message?.text === "/paysupport") await sendMessage(message.chat.id, "Поддержка Student AI: опиши проблему и, для оплаты, укажи дату и сумму Stars.");

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ ok: true });
  }
}
