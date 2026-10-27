export const INDIA_TIME_ZONE = "Asia/Kolkata";

type IndiaParts = { year: string; month: string; day: string };

function indiaParts(value: unknown): IndiaParts | null {
  const date = new Date(String(value));
  if (!Number.isFinite(date.getTime())) return null;
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: INDIA_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const part = (type: "year" | "month" | "day") =>
    parts.find((item) => item.type === type)?.value || "";
  return { year: part("year"), month: part("month"), day: part("day") };
}

export function indiaDayKey(value: unknown) {
  const parts = indiaParts(value);
  return parts ? `${parts.year}-${parts.month}-${parts.day}` : "";
}

/** Midday UTC keeps a calendar cell on the intended IST date in any browser zone. */
export function indiaMonthStart(value: unknown) {
  const parts = indiaParts(value) || indiaParts(new Date())!;
  return new Date(Date.UTC(Number(parts.year), Number(parts.month) - 1, 1, 12));
}

export function indiaDateFromKey(key: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key);
  return match
    ? new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12))
    : null;
}

export function indiaCalendarDays(month: Date) {
  const year = month.getUTCFullYear();
  const monthIndex = month.getUTCMonth();
  const first = new Date(Date.UTC(year, monthIndex, 1, 12));
  const last = new Date(Date.UTC(year, monthIndex + 1, 0, 12));
  const days: Array<Date | null> = Array.from(
    { length: first.getUTCDay() },
    () => null,
  );
  for (let day = 1; day <= last.getUTCDate(); day += 1)
    days.push(new Date(Date.UTC(year, monthIndex, day, 12)));
  while (days.length % 7) days.push(null);
  return days;
}

export function indiaTimeLabel(value: unknown, language: "en" | "ml") {
  const date = new Date(String(value));
  return Number.isFinite(date.getTime())
    ? date.toLocaleTimeString(language === "ml" ? "ml-IN" : "en-IN", {
        timeZone: INDIA_TIME_ZONE,
        hour: "numeric",
        minute: "2-digit",
      })
    : "—";
}

export function indiaDateTimeLabel(value: unknown, language: "en" | "ml") {
  const date = new Date(String(value));
  return Number.isFinite(date.getTime())
    ? date.toLocaleString(language === "ml" ? "ml-IN" : "en-IN", {
        timeZone: INDIA_TIME_ZONE,
        day: "numeric",
        month: "short",
        hour: "numeric",
        minute: "2-digit",
      })
    : "—";
}
