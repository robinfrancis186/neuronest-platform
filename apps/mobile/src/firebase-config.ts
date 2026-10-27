import type { FirebaseOptions } from "firebase/app";

const required = [
  "EXPO_PUBLIC_FIREBASE_API_KEY",
  "EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN",
  "EXPO_PUBLIC_FIREBASE_PROJECT_ID",
  "EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET",
  "EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID",
  "EXPO_PUBLIC_FIREBASE_APP_ID",
] as const;

type FirebaseEnvironment = Partial<Record<(typeof required)[number], string>>;

/** Firebase configuration is public app identity, never a server credential. */
export function firebaseConfigFromEnv(
  env: FirebaseEnvironment = process.env as FirebaseEnvironment,
) {
  const missing = required.filter((name) => !env[name]?.trim());
  if (missing.length)
    throw new Error("Firebase sign-in is not configured. Please try again shortly.");
  return {
    apiKey: env.EXPO_PUBLIC_FIREBASE_API_KEY!.trim(),
    authDomain: env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN!.trim(),
    projectId: env.EXPO_PUBLIC_FIREBASE_PROJECT_ID!.trim(),
    storageBucket: env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET!.trim(),
    messagingSenderId: env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!.trim(),
    appId: env.EXPO_PUBLIC_FIREBASE_APP_ID!.trim(),
  } satisfies FirebaseOptions;
}
