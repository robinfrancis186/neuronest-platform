import * as DocumentPicker from "expo-document-picker";
import * as Sharing from "expo-sharing";
import { File, Paths } from "expo-file-system";
import { Platform } from "react-native";
import { api, apiResponse, post } from "./api";
export async function upload(child: string) {
  const result = await DocumentPicker.getDocumentAsync({
    type: ["application/pdf", "image/jpeg", "image/png"],
    copyToCacheDirectory: true,
    multiple: false,
  });
  if (result.canceled) return;
  const asset = result.assets[0];
  if (asset.size && asset.size > 20 * 1024 * 1024)
    throw new Error("Choose a document under 20 MB.");
  const body = new FormData();
  body.append("child", child);
  if (Platform.OS === "web") body.append("file", asset.file as Blob, asset.name);
  else
    body.append("file", {
      uri: asset.uri,
      name: asset.name,
      type: asset.mimeType || "application/octet-stream",
    } as unknown as Blob);
  try {
    await api("attachments/", { method: "POST", body });
  } finally {
    if (Platform.OS !== "web") {
      const copied = new File(asset.uri);
      if (copied.exists) copied.delete();
    }
  }
}
export async function download(id: string) {
  if (!/^[a-zA-Z0-9-]+$/.test(id)) throw new Error("Invalid attachment.");
  const response = await apiResponse(`attachments/${id}/content/`);
  if (!response.ok)
    throw new Error(
      response.status === 403
        ? "Access denied or scan pending."
        : "Download unavailable.",
    );
  if (Platform.OS === "web") {
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "neuronest-record";
    a.click();
    URL.revokeObjectURL(url);
    return;
  }
  const disposition = response.headers.get("Content-Disposition") || "";
  const filename =
    disposition.match(/filename="?([^";]+)/)?.[1]?.replace(/[^a-zA-Z0-9._-]/g, "_") ||
    "neuronest-record.pdf";
  const file = new File(Paths.cache, `${id}-${filename}`);
  file.create({ overwrite: true });
  file.write(new Uint8Array(await response.arrayBuffer()));
  try {
    if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(file.uri);
    else throw new Error("File sharing is unavailable on this device.");
  } finally {
    if (file.exists) file.delete();
  }
}

export async function exportRecords(child: string) {
  const data = await post<Record<string, unknown>>("exports/", { child });
  const body = JSON.stringify(data, null, 2);
  if (Platform.OS === "web") {
    const url = URL.createObjectURL(new Blob([body], { type: "application/json" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "neuronest-records.json";
    link.click();
    URL.revokeObjectURL(url);
    return;
  }
  const file = new File(Paths.cache, "neuronest-records.json");
  file.create({ overwrite: true });
  file.write(body);
  try {
    if (!(await Sharing.isAvailableAsync()))
      throw new Error("File sharing is unavailable on this device.");
    await Sharing.shareAsync(file.uri, {
      mimeType: "application/json",
      UTI: "public.json",
    });
  } finally {
    if (file.exists) file.delete();
  }
}
