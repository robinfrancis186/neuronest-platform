import { useEffect, useRef, useState } from "react";
import { ArrowRight, KeyRound, MailCheck, ShieldCheck } from "lucide-react";
import {
  completePasswordReset,
  createAccount,
  resendVerification,
  sendRecovery,
  signInWithEmail,
  signInWithFirebaseCustomToken,
  signInWithGoogle,
  signOut,
  tokenFor,
  verifyEmailAction,
  type IdentityUser,
} from "./auth";
import { fallbackForDefaultFirebaseAction } from "./auth-callback";
import { googleSignInFailureMessage, isGenericRecoveryOutcome } from "./auth-errors";
import {
  api,
  claimUsername,
  configurationError,
  hasUsername,
  signInWithUsername,
  type User,
} from "./api";
import {
  IDENTITY_LINK_REVIEW_NOTICE,
  requiresIdentityLinkReview,
} from "./identity-link";
import { useTranslation } from "./i18n";

type AuthMode =
  | "sign-in"
  | "sign-up"
  | "verify"
  | "recover"
  | "reset-password"
  | "claim-username";
type SignInMethod = "username" | "email";
type PendingProfile = { uid: string; fullName: string; username: string };

const MINIMUM_PASSWORD_LENGTH = 12;
const USERNAME_PATTERN = /^[A-Za-z][A-Za-z0-9._-]{2,29}$/;
const PENDING_PROFILE_KEY = "neuronest:pending-profile";

function pendingProfile(uid: string): PendingProfile | null {
  try {
    const value = JSON.parse(sessionStorage.getItem(PENDING_PROFILE_KEY) || "null");
    if (
      value &&
      value.uid === uid &&
      typeof value.fullName === "string" &&
      typeof value.username === "string"
    )
      return value;
  } catch {
    // A malformed local onboarding hint must never block a verified account.
  }
  return null;
}

function savePendingProfile(profile: PendingProfile) {
  try {
    sessionStorage.setItem(PENDING_PROFILE_KEY, JSON.stringify(profile));
  } catch {
    // The account can still complete the server-owned username claim manually.
  }
}

function clearPendingProfile() {
  try {
    sessionStorage.removeItem(PENDING_PROFILE_KEY);
  } catch {
    // Nothing to clear when session storage is unavailable.
  }
}

function messageFor(error: unknown, fallback: string) {
  const text = error instanceof Error ? error.message : "";
  if (
    /invalid login credentials|invalid credentials|invalid-credential|wrong-password|user-not-found/i.test(
      text,
    )
  )
    return "We couldn’t sign you in with those details.";
  if (/email-already-in-use/i.test(text))
    return "An account already uses this email. Sign in or reset its password.";
  if (/expired-action-code|invalid-action-code/i.test(text))
    return "That secure link is invalid or expired. Request a new one.";
  if (/rate limit|too many requests/i.test(text))
    return "Please wait a moment before trying again.";
  return fallback;
}

