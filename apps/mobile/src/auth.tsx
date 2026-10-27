import React, { useEffect, useState } from "react";
import { View } from "react-native";
import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithCustomToken,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  type User as FirebaseUser,
} from "firebase/auth";
import { me, post, setToken } from "./api";
import {
  emailValue,
  fullNameValue,
  hasUsername,
  isFirebaseIdentityLinkRequired,
  isFirebaseIdentityLinkReviewRequired,
  passwordValue,
  passwordRecoveryFailureMessage,
  usernameValue,
} from "./auth-inputs";
import { firebaseAuth } from "./firebase";
import type { User } from "./types";
import {
  Button,
  Card,
  Confirm,
  Copy,
  ErrorText,
  FieldError,
  Form,
  Title,
  useT,
} from "./ui";

type Mode =
  | "sign-in"
  | "sign-up"
  | "recover"
  | "claim-username"
  | "link-identity"
  | "identity-review";
type SignInMethod = "username" | "email";
type UsernameSession = { custom_token?: unknown };

function authMessage(failure: unknown) {
  const code = (failure as { code?: unknown })?.code;
  if (
    code === "auth/invalid-credential" ||
    code === "auth/invalid-login-credentials" ||
    code === "auth/wrong-password" ||
    code === "auth/user-not-found"
  )
    return "We couldn’t sign you in with those details.";
  if (code === "auth/email-already-in-use")
    return "An account already uses this email. Sign in instead.";
  if (code === "auth/too-many-requests")
    return "Too many attempts. Please wait a moment and retry.";
  if (code === "auth/network-request-failed") return "Check your connection and retry.";
  return failure instanceof Error ? failure.message : "Sign-in failed. Please retry.";
}

