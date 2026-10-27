import type { components } from "../../../packages/contracts/api";
import {
  authConfigurationError,
  bearerToken,
  firebaseAuth,
  signOut,
  tokenFor,
} from "./auth";
import { resolveServiceUrl } from "./auth-config";
import { isDefinitiveAuthFailure } from "./auth-errors";
import { apiError, isPage, type Page } from "./http";
export { ApiError, isPage, type Page } from "./http";
export { authConfigurationError, restoreSession, signOut } from "./auth";

const apiConfig = resolveServiceUrl(import.meta.env.VITE_API_URL, "The core API");

export const API = apiConfig.value || "";
export const apiConfigurationError = apiConfig.error
  ? "The core API is not configured. Set VITE_API_URL."
  : "";
export const configurationError = authConfigurationError || apiConfigurationError;

export type User = components["schemas"]["CurrentAccount"] & {
  role: NonNullable<components["schemas"]["CurrentAccount"]["role"]>;
};
export type Child = components["schemas"]["Child"];
export type Appointment = components["schemas"]["Appointment"] & { is_demo?: boolean };
// Engine rows keep their versioned JSON payload; authorization and validation remain server-side.
export type Row = { id: string; [key: string]: any };

const USERNAME_PATTERN = /^[a-z][a-z0-9._-]{2,29}$/;
/** True only for a claimed family sign-in username, never a provider subject. */
export const hasUsername = (value: unknown): value is string =>
  typeof value === "string" && USERNAME_PATTERN.test(value);

function expireSession() {
  window.dispatchEvent(new Event("neuronest:expired"));
}

type UsernameSession = { custom_token: string };
async function usernameAuth<T>(path: string, body: unknown): Promise<T> {
  if (apiConfigurationError) throw new Error(apiConfigurationError);
  const response = await fetch(`${API}/v1/auth/username/${path}`, {
    method: "POST",
    credentials: "omit",
    referrerPolicy: "no-referrer",
    cache: "no-store",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({ detail: "Request failed." }));
  if (!response.ok) throw apiError(data, response.status);
  return data as T;
}

/** The core verifies username/password privately and returns a Firebase custom token. */
export const signInWithUsername = async (username: string, password: string) => {
  const session = await usernameAuth<UsernameSession>("sign-in/", {
    username,
    password,
  });
  if (!session || typeof session.custom_token !== "string" || !session.custom_token)
    throw new Error("Username sign-in is not configured yet.");
  return session.custom_token;
};

export const claimUsername = (username: string, full_name: string) =>
  api<User>("auth/username/claim/", "POST", { username, full_name });

async function request(
  path: string,
  method: string,
  body?: unknown,
  signal?: AbortSignal,
  refreshed = false,
): Promise<unknown> {
  if (apiConfigurationError) throw new Error(apiConfigurationError);
  const form = body instanceof FormData;
  const token = bearerToken();
  const response = await fetch(`${API}/v1/${path.replace(/^\//, "")}`, {
    method,
    credentials: "omit",
    referrerPolicy: "no-referrer",
    cache: "no-store",
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(!form && body !== undefined ? { "Content-Type": "application/json" } : {}),
    },
    body:
      body === undefined ? undefined : form ? (body as FormData) : JSON.stringify(body),
    signal,
  });
  const data =
    response.status === 204
      ? null
      : await response
          .json()
          .catch(() => ({ detail: `Request failed (${response.status})` }));
  if (!response.ok) {
    if (response.status === 401 && !refreshed && token && firebaseAuth?.currentUser) {
      try {
        await tokenFor(firebaseAuth.currentUser, true);
        return request(path, method, body, signal, true);
      } catch (error) {
        // Preserve the local Firebase session through network failures. A revoked or
        // disabled identity still follows the normal expiry path.
        if (isDefinitiveAuthFailure(error)) {
          expireSession();
          void signOut();
        }
      }
    }
    if (response.status === 401 && !firebaseAuth?.currentUser) {
      expireSession();
      void signOut();
    }
    throw apiError(data, response.status);
  }
  return data;
}

/**
 * Most callers want the rows. List endpoints answer with a bounded page, so
 * unwrap it here and let a caller that cares about truncation use apiPage.
 */
export async function api<T = Row>(
  path: string,
  method = "GET",
  body?: unknown,
  signal?: AbortSignal,
): Promise<T> {
  const data = await request(path, method, body, signal);
  return (isPage(data) ? (data.results as unknown) : data) as T;
}

/** The same request, keeping the envelope so a caller can tell it was truncated. */
export async function apiPage<T = Row>(
  path: string,
  signal?: AbortSignal,
): Promise<Page<T>> {
  const data = await request(path, "GET", undefined, signal);
  if (isPage<T>(data)) return data;
  const results = (Array.isArray(data) ? data : [data]) as T[];
  return { count: results.length, next: null, previous: null, results };
}

export async function download(path: string, filename: string) {
  if (apiConfigurationError) throw new Error(apiConfigurationError);
  const token = bearerToken();
  const response = await fetch(`${API}/v1/${path}`, {
    credentials: "omit",
    referrerPolicy: "no-referrer",
    cache: "no-store",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!response.ok)
    throw new Error(
      "File unavailable. It may be quarantined or your access may have changed.",
    );
  const href = URL.createObjectURL(await response.blob());
  const a = document.createElement("a");
  a.href = href;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(href), 1000);
}
