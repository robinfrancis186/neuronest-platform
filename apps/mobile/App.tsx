import React, { useEffect, useMemo, useRef, useState } from "react";
import { onIdTokenChanged, signOut } from "firebase/auth";
import {
  ActivityIndicator,
  AppState,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { api, me, onExpired, patch, post, setToken } from "./src/api";
import { Login } from "./src/auth";
import {
  hasUsername,
  isFirebaseIdentityLinkRequired,
  isFirebaseIdentityLinkReviewRequired,
} from "./src/auth-inputs";
import { firebaseAuth } from "./src/firebase";
import { readTheme, saveTheme } from "./src/storage";
import { themeColors, type Theme, type ThemeColors } from "./src/theme";
import { visibleName, type Child, type Language, type User } from "./src/types";
import {
  Badge,
  Button,
  Card,
  Choice,
  Copy,
  ErrorText,
  Form,
  LanguageContext,
  ThemeContext,
} from "./src/ui";
import { translate } from "./src/i18n";
import { setAlertLanguage } from "./src/alerts";
import {
  Appointments,
  Assistant,
  childFields,
  Development,
  Directory,
  FamilyAccess,
  Invitations,
  Library,
  Messages,
  Notifications,
  Overview,
  Preferences,
  Privacy,
  Records,
  Reports,
  Screening,
} from "./src/screens";
const sections: Record<string, string[]> = {
  Today: [],
  Journey: [
    "Observations",
    "Goals",
    "Growth",
    "Vaccinations",
    "Records",
    "Reports",
    "Screening",
    "Therapy",
  ],
  Care: ["Find a professional", "Appointments", "Messages"],
  Library: ["Read & watch", "Resources"],
  Account: ["Family & access", "Notifications", "Preferences", "Privacy"],
};
const symbols: Record<string, string> = {
  Today: "◉",
  Journey: "↗",
  Care: "♡",
  Library: "▤",
  Account: "◎",
};
export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [requiresUsernameSetup, setRequiresUsernameSetup] = useState(false);
  const [requiresIdentityLink, setRequiresIdentityLink] = useState(false);
  const [requiresIdentityReview, setRequiresIdentityReview] = useState(false);
  const [ready, setReady] = useState(false);
  const [children, setChildren] = useState<Child[]>([]);
  const [childrenLoaded, setChildrenLoaded] = useState(false);
  const [childId, setChildId] = useState("");
  const [language, setLanguage] = useState<Language>("en");
  const [theme, setTheme] = useState<Theme>("light");
  const [tab, setTab] = useState("Today");
  const [section, setSection] = useState("");
  const [revision, setRevision] = useState(0);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [assistant, setAssistant] = useState(false);
  const [addChild, setAddChild] = useState(false);
  const [privacyShield, setPrivacyShield] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scroll = useRef<ScrollView>(null);
  const t = (value: string) => translate(language, value);
  const colors = themeColors[theme];
  const app = useMemo(() => createAppStyles(colors), [colors]);
  const child = children.find((c) => c.id === childId);
  const changed = () => {
    setChildrenLoaded(false);
    setRevision((r) => r + 1);
  };
  const notify = (value: string) => {
    setMessage(t(value));
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setMessage(""), 8000);
  };
  const logout = async () => {
    setToken("");
    setUser(null);
    setRequiresUsernameSetup(false);
    setRequiresIdentityLink(false);
    setRequiresIdentityReview(false);
    setChildren([]);
    setChildrenLoaded(false);
    setChildId("");
    setAssistant(false);
    setMessage("");
    setTab("Today");
    setSection("");
    setError("");
    await signOut(firebaseAuth()).catch(() => undefined);
  };
  const toggleTheme = () => {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
    void saveTheme(next).catch(() => undefined);
  };
  useEffect(() => {
    void readTheme()
      .then(setTheme)
      .catch(() => undefined);
  }, []);
  useEffect(() => {
    onExpired(() => {
      void logout();
    });
    let active = true;
    try {
      const unsubscribe = onIdTokenChanged(firebaseAuth(), (firebaseUser) => {
        void (async () => {
          try {
            if (!firebaseUser) {
              setToken("");
              setUser(null);
              setRequiresUsernameSetup(false);
              setRequiresIdentityLink(false);
              // Keep a preceding support-review outcome visible after its forced sign-out.
              setChildren([]);
              setChildrenLoaded(false);
              setChildId("");
              return;
            }
            await firebaseUser.reload();
            if (!firebaseUser.emailVerified) {
              // An unverified Firebase user never receives an API bearer token.
              setToken("");
              setUser(null);
              setRequiresUsernameSetup(false);
              setRequiresIdentityLink(false);
              setRequiresIdentityReview(false);
              return;
            }
            setToken(await firebaseUser.getIdToken());
            const identity = await me();
            if (identity.role !== "parent") {
              setToken("");
              await signOut(firebaseAuth());
              return;
            }
            setLanguage(identity.language || "en");
            if (hasUsername(identity.username)) {
              setRequiresUsernameSetup(false);
              setRequiresIdentityLink(false);
              setRequiresIdentityReview(false);
              setUser(identity);
            } else {
              setRequiresIdentityLink(false);
              setRequiresIdentityReview(false);
              setRequiresUsernameSetup(true);
            }
          } catch (failure) {
            const requiresReview = isFirebaseIdentityLinkReviewRequired(failure);
            setToken("");
            setUser(null);
            setRequiresUsernameSetup(false);
            setRequiresIdentityLink(isFirebaseIdentityLinkRequired(failure));
            setRequiresIdentityReview(requiresReview);
            if (requiresReview) await signOut(firebaseAuth()).catch(() => undefined);
          } finally {
            if (active) setReady(true);
          }
        })();
      });
      return () => {
        active = false;
        unsubscribe();
        if (timer.current) clearTimeout(timer.current);
      };
    } catch {
      setReady(true);
    }
    return () => {
      active = false;
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);
  useEffect(() => {
    setAlertLanguage(language);
  }, [language]);
  useEffect(() => {
    // A child change also changes the assistant's authorized record scope.
    setAssistant(false);
  }, [childId]);
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      setPrivacyShield(state !== "active");
      if (state === "active") changed();
    });
    return () => subscription.remove();
  }, []);
  useEffect(() => {
    if (!user) {
      setChildrenLoaded(false);
      return;
    }
    let active = true;
    setChildrenLoaded(false);
    api<Child[]>("children/")
      .then((data) => {
        if (active) {
          setChildren(data);
          setChildId((current) =>
            data.some((c) => c.id === current) ? current : data[0]?.id || "",
          );
          setError("");
          setChildrenLoaded(true);
        }
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [user?.id, revision]);
  const go = (next: string, detail?: string) => {
    setTab(next);
    setSection(detail || sections[next][0] || "");
    scroll.current?.scrollTo({ y: 0, animated: false });
  };
  const accountProps = user ? { user, revision, changed, notify } : null;
  const props = child && user ? { child, user, revision, changed, notify } : null;
  const firstName = visibleName(user?.display_name).split(/\s+/u)[0] || "";
  const showFirstChildWelcome =
    !!user && childrenLoaded && !children.length && !addChild && tab === "Today";
  return (
    <SafeAreaProvider>
      <ThemeContext.Provider value={theme}>
        <LanguageContext.Provider value={language}>
          <SafeAreaView style={app.safe}>
            <StatusBar
              barStyle={theme === "dark" ? "light-content" : "dark-content"}
              backgroundColor={colors.bg}
            />
            <View style={app.header}>
              <View style={app.brandLockup}>
                <Image
                  source={require("./assets/adaptive-icon.png")}
                  style={app.brandMark}
                  accessible={false}
                />
                <View>
                  <Text style={app.brand}>NeuroNest</Text>
                  <Text style={app.tagline}>{t("Your family, connected.")}</Text>
                </View>
              </View>
              <View style={app.headerActions}>
                <Pressable
                  accessibilityRole="switch"
                  accessibilityLabel={t(
                    theme === "light" ? "Use dark theme" : "Use light theme",
                  )}
                  accessibilityState={{ checked: theme === "dark" }}
                  aria-checked={theme === "dark"}
                  onPress={toggleTheme}
                  style={app.theme}
                >
                  <Text style={app.themeIcon}>{theme === "light" ? "☾" : "☀"}</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t("Change language")}
                  onPress={() => setLanguage((l) => (l === "en" ? "ml" : "en"))}
                  style={app.language}
                >
                  <Text style={{ color: colors.teal, fontWeight: "600" }}>
                    {language === "en" ? "മലയാളം" : "English"}
                  </Text>
                </Pressable>
              </View>
            </View>
            {!ready ? (
              <ActivityIndicator style={{ margin: 60 }} color={colors.teal} />
            ) : (
              <ScrollView
                ref={scroll}
                style={{ flex: 1 }}
                contentContainerStyle={app.content}
                keyboardShouldPersistTaps="handled"
              >
                {!user ? (
                  <Login
                    requireUsernameSetup={requiresUsernameSetup}
                    requireIdentityLink={requiresIdentityLink}
                    requireIdentityReview={requiresIdentityReview}
                    onIdentityLinkCancelled={() => setRequiresIdentityLink(false)}
                    onIdentityReviewCancelled={() => setRequiresIdentityReview(false)}
                    onLogin={(identity) => {
                      setRequiresUsernameSetup(false);
                      setRequiresIdentityLink(false);
                      setRequiresIdentityReview(false);
                      setUser(identity);
                      setLanguage(identity.language || "en");
                      changed();
                    }}
                  />
                ) : (
                  <>
                    <View style={app.greeting}>
                      <Copy muted>
                        {new Date().toLocaleDateString(
                          language === "ml" ? "ml-IN" : "en-IN",
                          {
                            weekday: "long",
                            month: "long",
                            day: "numeric",
                            timeZone: "Asia/Kolkata",
                          },
                        )}
                      </Copy>
                      <Text accessibilityRole="header" style={app.heading}>
                        {tab === "Today"
                          ? language === "ml"
                            ? firstName
                              ? `നമസ്കാരം, ${firstName}.`
                              : "നമസ്കാരം."
                            : firstName
                              ? `Hello, ${firstName}.`
                              : "Hello."
                          : t(tab)}
                      </Text>
                    </View>
                    {accountProps && (tab === "Today" || tab === "Account") && (
                      <Invitations {...accountProps} />
                    )}
                    {children.length > 0 && (
                      <Choice
                        label="Choose a child"
                        value={childId}
                        options={children.map((c) => ({ value: c.id, label: c.name }))}
                        onChange={(id) => {
                          setChildId(id);
                          setAssistant(false);
                          setMessage("");
                        }}
                      />
                    )}
                    {!!error && (
                      <Card>
                        <ErrorText>{error}</ErrorText>
                        <Button title="Retry" onPress={changed} />
                      </Card>
                    )}
                    {!childrenLoaded && !children.length && !error && (
                      <ActivityIndicator />
                    )}
                    {showFirstChildWelcome && (
                      <View style={app.familyWelcome}>
                        <View pointerEvents="none" style={app.familyWelcomeOrb} />
                        <View style={app.familyWelcomeCopy}>
                          <View style={app.familyWelcomeMark}>
                            <Image
                              source={require("./assets/adaptive-icon.png")}
                              style={app.familyWelcomeMarkImage}
                              accessible={false}
                            />
                          </View>
                          <Text style={app.familyWelcomeGreeting}>
                            {language === "ml"
                              ? firstName
                                ? `${firstName}, സ്വാഗതം.`
                                : "സ്വാഗതം."
                              : firstName
                                ? `Welcome, ${firstName}.`
                                : "Welcome."}
                          </Text>
                          <Text
                            accessibilityRole="header"
                            style={app.familyWelcomeTitle}
                          >
                            {t("Let’s make room for your child’s story.")}
                          </Text>
                          <Copy muted style={app.familyWelcomeDescription}>
                            {t(
                              "Start with a profile, then add the moments that feel important. You decide who can see them.",
                            )}
                          </Copy>
                          <View style={app.familyWelcomeActions}>
                            <Pressable
                              accessibilityRole="button"
                              accessibilityLabel={t("Create a child profile")}
                              onPress={() => setAddChild(true)}
                              style={({ pressed }) => [
                                app.familyWelcomePrimary,
                                pressed && app.familyWelcomePrimaryPressed,
                              ]}
                            >
                              <Text style={app.familyWelcomePrimaryText}>
                                {t("Create a child profile")}
                              </Text>
                              <Text style={app.familyWelcomePrimaryIcon}>+</Text>
                            </Pressable>
                            <Pressable
                              accessibilityRole="button"
                              accessibilityLabel={t("Explore the library")}
                              onPress={() => go("Library", "Read & watch")}
                              style={({ pressed }) => [
                                app.familyWelcomeSecondary,
                                pressed && app.familyWelcomeSecondaryPressed,
                              ]}
                            >
                              <Text style={app.familyWelcomeSecondaryText}>
                                {t("Explore the library")}
                              </Text>
                              <Text style={app.familyWelcomeSecondaryIcon}>→</Text>
                            </Pressable>
                          </View>
                        </View>
                        <View
                          accessibilityLabel={t("Your first steps")}
                          style={app.familyWelcomeSteps}
                        >
                          {[
                            [
                              "1",
                              "Add a few basics",
                              "A name, date of birth, and preferred language are enough to begin.",
                            ],
                            [
                              "2",
                              "Notice little moments",
                              "Record a new word, routine, concern, or a moment of connection.",
                            ],
                            [
                              "3",
                              "Bring support together",
                              "Share only when you choose, with the people supporting your family.",
                            ],
                          ].map(([number, title, description]) => (
                            <View key={number} style={app.familyWelcomeStep}>
                              <View style={app.familyWelcomeNumber}>
                                <Text style={app.familyWelcomeNumberText}>
                                  {number}
                                </Text>
                              </View>
                              <View style={app.familyWelcomeStepCopy}>
                                <Text style={app.familyWelcomeStepTitle}>
                                  {t(title)}
                                </Text>
                                <Text style={app.familyWelcomeStepDescription}>
                                  {t(description)}
                                </Text>
                              </View>
                            </View>
                          ))}
                        </View>
                      </View>
                    )}
                    {(addChild ||
                      (!children.length &&
                        !showFirstChildWelcome &&
                        childrenLoaded &&
                        (tab === "Today" ||
                          (tab === "Account" && section === "Family & access")))) && (
                      <Card title="Add a child">
                        <Form
                          fields={childFields}
                          submit="Save"
                          onSubmit={async (value) => {
                            const created = await post<Child>("children/", value);
                            setChildId(created.id);
                            changed();
                            setAddChild(false);
                            notify("Saved.");
                          }}
                        />
                        {children.length > 0 && (
                          <Button
                            quiet
                            title="Close"
                            onPress={() => setAddChild(false)}
                          />
                        )}
                      </Card>
                    )}
                    {sections[tab].length > 0 && (
                      <View style={{ marginVertical: 18 }}>
                        <Choice
                          label={tab}
                          value={section}
                          options={sections[tab].map((s) => ({ value: s, label: s }))}
                          onChange={setSection}
                        />
                      </View>
                    )}
                    {props ? (
                      <View
                        key={`${user.id}:${childId}:${tab}:${section}`}
                        style={{ marginTop: 18 }}
                      >
                        {tab === "Today" && <Overview {...props} go={go} />}
                        {tab === "Journey" &&
                          (section === "Reports" ? (
                            <Reports {...props} />
                          ) : section === "Records" ? (
                            <Records {...props} />
                          ) : section === "Screening" ? (
                            <Screening {...props} />
                          ) : (
                            <Development {...props} section={section} />
                          ))}
                        {tab === "Care" &&
                          (section === "Appointments" ? (
                            <Appointments {...props} />
                          ) : section === "Messages" ? (
                            <Messages {...props} />
                          ) : (
                            <Directory {...props} />
                          ))}
                        {tab === "Account" && (
                          <>
                            {section === "Family & access" && (
                              <>
                                <Card title="Family settings">
                                  <Copy>
                                    {visibleName(user.display_name) ||
                                      t("Your account")}{" "}
                                    · {user.email}
                                  </Copy>
                                  <Copy>
                                    {child?.name} · {child?.date_of_birth}
                                  </Copy>
                                  <Form
                                    key={`${props.child.id}:${revision}`}
                                    fields={childFields.map((field) => ({
                                      ...field,
                                      initial: String(
                                        props.child[field.name as keyof Child] || "",
                                      ),
                                    }))}
                                    submit="Save child details"
                                    onSubmit={async (values) => {
                                      await patch(
                                        `children/${props.child.id}/`,
                                        values,
                                      );
                                      changed();
                                      notify("Saved.");
                                    }}
                                  />
                                  <Button
                                    quiet
                                    title="Add a child"
                                    onPress={() => setAddChild(true)}
                                  />
                                </Card>
                                <FamilyAccess {...props} />
                              </>
                            )}
                          </>
                        )}
                      </View>
                    ) : (
                      childrenLoaded &&
                      !showFirstChildWelcome &&
                      (tab === "Today" || tab === "Journey" || tab === "Care") && (
                        <Copy muted>{t("Select a child to continue.")}</Copy>
                      )
                    )}
                    {tab === "Library" && (
                      <Library revision={revision} section={section} notify={notify} />
                    )}
                    {tab === "Account" && accountProps && (
                      <>
                        {section === "Notifications" && (
                          <Notifications {...accountProps} />
                        )}
                        {section === "Preferences" && (
                          <Preferences
                            language={language}
                            setLanguage={setLanguage}
                            displayName={user.display_name}
                            onDisplayNameChanged={(displayName) =>
                              setUser((current) =>
                                current
                                  ? { ...current, display_name: displayName }
                                  : current,
                              )
                            }
                            notify={notify}
                          />
                        )}
                        {section === "Privacy" && (
                          <Privacy {...accountProps} child={child} />
                        )}
                        <Button quiet title="Sign out" onPress={() => void logout()} />
                      </>
                    )}
                  </>
                )}
              </ScrollView>
            )}
            {!!message && (
              <View
                style={app.toast}
                accessibilityRole="alert"
                accessibilityLiveRegion="polite"
              >
                <Copy style={{ color: "#FFFFFF" }}>{message}</Copy>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t("Dismiss notification")}
                  hitSlop={12}
                  onPress={() => setMessage("")}
                >
                  <Text style={{ color: "#FFFFFF", fontSize: 23 }}>×</Text>
                </Pressable>
              </View>
            )}
            {props && (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t("Open Nest assistant")}
                accessibilityHint={t("Ask a question about your child's care")}
                onPress={() => setAssistant(true)}
                style={({ pressed }) => [
                  app.assistantLauncher,
                  pressed && app.assistantLauncherPressed,
                ]}
              >
                <Text style={app.assistantLauncherIcon}>✦</Text>
                <Text style={app.assistantLauncherText}>{t("Nest Assistant")}</Text>
              </Pressable>
            )}
            {user && (
              <View style={app.tabs}>
                {Object.keys(sections).map((item) => (
                  <Pressable
                    key={item}
                    accessibilityRole="tab"
                    accessibilityState={{ selected: tab === item }}
                    aria-selected={tab === item}
                    accessibilityLabel={t(item)}
                    onPress={() => go(item)}
                    style={[app.tab, tab === item && app.tabActive]}
                  >
                    <Text
                      style={[app.tabSymbol, tab === item && { color: colors.teal }]}
                    >
                      {symbols[item]}
                    </Text>
                    <Text
                      style={[
                        app.tabLabel,
                        tab === item && { color: colors.teal, fontWeight: "700" },
                      ]}
                    >
                      {t(item)}
                    </Text>
                  </Pressable>
                ))}
              </View>
            )}
            <Modal
              visible={assistant && !!props}
              onRequestClose={() => setAssistant(false)}
              animationType="slide"
              presentationStyle="pageSheet"
            >
              <SafeAreaView style={app.safe}>
                <View style={app.assistantHeader}>
                  <View style={app.assistantHeaderBrand}>
                    <Image
                      source={require("./assets/adaptive-icon.png")}
                      style={app.assistantHeaderMark}
                      accessible={false}
                    />
                    <Text accessibilityRole="header" style={app.assistantHeaderTitle}>
                      {t("Nest Assistant")}
                    </Text>
                  </View>
                  <Button quiet title="Close" onPress={() => setAssistant(false)} />
                </View>
                <ScrollView
                  contentContainerStyle={app.content}
                  keyboardShouldPersistTaps="handled"
                >
                  {props && (
                    <Assistant
                      key={`${childId}:${language}`}
                      {...props}
                      language={language}
                    />
                  )}
                </ScrollView>
              </SafeAreaView>
            </Modal>
            {privacyShield && (
              <View style={app.shield}>
                <Text style={app.brand}>NeuroNest</Text>
              </View>
            )}
          </SafeAreaView>
        </LanguageContext.Provider>
      </ThemeContext.Provider>
    </SafeAreaProvider>
  );
}
const createAppStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.bg },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 22,
      paddingVertical: 17,
      borderBottomWidth: 1,
      borderColor: colors.line,
    },
    brandLockup: { flexDirection: "row", alignItems: "center", gap: 8 },
    brandMark: { width: 34, height: 34, resizeMode: "contain" },
    brand: { fontSize: 29, fontWeight: "700", color: colors.ink, letterSpacing: -1.2 },
    tagline: { fontSize: 12, color: colors.muted, marginTop: 3 },
    language: {
      paddingVertical: 12,
      paddingHorizontal: 13,
      borderRadius: 16,
      backgroundColor: colors.pale,
    },
    headerActions: { flexDirection: "row", alignItems: "center", gap: 8 },
    theme: {
      minWidth: 48,
      minHeight: 48,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 16,
      backgroundColor: colors.pale,
    },
    themeIcon: { color: colors.teal, fontSize: 22, fontWeight: "600" },
    content: {
      width: "100%",
      maxWidth: 780,
      alignSelf: "center",
      padding: 20,
      paddingBottom: 30,
    },
    greeting: { marginBottom: 22, gap: 8 },
    heading: {
      fontSize: 34,
      lineHeight: 44,
      color: colors.ink,
      fontWeight: "600",
      letterSpacing: -1,
    },
    familyWelcome: {
      position: "relative",
      overflow: "hidden",
      gap: 22,
      borderWidth: 1,
      borderColor: colors.line,
      borderRadius: 24,
      padding: 24,
      backgroundColor: colors.pale,
      shadowColor: "#102A28",
      shadowOpacity: 0.08,
      shadowRadius: 18,
      shadowOffset: { width: 0, height: 8 },
      elevation: 2,
    },
    familyWelcomeOrb: {
      position: "absolute",
      width: 250,
      height: 250,
      borderRadius: 125,
      right: -142,
      top: -122,
      backgroundColor: colors.paper,
      opacity: 0.62,
    },
    familyWelcomeCopy: { gap: 10, zIndex: 1 },
    familyWelcomeMark: {
      width: 46,
      height: 46,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.line,
      backgroundColor: colors.paper,
      marginBottom: 6,
    },
    familyWelcomeMarkImage: { width: 32, height: 32, resizeMode: "contain" },
    familyWelcomeGreeting: { color: colors.teal, fontSize: 15, fontWeight: "700" },
    familyWelcomeTitle: {
      maxWidth: 330,
      color: colors.ink,
      fontSize: 31,
      lineHeight: 38,
      fontWeight: "700",
      letterSpacing: -1.1,
    },
    familyWelcomeDescription: { maxWidth: 340, fontSize: 15, lineHeight: 24 },
    familyWelcomeActions: { gap: 12, marginTop: 8 },
    familyWelcomePrimary: {
      minHeight: 54,
      paddingHorizontal: 18,
      borderRadius: 16,
      flexDirection: "row",
      justifyContent: "center",
      alignItems: "center",
      gap: 10,
      backgroundColor: colors.teal,
    },
    familyWelcomePrimaryPressed: { opacity: 0.82, transform: [{ scale: 0.99 }] },
    familyWelcomePrimaryText: { color: "#FFFFFF", fontSize: 16, fontWeight: "700" },
    familyWelcomePrimaryIcon: { color: "#FFFFFF", fontSize: 23, lineHeight: 24 },
    familyWelcomeSecondary: {
      minHeight: 46,
      alignSelf: "flex-start",
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      paddingHorizontal: 4,
    },
    familyWelcomeSecondaryPressed: { opacity: 0.6 },
    familyWelcomeSecondaryText: { color: colors.teal, fontSize: 15, fontWeight: "700" },
    familyWelcomeSecondaryIcon: { color: colors.teal, fontSize: 19, fontWeight: "700" },
    familyWelcomeSteps: { gap: 10, zIndex: 1 },
    familyWelcomeStep: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 12,
      borderWidth: 1,
      borderColor: colors.line,
      borderRadius: 16,
      padding: 14,
      backgroundColor: colors.paper,
    },
    familyWelcomeNumber: {
      width: 27,
      height: 27,
      borderRadius: 14,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.input,
    },
    familyWelcomeNumberText: { color: colors.teal, fontSize: 13, fontWeight: "800" },
    familyWelcomeStepCopy: { flex: 1, gap: 3 },
    familyWelcomeStepTitle: {
      color: colors.ink,
      fontSize: 15,
      lineHeight: 20,
      fontWeight: "700",
    },
    familyWelcomeStepDescription: {
      color: colors.muted,
      fontSize: 13,
      lineHeight: 18,
    },
    tabs: {
      flexDirection: "row",
      backgroundColor: colors.paper,
      borderTopWidth: 1,
      borderColor: colors.line,
      padding: 7,
      gap: 2,
    },
    tab: {
      flex: 1,
      minHeight: 62,
      alignItems: "center",
      justifyContent: "center",
      gap: 5,
      borderRadius: 14,
    },
    tabActive: { backgroundColor: colors.pale },
    tabSymbol: { color: colors.muted, fontSize: 24 },
    tabLabel: { color: colors.muted, fontSize: 12 },
    assistantLauncher: {
      position: "absolute",
      right: 20,
      bottom: 92,
      minHeight: 52,
      paddingHorizontal: 18,
      borderRadius: 26,
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      backgroundColor: colors.teal,
      shadowColor: "#102A28",
      shadowOpacity: 0.22,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 6 },
      elevation: 8,
      zIndex: 2,
    },
    assistantLauncherPressed: { opacity: 0.82 },
    assistantLauncherIcon: { color: "#FFFFFF", fontSize: 18, fontWeight: "700" },
    assistantLauncherText: { color: "#FFFFFF", fontSize: 15, fontWeight: "700" },
    assistantHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      padding: 16,
      borderBottomWidth: 1,
      borderColor: colors.line,
    },
    assistantHeaderBrand: { flexDirection: "row", alignItems: "center", gap: 10 },
    assistantHeaderMark: { width: 32, height: 32, resizeMode: "contain" },
    assistantHeaderTitle: { color: colors.ink, fontSize: 20, fontWeight: "700" },
    toast: {
      backgroundColor: colors.toast,
      marginHorizontal: 14,
      marginBottom: 10,
      borderRadius: 16,
      padding: 14,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 10,
    },
    shield: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: colors.bg,
      alignItems: "center",
      justifyContent: "center",
    },
  });
