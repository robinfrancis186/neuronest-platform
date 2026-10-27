import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import {
  getAuth,
  getReactNativePersistence,
  initializeAuth,
  type Auth,
} from "firebase/auth";
import { Platform } from "react-native";
import { firebaseConfigFromEnv } from "./firebase-config";
import { authStorage } from "./storage";

let app: FirebaseApp | null = null;
let auth: Auth | null = null;

const nativeAuthStorage = {
  getItem: (key: string) => authStorage.getItem(key),
  setItem: async (key: string, value: string) => {
    await authStorage.setItem(key, value);
  },
  removeItem: async (key: string) => {
    await authStorage.removeItem(key);
  },
};

export function firebaseApp() {
  if (!app) app = getApps().length ? getApp() : initializeApp(firebaseConfigFromEnv());
  return app;
}

export function firebaseAuth() {
  if (auth) return auth;
  const instance = firebaseApp();
  if (Platform.OS === "web") return (auth = getAuth(instance));
  try {
    auth = initializeAuth(instance, {
      persistence: getReactNativePersistence(nativeAuthStorage),
    });
  } catch (error) {
    if ((error as { code?: string }).code !== "auth/already-initialized") throw error;
    auth = getAuth(instance);
  }
  return auth;
}
