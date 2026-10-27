import { getApps, initializeApp } from "firebase/app";
import {
  applyActionCode,
  browserLocalPersistence,
  confirmPasswordReset,
  createUserWithEmailAndPassword,
  getAuth,
  GoogleAuthProvider,
  onIdTokenChanged,
  sendEmailVerification,
  sendPasswordResetEmail,
  setPersistence,
  signInWithCustomToken,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut as firebaseSignOut,
  updateProfile,
  type User as FirebaseUser,
} from "firebase/auth";
import { resolveFirebaseConfig } from "./auth-config";
import { isDefinitiveAuthFailure } from "./auth-errors";

const resolved = resolveFirebaseConfig(
  import.meta.env as import("./auth-config").PublicEnvironment,
);

export const authConfigurationError = resolved.error || "";
const firebaseApp = resolved.config
  ? getApps().find((app) => app.name === "neuronest-web") ||
    initializeApp(resolved.config, "neuronest-web")
  : null;
export const firebaseAuth = firebaseApp ? getAuth(firebaseApp) : null;
export type IdentityUser = FirebaseUser;

let accessToken = "";
let persistenceReady: Promise<void> | null = null;
let subscribed = false;

function expireSession() {
  accessToken = "";
  window.dispatchEvent(new Event("neuronest:expired"));
}

function actionCodeSettings() {
  return { url: new URL("/auth/callback", window.location.origin).toString() };
}

/** Keep the identity across reloads and browser restarts until the user signs out. */
export async function prepareAuth() {
  if (!firebaseAuth) return;
  if (!persistenceReady) {
    persistenceReady = setPersistence(firebaseAuth, browserLocalPersistence).then(
      () => {
        if (subscribed) return;
        subscribed = true;
        onIdTokenChanged(firebaseAuth, (user) => {
          if (!user) {
            expireSession();
            return;
          }
          void user
            .getIdToken()
            .then((token) => {
              if (firebaseAuth.currentUser?.uid === user.uid) accessToken = token;
            })
            .catch((error) => {
              // A short network outage must not turn into an account logout. Firebase
              // will emit a null user for revoked/disabled identities instead.
              if (isDefinitiveAuthFailure(error)) expireSession();
            });
        });
      },
    );
  }
  return persistenceReady;
}

function requireAuth() {
  if (!firebaseAuth)
    throw new Error(authConfigurationError || "Secure sign-in is not configured.");
  return firebaseAuth;
}

export async function tokenFor(user: FirebaseUser, forceRefresh = false) {
  try {
    const token = await user.getIdToken(forceRefresh);
    if (firebaseAuth?.currentUser?.uid === user.uid) accessToken = token;
    return token;
  } catch (error) {
    if (isDefinitiveAuthFailure(error)) expireSession();
    throw error;
  }
}

export const bearerToken = () => accessToken;

export async function restoreSession(): Promise<FirebaseUser | null> {
  await prepareAuth();
  if (!firebaseAuth) return null;
  await firebaseAuth.authStateReady();
  const user = firebaseAuth.currentUser;
  if (user) await tokenFor(user);
  return user;
}

/** Ends this persisted browser identity even if the core API is unavailable. */
export async function signOut() {
  accessToken = "";
  if (!firebaseAuth) return;
  await prepareAuth();
  await firebaseSignOut(firebaseAuth);
}

export async function signInWithEmail(email: string, password: string) {
  const auth = requireAuth();
  await prepareAuth();
  const credential = await signInWithEmailAndPassword(auth, email, password);
  await tokenFor(credential.user, true);
  return credential.user;
}

/** Google creates or restores the Firebase identity; core setup still claims a username. */
export async function signInWithGoogle() {
  const auth = requireAuth();
  await prepareAuth();
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  const credential = await signInWithPopup(auth, provider);
  await tokenFor(credential.user, true);
  return credential.user;
}

export async function signInWithFirebaseCustomToken(customToken: string) {
  const auth = requireAuth();
  await prepareAuth();
  const credential = await signInWithCustomToken(auth, customToken);
  await tokenFor(credential.user, true);
  return credential.user;
}

export async function createAccount(email: string, password: string, fullName: string) {
  const auth = requireAuth();
  await prepareAuth();
  const credential = await createUserWithEmailAndPassword(auth, email, password);
  try {
    await updateProfile(credential.user, { displayName: fullName });
  } catch (error) {
    await firebaseSignOut(auth).catch(() => {});
    throw error;
  }
  // The identity already exists: a mail-delivery failure must lead to resend,
  // not another account-creation attempt that fails with email-already-in-use.
  let verificationSent = false;
  try {
    await sendEmailVerification(credential.user, actionCodeSettings());
    verificationSent = true;
  } catch { /* The verification screen offers an authenticated resend. */ }
  return { identity: credential.user, verificationSent };
}

export async function resendVerification(email: string, password: string) {
  const user = await signInWithEmail(email, password);
  try {
    await sendEmailVerification(user, actionCodeSettings());
  } finally {
    await signOut().catch(() => {});
  }
}

export async function sendRecovery(email: string) {
  const auth = requireAuth();
  await prepareAuth();
  await sendPasswordResetEmail(auth, email, actionCodeSettings());
}

export async function verifyEmailAction(code: string) {
  const auth = requireAuth();
  await prepareAuth();
  await applyActionCode(auth, code);
}

export async function completePasswordReset(code: string, password: string) {
  const auth = requireAuth();
  await prepareAuth();
  await confirmPasswordReset(auth, code, password);
}