export default function Login({
  onLogin,
  requireUsernameSetup = false,
  identityReviewRequired = false,
  verificationEmail = "",
}: {
  onLogin: (user: User) => void;
  requireUsernameSetup?: boolean;
  identityReviewRequired?: boolean;
  verificationEmail?: string;
}) {
  const tr = useTranslation();
  const callbackStarted = useRef(false);
  const [mode, setMode] = useState<AuthMode>("sign-in");
  const [signInMethod, setSignInMethod] = useState<SignInMethod>("username");
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [resetCode, setResetCode] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!verificationEmail) return;
    setEmail(verificationEmail);
    setMode("verify");
  }, [verificationEmail]);

  const completeSession = async (identity: IdentityUser) => {
    if (!identity.emailVerified) {
      const verifiedEmail =
        identity.email?.trim().toLowerCase() || email.trim().toLowerCase();
      await signOut().catch(() => {});
      setEmail(verifiedEmail);
      setPassword("");
      setConfirmPassword("");
      setMode("verify");
      setNotice(
        "Your email still needs verification. Open the link we sent you, or enter your password below to send a fresh link.",
      );
      return;
    }
    await tokenFor(identity, true);
    try {
      const user = await api<User>("me/");
      if (!hasUsername(user.username)) {
        const pending = pendingProfile(identity.uid);
        setFullName(
          pending?.fullName ||
            identity.displayName?.trim() ||
            (user.display_name.includes("@") ? "" : user.display_name),
        );
        setUsername(pending?.username || "");
        setPassword("");
        setConfirmPassword("");
        setMode("claim-username");
        setNotice("Finish setting up your account after verifying your email.");
        if (pending) {
          try {
            const completed = await claimUsername(pending.username, pending.fullName);
            clearPendingProfile();
            onLogin(completed);
          } catch (cause) {
            setError(messageFor(cause, "We couldn’t save your username. Choose another or try again."));
          }
        }
        return;
      }
      clearPendingProfile();
      onLogin(user);
    } catch (cause) {
      if (requiresIdentityLinkReview(cause)) {
        await signOut().catch(() => {});
        setMode("sign-in");
        setSignInMethod("email");
        setPassword("");
        setConfirmPassword("");
        setError("");
        setNotice(IDENTITY_LINK_REVIEW_NOTICE);
        return;
      }
      await signOut().catch(() => {});
      setError(
        messageFor(cause, "We couldn’t open your care workspace. Please try again."),
      );
    }
  };

  useEffect(() => {
    if (!requireUsernameSetup) return;
    setMode("claim-username");
    setNotice("Finish setting up your account after verifying your email.");
  }, [requireUsernameSetup]);

  useEffect(() => {
    if (!identityReviewRequired) return;
    setMode("sign-in");
    setSignInMethod("email");
    setPassword("");
    setConfirmPassword("");
    setError("");
    setNotice(IDENTITY_LINK_REVIEW_NOTICE);
  }, [identityReviewRequired]);

  useEffect(() => {
    if (location.pathname !== "/auth/callback" || callbackStarted.current) return;
    callbackStarted.current = true;
    const finishAction = async () => {
      setBusy(true);
      setError("");
      try {
        const parameters = new URLSearchParams(location.search);
        const action = parameters.get("mode");
        const code = parameters.get("oobCode");
        if (!code) {
          const fallback = fallbackForDefaultFirebaseAction();
          history.replaceState({}, "", "/");
          setMode(fallback.mode);
          setSignInMethod(fallback.signInMethod);
          setNotice(fallback.notice);
          return;
        }
        if (action === "verifyEmail") {
          await verifyEmailAction(code);
          history.replaceState({}, "", "/");
          setMode("sign-in");
          setSignInMethod("email");
          setNotice("Your email is verified. Sign in with your email to finish setup.");
          return;
        }
        if (action === "resetPassword") {
          history.replaceState({}, "", "/auth/callback?mode=resetPassword");
          setResetCode(code);
          setMode("reset-password");
          setNotice("Choose a new password to finish recovering your account.");
          return;
        }
        throw new Error("unsupported action");
      } catch (cause) {
        setError(
            messageFor(
              cause,
              "That secure link is invalid, expired, or was opened in a different browser or device. Request a new link.",
            ),
          );
      } finally {
        setBusy(false);
      }
    };
    void finishAction();
  }, []);

  const switchMode = (next: AuthMode) => {
    setMode(next);
    setError("");
    setNotice("");
    setPassword("");
    setConfirmPassword("");
    setResetCode("");
    if (next !== "sign-up" && next !== "claim-username") setFullName("");
    if (next !== "sign-up" && next !== "claim-username") setUsername("");
    if (next !== "sign-in") setSignInMethod("username");
    if (location.pathname === "/auth/callback") history.replaceState({}, "", "/");
  };

  const useDifferentAccount = async () => {
    setBusy(true);
    setError("");
    try {
      await signOut();
      clearPendingProfile();
      switchMode("sign-in");
    } catch (cause) {
      setError(messageFor(cause, "We couldn’t sign out. Please try again."));
    } finally {
      setBusy(false);
    }
  };

  const continueWithGoogle = async () => {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const identity = await signInWithGoogle();
      if (!identity.emailVerified) {
        await signOut().catch(() => {});
        setError("Google did not provide a verified email for this account.");
        return;
      }
      await completeSession(identity);
    } catch (cause) {
      const message = googleSignInFailureMessage(cause);
      if (message) setError(messageFor(cause, message));
    } finally {
      setBusy(false);
    }
  };

  const validPassword = () => {
    if (password.length < MINIMUM_PASSWORD_LENGTH) {
      setError("Password must be at least 12 characters.");
      return false;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return false;
    }
    return true;
  };

  const validProfile = () => {
    const normalizedFullName = fullName.trim().replace(/\s+/gu, " ");
    if (!normalizedFullName) {
      setError("Enter your full name.");
      return null;
    }
    if (!USERNAME_PATTERN.test(username.trim())) {
      setError(
        "Use 3–30 letters or numbers, starting with a letter. You may also use . _ or -.",
      );
      return null;
    }
    return { fullName: normalizedFullName, username: username.trim() };
  };

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    try {
      if (mode === "claim-username") {
        const profile = validProfile();
        if (!profile) return;
        onLogin(await claimUsername(profile.username, profile.fullName));
        clearPendingProfile();
        return;
      }
      if (mode === "sign-in") {
        const identity =
          signInMethod === "email" || username.includes("@")
            ? await signInWithEmail((signInMethod === "email" ? email : username).trim().toLowerCase(), password)
            : await signInWithFirebaseCustomToken(
                await signInWithUsername(username, password),
              );
        await completeSession(identity);
        return;
      }
      if (mode === "sign-up") {
        const profile = validProfile();
        if (!profile || !validPassword()) return;
        const { identity, verificationSent } = await createAccount(
          email.trim().toLowerCase(),
          password,
          profile.fullName,
        );
        savePendingProfile({ uid: identity.uid, ...profile });
        await signOut();
        setMode("verify");
        setNotice(verificationSent
          ? "Check your email to verify it and finish setting up your account."
          : "Your account was created, but the verification email could not be sent. Use the resend button below.");
        return;
      }
      if (mode === "verify") {
        await completeSession(await signInWithEmail(email.trim().toLowerCase(), password));
        return;
      }
      if (mode === "recover") {
        try {
          await sendRecovery(email.trim().toLowerCase());
        } catch (cause) {
          if (!isGenericRecoveryOutcome(cause)) throw cause;
        }
        setNotice("If an account uses this email, a recovery link has been sent.");
        return;
      }
      if (!validPassword()) return;
      if (!resetCode) throw new Error("missing action code");
      await completePasswordReset(resetCode, password);
      history.replaceState({}, "", "/");
      setMode("sign-in");
      setSignInMethod("email");
      setPassword("");
      setConfirmPassword("");
      setResetCode("");
      setNotice("Your password has been updated. Sign in to continue.");
    } catch (cause) {
      setError(
        messageFor(cause, "We couldn’t complete that request. Please try again."),
      );
    } finally {
      setBusy(false);
    }
  };

  const title =
    mode === "sign-up"
      ? tr("Create your family account")
      : mode === "verify"
        ? tr("Verify your email")
        : mode === "recover"
          ? tr("Reset your password")
          : mode === "reset-password"
            ? tr("Set a new password")
            : mode === "claim-username"
              ? tr("Finish setting up your account")
              : tr("Welcome to your nest.");
  const description =
    mode === "sign-up"
      ? tr(
          "Choose your name, username, recovery email, and password. We’ll verify your email before opening your care space.",
        )
      : mode === "verify"
        ? tr(
            "Open the link in your email, then return here and continue with your password.",
          )
        : mode === "recover"
          ? tr("We’ll email a secure link to reset your password.")
          : mode === "reset-password"
            ? tr("Choose a new password with at least 12 characters.")
            : mode === "claim-username"
              ? tr(
                  "Choose your name and username. Your verified email remains available for recovery.",
                )
              : signInMethod === "email"
                ? tr("Use your account email to sign in.")
                : tr(
                    "Sign in with your username or email address.",
                  );
  const submitLabel =
    mode === "sign-up"
      ? tr("Create account")
      : mode === "verify"
        ? tr("I’ve verified my email — continue")
        : mode === "recover"
          ? tr("Send recovery link")
          : mode === "reset-password"
            ? tr("Update password")
            : mode === "claim-username"
              ? tr("Finish setup")
              : tr("Sign in");
  const requiresFullName = ["sign-up", "claim-username"].includes(mode);
  const requiresPassword = ["sign-in", "sign-up", "verify", "reset-password"].includes(
    mode,
  );
  const requiresConfirmation = ["sign-up", "reset-password"].includes(mode);
  const requiresUsername =
    mode === "sign-up" ||
    mode === "claim-username" ||
    (mode === "sign-in" && signInMethod === "username");
  const requiresEmail =
    ["sign-up", "verify", "recover"].includes(mode) ||
    (mode === "sign-in" && signInMethod === "email");
  const googleProvider = (
    <div className="auth-provider">
      {mode === "sign-in" && <span>{tr("or")}</span>}
      <button
        className="secondary wide"
        type="button"
        disabled={busy}
        onClick={() => void continueWithGoogle()}
      >
        {tr("Continue with Google")}
      </button>
    </div>
  );

  return (
    <div className="login-page">
      <div className="login-story">
        <a className="login-story-brand" href="/">
          <img
            src="/brand/neuronest-wordmark.png"
            width={1046}
            height={223}
            alt="NeuroNest"
          />
        </a>
        <div className="login-story-content">
          <span className="eyebrow">
            {tr("A LITTLE SUPPORT. A WORLD OF POSSIBILITY.")}
          </span>
          <h1>
            {tr("Every mind blooms")}
            <br />
            {tr("in its own time.")}
          </h1>
          <img className="login-family-art" src="/brand/family-reading-v2.png"
            width={1536} height={1024} alt="" />
        </div>
        <div className="login-footer">
          <ShieldCheck size={18} />
          {tr("Your family. Your records. Your choice.")}
        </div>
      </div>
      <main className="login-panel">
        <h2>{title}</h2>
        <p className="muted">{description}</p>
        {!configurationError && mode === "sign-up" && googleProvider}
        {["sign-up", "verify"].includes(mode) && (
          <p className="auth-link-guidance">
            {tr(
              "For your security, open the email link in this same browser and device.",
            )}
          </p>
        )}
        {configurationError ? (
          <p className="auth-notice" role="alert">
            {tr(configurationError)}
          </p>
        ) : (
          <form className="auth-form" onSubmit={submit}>
            {requiresFullName && (
              <label className="auth-field">
                <span>{tr("Full name")}</span>
                <input
                  type="text"
                  autoComplete="name"
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                  maxLength={160}
                  required
                  disabled={busy}
                />
              </label>
            )}
            {requiresUsername && (
              <label className="auth-field">
                <span>{tr(mode === "sign-in" ? "Username or email" : "Username")}</span>
                <input
                  type="text"
                  autoComplete="username"
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  minLength={mode === "sign-in" ? undefined : 3}
                  maxLength={mode === "sign-in" ? 254 : 30}
                  pattern={mode === "sign-in" ? undefined : "[A-Za-z][A-Za-z0-9._-]{2,29}"}
                  autoCapitalize="none"
                  spellCheck={false}
                  title={tr(
                    "Use 3–30 letters or numbers, starting with a letter. You may also use . _ or -.",
                  )}
                  required
                  disabled={busy}
                />
              </label>
            )}
            {requiresEmail && (
              <label className="auth-field">
                <span>{tr("Email address")}</span>
                <input
                  type="email"
                  autoComplete="email"
                  inputMode="email"
                  autoCapitalize="none"
                  spellCheck={false}
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                  disabled={busy}
                />
              </label>
            )}
            {requiresPassword && (
              <label className="auth-field">
                <span>
                  {tr(
                    mode === "sign-in" || mode === "verify"
                      ? "Password"
                      : "New password",
                  )}
                </span>
                <input
                  type="password"
                  autoComplete={
                    mode === "sign-in" || mode === "verify"
                      ? "current-password"
                      : "new-password"
                  }
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  minLength={
                    mode === "sign-in" || mode === "verify"
                      ? undefined
                      : MINIMUM_PASSWORD_LENGTH
                  }
                  required
                  disabled={busy}
                />
                {mode !== "sign-in" && mode !== "verify" && (
                  <small>{tr("Use at least 12 characters.")}</small>
                )}
              </label>
            )}
            {requiresConfirmation && (
              <label className="auth-field">
                <span>{tr("Confirm password")}</span>
                <input
                  type="password"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  minLength={MINIMUM_PASSWORD_LENGTH}
                  required
                  disabled={busy}
                />
              </label>
            )}
            {notice && (
              <p className="auth-notice" role="status">
                <MailCheck size={17} aria-hidden="true" />
                {tr(notice)}
              </p>
            )}
            {error && (
              <p className="error" role="alert">
                {tr(error)}
              </p>
            )}
            <button className="wide" disabled={busy}>
              {busy ? tr("Please wait…") : submitLabel}
              {mode === "recover" || mode === "verify" ? (
                <MailCheck size={17} />
              ) : mode === "reset-password" ? (
                <KeyRound size={17} />
              ) : (
                <ArrowRight size={17} />
              )}
            </button>
          </form>
        )}
        {!configurationError && mode === "sign-in" && googleProvider}
        {!configurationError && mode === "verify" && <button className="text-button auth-back" type="button" disabled={busy} onClick={async () => {
          if (!email.trim() || !password) {
            setError("Enter your email and password to resend the verification link.");
            return;
          }
          setBusy(true); setError(""); setNotice("");
          try {
            await resendVerification(email.trim().toLowerCase(), password);
            setNotice("A fresh verification email has been sent.");
          } catch (cause) {
            setError(messageFor(cause, "We couldn’t send the verification email. Please try again."));
          } finally { setBusy(false); }
        }}>{tr("Send verification email again")}</button>}
        {!configurationError && mode === "sign-in" && (
          <>
            <div className="auth-links">
              <button
                className="text-button"
                type="button"
                onClick={() => switchMode("recover")}
              >
                {tr("Forgot password?")}
              </button>
              <button
                className="text-button"
                type="button"
                onClick={() => switchMode("sign-up")}
              >
                {tr("Create an account")}
              </button>
            </div>
            <button
              className="text-button auth-back"
              type="button"
              onClick={() =>
                setSignInMethod((value) =>
                  value === "username" ? "email" : "username",
                )
              }
            >
              {tr(
                signInMethod === "username"
                  ? "Use email to sign in"
                  : "Use username to sign in",
              )}
            </button>
          </>
        )}
        {!configurationError &&
          ["sign-up", "verify", "recover", "reset-password"].includes(mode) && (
            <button
              className="text-button auth-back"
              type="button"
              onClick={() => { switchMode("sign-in"); setSignInMethod("email"); }}
            >
              {tr("Back to sign in")}
            </button>
          )}
        {!configurationError && mode === "claim-username" && (
          <button
            className="text-button auth-back"
            type="button"
            onClick={() => void useDifferentAccount()}
          >
            {tr("Use a different account")}
          </button>
        )}
      </main>
    </div>
  );
}
