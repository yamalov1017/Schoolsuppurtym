import { CONFIG } from "./config";

async function tg(method: string, body: Record<string, unknown>) {
  const r = await fetch(`https://api.telegram.org/bot${CONFIG.botToken}/${method}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body)
  });
  const j = await r.json();
  if (!j.ok) throw new Error(j.description || `Telegram error: ${method}`);
  return j.result;
}

export async function createInvoice(params: {
  userId: number;
  product: "week" | "month";
  title: string;
  description: string;
  stars: number;
}) {
  return tg("createInvoiceLink", {
    title: params.title,
    description: params.description,
    payload: `access:${params.product}:${params.userId}:${crypto.randomUUID()}`,
    provider_token: "",
    currency: "XTR",
    prices: [{ label: params.title, amount: params.stars }]
  }) as Promise<string>;
}

export async function sendMessage(chatId: number, text: string, openApp = false) {
  return tg("sendMessage", {
    chat_id: chatId,
    text,
    ...(openApp ? { reply_markup: { inline_keyboard: [[{ text: "🚀 Открыть Student AI", web_app: { url: CONFIG.miniAppUrl } }]] } } : {})
  });
}

export async function setWebhook() {
  return tg("setWebhook", {
    url: `${CONFIG.miniAppUrl}/api/telegram/webhook`,
    secret_token: CONFIG.webhookSecret,
    allowed_updates: ["message", "pre_checkout_query"]
  });
}
