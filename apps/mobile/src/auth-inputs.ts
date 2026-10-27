export class AuthInputError extends Error {
  constructor(
    readonly field: string,
    message: string,
  ) {
    super(message);
  }
}

export const emailValue = (value: string) => {
  const email = value.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    throw new AuthInputError("email", "Enter a valid email address.");
  return email;
};
export const passwordValue = (value: string) => {
  if (value.length < 12)
    throw new AuthInputError("password", "Use a password with at least 12 characters.");
  return value;
};
export const fullNameValue = (value: string) => {
  const name = value.trim().replace(/\s+/g, " ");
  if (!name) throw new AuthInputError("full_name", "Enter your name.");
  if (name.length > 160)
    throw new AuthInputError("full_name", "Use a name with at most 160 characters.");
  return name;
};
const USERNAME_PATTERN = /^[a-z][a-z0-9._-]{2,29}$/;
export const hasUsername = (value: unknown): value is string =>
  typeof value === "string" && USERNAME_PATTERN.test(value);
export const usernameValue = (value: string) => {
  const username = value.trim().toLowerCase();
  if (!hasUsername(username))
    throw new AuthInputError(
      "username",
      "Use 3–30 letters or numbers, starting with a letter. You may also use . _ or -.",
    );
  return username;
};

/** Only the core's explicit conflict code can open the legacy-link action. */
export const isFirebaseIdentityLinkRequired = (failure: unknown) => {
  const error = failure as { status?: unknown; code?: unknown } | null;
  return error?.status === 409 && error.code === "firebase_identity_link_required";
};

/** A legacy account with care data must be reviewed by support before linking. */
export const isFirebaseIdentityLinkReviewRequired = (failure: unknown) => {
  const error = failure as { status?: unknown; code?: unknown } | null;
  return (
    error?.status === 409 && error.code === "firebase_identity_link_review_required"
  );
};

/**
 * A reset request must not disclose whether an email is registered. Firebase's
 * enumeration-protection setting is the primary control; this is the client
 * defense when a provider returns recipient-specific errors anyway.
 */
export const passwordRecoveryFailureMessage = (failure: unknown) => {
  const code = (failure as { code?: unknown } | null)?.code;
  if (code === "auth/network-request-failed") return "Check your connection and retry.";
  if (code === "auth/too-many-requests")
    return "Too many attempts. Please wait a moment and retry.";
  if (
    code === "auth/app-not-authorized" ||
    code === "auth/invalid-api-key" ||
    code === "auth/operation-not-allowed"
  )
    return "Password recovery is unavailable. Please retry later.";
  return null;
};
