import { ApiError } from "./http.ts";

export const FIREBASE_IDENTITY_LINK_REVIEW_REQUIRED =
  "firebase_identity_link_review_required";
export const IDENTITY_LINK_REVIEW_NOTICE =
  "This account needs an independent identity review before it can be opened. Contact support to continue.";

/** An email match never authorizes a browser to attach a legacy account. */
export function requiresIdentityLinkReview(error: unknown): error is ApiError {
  return (
    error instanceof ApiError &&
    error.status === 409 &&
    error.code === FIREBASE_IDENTITY_LINK_REVIEW_REQUIRED
  );
}
