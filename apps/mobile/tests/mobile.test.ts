import assert from "node:assert/strict";
import test from "node:test";
import { createRequire } from "node:module";
import { replayDrafts, validateObservation, validDate } from "../src/draft-queue";
import { translate } from "../src/i18n";
import {
  expoPushToken,
  PUSH_DISABLED,
  PUSH_ENROLLMENT_RETRY,
  pushEnrollmentError,
} from "../src/push-token";
import { themeColors, themeFromStoredValue } from "../src/theme";
import { observationTrend, rowsInTimeframe } from "../src/reports";
import { indiaDateKey, indiaTimeLabel, visibleName } from "../src/types";
import type { Draft } from "../src/types";
const payload = {
  child: "child-a",
  title: "Shared a toy",
  domain: "social",
  status: "observed",
  note: "With a sibling",
  observed_on: "2026-09-07",
};
const draft = (id: string, owner = "parent-a"): Draft => ({
  id,
  owner,
  payload,
  created_at: "2026-09-07T09:00:00Z",
});
test("offline replay rejects another owner before sending", async () => {
  let sent = false;
  await assert.rejects(
    replayDrafts(
      "parent-a",
      [draft("1", "parent-b")],
      async () => {
        sent = true;
      },
      async () => {},
    ),
    /another account/,
  );
  assert.equal(sent, false);
});
test("failed replay preserves rejected and later entries but removes acknowledgements", async () => {
  const sent: string[] = [],
    removed: string[] = [];
  await assert.rejects(
    replayDrafts(
      "parent-a",
      [draft("1"), draft("2"), draft("3")],
      async (d) => {
        sent.push(d.id);
        if (d.id === "2") throw new Error("revoked");
      },
      async (id) => {
        removed.push(id);
      },
    ),
    /revoked/,
  );
  assert.deepEqual(sent, ["1", "2"]);
  assert.deepEqual(removed, ["1"]);
});
test("observation validation prevents missing identity and invalid status/date", () => {
  assert.deepEqual(validateObservation(payload, "child-a"), payload);
  assert.throws(() => validateObservation(payload, ""));
  assert.throws(() =>
    validateObservation({ ...payload, status: "diagnosed" }, "child-a"),
  );
  assert.throws(() =>
    validateObservation({ ...payload, observed_on: "invalid" }, "child-a"),
  );
});
test("main family navigation is translated into Malayalam", () => {
  for (const key of [
    "Today",
    "Journey",
    "Care",
    "Library",
    "Account",
    "Records",
    "Reports",
    "Save",
    "Google sign-in is available in the web app. Native Google sign-in is not configured yet.",
  ])
    assert.notEqual(translate("ml", key), key);
});

test("dates reject calendar rollover and accept leap years", () => {
  assert.equal(validDate("2024-02-29"), true);
  for (const value of ["2025-02-29", "2026-04-31", "2026-13-01", "2026-1-01"])
    assert.equal(validDate(value), false);
});
test("greetings omit email-shaped display names", () => {
  assert.equal(visibleName("  Asha Nair "), "Asha Nair");
  assert.equal(visibleName("parent@example.test"), "");
});
test("report timeframes and trends use only recorded observation dates", () => {
  const rows = [
    { id: "today", observed_on: "2026-09-09" },
    { id: "five-days", observed_on: "2026-09-04" },
    { id: "eight-days", observed_on: "2026-09-01" },
  ];
  const now = new Date("2026-09-09T12:00:00");
  assert.deepEqual(
    rowsInTimeframe(rows, ["observed_on"], 7, now).map((row) => row.id),
    ["today", "five-days"],
  );
  assert.deepEqual(observationTrend(rows, 7, now), [0, 1, 0, 1]);
});
test("theme storage defaults to light and recognizes dark", () => {
  assert.equal(themeFromStoredValue(null), "light");
  assert.equal(themeFromStoredValue("anything else"), "light");
  assert.equal(themeFromStoredValue("dark"), "dark");
  assert.notEqual(themeColors.light.bg, themeColors.dark.bg);
});

