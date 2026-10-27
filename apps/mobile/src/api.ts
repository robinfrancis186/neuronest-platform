import type { User } from "./types";
export const API_URL = (
  process.env.EXPO_PUBLIC_API_URL || "http://127.0.0.1:8000"
).replace(/\/$/, "");
export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
  ) {
    super(message);
  }
}
let bearer = "";
let expired: (() => void) | undefined;
export const setToken = (token: string) => {
  bearer = token;
};
export const getToken = () => bearer;
export const onExpired = (fn: () => void) => {
  expired = fn;
};
export async function apiResponse(
  path: string,
  options: RequestInit = {},
): Promise<Response> {
  if (!__DEV__ && !API_URL.startsWith("https://"))
    throw new ApiError("A secure API URL is required.", 0);
  const requestToken = bearer;
  const headers = new Headers(options.headers);
  if (bearer) headers.set("Authorization", `Bearer ${bearer}`);
  if (options.body && !(options.body instanceof FormData))
    headers.set("Content-Type", "application/json");
  let response: Response;
  try {
    response = await fetch(`${API_URL}/v1/${path}`, {
      ...options,
      headers,
      cache: "no-store",
    });
  } catch (error) {
    if ((error as Error).name === "AbortError") throw error;
    throw new ApiError("Could not connect. Check your connection and retry.", 0);
  }
  if (!response.ok) {
    const text = await response.text();
    let body: unknown;
    try {
      body = text ? JSON.parse(text) : null;
    } catch {
      body = null;
    }
    if (response.status === 401 && requestToken === bearer) expired?.();
    const detail = (body as { detail?: unknown } | null)?.detail;
    const code = (body as { code?: unknown } | null)?.code;
    throw new ApiError(
      typeof detail === "string"
        ? detail
        : body
          ? JSON.stringify(body)
          : `Request failed (${response.status}).`,
      response.status,
      typeof code === "string" ? code : undefined,
    );
  }
  return response;
}
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

/** Ask for the largest safe page; callers still expose when the server caps it. */
export function boundedPagePath(path: string) {
  const [route, query = ""] = path.split("?", 2);
  const params = new URLSearchParams(query);
  params.set("page_size", "500");
  return `${route}?${params.toString()}`;
}
export async function api<T = unknown>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const data = await apiRaw<unknown>(path, options);
  // Callers ask for rows; apiPage keeps the envelope when truncation matters.
  return (isPage(data) ? (data.results as unknown) : data) as T;
}
export async function apiPage<T = unknown>(
  path: string,
  options: RequestInit = {},
): Promise<Page<T>> {
  const data = await apiRaw<unknown>(path, options);
  if (isPage<T>(data)) return data;
  const results = (Array.isArray(data) ? data : data == null ? [] : [data]) as T[];
  return { count: results.length, next: null, previous: null, results };
}
async function apiRaw<T = unknown>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await apiResponse(path, options);
  const text = await response.text();
  if (!text) return null as T;
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new ApiError("The server returned an unreadable response.", response.status);
  }
}
export const post = <T = unknown>(
  path: string,
  body: unknown,
  headers?: Record<string, string>,
) => api<T>(path, { method: "POST", body: JSON.stringify(body), headers });
export const patch = <T = unknown>(path: string, body: unknown) =>
  api<T>(path, { method: "PATCH", body: JSON.stringify(body) });
export const me = () => api<User>("me/");
export const childPath = (path: string, child: string) =>
  `${path}/?child=${encodeURIComponent(child)}`;
