import { test } from "node:test";
import assert from "node:assert/strict";
import {
  safeUrl,
  secureServiceUrl,
  money,
  date,
  cleanForm,
  doctorDisplayName,
} from "./utils.ts";
import { indiaCalendarDays, indiaDayKey, indiaMonthStart } from "./booking-utils.ts";
test("API-sourced links cannot execute script or open data documents", () => {
  for (const url of [
    "javascript:alert(1)",
    "data:text/html,test",
    "file:///etc/passwd",
    "broken",
  ])
    assert.equal(safeUrl(url), undefined);
  assert.equal(safeUrl("https://example.org/source"), "https://example.org/source");
});
test("doctor labels clean only server-marked exhibition profiles without mutating records", () => {
  const doctor = {
    display_name: "Demo Dr. Asha — test only",
    is_demo: true,
    id: "provider-100",
  };
  assert.equal(doctorDisplayName(doctor.display_name, doctor.is_demo), "Dr. Asha");
  assert.equal(doctor.display_name, "Demo Dr. Asha — test only");
  assert.equal(doctor.id, "provider-100");
  assert.equal(doctorDisplayName("Dr. Keerthy S", false), "Dr. Keerthy S");
  assert.equal(doctorDisplayName(doctor.display_name, false), doctor.display_name);
  assert.equal(doctorDisplayName(doctor.display_name, "true"), doctor.display_name);
  assert.equal(doctorDisplayName(undefined, true), "");
  assert.equal(doctorDisplayName("Dr. Asha", true), "Dr. Asha");
});
test("browser service endpoints reject non-local HTTP and credential-bearing URLs", () => {
  assert.equal(
    secureServiceUrl("https://api.neuronest.example/v1/", "API"),
    "https://api.neuronest.example/v1",
  );
  assert.equal(
    secureServiceUrl("http://127.0.0.1:8000/", "API"),
    "http://127.0.0.1:8000",
  );
  assert.throws(() => secureServiceUrl("http://api.neuronest.example", "API"));
  assert.throws(() =>
    secureServiceUrl("https://user:pass@api.neuronest.example", "API"),
  );
});
test("native form values preserve zero and normalize numeric amounts", () => {
  assert.deepEqual(cleanForm({ a: "", weight_kg: "0", title: "A" }, ["weight_kg"]), {
    weight_kg: 0,
    title: "A",
  });
  assert.equal(money(125000), "₹1,250");
  assert.equal(money(125099), "₹1,250.99");
  assert.equal(date("bad"), "Not available");
});

import { preferredLanguage, rememberLanguage, translate } from "./i18n.ts";
test("language choice persists and blocked browser storage preserves switching", () => {
  const original = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  const values = new Map<string, string>();
  try {
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      value: {
        getItem: (key: string) => values.get(key),
        setItem: (key: string, value: string) => values.set(key, value),
      },
    });
    assert.equal(preferredLanguage("ml"), "ml");
    rememberLanguage("ml");
    assert.equal(preferredLanguage("en"), "ml");
    rememberLanguage("en");
    assert.equal(preferredLanguage("ml"), "en");
    values.set("neuronest.language", "unknown");
    assert.equal(preferredLanguage("ml"), "ml");
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      get() {
        throw new Error("Storage is blocked");
      },
    });
    assert.equal(preferredLanguage("ml"), "ml");
    assert.doesNotThrow(() => rememberLanguage("en"));
  } finally {
    if (original) Object.defineProperty(globalThis, "localStorage", original);
    else Reflect.deleteProperty(globalThis, "localStorage");
  }
});
test("Malayalam translation retains authored content and translates workflow labels", () => {
  assert.equal(translate("Save changes", "ml"), "മാറ്റങ്ങൾ സൂക്ഷിക്കുക");
  assert.equal(translate("Save changes", "en"), "Save changes");
  assert.equal(
    translate("Family-authored observation", "ml"),
    "Family-authored observation",
  );
});

