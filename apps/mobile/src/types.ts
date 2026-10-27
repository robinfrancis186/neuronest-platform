export type Language = "en" | "ml";
export type User = {
  id: string;
  email: string;
  username: string;
  display_name: string;
  role: string;
  language?: Language;
};
export const visibleName = (value: string | null | undefined) => {
  const name = value?.trim() || "";
  return name.includes("@") ? "" : name;
};
export type Child = {
  id: string;
  name: string;
  date_of_birth: string;
  language: Language;
};
export type Row = { id: string; [key: string]: unknown };
export type Observation = {
  child: string;
  domain: string;
  title: string;
  status: string;
  note: string;
  observed_on: string;
};
export type Draft = {
  id: string;
  owner: string;
  created_at: string;
  payload: Observation;
};
export type Citation = { title: string; url: string };
export type Answer = {
  answer: string;
  language: Language;
  citations: Citation[];
  escalation: string | boolean | null;
  status: string;
};
export type Join = { token: string; url?: string; server_url?: string; room?: string };
export type Payment = Row & {
  amount_minor: number;
  provider_order_id?: string;
  checkout?: {
    key?: string;
    key_id?: string;
    order_id?: string;
    url?: string;
    currency?: string;
  };
  status: string;
};
export const str = (row: Row, key: string): string =>
  row[key] == null
    ? ""
    : typeof row[key] === "object"
      ? JSON.stringify(row[key])
      : String(row[key]);
export const money = (minor: unknown) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(
    Number(minor || 0) / 100,
  );
export const dateLabel = (value: unknown) =>
  value
    ? new Date(String(value)).toLocaleString("en-IN", {
        timeZone: "Asia/Kolkata",
        dateStyle: "medium",
        timeStyle: "short",
      })
    : "";

/** A stable day key lets the booking UI group API timestamps in India time. */
export const indiaDateKey = (value: unknown) => {
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return "";
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })
      .formatToParts(date)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );
  return `${parts.year}-${parts.month}-${parts.day}`;
};

export const indiaDateLabel = (value: unknown, language: Language) =>
  value
    ? new Date(String(value)).toLocaleDateString(
        language === "ml" ? "ml-IN" : "en-IN",
        {
          timeZone: "Asia/Kolkata",
          weekday: "short",
          month: "short",
          day: "numeric",
        },
      )
    : "";

export const indiaTimeLabel = (value: unknown, language: Language) =>
  value
    ? new Date(String(value)).toLocaleTimeString(
        language === "ml" ? "ml-IN" : "en-IN",
        {
          timeZone: "Asia/Kolkata",
          hour: "numeric",
          minute: "2-digit",
        },
      )
    : "";
