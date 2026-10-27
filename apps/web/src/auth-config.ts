import { secureServiceUrl } from "./utils.ts";

export type PublicEnvironment = {
  VITE_API_URL?: string;
  VITE_FIREBASE_API_KEY?: string;
  VITE_FIREBASE_AUTH_DOMAIN?: string;
  VITE_FIREBASE_PROJECT_ID?: string;
  VITE_FIREBASE_APP_ID?: string;
  VITE_FIREBASE_MESSAGING_SENDER_ID?: string;
};

type ResolvedService =
  | { value: string; error?: never }
  | { value?: never; error: string };

function configured(value: string | undefined) {
  return value?.trim() || "";
}

export function resolveServiceUrl(
  value: string | undefined,
  name: string,
): ResolvedService {
  const raw = configured(value);
  if (!raw) return { error: `${name} is not configured.` };
  try {
    return { value: secureServiceUrl(raw, name) };
  } catch {
    return { error: `${name} must be an HTTPS URL outside local development.` };
  }
}

export type FirebaseConfig = {
  apiKey: string;
  authDomain: string;
  projectId: string;
  appId: string;
  messagingSenderId?: string;
};

function firebaseHostname(value: string | undefined) {
  const hostname = configured(value).toLowerCase();
  if (!hostname || /[\s/:?#@]/u.test(hostname)) return "";
  return hostname;
}

export function resolveFirebaseConfig(
  environment: PublicEnvironment,
): { config: FirebaseConfig; error?: never } | { config?: never; error: string } {
  const apiKey = configured(environment.VITE_FIREBASE_API_KEY);
  const authDomain = firebaseHostname(environment.VITE_FIREBASE_AUTH_DOMAIN);
  const projectId = configured(environment.VITE_FIREBASE_PROJECT_ID);
  const appId = configured(environment.VITE_FIREBASE_APP_ID);
  if (!apiKey || !authDomain || !projectId || !appId)
    return {
      error:
        "Secure sign-in is not configured. Set VITE_FIREBASE_API_KEY, VITE_FIREBASE_AUTH_DOMAIN, VITE_FIREBASE_PROJECT_ID, and VITE_FIREBASE_APP_ID.",
    };
  return {
    config: {
      apiKey,
      authDomain,
      projectId,
      appId,
      ...(configured(environment.VITE_FIREBASE_MESSAGING_SENDER_ID)
        ? {
            messagingSenderId: configured(
              environment.VITE_FIREBASE_MESSAGING_SENDER_ID,
            ),
          }
        : {}),
    },
  };
}
