"use client";

import { ChangeEvent, useEffect, useMemo, useState } from "react";

declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        initData: string;
        ready: () => void;
        expand: () => void;
        openInvoice: (url: string, callback?: (status: string) => void) => void;
      };
    };
  }
}

type Me = {
  firstName: string | null;
  accessType: "free" | "week" | "month";
  accessUntil: number | null;
  usedToday: number;
  freeDaily: number;
};

export default function Home() {
  const [text, setText] = useState("");
  const [image, setImage] = useState<string>();
  const [preview, setPreview] = useState<string>();
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(false);
  const [solving, setSolving] = useState(false);
  const [check, setCheck] = useState<{ task: string; subject: string; confidence: string } | null>(null);
  const [answer, setAnswer] = useState("");
  const [error, setError] = useState("");

  const initData = useMemo(() => typeof window !== "undefined" ? window.Telegram?.WebApp?.initData || "" : "", []);
  const headers = () => ({ "content-type": "application/json", "x-telegram-init-data": initData });

  useEffect(() => {
    window.Telegram?.WebApp?.ready();
    window.Telegram?.WebApp?.expand();
    refresh().catch(() => {});
  }, []);

  async function refresh() {
    if (!initData) return;
    const r = await fetch("/api/me", { headers: { "x-telegram-init-data": initData } });
    if (r.ok) setMe(await r.json());
  }

  async function fileChange(e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith("image/")) return setError("Выбери изображение.");
    if (f.size > 6 * 1024 * 1024) return setError("Фото должно быть до 6 МБ.");
    const data = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = reject;
      reader.readAsDataURL(f);
    });
    setImage(data); setPreview(data); setError("");
  }

  async function understand() {
    if (!text.trim() && !image) return setError("Напиши задачу или прикрепи фото.");
    setLoading(true); setError(""); setAnswer("");
    try {
      const r = await fetch("/api/understand", { method: "POST", headers: headers(), body: JSON.stringify({ text, imageDataUrl: image }) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Ошибка распознавания.");
      setCheck(d);
    } catch (e) { setError(e instanceof Error ? e.message : "Ошибка."); }
    finally { setLoading(false); }
  }

  async function solve() {
    if (!check) return;
    setSolving(true); setError("");
    try {
      const r = await fetch("/api/solve", { method: "POST", headers: headers(), body: JSON.stringify({ text, imageDataUrl: image, recognizedTask: check.task }) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Ошибка решения.");
      setAnswer(d.answer); setCheck(null); await refresh();
    } catch (e) { setError(e instanceof Error ? e.message : "Ошибка."); }
    finally { setSolving(false); }
  }

  async function buy(product: "week" | "month") {
    setError("");
    try {
      const r = await fetch("/api/billing/invoice", { method: "POST", headers: headers(), body: JSON.stringify({ product }) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Не удалось создать счёт.");
      const webApp = window.Telegram?.WebApp;
      if (!webApp?.openInvoice) throw new Error("Открой приложение внутри Telegram.");
      webApp.openInvoice(d.url, status => { if (status === "paid") refresh().catch(() => {}); });
    } catch (e) { setError(e instanceof Error ? e.message : "Ошибка оплаты."); }
  }

  const label = me?.accessType === "week" ? "7 ДНЕЙ" : me?.accessType === "month" ? "30 ДНЕЙ" : "FREE";

  return (
    <main className="app">
      <header className="top">
        <div className="brand"><div className="logo">SA</div><div><div className="name">Student AI</div><div className="sub">Решение любых школьных задач · фото + текст</div></div></div>
        <div className="badge">{label}</div>
      </header>

      <section className="card">
        <div className="sectionTitle"><span>ЗАДАЧА</span><div className="counter">{me?.accessType === "free" ? `${me.usedToday}/${me.freeDaily} сегодня` : "доступ активен"}</div></div>
        <textarea value={text} onChange={e => setText(e.target.value)} placeholder="Вставь условие сюда..." />
        <div className="actions">
          <label className="photoBtn">📷 Фото<input hidden type="file" accept="image/*" onChange={fileChange} /></label>
          <button className="btn primary" onClick={understand} disabled={loading}>{loading ? "Читаю..." : "Проверить условие"}</button>
        </div>
        {preview && <img className="preview" src={preview} alt="Условие" />}
        <div className="small" style={{ marginTop: 10 }}>Сначала я перепишу задачу и спрошу, правильно ли понял. Решение начнётся только после твоего подтверждения.</div>
      </section>

      {check && <section className="card"><div className="sectionTitle"><span>ПРОВЕРКА</span></div><div className="confirm"><div className="confirmTitle">Я правильно понял задачу?</div><div className="confirmMeta">{check.subject} · {check.confidence}</div><div className="taskText">{check.task}</div><div className="actions"><button className="btn primary" disabled={solving} onClick={solve}>{solving ? "Решаю..." : "✅ Да, решай"}</button><button className="btn ghost" onClick={() => setCheck(null)}>✏️ Нет, исправить</button></div></div></section>}

      {answer && <section className="card"><div className="sectionTitle"><span>ПОДРОБНОЕ РЕШЕНИЕ</span></div><div className="answer">{answer}</div></section>}
      {error && <div className="error">{error}</div>}

      <section className="card"><div className="sectionTitle"><span>ДОСТУП К GPT-6.1 SOL</span></div><div className="plans">
        <div className="plan"><div className="planName">FREE</div><div className="planPrice">3 / день</div><div className="planDesc">3 бесплатных решения каждый день.</div></div>
        <div className="plan"><div className="planName">7 ДНЕЙ</div><div className="planPrice">59 ⭐</div><div className="planDesc">Доступ к Sol на 7 дней.</div><button className="btn primary full" onClick={() => buy("week")}>Купить</button></div>
        <div className="plan featured"><div className="planName">30 ДНЕЙ</div><div className="planPrice">149 ⭐</div><div className="planDesc">Доступ к Sol на 30 дней.</div><button className="btn primary full" onClick={() => buy("month")}>Купить</button></div>
      </div><div className="small" style={{ marginTop: 12 }}>Цифровая услуга внутри Telegram оплачивается в Telegram Stars.</div></section>

      <div className="footer">/terms · /paysupport · Student AI</div>
    </main>
  );
}