test("Firebase browser configuration fails closed without public credentials", async () => {
  const { resolveFirebaseConfig } = await import("./auth-config.ts");
  const missing = resolveFirebaseConfig({});
  assert.equal(missing.config, undefined);
  assert.match(missing.error || "", /VITE_FIREBASE_API_KEY/);

  const configured = resolveFirebaseConfig({
    VITE_FIREBASE_API_KEY: "public-web-api-key",
    VITE_FIREBASE_AUTH_DOMAIN: "neuronest.firebaseapp.com",
    VITE_FIREBASE_PROJECT_ID: "neuronest",
    VITE_FIREBASE_APP_ID: "1:123:web:abc",
  });
  assert.deepEqual(configured, {
    config: {
      apiKey: "public-web-api-key",
      authDomain: "neuronest.firebaseapp.com",
      projectId: "neuronest",
      appId: "1:123:web:abc",
    },
  });
  assert.equal(
    resolveFirebaseConfig({
      VITE_FIREBASE_API_KEY: "public-web-api-key",
      VITE_FIREBASE_AUTH_DOMAIN: "https://neuronest.firebaseapp.com",
      VITE_FIREBASE_PROJECT_ID: "neuronest",
      VITE_FIREBASE_APP_ID: "1:123:web:abc",
    }).config,
    undefined,
    "an auth-domain URL is rejected; Firebase expects a hostname",
  );
});

test("the URL names the destination, tab and child, and refuses junk in the path", async () => {
  const { readPlace, placeUrl } = await import("./routing.ts");
  const at = (href: string) => {
    // readPlace reads window.location, so stand one up for the assertion.
    (globalThis as { window?: unknown }).window = { location: new URL(href) };
    return readPlace();
  };
  assert.deepEqual(at("http://x/journey/goals?child=abc"), {
    view: "today",
    tab: "",
    child: "abc",
  });
  assert.deepEqual(at("http://x/journey/health?child=abc"), {
    view: "records",
    tab: "health",
    child: "abc",
  });
  assert.deepEqual(at("http://x/journey/milestones?child=abc"), {
    view: "milestones",
    tab: "",
    child: "abc",
  });
  assert.deepEqual(at("http://x/reports?child=abc"), {
    view: "reports",
    tab: "",
    child: "abc",
  });
  assert.deepEqual(at("http://x/"), { view: null, tab: "", child: "" });
  assert.equal(
    at("http://x/not-a-view/goals").view,
    null,
    "an unknown destination is not accepted from the URL",
  );
  assert.equal(
    at("http://x/assistant").view,
    null,
    "the assistant opens as a chat panel, never as a routed page",
  );
  assert.equal(
    at("http://x/journey/<script>").tab,
    "",
    "a tab that is not a plain slug is discarded",
  );
  assert.equal(
    at("http://x/journey/" + "a".repeat(80)).tab,
    "",
    "an over-long tab is discarded rather than rendered",
  );
  assert.equal(
    at("http://x/journey/not-a-real-tab").tab,
    "",
    "a valid-looking tab for the wrong screen is discarded rather than leaving a blank view",
  );
  assert.equal(
    placeUrl({ view: "care", tab: "not-a-real-tab", child: "abc" }),
    "/care?child=abc",
    "invalid tabs are never written into a shareable URL",
  );
});

test("a place round-trips through the URL it produces", async () => {
  const { readPlace, placeUrl } = await import("./routing.ts");
  for (const place of [
    { view: "records" as const, tab: "health", child: "child-1" },
    { view: "assessments" as const, tab: "", child: "child-1" },
    { view: "milestones" as const, tab: "", child: "child-1" },
    { view: "care" as const, tab: "", child: "" },
    { view: "reports" as const, tab: "", child: "child-1" },
    { view: null, tab: "", child: "" },
  ]) {
    const href = "http://x" + placeUrl(place);
    (globalThis as { window?: unknown }).window = { location: new URL(href) };
    assert.deepEqual(readPlace(), place, `round-trip for ${href}`);
  }
});

test("the parent questionnaire is descriptive, complete only with six answers, and has no score", async () => {
  const {
    PARENT_QUESTIONNAIRE_ANSWERS,
    PARENT_QUESTIONNAIRE_SECTIONS,
    isCompleteParentQuestionnaire,
  } = await import("./assessments-utils.ts");
  assert.equal(PARENT_QUESTIONNAIRE_SECTIONS.length, 6);
  assert.deepEqual(
    PARENT_QUESTIONNAIRE_ANSWERS.map((option) => option.value),
    ["never", "sometimes", "often", "almost_always", "concerned"],
  );
  assert.equal(isCompleteParentQuestionnaire({ communication: "often" }), false);
  assert.equal(
    isCompleteParentQuestionnaire(
      Object.fromEntries(
        PARENT_QUESTIONNAIRE_SECTIONS.map((section) => [section.id, "sometimes"]),
      ),
    ),
    true,
  );
});

