/**
 * Responsive-audit harness — development only, never part of a shipped build.
 *
 * Signing in needs Firebase, which a layout audit has no business depending on.
 * This mounts the real Workspace with the real stylesheet and lets the network
 * be stubbed from the test, so every screen renders exactly as it ships.
 */
import { useEffect, useState } from "react";
import ReactDOM from "react-dom/client";
import { LanguageContext } from "./i18n";
import Workspace from "./Workspace";
import type { User } from "./api";
import "./styles.css";

const params = new URLSearchParams(window.location.search);
const role = (params.get("role") || "parent") as User["role"];

// Routing reads window.location, so put the requested destination in the path
// before React mounts. Reloading would hit the SPA fallback, not this harness.
const view = params.get("view") || "today";
const tab = params.get("tab") || "";
history.replaceState(
  {},
  "",
  `/${view}${tab ? `/${tab}` : ""}${window.location.search}`,
);

const user = {
  id: "audit-user",
  email: "audit@example.invalid",
  username: "auditparent",
  display_name: role === "admin" ? "Operations" : "Ananya Nair",
  role,
  language: "en",
} as User;

function Harness() {
  const [lang, setLang] = useState<"en" | "ml">(
    params.get("lang") === "ml" ? "ml" : "en",
  );
  const [theme, setTheme] = useState<"light" | "dark">(
    params.get("theme") === "dark" ? "dark" : "light",
  );
  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
  }, [lang, theme]);
  return (
    <LanguageContext.Provider value={lang}>
      <Workspace
        user={user}
        lang={lang}
        setLang={setLang}
        theme={theme}
        setTheme={setTheme}
        childSelectionRequired={params.get("choose_child") === "1"}
        onChildSelected={() => {}}
        onProfileUpdated={() => {}}
        onSignedOut={() => {}}
      />
    </LanguageContext.Provider>
  );
}

// This page renders the signed-in workspace with no authentication. Vite only
// builds index.html, so it cannot ship today — but that is a build-config detail,
// and this file should refuse to run in a production bundle regardless.
if (!import.meta.env.DEV) {
  document.body.textContent = "The responsive-audit harness is development-only.";
} else {
  ReactDOM.createRoot(document.getElementById("root")!).render(<Harness />);
}