export function Login({
  onLogin,
  requireUsernameSetup = false,
  requireIdentityLink = false,
  requireIdentityReview = false,
  onIdentityLinkCancelled,
  onIdentityReviewCancelled,
}: {
  onLogin: (user: User) => void;
  requireUsernameSetup?: boolean;
  requireIdentityLink?: boolean;
  requireIdentityReview?: boolean;
  onIdentityLinkCancelled?: () => void;
  onIdentityReviewCancelled?: () => void;
}) {
  const t = useT();
  const [mode, setMode] = useState<Mode>("sign-in");
  const [signInMethod, setSignInMethod] = useState<SignInMethod>("username");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [verificationEmail, setVerificationEmail] = useState("");
  const [claimName, setClaimName] = useState("");

  const showIdentityReview = async () => {
    setToken("");
    setError("");
    await signOut(firebaseAuth()).catch(() => undefined);
    setMode("identity-review");
    setNotice(
      "This account requires a manual identity review. Contact NeuroNest support to continue.",
    );
  };

  const establish = async (firebaseUser: FirebaseUser) => {
    await firebaseUser.reload();
    if (!firebaseUser.emailVerified) {
      setToken("");
      setVerificationEmail(firebaseUser.email || "");
      throw new Error("Verify your email before accessing NeuroNest.");
    }
    // Email verification happens outside the app, so refresh stale ID-token claims.
    const token = await firebaseUser.getIdToken(true);
    setToken(token);
    try {
      const user = await me();
      if (user.role !== "parent")
        throw new Error("Use the clinician or operations portal for this account.");
      if (!hasUsername(user.username)) {
        setClaimName(
          user.display_name.includes("@")
            ? firebaseUser.displayName || ""
            : user.display_name,
        );
        setMode("claim-username");
        setNotice("Finish setting up your account after verifying your email.");
        return;
      }
      onLogin(user);
    } catch (failure) {
      if (isFirebaseIdentityLinkReviewRequired(failure)) {
        await showIdentityReview();
        return;
      }
      if (isFirebaseIdentityLinkRequired(failure)) {
        // Keep the Firebase session so the parent can consciously choose whether
        // to link it. No request to the linking endpoint happens here.
        setToken("");
        setMode("link-identity");
        setNotice(
          "A verified sign-in matches an existing NeuroNest account. Review and confirm the link to continue.",
        );
        return;
      }
      setToken("");
      await signOut(firebaseAuth()).catch(() => undefined);
      throw failure;
    }
  };

  useEffect(() => {
    if (requireIdentityReview) {
      setError("");
      setMode("identity-review");
      setNotice(
        "This account requires a manual identity review. Contact NeuroNest support to continue.",
      );
      return;
    }
    if (requireIdentityLink) {
      setError("");
      setMode("link-identity");
      setNotice(
        "A verified sign-in matches an existing NeuroNest account. Review and confirm the link to continue.",
      );
      return;
    }
    if (!requireUsernameSetup) return;
    setMode("claim-username");
    setNotice("Finish setting up your account after verifying your email.");
  }, [requireIdentityLink, requireIdentityReview, requireUsernameSetup]);

  const switchMode = (next: Mode) => {
    setError("");
    setNotice("");
    if (next !== "sign-in") setSignInMethod("username");
    setMode(next);
  };
  const useDifferentAccount = async () => {
    setError("");
    setNotice("");
    setVerificationEmail("");
    setClaimName("");
    setToken("");
    await signOut(firebaseAuth()).catch(() => undefined);
    if (mode === "link-identity") onIdentityLinkCancelled?.();
    if (mode === "identity-review") onIdentityReviewCancelled?.();
    setMode("sign-in");
  };
  const resendConfirmation = async () => {
    try {
      const current = firebaseAuth().currentUser;
      if (!current || current.email !== verificationEmail)
        throw new Error("Sign in with your email to resend the verification link.");
      await sendEmailVerification(current);
      setNotice("Check your email to verify it and finish setting up your account.");
      setError("");
    } catch (failure) {
      setError(authMessage(failure));
    }
  };
  const signIn = async (values: Record<string, string>) => {
    try {
      const password = passwordValue(values.password);
      const credential =
        signInMethod === "email"
          ? await signInWithEmailAndPassword(
              firebaseAuth(),
              emailValue(values.email),
              password,
            )
          : await (async () => {
              // The core verifies username/password with Firebase, then returns a
              // short-lived custom token. The email is never exposed to this UI.
              setToken("");
              const session = await post<UsernameSession>("auth/username/sign-in/", {
                username: usernameValue(values.username),
                password,
              });
              if (typeof session.custom_token !== "string" || !session.custom_token)
                throw new Error(
                  "Username sign-in is not configured. Please use email once to finish setup.",
                );
              return signInWithCustomToken(firebaseAuth(), session.custom_token);
            })();
      await establish(credential.user);
    } catch (failure) {
      if (failure instanceof FieldError) throw failure;
      throw new Error(authMessage(failure));
    }
  };
  const signUp = async (values: Record<string, string>) => {
    try {
      const fullName = fullNameValue(values.full_name);
      const password = passwordValue(values.password);
      if (password !== values.confirm_password)
        throw new FieldError("confirm_password", "Passwords do not match.");
      const credential = await createUserWithEmailAndPassword(
        firebaseAuth(),
        emailValue(values.email),
        password,
      );
      await updateProfile(credential.user, { displayName: fullName });
      await sendEmailVerification(credential.user);
      setClaimName(fullName);
      setVerificationEmail(credential.user.email || "");
      setSignInMethod("email");
      setMode("sign-in");
      setNotice("Check your email to verify it and finish setting up your account.");
    } catch (failure) {
      if (failure instanceof FieldError) throw failure;
      throw new Error(authMessage(failure));
    }
  };
  const recover = async (values: Record<string, string>) => {
    try {
      await sendPasswordResetEmail(firebaseAuth(), emailValue(values.email));
      setNotice("If an account exists, a password reset link has been sent.");
      setMode("sign-in");
    } catch (failure) {
      if (failure instanceof FieldError) throw failure;
      const message = passwordRecoveryFailureMessage(failure);
      if (message) throw new Error(message);
      // A provider can reveal a missing or invalid recipient when email
      // enumeration protection is misconfigured. Keep this outcome generic.
      setNotice("If an account exists, a password reset link has been sent.");
      setMode("sign-in");
    }
  };
  const completeUsername = async (values: Record<string, string>) => {
    const fullName = fullNameValue(values.full_name);
    const username = usernameValue(values.username);
    const current = firebaseAuth().currentUser;
    if (!current) throw new Error("Sign in again to finish setting up your account.");
    await current.reload();
    if (!current.emailVerified)
      throw new Error("Verify your email before accessing NeuroNest.");
    await updateProfile(current, { displayName: fullName });
    setToken(await current.getIdToken(true));
    const user = await post<User>("auth/username/claim/", {
      username,
      full_name: fullName,
    });
    onLogin(user);
  };
  const linkIdentity = async () => {
    try {
      const current = firebaseAuth().currentUser;
      if (!current)
        throw new Error("Sign in with your verified email to link this account.");
      await current.reload();
      if (!current.emailVerified)
        throw new Error("Verify your email before linking this account.");
      if (
        !(await Confirm(
          "Link your existing account?",
          "This connects the verified Firebase sign-in to the existing NeuroNest account with the same email. Your care records stay with that account.",
          { confirmLabel: "Link accounts", dismissLabel: "Not now" },
        ))
      )
        return;
      // The only link request is made after the parent confirms in the platform dialog.
      setToken(await current.getIdToken(true));
      const linked = await post<{ linked?: unknown }>("auth/identity/link/", {
        confirm: true,
      });
      if (linked.linked !== true)
        throw new Error("Account linking could not be completed.");
      const user = await me();
      if (user.role !== "parent")
        throw new Error("Use the clinician or operations portal for this account.");
      if (!hasUsername(user.username)) {
        setClaimName(
          user.display_name.includes("@")
            ? current.displayName || ""
            : user.display_name,
        );
        setMode("claim-username");
        setNotice("Finish setting up your account after verifying your email.");
        return;
      }
      onLogin(user);
    } catch (failure) {
      if (isFirebaseIdentityLinkReviewRequired(failure)) {
        await showIdentityReview();
        return;
      }
      // Retain the Firebase session for a deliberate retry, but never retain an
      // API bearer after a failed link attempt.
      setToken("");
      setError(authMessage(failure));
    }
  };
  const fields =
    mode === "recover"
      ? [{ name: "email", label: "Email", type: "email" as const, required: true }]
      : mode === "claim-username"
        ? [
            {
              name: "full_name",
              label: "Your name",
              type: "text" as const,
              initial: claimName,
              required: true,
            },
            {
              name: "username",
              label: "Username",
              type: "text" as const,
              required: true,
            },
          ]
        : mode === "sign-up"
          ? [
              {
                name: "full_name",
                label: "Your name",
                type: "text" as const,
                required: true,
              },
              {
                name: "email",
                label: "Email",
                type: "email" as const,
                required: true,
              },
              {
                name: "password",
                label: "Password",
                type: "password" as const,
                required: true,
              },
              {
                name: "confirm_password",
                label: "Confirm password",
                type: "password" as const,
                required: true,
              },
            ]
          : [
              ...(signInMethod === "username"
                ? [
                    {
                      name: "username",
                      label: "Username",
                      type: "text" as const,
                      required: true,
                    },
                  ]
                : [
                    {
                      name: "email",
                      label: "Email",
                      type: "email" as const,
                      required: true,
                    },
                  ]),
              {
                name: "password",
                label: "Password",
                type: "password" as const,
                required: true,
              },
            ];
  const submit =
    mode === "sign-in"
      ? signIn
      : mode === "sign-up"
        ? signUp
        : mode === "recover"
          ? recover
          : completeUsername;
  const submitTitle =
    mode === "sign-in"
      ? "Sign in"
      : mode === "sign-up"
        ? "Create account"
        : mode === "recover"
          ? "Send reset link"
          : "Finish setup";
  return (
    <View style={{ gap: 16 }}>
      <Copy muted>NEURONEST · FAMILY</Copy>
      <Title>
        {t(
          mode === "sign-in"
            ? "Welcome to NeuroNest"
            : mode === "sign-up"
              ? "Create your family account"
              : mode === "recover"
                ? "Reset your password"
                : mode === "link-identity"
                  ? "Link your existing account"
                  : mode === "identity-review"
                    ? "Contact support for an identity review"
                    : "Finish setting up your account",
        )}
      </Title>
      <Copy>
        {t(
          mode === "sign-in" && signInMethod === "username"
            ? "Use your username to continue. Keep your verified email for account recovery."
            : mode === "sign-in"
              ? "Use your email once to finish setting up a new account."
              : mode === "sign-up"
                ? "Add your name and password. Your verified email remains available for recovery."
                : mode === "claim-username"
                  ? "Choose a username for future sign-ins. Your verified email remains available for recovery."
                  : mode === "link-identity"
                    ? "A verified Firebase sign-in has the same email as an existing NeuroNest account. Review the connection before continuing."
                    : mode === "identity-review"
                      ? "A manual support review is required before this Firebase sign-in can access the existing account."
                      : "Secure care, at your pace.",
        )}
      </Copy>
      {mode === "sign-in" && (
        <Copy muted>
          Google sign-in is available in the web app. Native Google sign-in is not
          configured yet.
        </Copy>
      )}
      <Card tint>
        {mode === "identity-review" ? (
          <View style={{ gap: 12 }}>
            <Copy>
              No accounts or care records have been linked. Contact NeuroNest support to
              complete an independent identity review.
            </Copy>
          </View>
        ) : mode === "link-identity" ? (
          <View style={{ gap: 12 }}>
            <Copy>
              Your records will remain attached to the existing account. Nothing is
              linked until you confirm.
            </Copy>
            <Button
              title="Review and link accounts"
              onPress={() => void linkIdentity()}
            />
          </View>
        ) : (
          <Form
            key={`${mode}.${signInMethod}`}
            fields={fields}
            submit={submitTitle}
            onSubmit={submit}
          />
        )}
        {mode === "sign-in" && (
          <View style={{ gap: 8 }}>
            <Button
              quiet
              title="Create account"
              onPress={() => switchMode("sign-up")}
            />
            <Button
              quiet
              title="Forgot password?"
              onPress={() => switchMode("recover")}
            />
            <Button
              quiet
              title={
                signInMethod === "username"
                  ? "Use email to sign in"
                  : "Use username to sign in"
              }
              onPress={() =>
                setSignInMethod((value) =>
                  value === "username" ? "email" : "username",
                )
              }
            />
            {!!verificationEmail && (
              <Button
                quiet
                title="Resend confirmation"
                onPress={() => void resendConfirmation()}
              />
            )}
          </View>
        )}
        {mode !== "sign-in" &&
          mode !== "claim-username" &&
          mode !== "link-identity" &&
          mode !== "identity-review" && (
            <Button
              quiet
              title="Back to sign in"
              onPress={() => switchMode("sign-in")}
            />
          )}
        {(mode === "claim-username" ||
          mode === "link-identity" ||
          mode === "identity-review") && (
          <Button
            quiet
            title="Use a different account"
            onPress={() => void useDifferentAccount()}
          />
        )}
      </Card>
      {!!notice && <Copy>{notice}</Copy>}
      {!!error && <ErrorText>{error}</ErrorText>}
    </View>
  );
}