test("check-in next steps prioritize reported skill loss and concern without inventing probabilities", async () => {
  const { milestoneNextStep } = await import("./milestones.ts");
  const row = {
    skill_loss: false,
    parent_concern: false,
    summary: { follow_up_recommended: false },
  } as Parameters<typeof milestoneNextStep>[0];
  const regular = milestoneNextStep(row);
  assert.equal(regular.title, "Continue regular developmental checks");
  assert.match(regular.description, /does not rule out/);
  const concern = milestoneNextStep({ ...row, parent_concern: true });
  assert.equal(concern.title, "Arrange a developmental review");
  const followUp = milestoneNextStep({
    ...row,
    summary: { ...row.summary, follow_up_recommended: true },
  });
  assert.equal(followUp.title, concern.title);
  const loss = milestoneNextStep({ ...row, parent_concern: true, skill_loss: true });
  assert.equal(loss.title, "Contact a clinician promptly");
  for (const result of [regular, concern, followUp, loss]) {
    assert.doesNotMatch(JSON.stringify(result), /\d|normal|risk score/i);
    assert.notEqual(translate(result.title, "ml"), result.title);
    assert.notEqual(translate(result.description, "ml"), result.description);
  }
});
test("milestone questions require one explicit valid answer per item", async () => {
  const { completeMilestoneAnswers } = await import("./milestones.ts");
  const items = ["4m-1", "4m-2"].map((id) => ({
    id,
    domain: "social",
    label: { en: "Example", ml: "ഉദാഹരണം" },
  }));
  assert.equal(completeMilestoneAnswers(items, {}), false);
  assert.equal(completeMilestoneAnswers(items, { "4m-1": "yes" }), false);
  assert.equal(
    completeMilestoneAnswers(items, { "4m-1": "yes", "4m-2": "in_progress" }),
    true,
  );
  assert.equal(
    completeMilestoneAnswers(items, { "4m-1": "not_yet", "4m-2": "unsure" }),
    true,
  );
  assert.equal(
    completeMilestoneAnswers(items, {
      "4m-1": "yes",
      "4m-2": "yes",
      "future-skill": "yes",
    }),
    false,
  );
  assert.equal(completeMilestoneAnswers([], {}), false);
});

test("a child id is escaped on its way into the query string", async () => {
  const { placeUrl } = await import("./routing.ts");
  const url = placeUrl({ view: "journey", tab: "", child: "a b&c=d" });
  assert.ok(!url.includes(" "), `no raw space in ${url}`);
  assert.ok(
    !/[&=]d/.test(url.split("child=")[1]),
    "the value cannot add its own parameters",
  );
});

test("reports fail closed when a child is missing and exclude other children", async () => {
  const { rowsForReportChild } = await import("./reports-utils.ts");
  const rows = [
    { id: "first", child: "child-a" },
    { id: "second", child: "child-b" },
    { id: "unscoped" },
  ];
  assert.deepEqual(
    rowsForReportChild(rows, "child-a").map((row) => row.id),
    ["first"],
  );
  assert.deepEqual(rowsForReportChild(rows, ""), []);
});

test("a validation failure names the fields it rejected", async () => {
  const { ApiError } = await import("./http.ts");
  const failure = new ApiError("title: too long", 400, { title: "too long" });
  assert.equal(failure.status, 400);
  assert.deepEqual(failure.fields, { title: "too long" });
  assert.ok(failure instanceof Error, "it is still an Error for ordinary handling");
});

