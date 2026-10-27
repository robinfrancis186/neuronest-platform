const GENERIC_RECOVERY_CODES = new Set([
  "auth/user-not-found",
  "auth/invalid-email",
  "auth/missing-email",
  "auth/invalid-recipient-email",
]);
const DEFINITIVE_AUTH_FAILURES = new Set([
  "auth/invalid-user-token",
  "auth/user-disabled",
  "auth/user-token-expired",
]);

/** Only Firebase's explicit invalidation errors may end a persisted session. */
export function isDefinitiveAuthFailure(error: unknown) {
  const code = (error as { code?: unknown } | null)?.code;
  return typeof code === "string" && DEFINITIVE_AUTH_FAILURES.has(code);
}

/**
 * Firebase Email Enumeration Protection normally makes password-reset requests
 * indistinguishable. Keep that privacy property if a provider setting drifts.
 */
export function isGenericRecoveryOutcome(error: unknown) {
  const providerCode =
    error &&
    typeof error === "object" &&
    typeof (error as { code?: unknown }).code === "string"
      ? (error as { code: string }).code
      : "";
  if (GENERIC_RECOVERY_CODES.has(providerCode)) return true;
  const message = error instanceof Error ? error.message : "";
  return [...GENERIC_RECOVERY_CODES].some((code) => message.includes(code));
}

/** Keep popup cancellation quiet while giving configuration failures a usable path. */
export function googleSignInFailureMessage(error: unknown) {
  const code =
    error &&
    typeof error === "object" &&
    typeof (error as { code?: unknown }).code === "string"
      ? (error as { code: string }).code
      : "";
  if (code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request")
    return null;
  if (code === "auth/popup-blocked") return "Allow pop-ups to continue with Google.";
  if (
    code === "auth/operation-not-allowed" ||
    code === "auth/app-not-authorized" ||
    code === "auth/unauthorized-domain"
  )
    return "Google sign-in is not available yet. Use your username or email instead.";
  if (code === "auth/account-exists-with-different-credential")
    return "Use your username or email to sign in with this account.";
  return "We couldn’t continue with Google. Please try again.";
}
