import * as WebBrowser from "expo-web-browser";
import type { Payment } from "./types";
export async function checkout(payment: Payment) {
  const url = payment.checkout?.url;
  if (!url || !url.startsWith("https://"))
    throw new Error(
      "Native checkout requires an Android/iOS development build, or a server-issued HTTPS checkout URL.",
    );
  await WebBrowser.openBrowserAsync(url);
}
