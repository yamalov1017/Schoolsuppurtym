import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { consumeFree, quota, saveTask } from "@/lib/db";
import { solveTask } from "@/lib/openai";
export const runtime = "nodejs";
export async function POST(req: NextRequest) {
  try {
    const u = requireUser(req);
    const q = quota(u.telegram_id);
    if (!q.allowed) return NextResponse.json({ error: "Лимит бесплатных решений закончился. Выбери платный доступ." }, { status: 402 });
    const body = await req.json();
    const recognizedTask = typeof body.recognizedTask === "string" ? body.recognizedTask.slice(0, 30000) : "";
    const text = typeof body.text === "string" ? body.text.slice(0, 20000) : "";
    const imageDataUrl = typeof body.imageDataUrl === "string" ? body.imageDataUrl : "";
    if (!recognizedTask) return NextResponse.json({ error: "Сначала подтверди распознанное условие." }, { status: 400 });

    const answer = await solveTask({ text, imageDataUrl: imageDataUrl || undefined }, recognizedTask);
    if (q.accessType === "free") consumeFree(u.telegram_id);
    saveTask(u.telegram_id, recognizedTask, answer);
    return NextResponse.json({ answer });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Ошибка при решении задачи." }, { status: 500 });
  }
}