test("a Firebase identity-review conflict never enables self-service linking", async () => {
  const { apiError } = await import("./http.ts");
  const {
    FIREBASE_IDENTITY_LINK_REVIEW_REQUIRED,
    IDENTITY_LINK_REVIEW_NOTICE,
    requiresIdentityLinkReview,
  } = await import("./identity-link.ts");
  const review = apiError(
    {
      code: FIREBASE_IDENTITY_LINK_REVIEW_REQUIRED,
      detail:
        "This account cannot be linked automatically. Contact support to complete an identity review.",
    },
    409,
  );
  assert.equal(review.code, FIREBASE_IDENTITY_LINK_REVIEW_REQUIRED);
  assert.equal(
    review.message,
    "This account cannot be linked automatically. Contact support to complete an identity review.",
  );
  assert.deepEqual(review.fields, {});
  assert.ok(requiresIdentityLinkReview(review));
  assert.match(IDENTITY_LINK_REVIEW_NOTICE, /contact support/i);
  assert.ok(
    !requiresIdentityLinkReview(
      apiError({ code: "firebase_identity_link_required" }, 409),
    ),
    "the retired self-service code cannot enable a confirmation screen",
  );
  assert.ok(
    !requiresIdentityLinkReview(
      apiError({ code: FIREBASE_IDENTITY_LINK_REVIEW_REQUIRED }, 403),
    ),
    "only the exact 409 review response changes the signed-out experience",
  );
});

test("a hosted Firebase email action without a code returns to email sign-in", async () => {
  const { EMAIL_ACTION_CONTINUE_NOTICE, fallbackForDefaultFirebaseAction } =
    await import("./auth-callback.ts");
  assert.deepEqual(fallbackForDefaultFirebaseAction(), {
    mode: "sign-in",
    signInMethod: "email",
    notice: EMAIL_ACTION_CONTINUE_NOTICE,
  });
  assert.match(EMAIL_ACTION_CONTINUE_NOTICE, /signing in with your email/i);
});

test("password recovery keeps missing or invalid recipients non-enumerating", async () => {
  const { isGenericRecoveryOutcome } = await import("./auth-errors.ts");
  assert.ok(isGenericRecoveryOutcome({ code: "auth/user-not-found" }));
  assert.ok(isGenericRecoveryOutcome({ code: "auth/invalid-recipient-email" }));
  assert.ok(
    isGenericRecoveryOutcome(new Error("Firebase: Error (auth/invalid-email).")),
    "provider messages without a code still normalize safely",
  );
  assert.ok(!isGenericRecoveryOutcome(new Error("Network request failed")));
  assert.ok(!isGenericRecoveryOutcome(new Error("Secure sign-in is not configured.")));
});

test("Google sign-in errors are actionable without treating a closed popup as a failure", async () => {
  const { googleSignInFailureMessage } = await import("./auth-errors.ts");
  assert.equal(googleSignInFailureMessage({ code: "auth/popup-closed-by-user" }), null);
  assert.match(
    googleSignInFailureMessage({ code: "auth/popup-blocked" }) || "",
    /pop-ups/i,
  );
  assert.match(
    googleSignInFailureMessage({ code: "auth/operation-not-allowed" }) || "",
    /not available/i,
  );
  assert.match(
    googleSignInFailureMessage({
      code: "auth/account-exists-with-different-credential",
    }) || "",
    /username or email/i,
  );
});

test("only definitive Firebase invalidation errors end a persisted session", async () => {
  const { isDefinitiveAuthFailure } = await import("./auth-errors.ts");
  assert.equal(isDefinitiveAuthFailure({ code: "auth/user-token-expired" }), true);
  assert.equal(isDefinitiveAuthFailure({ code: "auth/user-disabled" }), true);
  assert.equal(isDefinitiveAuthFailure({ code: "auth/network-request-failed" }), false);
  assert.equal(isDefinitiveAuthFailure(new Error("offline")), false);
});

test("a page envelope is recognised and a bare list is not", async () => {
  const { isPage } = await import("./http.ts");
  assert.ok(isPage({ count: 2, next: null, previous: null, results: [{ id: "a" }] }));
  assert.ok(isPage({ count: 0, next: null, previous: null, results: [] }));
  assert.ok(!isPage([{ id: "a" }]), "a bare array is not a page");
  assert.ok(!isPage({ results: [] }), "results without a count is not a page");
  assert.ok(!isPage(null) && !isPage(undefined) && !isPage("x"));
});