test("push enrollment keeps only a bounded token and hides native failures", () => {
  assert.equal(
    expoPushToken("ExponentPushToken[test-device]"),
    "ExponentPushToken[test-device]",
  );
  assert.equal(
    expoPushToken(" ExpoPushToken[test-device] "),
    "ExpoPushToken[test-device]",
  );
  for (const value of ["", " ", "x".repeat(256), null])
    assert.throws(() => expoPushToken(value), new RegExp(PUSH_ENROLLMENT_RETRY));
  assert.equal(pushEnrollmentError(new Error(PUSH_DISABLED)).message, PUSH_DISABLED);
  assert.equal(
    pushEnrollmentError(new Error("FCM registration failed: internal details")).message,
    PUSH_ENROLLMENT_RETRY,
  );
});
test("account credentials reject weak passwords", async () => {
  const {
    emailValue,
    fullNameValue,
    hasUsername,
    isFirebaseIdentityLinkRequired,
    isFirebaseIdentityLinkReviewRequired,
    passwordValue,
    passwordRecoveryFailureMessage,
    usernameValue,
  } = await import("../src/auth-inputs");
  assert.equal(emailValue(" Parent@Example.com "), "parent@example.com");
  assert.throws(() => emailValue("not-an-email"), /valid email/i);
  assert.throws(() => passwordValue("short"), /12 characters/i);
  assert.equal(fullNameValue("  Anu   Joseph "), "Anu Joseph");
  assert.equal(fullNameValue("റോബിൻ ഫ്രാൻസിസ്"), "റോബിൻ ഫ്രാൻസിസ്");
  assert.throws(() => fullNameValue(" "), /name/i);
  assert.throws(() => fullNameValue("a".repeat(161)), /160 characters/i);
  assert.equal(usernameValue(" Asha.Nair "), "asha.nair");
  assert.equal(hasUsername("asha.nair"), true);
  assert.equal(
    isFirebaseIdentityLinkRequired({
      status: 409,
      code: "firebase_identity_link_required",
    }),
    true,
  );
  assert.equal(isFirebaseIdentityLinkRequired({ status: 409 }), false);
  assert.equal(
    isFirebaseIdentityLinkRequired({ status: 409, code: "other_conflict" }),
    false,
  );
  assert.equal(
    isFirebaseIdentityLinkReviewRequired({
      status: 409,
      code: "firebase_identity_link_review_required",
    }),
    true,
  );
  assert.equal(
    isFirebaseIdentityLinkRequired({
      status: 409,
      code: "firebase_identity_link_review_required",
    }),
    false,
    "a review response must never open the client link confirmation",
  );
  assert.equal(
    isFirebaseIdentityLinkReviewRequired({
      status: 409,
      code: "firebase_identity_link_required",
    }),
    false,
  );
  assert.equal(isFirebaseIdentityLinkReviewRequired({ status: 400 }), false);
  for (const code of [
    "auth/user-not-found",
    "auth/invalid-email",
    "auth/invalid-recipient-email",
  ])
    assert.equal(
      passwordRecoveryFailureMessage({ code }),
      null,
      `${code} must not reveal whether an account exists`,
    );
  assert.match(
    passwordRecoveryFailureMessage({ code: "auth/network-request-failed" }) || "",
    /connection/i,
  );
  assert.equal(hasUsername("4d2ce5ab-9a90-4b16-9a1e-8be73b54d2af"), false);
  assert.throws(() => usernameValue("aa"), /3–30/i);
  assert.throws(() => usernameValue("1parent"), /starting with a letter/i);
});
test("Firebase configuration fails closed until every public app value is present", async () => {
  const { firebaseConfigFromEnv } = await import("../src/firebase-config");
  assert.throws(() => firebaseConfigFromEnv({}), /Firebase sign-in is not configured/);
  assert.deepEqual(
    firebaseConfigFromEnv({
      EXPO_PUBLIC_FIREBASE_API_KEY: "public-api-key",
      EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN: "neuronest.firebaseapp.com",
      EXPO_PUBLIC_FIREBASE_PROJECT_ID: "neuronest",
      EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET: "neuronest.firebasestorage.app",
      EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: "123",
      EXPO_PUBLIC_FIREBASE_APP_ID: "1:123:web:abc",
    }),
    {
      apiKey: "public-api-key",
      authDomain: "neuronest.firebaseapp.com",
      projectId: "neuronest",
      storageBucket: "neuronest.firebasestorage.app",
      messagingSenderId: "123",
      appId: "1:123:web:abc",
    },
  );
});
test("booking calendar groups slots in India time", () => {
  assert.equal(indiaDateKey("2026-09-08T20:00:00Z"), "2026-09-09");
  assert.equal(indiaDateKey("not-a-date"), "");
  assert.match(indiaTimeLabel("2026-09-08T20:00:00Z", "en"), /\d/);
});
test("API transport uses bearer, handles expiry and refuses insecure production endpoints", async () => {
  (globalThis as { __DEV__?: boolean }).__DEV__ = true;
  const { ApiError, api, apiResponse, setToken, onExpired } = await import(
    "../src/api"
  );
  const originalFetch = globalThis.fetch;
  let expired = 0;
  try {
    setToken("test-only-token");
    onExpired(() => {
      expired++;
    });
    globalThis.fetch = async (_url, options) => {
      assert.equal(
        new Headers(options?.headers).get("Authorization"),
        "Bearer test-only-token",
      );
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    };
    assert.deepEqual(await api("me/"), { ok: true });
    globalThis.fetch = async () =>
      new Response(JSON.stringify({ detail: "Expired" }), { status: 401 });
    await assert.rejects(apiResponse("attachments/id/content/"), /Expired/);
    assert.equal(expired, 1);
    globalThis.fetch = async () => {
      setToken("new-session");
      return new Response(JSON.stringify({ detail: "Previous session expired" }), {
        status: 401,
      });
    };
    await assert.rejects(api("me/"), /Previous session/);
    assert.equal(expired, 1, "an older request must not sign out the newer session");
    globalThis.fetch = async () =>
      new Response(
        JSON.stringify({
          code: "firebase_identity_link_required",
          detail: "Confirm the identity link to continue.",
        }),
        { status: 409 },
      );
    await assert.rejects(api("me/"), (failure: unknown) => {
      assert.ok(failure instanceof ApiError);
      assert.equal(failure.code, "firebase_identity_link_required");
      assert.equal(failure.status, 409);
      return true;
    });
    globalThis.fetch = async () => new Response("invalid-json", { status: 200 });
    await assert.rejects(api("me/"), /unreadable/);
    (globalThis as { __DEV__?: boolean }).__DEV__ = false;
    await assert.rejects(apiResponse("attachments/id/content/"), /secure API/);
  } finally {
    globalThis.fetch = originalFetch;
    setToken("");
    (globalThis as { __DEV__?: boolean }).__DEV__ = true;
  }
});

