import { Platform } from "react-native";
import { expoPushToken, PUSH_DISABLED, pushEnrollmentError } from "./push-token";

export async function pushToken() {
  if (Platform.OS === "web")
    throw new Error("Push enrollment is available in the Android/iOS app.");
  const projectId = process.env.EXPO_PUBLIC_EAS_PROJECT_ID;
  if (!projectId)
    throw new Error(
      "Push is unavailable until the app publisher configures the notification service.",
    );
  try {
    const notifications = await import("expo-notifications");
    if (Platform.OS === "android")
      await notifications.setNotificationChannelAsync("care-updates", {
        name: "Care updates",
        importance: notifications.AndroidImportance.DEFAULT,
        lockscreenVisibility: notifications.AndroidNotificationVisibility.PRIVATE,
      });
    let permission = await notifications.getPermissionsAsync();
    if (!permission.granted) permission = await notifications.requestPermissionsAsync();
    if (!permission.granted) throw new Error(PUSH_DISABLED);
    return expoPushToken(
      (await notifications.getExpoPushTokenAsync({ projectId })).data,
    );
  } catch (error) {
    throw pushEnrollmentError(error);
  }
}
