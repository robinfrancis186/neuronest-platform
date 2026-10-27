export function safeUrl(value: unknown): string | undefined {
  if (typeof value !== "string") return;
  try {
    const u = new URL(value);
    if (["https:", "http:"].includes(u.protocol)) return u.href;
  } catch {
    /* malformed sources are not clickable */
  }
}
export function secureServiceUrl(value: string, name: string): string {
  const url = new URL(value);
  const loopback = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  if (url.protocol !== "https:" && !loopback)
    throw new Error(`${name} must use HTTPS outside loopback.`);
  if (url.username || url.password || url.search || url.hash)
    throw new Error(`${name} must be a plain service URL.`);
  return url.href.replace(/\/$/, "");
}
export function money(minor: unknown): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(Number(minor ?? 0) / 100);
}
export function doctorDisplayName(name: unknown, isDemo: unknown = false): string {
  if (typeof name !== "string") return "";
  return isDemo === true ? name.replace(/^Demo (.+) — test only$/, "$1") : name;
}
export function date(
  value: unknown,
  full = false,
  language: "en" | "ml" = "en",
): string {
  if (!value || typeof value !== "string") return "Not scheduled";
  const d = new Date(value);
  if (!Number.isFinite(d.getTime())) return "Not available";
  return d.toLocaleString(
    language === "ml" ? "ml-IN" : "en-IN",
    full
      ? { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }
      : { day: "numeric", month: "short", year: "numeric" },
  );
}
export function age(dob: string, language: "en" | "ml" = "en"): string {
  const days = (Date.now() - new Date(dob).getTime()) / 86400000;
  return days < 365
    ? `${Math.max(0, Math.floor(days / 30.44))} ${language === "ml" ? "മാസം" : "months"}`
    : `${Math.floor(days / 365.2425)} ${language === "ml" ? "വയസ്സ്" : "years"}`;
}
export function cleanForm(
  values: Record<string, FormDataEntryValue>,
  numeric: string[] = [],
): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(values)
      .filter(([, v]) => v !== "")
      .map(([k, v]) => [k, numeric.includes(k) ? Number(v) : v]),
  );
}