test("patched UUID retains native Xcode project generation compatibility", () => {
  const require = createRequire(import.meta.url);
  const fromXcode = createRequire(require.resolve("xcode"));
  assert.match(
    fromXcode("uuid").v4(),
    /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/,
  );
});

test("a page envelope is unwrapped for callers and preserved for truncation checks", async () => {
  const { api, apiPage, boundedPagePath, isPage, setToken } = await import(
    "../src/api"
  );
  setToken("token");
  const page = {
    count: 240,
    next: "http://x/v1/observations/?page=2",
    previous: null,
    results: [{ id: "a" }, { id: "b" }],
  };
  assert.ok(isPage(page), "a page envelope is recognised");
  assert.ok(!isPage([{ id: "a" }]), "a bare array is not a page");
  assert.equal(
    boundedPagePath("observations/?child=child-1"),
    "observations/?child=child-1&page_size=500",
    "mobile list requests use the server's maximum bounded page",
  );
  assert.equal(
    boundedPagePath("observations/?page_size=20"),
    "observations/?page_size=500",
    "a caller cannot accidentally request a smaller incomplete page",
  );

  const original = globalThis.fetch;
  globalThis.fetch = async () =>
    new Response(JSON.stringify(page), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  try {
    const rows = await api<Array<{ id: string }>>("observations/");
    assert.deepEqual(
      rows.map((r) => r.id),
      ["a", "b"],
      "callers asking for rows get rows, not the envelope",
    );
    const envelope = await apiPage<{ id: string }>("observations/");
    assert.equal(envelope.count, 240, "the total is preserved");
    assert.ok(envelope.next, "truncation is detectable");
  } finally {
    globalThis.fetch = original;
    setToken("");
  }
});

test("an unpaginated response still reads as a single complete page", async () => {
  const { apiPage, setToken } = await import("../src/api");
  setToken("token");
  const original = globalThis.fetch;
  globalThis.fetch = async () =>
    new Response(JSON.stringify([{ id: "a" }, { id: "b" }, { id: "c" }]), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  try {
    const envelope = await apiPage("resources/");
    assert.equal(envelope.count, 3);
    assert.equal(
      envelope.next,
      null,
      "a complete response is never reported as truncated",
    );
  } finally {
    globalThis.fetch = original;
    setToken("");
  }
});

test("confirmations are written in the reader's language", async () => {
  const { confirmText, setAlertLanguage } = await import("../src/alerts");
  try {
    setAlertLanguage("ml");
    const ml = confirmText("Discard encrypted draft?", "Dismiss notification");
    for (const [part, value] of Object.entries(ml))
      assert.ok(/[ഀ-ൿ]/.test(value), `${part} is Malayalam (got ${value})`);
    assert.notEqual(
      ml.confirmLabel,
      ml.dismissLabel,
      "the two choices are distinguishable",
    );

    setAlertLanguage("en");
    const en = confirmText("Discard encrypted draft?", "Dismiss notification", {
      confirmLabel: "Discard draft",
      dismissLabel: "Keep draft",
    });
    assert.equal(en.title, "Discard encrypted draft?");
    assert.equal(en.confirmLabel, "Discard draft", "a caller can name the action");
    assert.equal(en.dismissLabel, "Keep draft", "and name the safe way out");

    setAlertLanguage("ml");
    const named = confirmText("Discard encrypted draft?", "Dismiss notification", {
      confirmLabel: "Discard draft",
      dismissLabel: "Keep draft",
    });
    assert.ok(/[ഀ-ൿ]/.test(named.confirmLabel), "caller labels are translated too");
  } finally {
    setAlertLanguage("en");
  }
});

test("an explicit language overrides the ambient one", async () => {
  const { confirmText, setAlertLanguage, getAlertLanguage } = await import(
    "../src/alerts"
  );
  setAlertLanguage("en");
  assert.equal(getAlertLanguage(), "en");
  const forced = confirmText("Discard encrypted draft?", "Dismiss notification", {
    language: "ml",
  });
  assert.ok(/[ഀ-ൿ]/.test(forced.title), "the override wins over the ambient language");
});

test("every Malayalam translation is a real translation, not a copy of the key", async () => {
  const { translate } = await import("../src/i18n");
  const fs = await import("node:fs");
  const path = new URL("../src/i18n.ts", import.meta.url).pathname;
  const source: string = fs.readFileSync(path, { encoding: "utf8" });
  const keys = [
    ...source.matchAll(/^\s{2}(?:"([^"]+)"|([A-Za-z][A-Za-z0-9]*)):/gm),
  ].map((m) => m[1] ?? m[2]);
  assert.ok(keys.length > 50, `the dictionary is substantial (${keys.length} keys)`);
  const untranslated = keys.filter((key) => {
    const value = translate("ml", key);
    return value === key || !/[ഀ-ൿ]/.test(value);
  });
  assert.deepEqual(untranslated, [], "no key falls through to English");
  assert.deepEqual(
    keys.filter((key) => /[\u0C00-\u0C7F]/.test(translate("ml", key))),
    [],
    "Malayalam copy must not contain characters from another Indic script",
  );
  assert.equal(translate("ml", "English"), "ഇംഗ്ലീഷ്");
  assert.equal(translate("ml", "Screening"), "പ്രാഥമിക പരിശോധന");
});

test("an unknown key falls back to the original rather than rendering blank", () => {
  assert.equal(
    translate("ml", "A phrase nobody has translated yet"),
    "A phrase nobody has translated yet",
  );
  assert.equal(translate("en", "Care"), "Care");
});

test("observation validation accepts a complete record and normalises whitespace", () => {
  const clean = validateObservation(
    {
      title: "  Waved goodbye  ",
      domain: "social",
      status: "observed",
      note: "At the door",
      observed_on: "2028-02-29",
    },
    "child-a",
  );
  assert.equal(
    clean.title,
    "Waved goodbye",
    "the title is trimmed before it is stored",
  );
  assert.equal(clean.child, "child-a");
  assert.equal(clean.observed_on, "2028-02-29", "a real leap day is accepted");
});

test("observation validation accepts parent concern categories and preserves legacy drafts", () => {
  const base = { title: "A concern", status: "unsure", observed_on: "2026-09-07" };
  for (const domain of ["emotional_regulation", "sleep", "eating", "other", "motor"])
    assert.equal(validateObservation({ ...base, domain }, "child-a").domain, domain);
});

test("observation validation rejects every unsupported domain and status", () => {
  const base = { title: "A moment", status: "observed", observed_on: "2026-09-07" };
  assert.throws(
    () => validateObservation({ ...base, domain: "telepathy" }, "child-a"),
    /domain/i,
  );
  assert.throws(
    () =>
      validateObservation({ ...base, domain: "social", status: "cured" }, "child-a"),
    /status/i,
  );
});

test("draft replay is ordered and stops at the first failure without dropping later work", async () => {
  const order: string[] = [];
  const removed: string[] = [];
  await assert.rejects(
    replayDrafts(
      "parent-a",
      [draft("one"), draft("two"), draft("three")],
      async (d) => {
        order.push(d.id);
        if (d.id === "two") throw new Error("Access changed");
      },
      async (id) => {
        removed.push(id);
      },
    ),
    /Access changed/,
  );
  assert.deepEqual(order, ["one", "two"], "replay stops rather than racing ahead");
  assert.deepEqual(removed, ["one"], "only the acknowledged draft is discarded");
});