test("operations queue pagination keeps both queue streams", async () => {
  const { appendOperationsQueue } = await import("./operations-utils.ts");
  const merged = appendOperationsQueue(
    {
      id: "first",
      outbox: [{ id: "delivery-1" }],
      payment_events: [{ id: "payment-1" }],
    },
    {
      id: "second",
      outbox: [{ id: "delivery-2" }],
      payment_events: [{ id: "payment-2" }],
      next_offset: 200,
    },
  );
  assert.deepEqual(
    merged.outbox.map((item: { id: string }) => item.id),
    ["delivery-1", "delivery-2"],
  );
  assert.deepEqual(
    merged.payment_events.map((item: { id: string }) => item.id),
    ["payment-1", "payment-2"],
  );
  assert.equal(merged.next_offset, 200);
});

test("money and dates stay readable when the API sends something unexpected", () => {
  assert.equal(money(null), "₹0");
  assert.equal(money(undefined), "₹0");
  assert.equal(money(0), "₹0");
  assert.equal(money(150000), "₹1,500");
  assert.equal(date(null), "Not scheduled");
  assert.equal(date(""), "Not scheduled");
  assert.equal(date("not-a-date"), "Not available");
  assert.equal(
    date(12345 as unknown),
    "Not scheduled",
    "a non-string is not formatted",
  );
});

test("booking availability groups instants in India time rather than the browser timezone", () => {
  const lateUtc = "2030-01-15T18:45:00Z";
  assert.equal(indiaDayKey(lateUtc), "2030-01-16");
  const month = indiaMonthStart(lateUtc);
  assert.equal(month.toISOString(), "2030-01-01T12:00:00.000Z");
  assert.equal(
    indiaCalendarDays(month).filter(Boolean).at(-1)?.toISOString(),
    "2030-01-31T12:00:00.000Z",
  );
});

test("every Malayalam entry is a real translation and the dictionary has no duplicate keys", async () => {
  const { translate } = await import("./i18n.ts");
  const fs = await import("node:fs");
  const source: string = fs.readFileSync(
    new URL("./i18n.ts", import.meta.url).pathname,
    "utf8",
  );
  // Only the template-literal dictionary, not TypeScript lines that contain a pipe.
  const block = source.split("`")[1] ?? "";
  const pairs = block
    .split("\n")
    .filter((line) => line.includes("|"))
    .map((line) => {
      const [key, ...rest] = line.split("|");
      return [key, rest.join("|")];
    });
  assert.ok(
    pairs.length > 300,
    `the dictionary is substantial (${pairs.length} entries)`,
  );

  const seen = new Map<string, number>();
  for (const [key] of pairs) seen.set(key, (seen.get(key) || 0) + 1);
  assert.deepEqual(
    [...seen].filter(([, n]) => n > 1).map(([k]) => k),
    [],
    "a duplicate key would silently shadow one of the two translations",
  );

  const untranslated = pairs.filter(
    ([key, value]) => value === key || !/[ഀ-ൿ]/.test(value),
  );
  assert.deepEqual(
    untranslated.map(([k]) => k),
    [],
    "no entry falls through to English",
  );
  assert.deepEqual(
    pairs.filter(([, value]) => /[\u0C00-\u0C7F]/.test(value)).map(([key]) => key),
    [],
    "Malayalam copy must not contain characters from another Indic script",
  );

  const dictionary = new Set(pairs.map(([key]) => key));
  const directory = new URL(".", import.meta.url);
  const sourceFiles = (
    fs.readdirSync(directory, { recursive: true }) as string[]
  ).filter((file) => /\.(?:ts|tsx)$/.test(file) && !file.endsWith(".test.ts"));
  const staticKeys = new Set(
    sourceFiles.flatMap((file) =>
      [
        ...fs
          .readFileSync(new URL(file, directory), "utf8")
          .matchAll(/\btr\("([^"\\]+)"\)/g),
      ].map((match) => match[1]),
    ),
  );
  assert.deepEqual(
    [...staticKeys].filter((key) => !dictionary.has(key)).sort(),
    [],
    "every static web label translated with tr() has a Malayalam entry",
  );
  assert.equal(
    translate("A phrase nobody has translated", "ml"),
    "A phrase nobody has translated",
    "an unknown key falls back to the original rather than rendering blank",
  );
});
