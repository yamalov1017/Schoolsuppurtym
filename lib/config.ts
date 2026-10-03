import SETUP from "../SETUP.json";

function requireValue(name: string, value: string) {
  if (!value || value.startsWith("ВСТАВЬ_") || value.startsWith("ПРИДУМАЙ_")) {
    throw new Error(`Заполни ${name} в файле SETUP.json`);
  }
  return value;
}

export const CONFIG = {
  botToken: requireValue("BOT_TOKEN", SETUP.BOT_TOKEN),
  openaiKey: requireValue("OPENAI_API_KEY", SETUP.OPENAI_API_KEY),
  botUsername: requireValue("BOT_USERNAME", SETUP.BOT_USERNAME),
  miniAppUrl: requireValue("MINI_APP_URL", SETUP.MINI_APP_URL),
  webhookSecret: requireValue("WEBHOOK_SECRET", SETUP.WEBHOOK_SECRET),
  openaiModel: SETUP.OPENAI_MODEL,
  reasoningEffort: SETUP.REASONING_EFFORT,
  databasePath: SETUP.DATABASE_PATH,
  freeDailyRequests: SETUP.FREE_DAILY_REQUESTS,
  weekPriceStars: SETUP.WEEK_PRICE_STARS,
  weekDays: SETUP.WEEK_DAYS,
  monthPriceStars: SETUP.MONTH_PRICE_STARS,
  monthDays: SETUP.MONTH_DAYS
} as const;
