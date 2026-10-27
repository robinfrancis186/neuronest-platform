import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import { File, Directory, Paths } from "expo-file-system";
import {
  AESEncryptionKey,
  AESSealedData,
  aesEncryptAsync,
  aesDecryptAsync,
  digestStringAsync,
  CryptoDigestAlgorithm,
  randomUUID,
} from "expo-crypto";
import type { Draft, Observation } from "./types";
import { themeFromStoredValue, type Theme } from "./theme";
const options = { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY };
const themeKey = "neuronest.theme";
const authKey = "neuronest.auth";
export const authStorage = {
  getItem: (key: string) =>
    Platform.OS === "web"
      ? Promise.resolve(
          typeof localStorage === "undefined" ? null : localStorage.getItem(key),
        )
      : SecureStore.getItemAsync(`${authKey}.${key}`, options),
  setItem: (key: string, value: string) =>
    Platform.OS === "web"
      ? Promise.resolve(
          typeof localStorage === "undefined"
            ? undefined
            : localStorage.setItem(key, value),
        )
      : SecureStore.setItemAsync(`${authKey}.${key}`, value, options),
  removeItem: (key: string) =>
    Platform.OS === "web"
      ? Promise.resolve(
          typeof localStorage === "undefined"
            ? undefined
            : localStorage.removeItem(key),
        )
      : SecureStore.deleteItemAsync(`${authKey}.${key}`, options),
};
export const readTheme = async (): Promise<Theme> =>
  themeFromStoredValue(
    Platform.OS === "web"
      ? typeof localStorage === "undefined"
        ? null
        : localStorage.getItem(themeKey)
      : await SecureStore.getItemAsync(themeKey, options),
  );
export const saveTheme = async (theme: Theme) => {
  if (Platform.OS === "web") {
    if (typeof localStorage !== "undefined") localStorage.setItem(themeKey, theme);
    return;
  }
  await SecureStore.setItemAsync(themeKey, theme, options);
};
async function identity(owner: string) {
  return digestStringAsync(CryptoDigestAlgorithm.SHA256, owner);
}
async function directory(owner: string) {
  if (Platform.OS === "web")
    throw new Error("Encrypted offline drafts are available in the Android/iOS app.");
  return new Directory(Paths.document, "drafts", await identity(owner));
}
const keyOperations = new Map<string, Promise<AESEncryptionKey>>();
async function key(owner: string, create: boolean) {
  const name = `neuronest.drafts.${await identity(owner)}`;
  const pending = keyOperations.get(name);
  if (pending) return pending;
  const operation = (async () => {
    const existing = await SecureStore.getItemAsync(name, options);
    if (existing) return AESEncryptionKey.import(existing, "hex");
    if (!create)
      throw new Error("Draft encryption key unavailable. No draft was uploaded.");
    const generated = await AESEncryptionKey.generate();
    await SecureStore.setItemAsync(name, await generated.encoded("hex"), options);
    return generated;
  })();
  keyOperations.set(name, operation);
  try {
    return await operation;
  } finally {
    keyOperations.delete(name);
  }
}

export async function saveDraft(owner: string, payload: Observation) {
  const folder = await directory(owner);
  folder.create({ intermediates: true, idempotent: true });
  const draft: Draft = {
    id: randomUUID(),
    owner,
    created_at: new Date().toISOString(),
    payload,
  };
  const sealed = await aesEncryptAsync(
    new TextEncoder().encode(JSON.stringify(draft)),
    await key(owner, !folder.list().some((entry) => entry.name.endsWith(".aes"))),
  );
  const file = new File(folder, `${draft.id}.pending`);
  file.create();
  try {
    file.write(await sealed.combined());
    file.move(new File(folder, `${draft.id}.aes`));
  } catch (error) {
    if (file.exists) file.delete();
    throw error;
  }
  return draft;
}
export async function readDrafts(owner: string): Promise<Draft[]> {
  if (Platform.OS === "web") return [];
  const folder = await directory(owner);
  if (!folder.exists) return [];
  const files = folder
    .list()
    .filter(
      (entry): entry is File => entry instanceof File && entry.name.endsWith(".aes"),
    );
  if (!files.length) return [];
  const encryptionKey = await key(owner, false);
  const drafts = await Promise.all(
    files.map(async (file) => {
      const decoded = await aesDecryptAsync(
        AESSealedData.fromCombined(await file.bytes()),
        encryptionKey,
      );
      const draft = JSON.parse(new TextDecoder().decode(decoded)) as Draft;
      if (
        draft.owner !== owner ||
        `${draft.id}.aes` !== file.name ||
        !draft.payload?.child
      )
        throw new Error("Draft integrity check failed.");
      return draft;
    }),
  );
  return drafts.sort((a, b) => a.created_at.localeCompare(b.created_at));
}
export async function removeDraft(owner: string, id: string) {
  if (!/^[a-f0-9-]{36}$/.test(id)) throw new Error("Invalid draft identifier.");
  const file = new File(await directory(owner), `${id}.aes`);
  if (file.exists) file.delete();
}
export async function eraseDrafts(owner: string) {
  const folder = await directory(owner);
  if (folder.exists) folder.delete();
  await SecureStore.deleteItemAsync(
    `neuronest.drafts.${await identity(owner)}`,
    options,
  );
}
