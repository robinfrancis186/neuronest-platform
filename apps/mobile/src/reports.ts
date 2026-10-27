import type { Row } from "./types";

export type ReportTimeframe = "7" | "30" | "90";

export const reportDays: Record<ReportTimeframe, number> = {
  "7": 7,
  "30": 30,
  "90": 90,
};

const day = (value: Date) =>
  new Date(value.getFullYear(), value.getMonth(), value.getDate()).getTime();

const dateFor = (row: Row, fields: string[]) => {
  const value = fields.map((field) => row[field]).find(Boolean);
  if (typeof value !== "string") return null;
  const date = /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? new Date(`${value}T00:00:00`)
    : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const ageInDays = (date: Date, now: Date) =>
  Math.floor((day(now) - day(date)) / 86_400_000);

export function rowsInTimeframe(
  rows: Row[],
  fields: string[],
  days: number,
  now = new Date(),
) {
  return rows.filter((row) => {
    const date = dateFor(row, fields);
    const age = date && ageInDays(date, now);
    return typeof age === "number" && age >= 0 && age < days;
  });
}

export function observationTrend(rows: Row[], days: number, now = new Date()) {
  const bars = [0, 0, 0, 0];
  const bucketDays = Math.ceil(days / bars.length);
  for (const row of rows) {
    const date = dateFor(row, ["observed_on", "created_at"]);
    if (!date) continue;
    const age = ageInDays(date, now);
    if (age < 0 || age >= days) continue;
    bars[Math.max(0, 3 - Math.floor(age / bucketDays))]++;
  }
  return bars;
}
