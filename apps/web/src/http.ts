/**
 * Transport shapes with no browser dependencies.
 *
 * Kept apart from api.ts, which reads browser session storage and constructs a
 * identity client at module load, so these can be reasoned about and tested on their own.
 */

/** List endpoints answer with a bounded page rather than the whole result set. */
export type Page<T> = {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
};

export function isPage<T>(value: unknown): value is Page<T> {
  return (
    !!value &&
    typeof value === "object" &&
    Array.isArray((value as Page<T>).results) &&
    typeof (value as Page<T>).count === "number"
  );
}

/**
 * A validation failure names the fields it rejected. Flattening it into one
 * sentence loses that, so the field map travels with the error and the form can
 * mark the actual inputs invalid instead of printing a paragraph above them.
 */
export class ApiError extends Error {
  status: number;
  fields: Record<string, string>;
  /** A server-defined, non-localized error code when the API supplies one. */
  code?: string;
  constructor(
    message: string,
    status: number,
    fields: Record<string, string> = {},
    code?: string,
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.fields = fields;
    this.code = code;
  }
}

/** Build the error for a failed response, preferring field detail over a summary. */
export function apiError(data: unknown, status: number): ApiError {
  const body = (data || {}) as Record<string, unknown>;
  const say = (v: unknown) => (Array.isArray(v) ? v.join(" ") : String(v));
  const code = typeof body.code === "string" ? body.code : undefined;
  // The core adds a generic `detail` alongside field errors, so collect the
  // fields first and only fall back to the summary when there are none.
  const fields: Record<string, string> = {};
  for (const [key, value] of Object.entries(body))
    if (key !== "detail" && key !== "code" && value != null) fields[key] = say(value);
  if (Object.keys(fields).length)
    return new ApiError(
      Object.entries(fields)
        .map(([k, v]) => `${k}: ${v}`)
        .join("; "),
      status,
      fields,
      code,
    );
  return new ApiError(
    typeof body.detail === "string" ? body.detail : `Request failed (${status})`,
    status,
    {},
    code,
  );
}
