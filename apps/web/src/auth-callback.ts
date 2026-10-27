/**
 * Firebase's hosted action pages can redirect to the configured continue URL
 * after completing verification or a password reset, without exposing oobCode.
 */
export const EMAIL_ACTION_CONTINUE_NOTICE =
  "Continue by signing in with your email. If you still need to finish the secure email action, return to the link and complete it there.";

export function fallbackForDefaultFirebaseAction() {
  return {
    mode: "sign-in" as const,
    signInMethod: "email" as const,
    notice: EMAIL_ACTION_CONTINUE_NOTICE,
  };
}
