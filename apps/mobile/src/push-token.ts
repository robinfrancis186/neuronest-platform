export const PUSH_DISABLED =
  "Notifications are disabled. Enable them in device settings and retry.";
export const PUSH_ENROLLMENT_RETRY =
  "Push could not be set up. Check your connection and retry.";

export function expoPushToken(value: unknown) {
  const token = typeof value === "string" ? value.trim() : "";
  if (!token || token.length > 255) throw new Error(PUSH_ENROLLMENT_RETRY);
  return token;
}

export function pushEnrollmentError(error: unknown) {
  if (error instanceof Error && error.message === PUSH_DISABLED) return error;
  return new Error(PUSH_ENROLLMENT_RETRY);
}
