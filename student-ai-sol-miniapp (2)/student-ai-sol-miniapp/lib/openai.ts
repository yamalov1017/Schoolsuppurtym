import OpenAI from "openai";
import { CONFIG } from "./config";

const client = new OpenAI({ apiKey: CONFIG.openaiKey });

type Input = { text?: string; imageDataUrl?: string };

function buildContent(input: Input) {
  const content: any[] = [];
  if (input.text?.trim()) content.push({ type: "input_text", text: input.text.trim() });
  if (input.imageDataUrl) content.push({ type: "input_image", image_url: input.imageDataUrl });
  return content;
}

export async function understandTask(input: Input) {
  const response = await client.responses.create({
    model: CONFIG.openaiModel,
    reasoning: { effort: "medium" },
    instructions: `
Ты первый этап Student AI. Твоя задача — НЕ решать задачу, а внимательно прочитать её.
По тексту и/или фотографии восстанови точное условие.
Верни только JSON:
{"recognized_task":"...","subject":"...","confidence":"high|medium|low"}
Сохраняй все числа, единицы, варианты, формулы, ограничения и данные с изображения.
Ничего не выдумывай. Если непонятно — confidence=low.
`,
    input: [{ role: "user", content: buildContent(input) }]
  });
  return response.output_text;
}

export function parseUnderstanding(raw: string) {
  try {
    const clean = raw.replace(/^```json\s*/i, "").replace(/```$/i, "").trim();
    const o = JSON.parse(clean);
    return { task: String(o.recognized_task || ""), subject: String(o.subject || "Неизвестно"), confidence: String(o.confidence || "low") };
  } catch {
    return { task: raw.trim(), subject: "Неизвестно", confidence: "low" };
  }
}

export async function solveTask(input: Input, recognizedTask: string) {
  const response = await client.responses.create({
    model: CONFIG.openaiModel,
    reasoning: { effort: CONFIG.reasoningEffort },
    instructions: `
Ты Student AI — универсальный решатель школьных задач на GPT-6.1 Sol.
Решай максимально подробно и понятно, но без раскрытия скрытой chain-of-thought.
Поддерживай математику, физику, химию, биологию, информатику, историю,
обществознание, географию, русский язык, литературу, английский и другие школьные предметы.

Правила:
- Сначала проверь, что условие полное.
- Не выдумывай данные.
- Если есть фото с графиком, рисунком или таблицей — используй его.
- Для математики/физики/химии: Дано → Найти → Формулы → Подстановка/вычисления → Ответ.
- Для тестов: сначала правильный вариант, затем объяснение.
- Для гуманитарных предметов: структурированное объяснение, факты и аргументы.
- Если условие недостаточно читаемо — прямо скажи, какой фрагмент нужно прислать ещё раз.
- Последняя отдельная строка должна начинаться с «Ответ:».
`,
    input: [{ role: "user", content: [
      { type: "input_text", text: `Подтверждённое условие пользователя:\n${recognizedTask}\n\nИсходные данные:` },
      ...buildContent(input)
    ] }]
  });
  return response.output_text;
}
