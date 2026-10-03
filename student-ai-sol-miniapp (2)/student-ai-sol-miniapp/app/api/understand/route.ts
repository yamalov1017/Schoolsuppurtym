import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { quota } from "@/lib/db";
import { understandTask, parseUnderstanding } from "@/lib/openai";
export const runtime = "nodejs";
export async function POST(req: NextRequest) {
  try {
    const u = requireUser(req);
    const q = quota(u.telegram_id);
    if (!q.allowed) return NextResponse.json({ error: "3 бесплатных решения на сегодня уже использованы. Выбери доступ на неделю или месяц." }, { status: 402 });
    const body = await req.json();
    const text = typeof body.text === "string" ? body.text.slice(0, 20000) : "";
    const imageDataUrl = typeof body.imageDataUrl === "string" ? body.imageDataUrl : "";
    if (!text && !imageDataUrl) return NextResponse.json({ error: "Добавь текст или фото." }, { status: 400 });
    if (imageDataUrl && !/^data:image\/(png|jpe?g|webp);base64,/i.test(imageDataUrl)) return NextResponse.json({ error: "Поддерживаются PNG, JPEG и WebP." }, { status: 400 });
    const parsed = parseUnderstanding(await understandTask({ text, imageDataUrl: imageDataUrl || undefined }));
    if (!parsed.task) return NextResponse.json({ error: "Не удалось восстановить условие. Пришли фото ещё раз." }, { status: 422 });
    return NextResponse.json(parsed);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Ошибка при распознавании задания." }, { status: 500 });
  }
}
