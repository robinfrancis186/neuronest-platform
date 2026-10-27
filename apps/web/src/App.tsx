import { useCallback, useEffect, useState } from "react";
import { Flower2, Moon, Sun } from "lucide-react";
import { ApiError, api, hasUsername, restoreSession, signOut, type User } from "./api";
import { firebaseAuth } from "./auth";
import { requiresIdentityLinkReview } from "./identity-link";
import {
  LanguageContext,
  preferredLanguage,
  rememberLanguage,
  translate,
  type Language,
} from "./i18n";
import { LanguageSelect } from "./ui/LanguageSelect";
import Login from "./Login";
import Workspace from "./Workspace";

/**
 * Session gate. Everything a signed-in user works with lives in Workspace, which
 * unmounts on sign-out or token expiry and so discards that session's state.
 */
export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [requiresUsernameSetup, setRequiresUsernameSetup] = useState(false);
  const [identityReviewRequired, setIdentityReviewRequired] = useState(false);
  const [childSelectionRequired, setChildSelectionRequired] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState("");
  const [boot, setBoot] = useState(true);
  const [restoreAttempt, setRestoreAttempt] = useState(0);
  const [sessionRecovery, setSessionRecovery] = useState(false);
  const [restoreError, setRestoreError] = useState("");
  const [lang, setLangState] = useState<Language>(() => preferredLanguage());
  const setLang = useCallback((language: Language) => {
    rememberLanguage(language);
    setLangState(language);
  }, []);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const tr = (text: string) => translate(text, lang);
  const login = useCallback((u: User, chooseChild = true) => {
    setRequiresUsernameSetup(false);
    setIdentityReviewRequired(false);
    setVerificationEmail("");
    setChildSelectionRequired(chooseChild && u.role === "parent");
    setSessionRecovery(false);
    setRestoreError("");
    setUser(u);
    setLangState(preferredLanguage(u.language === "ml" ? "ml" : "en"));
  }, []);
  useEffect(() => {
    let active = true;
    const restore = async () => {
      setBoot(true);
      setRestoreError("");
      try {
        // Action links must be handled even when another identity is already saved.
        if (location.pathname === "/auth/callback") return;
        const session = await restoreSession();
        if (session) {
          if (!session.emailVerified) {
            if (active) setVerificationEmail(session.email || "");
            return;
          }
          const identity = await api<User>("me/");
          if (!hasUsername(identity.username)) {
            if (active) setRequiresUsernameSetup(true);
          } else if (active) login(identity, false);
          if (active) setSessionRecovery(false);
        }
      } catch (cause) {
        if (requiresIdentityLinkReview(cause)) {
          await signOut().catch(() => {});
          if (active) {
            setRequiresUsernameSetup(false);
            setIdentityReviewRequired(true);
          }
        } else if (active && firebaseAuth?.currentUser) {
          // Keep the Firebase identity and offer a retry. The API may be briefly
          // unavailable; that is not a user-requested sign-out.
          setSessionRecovery(true);
          setRestoreError(
            cause instanceof ApiError && cause.status === 401
              ? "Your saved sign-in is still here, but the care workspace needs to reconnect."
              : "Your saved sign-in is still here, but the care workspace is temporarily unavailable.",
          );
        }
      } finally {
        if (active) setBoot(false);
      }
    };
    void restore();
    const expired = () => {
      if (!active) return;
      setRequiresUsernameSetup(false);
      setIdentityReviewRequired(false);
      setChildSelectionRequired(false);
      setSessionRecovery(false);
      setRestoreError("");
      setUser(null);
    };
    window.addEventListener("neuronest:expired", expired);
    return () => {
      active = false;
      window.removeEventListener("neuronest:expired", expired);
    };
  }, [login, restoreAttempt]);
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
  }, [theme]);
  if (boot)
    return (
      <div className="loading-screen">
        <Flower2 className="spin" />
        {tr("Opening your nest…")}
      </div>
    );
  if (!user && sessionRecovery)
    return (
      <LanguageContext.Provider value={lang}>
        <main className="session-recovery">
          <section className="session-recovery-card" aria-live="polite">
            <span className="badge">{tr("Your sign-in is saved")}</span>
            <h1>{tr("Let’s reconnect your nest")}</h1>
            <p>
              {tr(restoreError || "The care workspace needs a moment to reconnect.")}
            </p>
            <div className="session-recovery-actions">
              <button
                type="button"
                onClick={() => {
                  setSessionRecovery(false);
                  setRestoreAttempt((value) => value + 1);
                }}
              >
                {tr("Try again")}
              </button>
              <button
                type="button"
                className="text-button"
                onClick={() => {
                  void signOut().finally(() => {
                    setSessionRecovery(false);
                    setRestoreError("");
                    setUser(null);
                  });
                }}
              >
                {tr("Sign out")}
              </button>
            </div>
          </section>
        </main>
      </LanguageContext.Provider>
    );
  if (!user)
    return (
      <LanguageContext.Provider value={lang}>
        <div className="login-controls">
          <button
            className="login-theme icon-button"
            aria-label={tr(theme === "light" ? "Use dark theme" : "Use light theme")}
            aria-pressed={theme === "dark"}
            onClick={() => setTheme((value) => (value === "light" ? "dark" : "light"))}
            title={tr(theme === "light" ? "Use dark theme" : "Use light theme")}
          >
            {theme === "light" ? <Moon size={17} /> : <Sun size={17} />}
          </button>
          <LanguageSelect value={lang} onChange={setLang} />
        </div>
        <Login
          onLogin={login}
          requireUsernameSetup={requiresUsernameSetup}
          identityReviewRequired={identityReviewRequired}
          verificationEmail={verificationEmail}
        />
      </LanguageContext.Provider>
    );
  return (
    <LanguageContext.Provider value={lang}>
      <Workspace
        user={user}
        lang={lang}
        setLang={setLang}
        theme={theme}
        setTheme={setTheme}
        childSelectionRequired={childSelectionRequired}
        onChildSelected={() => setChildSelectionRequired(false)}
        onProfileUpdated={setUser}
        onSignedOut={() => {
          setRequiresUsernameSetup(false);
          setIdentityReviewRequired(false);
          setChildSelectionRequired(false);
          setUser(null);
        }}
      />
    </LanguageContext.Provider>
  );
}
