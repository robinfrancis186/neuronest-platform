import { loadRazorpay } from "./razorpay";
import { useEffect, useRef, useState } from "react";
import {
  api,
  apiPage,
  signOut,
  type Appointment,
  type Child,
  type Row,
  type User,
} from "./api";
import { translate } from "./i18n";
import { age as formatAge, date as formatDate, doctorDisplayName } from "./utils";
import {
  labels,
  selectField,
  textField,
  today,
  type Field,
  type Modal,
  type View,
} from "./ui/fields";
import type { ChatEntry, Workspace as WorkspaceValue } from "./workspace-context";
import { readPlace, writePlace, type Place } from "./routing";
import type { Confirmation } from "./ui/ConfirmDialog";
import { appendOperationsQueue } from "./operations-utils";

/**
 * All state, effects and server calls for one signed-in session.
 *
 * Kept apart from the shell that renders it: this file answers "what does the
 * session know and do", Workspace.tsx answers "what does it look like".
 */
function omit<T>(source: Record<string, T>, key: string) {
  const { [key]: _removed, ...rest } = source;
  return rest;
}

export function useWorkspaceState({
  user,
  lang,
  setLang,
  onSignedOut,
  childSelectionRequired = false,
}: {
  user: User;
  lang: "en" | "ml";
  setLang: (language: "en" | "ml") => void;
  onSignedOut: () => void;
  childSelectionRequired?: boolean;
}): WorkspaceValue & {
  pendingConfirm: {
    confirmation: Confirmation;
    resolve: (confirmed: boolean) => void;
  } | null;
  setPendingConfirm: (pending: null) => void;
} {
  const home: View =
    user.role === "admin" ? "operations" : user.role === "mentor" ? "care" : "today";
  const opened = readPlace();
  const [view, setView] = useState<View>(opened.view || home);
  const [tab, setTab] = useState(opened.tab);
  const [children, setChildren] = useState<Child[]>([]);
  const [childrenLoaded, setChildrenLoaded] = useState(false);
  const [childId, setChildId] = useState(opened.child);
  const [data, setData] = useState<Record<string, Row[]>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [truncated, setTruncated] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [revision, setRevision] = useState(0);
  const [modal, setModal] = useState<Modal | null>(null);
  const [pendingConfirm, setPendingConfirm] = useState<{
    confirmation: Confirmation;
    resolve: (confirmed: boolean) => void;
  } | null>(null);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [online, setOnline] = useState(navigator.onLine);
  const [busy, setBusy] = useState("");
  const [search, setSearch] = useState("");
  const [provider, setProvider] = useState<Row | null>(null);
  const [slots, setSlots] = useState<Row[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const slotRequest = useRef(0);
  const [room, setRoom] = useState<Row | null>(null);
  const [demoCall] = useState(() => new URLSearchParams(window.location.search).get("demo_call") || "");
  useEffect(() => {
    if (!demoCall || user.role !== "parent") return;
    let active = true;
    api<Row>(`appointments/${encodeURIComponent(demoCall)}/join/`, "POST", { demo_doctor: true })
      .then((result) => { if (active) setRoom(result); })
      .catch((error) => { if (active) setError(error.message); });
    return () => { active = false; };
  }, [demoCall, user.id, user.role]);
  const [readiness, setReadiness] = useState<Row | null>(null);
  const [chat, setChat] = useState<ChatEntry[]>([]);
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [includeRecords, setIncludeRecords] = useState(false);
  const [screen, setScreen] = useState<Row | null>(null);
  const [operationNextOffset, setOperationNextOffset] = useState<number | null>(null);
  const chatScope = useRef("");
  chatScope.current = `${user?.id || ""}:${childId}:${lang}`;
  const tr = (text: string) => translate(text, lang);
  const date = (value: unknown, full = false) => formatDate(value, full, lang);
  const age = (dob: string) => formatAge(dob, lang);
  const child = children.find((c) => c.id === childId);
  const isStaff = !!user && ["doctor", "therapist", "mentor"].includes(user.role);
  const canWriteClinicalRecords = user?.role === "doctor" || user?.role === "therapist";
  const isAdmin = user?.role === "admin";
  const t = (key: string) => labels[key]?.[lang === "en" ? 0 : 1] || key;
  const list = (key: string) => data[key] || [];
  const refresh = () => {
    setChildrenLoaded(false);
    setRevision((v) => v + 1);
  };
  // Start loading in the same update that removes stale rows, so an Empty state
  // never flashes before the fetch effect runs after a route or child change.
  const beginLoad = () => {
    setLoading(true);
    setData({});
    setErrors({});
    setTruncated({});
  };
  const navigate = (v: View, nextTab = "") => {
    if (v === "journey") v = "today";
    beginLoad();
    setView(v);
    setTab(nextTab);
    writePlace({ view: v, tab: nextTab, child: childId }, "push");
    setSearch("");
    setProvider(null);
    setError("");
    window.scrollTo(0, 0);
  };
  // A tab or child change is a refinement of where you already are, so it replaces
  // rather than pushing: back should leave the destination, not step through its tabs.
  useEffect(() => {
    if (demoCall && view === "care" && tab === "appointments") {
      const query = new URLSearchParams({ child: childId, demo_call: demoCall });
      window.history.replaceState({}, "", `/care/appointments?${query}`);
    } else writePlace({ view, tab, child: childId }, "replace");
  }, [view, tab, childId, demoCall]);
  useEffect(() => {
    const restore = () => {
      const place: Place = readPlace();
      beginLoad();
      setView(place.view || home);
      setTab(place.tab);
      if (place.child) setChildId(place.child);
    };
    window.addEventListener("popstate", restore);
    return () => window.removeEventListener("popstate", restore);
  }, [home]);
  useEffect(() => {
    const network = () => setOnline(navigator.onLine);
    window.addEventListener("online", network);
    window.addEventListener("offline", network);
    return () => {
      window.removeEventListener("online", network);
      window.removeEventListener("offline", network);
    };
  }, []);
  useEffect(() => {
    if (!user) {
      setChildrenLoaded(false);
      return;
    }
    let live = true;
    setChildrenLoaded(false);
    api<Child[]>("children/")
      .then((rows) => {
        if (live) {
          setChildren(rows);
          setChildId((old) =>
            childSelectionRequired
              ? ""
              : rows.some((c) => c.id === old)
                ? old
                : rows[0]?.id || "",
          );
          setChildrenLoaded(true);
        }
      })
      .catch((e) => {
        if (!isAdmin) setError(e.message);
      });
    api<Row>("readiness/")
      .then((r) => live && setReadiness(r))
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [user, revision, isAdmin, childSelectionRequired]);
  useEffect(() => {
    if (!user) return;
    if (childSelectionRequired && user.role === "parent" && !childId) {
      setLoading(false);
      setData({});
      setErrors({});
      setTruncated({});
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    setErrors({});
    setData({});
    setTruncated({});
    if (view === "operations") setOperationNextOffset(null);
    const common = ["notifications"];
    let keys: string[] = [];
    if (view === "today")
      keys = ["appointments", "goals", "observations", "content", "therapy-sessions"];
    if (view === "journey" || view === "today")
      keys = [
        "appointments",
        "observations",
        "goals",
        "growth",
        "vaccinations",
        "therapy-sessions",
        "screenings",
        "practitioners",
      ];
    if (view === "milestones") keys = ["milestone-checkins"];
    if (view === "assessments") keys = ["parent-questionnaires"];
    if (view === "reports")
      keys = [
        "observations",
        "goals",
        "growth",
        "vaccinations",
        "therapy-sessions",
        "screenings",
        "appointments",
        "milestone-checkins",
        ...(user.role === "parent" ? ["parent-questionnaires"] : []),
      ];
    if (view === "journey" || view === "today") keys.push("screenings/instruments");
    if (view === "care")
      keys = [
        "practitioners",
        "appointments",
        "payments",
        "messages",
        "messages/recipients",
        "referrals",
        "therapy-sessions",
      ];
    if (view === "library") keys = ["content", "resources"];
    if (view === "records")
      keys = [
        "records",
        "attachments",
        "grants",
        "practitioners",
        "growth",
        "vaccinations",
      ];
    if (view === "account")
      keys = [
        "guardianships",
        "privacy-requests",
        "preferences",
        "provider-applications",
      ];
    if (view === "operations")
      keys = [
        "provider-applications",
        "content",
        "resources",
        "payments",
        "privacy-requests",
        "operations",
        "policies",
      ];
    const scoped = new Set([
      "goals",
      "observations",
      "growth",
      "vaccinations",
      "therapy-sessions",
      "screenings",
      "parent-questionnaires",
      "milestone-checkins",
      "records",
      "attachments",
      "grants",
      "audit",
      "messages",
      "messages/recipients",
      "referrals",
    ]);
    Promise.allSettled(
      [...new Set([...common, ...keys])].map(async (key) => {
        if (scoped.has(key) && !childId && !isAdmin) return;
        try {
          const page = await apiPage<Row>(
            `${key}/${scoped.has(key) && childId ? `?child=${encodeURIComponent(childId)}` : key === "screenings/instruments" ? `?language=${lang}` : ""}`,
            controller.signal,
          );
          const single = page.results.length === 1 ? page.results[0] : undefined;
          const value =
            single && Array.isArray(single.instruments)
              ? (single.instruments as Row[])
              : page.results;
          if (!controller.signal.aborted) {
            setData((prev) => ({ ...prev, [key]: value }));
            if (key === "operations")
              setOperationNextOffset(
                typeof single?.next_offset === "number" ? single.next_offset : null,
              );
            // A list the server truncated must say so rather than looking complete.
            setTruncated((prev) =>
              page.next ? { ...prev, [key]: page.count } : omit(prev, key),
            );
          }
        } catch (e) {
          if (!controller.signal.aborted)
            setErrors((prev) => ({ ...prev, [key]: (e as Error).message }));
        }
      }),
    ).then(() => {
      if (!controller.signal.aborted) setLoading(false);
    });
    return () => controller.abort();
  }, [user, view, tab, childId, revision, isAdmin, lang, childSelectionRequired]);
  useEffect(() => {
    setAssistantOpen(false);
    setChat([]);
    setScreen(null);
    setIncludeRecords(false);
  }, [childId, user, lang]);
  useEffect(() => {
    if (!notice) return;
    const id = setTimeout(() => setNotice(""), 6000);
    return () => clearTimeout(id);
  }, [notice]);
  async function command(
    path: string,
    body?: unknown,
    success = "Saved successfully",
    method = "POST",
  ) {
    setBusy(path);
    setError("");
    try {
      const r = await api(path, method, body ?? {});
      setNotice(success);
      refresh();
      return r;
    } catch (e) {
      setError((e as Error).message);
      return null;
    } finally {
      setBusy("");
    }
  }
  async function loadMoreOperations() {
    const offset = operationNextOffset;
    if (offset === null || busy) return;
    setBusy("operations/more");
    setErrors((prev) => omit(prev, "operations"));
    try {
      const response = await api<Row | Row[]>(`operations/?offset=${offset}`);
      const next = Array.isArray(response) ? response[0] : response;
      if (!next) throw new Error("The next queue page is unavailable.");
      setData((prev) => {
        const current = prev.operations?.[0];
        return {
          ...prev,
          operations: [appendOperationsQueue(current, next)],
        };
      });
      setOperationNextOffset(
        typeof next.next_offset === "number" ? next.next_offset : null,
      );
    } catch (e) {
      setErrors((prev) => ({ ...prev, operations: (e as Error).message }));
    } finally {
      setBusy("");
    }
  }
  const add = (
    title: string,
    endpoint: string,
    fields: Field[],
    extra: Record<string, unknown> = {},
    description?: string,
  ) => setModal({ title, endpoint, fields, extra, description });
  const childAdd = (
    title: string,
    endpoint: string,
    fields: Field[],
    description?: string,
    extra: Record<string, unknown> = {},
  ) => {
    if (!childId) {
      setError("Select or create a child profile first.");
      return;
    }
    add(title, endpoint, fields, { child: childId, ...extra }, description);
  };
  async function logout() {
    // The URL names a destination and a child. Neither belongs to the next person
    // to sign in on this device, so clear it before the session ends.
    writePlace({ view: null, tab: "", child: "" }, "replace");
    // Unmounting this component is what discards the session's loaded state.
    onSignedOut();
    await signOut().catch(() => {});
  }
  async function chooseProvider(p: Row) {
    const request = ++slotRequest.current;
    setProvider(p);
    setError("");
    setSlots([]);
    setSlotsLoading(true);
    try {
      const rows = await api<Row[]>(`slots/?practitioner=${p.id}&page_size=500`);
      if (request === slotRequest.current) setSlots(rows);
    } catch (e) {
      if (request === slotRequest.current) setError((e as Error).message);
    } finally {
      if (request === slotRequest.current) setSlotsLoading(false);
    }
  }
  async function book(slot: Row) {
    try {
      const current = await api<Row>("readiness/");
      setReadiness(current);
      const demo = provider?.is_demo === true;
      if (
        !(demo
          ? current.capabilities?.demo_bookings?.ready
          : current.capabilities?.payments?.ready)
      ) {
        setError(
          tr(
            "Booking payments are not available yet. No reservation has been created. Please try again after payment setup is complete.",
          ),
        );
        return;
      }
      const grants = demo ? [] : await api<Row[]>(`grants/?child=${childId}`);
      const recipient = provider?.user;
      if (!recipient) throw new Error("Choose a specialist again before booking.");
      if (
        !demo &&
        !grants.some(
          (g) =>
            g.recipient === recipient &&
            !g.revoked_at &&
            new Date(g.expires_at).getTime() > Date.now() &&
            g.scopes?.includes("records"),
        )
      ) {
        setModal({
          title: `Authorize care for ${child?.name || "this child"}`,
          description: `Booking requires permission for ${provider?.display_name} to access this child's health records. Choose an expiry and purpose. You can revoke access in Health records. For test profiles, use synthetic child information only. After saving, select Hold this time again.`,
          endpoint: "grants/",
          extra: { child: childId, recipient, scopes: ["records"] },
          fields: [
            textField("purpose", "Purpose of sharing"),
            textField("expires_at", "Access expires", "datetime-local"),
          ],
        });
        return;
      }
    } catch (e) {
      setError((e as Error).message);
      return;
    }
    const r = await command(
      "appointments/",
      { child: childId, slot: slot.id },
      "Appointment held. Complete payment before the hold expires.",
    );
    if (r) {
      setProvider(null);
      setTab("appointments");
    }
  }
  async function reschedule(a: Row) {
    setError("");
    try {
      const available = (
        await api<Row[]>(`slots/?practitioner=${a.practitioner}`)
      ).filter(
        (s) =>
          s.available &&
          (s.consultation_mode || "online") === (a.consultation_mode || "online"),
      );
      if (!available.length) {
        setNotice("No replacement slots are available with this practitioner.");
        return;
      }
      add(
        "Reschedule consultation",
        `appointments/${a.id}/reschedule/`,
        [
          selectField(
            "slot",
            "New consultation time",
            available.map((s) => ({
              value: s.id,
              label: date(s.starts_at, true),
            })),
          ),
        ],
        {},
        "Your existing consultation is moved only after the replacement is secured.",
      );
    } catch (e) {
      setError((e as Error).message);
    }
  }
  function payout(p: Row) {
    setModal({
      title: "Payout account onboarding",
      endpoint: `provider-applications/${p.id}/payout-onboarding/`,
      description:
        "Submit the professional’s authorized business details. Provider verification and activation remain separate.",
      fields: [
        textField("email", "Business email", "email"),
        textField("phone", "Business phone", "tel"),
        textField("legal_business_name", "Legal business name"),
        selectField("business_type", "Business type", [
          "individual",
          "proprietorship",
          "partnership",
          "private_limited",
        ]),
        textField("category", "Business category"),
        textField("subcategory", "Business subcategory"),
        textField("street1", "Registered address"),
        textField("city", "City"),
        textField("state", "State"),
        textField("postal_code", "Postal code"),
      ],
      transform: (d) => ({
        email: d.email,
        phone: d.phone,
        legal_business_name: d.legal_business_name,
        business_type: d.business_type,
        profile: {
          category: d.category,
          subcategory: d.subcategory,
          addresses: {
            registered: {
              street1: d.street1,
              city: d.city,
              state: d.state,
              postal_code: d.postal_code,
              country: "IN",
            },
          },
        },
      }),
    });
  }
  async function checkout(appointment: Appointment) {
    const p = await command(
      "payments/",
      { appointment: appointment.id },
      "Checkout created. Payment confirmation is verified by the server.",
    );
    if (!p) return;
    if (p.checkout?.key) {
      try {
        const Razorpay = await loadRazorpay();
        new Razorpay({
          ...p.checkout,
          name: "NeuroNest",
          order_id: p.provider_order_id,
          handler: async () => {
            setNotice("Payment submitted. Waiting for server confirmation…");
            try {
              for (let attempt = 0; attempt < 12; attempt++) {
                if (appointment.is_demo)
                  await api(`payments/${p.id}/verify/`, "POST", {});
                const current = await api<Appointment>(
                  `appointments/${appointment.id}/`,
                );
                if (current.status !== "awaiting_payment") {
                  setNotice(
                    current.status === "confirmed"
                      ? "Your appointment is confirmed."
                      : "Payment processed. Check the appointment status below.",
                  );
                  refresh();
                  return;
                }
                await new Promise((resolve) => setTimeout(resolve, 2500));
              }
              setNotice(
                "Payment verification is still pending. Check Payments before trying again.",
              );
              refresh();
            } catch (e) {
              setError(
                `Payment was submitted, but its status could not be checked. ${(e as Error).message}`,
              );
            }
          },
          modal: {
            ondismiss: () =>
              setNotice("Checkout closed. Your payment status remains unchanged."),
          },
        }).open();
      } catch (e) {
        setError((e as Error).message);
      }
    } else {
      setTab("payments");
      setNotice("Checkout is not configured. Review payment status below.");
    }
  }
  async function join(a: Row) {
    const r = await command(`appointments/${a.id}/join/`, {}, "");
    if (r?.token && (r.url || r.server_url)) {
      setRoom(r);
      setNotice("Consultation access verified.");
    } else if (r)
      setError(
        r.detail ||
          "Video service is not configured. Your appointment remains available.",
      );
  }
  async function exportRecords() {
    const r = await command("exports/", { child: childId }, "Record export prepared.");
    if (r) {
      const blob = new Blob([JSON.stringify(r, null, 2)], {
        type: "application/json",
      });
      const href = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = href;
      link.download = `neuronest-${child?.name || "records"}-export.json`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(href), 1000);
    }
  }
  const personOptions = list("practitioners").map((p) => ({
    value: p.user,
    label: doctorDisplayName(p.display_name, p.is_demo),
  }));
  const practitionerOptions = list("practitioners").map((p) => ({
    value: p.id,
    label: doctorDisplayName(p.display_name, p.is_demo),
  }));
  const messageOptions = list("messages/recipients").length
    ? list("messages/recipients").map((p) => ({
        value: p.id,
        label: p.display_name || p.email,
      }))
    : isStaff
      ? Array.from(
          new Map(
            list("messages")
              .filter((m) => m.author !== user?.id)
              .map((m) => [
                m.author,
                { value: m.author, label: m.author_name || "Guardian" },
              ]),
          ).values(),
        )
      : personOptions;
  const observationForm = () =>
    childAdd(
      "Record a concern",
      "observations/",
      [
        {
          ...textField("title", "What happened or changed?"),
          hint: "For example: used fewer words at dinner or covered ears during a loud event.",
        },
        selectField("domain", "What area does it relate to?", [
          { value: "communication", label: "Communication" },
          { value: "social", label: "Social connection" },
          { value: "movement", label: "Movement" },
          { value: "daily_living", label: "Everyday routines" },
          { value: "sensory", label: "Sensory experiences" },
          { value: "emotional_regulation", label: "Feelings & behaviour" },
          { value: "sleep", label: "Sleep" },
          { value: "eating", label: "Eating" },
          { value: "other", label: "Something else" },
        ]),
        selectField("status", "How would you describe it?", [
          { value: "observed", label: "Something I noticed" },
          { value: "not_yet", label: "Not doing this yet" },
          { value: "unsure", label: "I’m not sure" },
          { value: "lost", label: "Skill reduced or stopped" },
        ]),
        {
          ...textField("note", "Add any details that may help", "textarea", false),
          hint: "What happened before, during and after? Include when it started, where it happens and how often if you know.",
        },
        textField("observed_on", "Observed on", "date", true, today()),
      ],
      "This saves a parent concern for your care team. It does not diagnose autism. If a skill has reduced or stopped, contact your clinician promptly.",
    );
  const recordForm = () => {
    if (!canWriteClinicalRecords) return;
    childAdd("Add a health record", "records/", [
      textField("title", "Record title"),
      selectField(
        "kind",
        "Record type",
        user?.role === "doctor"
          ? ["note", "assessment", "prescription", "report"]
          : ["report", "note"],
      ),
      textField("body", "Record details", "textarea"),
    ]);
  };
  const goalForm = () =>
    childAdd("Set a personal goal", "goals/", [
      textField("title", "One thing to work towards"),
      textField("description", "How will you support this?", "textarea", false),
      textField("target_date", "Review date", "date", false),
    ]);
  const nav: View[] = isAdmin
    ? ["operations", "care", "library", "account"]
    : user.role === "mentor"
      ? ["care", "library", "account"]
      : user.role === "parent"
        ? [
            "today",
            "milestones",
            "activities",
            "assessments",
            "reports",
            "care",
            "library",
            "account",
          ]
        : [
            "today",
            "milestones",
            "activities",
            "reports",
            "care",
            "library",
            "account",
          ];
  const currentTitle =
    isStaff && view === "today" ? tr("Your care workspace") : t(view);
  const childAppointments = list("appointments").filter(
    (a) => !childId || a.child === childId,
  );
  const operationQueue = list("operations")[0] || ({} as Row);
  const queueOutbox = Array.isArray(operationQueue.outbox)
    ? (operationQueue.outbox as Row[])
    : [];
  const queuePayments = Array.isArray(operationQueue.payment_events)
    ? (operationQueue.payment_events as Row[])
    : [];
  const policyReadiness = list("policies")[0];
  const confirmAction = (confirmation: Confirmation) =>
    new Promise<boolean>((resolve) => setPendingConfirm({ confirmation, resolve }));
  const selectChild = (id: string) => {
    beginLoad();
    setAssistantOpen(false);
    setChildId(id);
    setProvider(null);
  };
  const workspace: WorkspaceValue = {
    user,
    isStaff,
    isAdmin,
    canWriteClinicalRecords,
    lang,
    setLang,
    tr,
    t,
    date,
    age,
    view,
    nav,
    currentTitle,
    navigate,
    tab,
    setTab,
    children,
    childrenLoaded,
    child,
    childId,
    setChildId,
    selectChild,
    list,
    errors,
    truncated,
    loading,
    refresh,
    readiness,
    notice,
    setNotice,
    error,
    setError,
    busy,
    setBusy,
    online,
    modal,
    setModal,
    confirmAction,
    add,
    childAdd,
    observationForm,
    recordForm,
    goalForm,
    payout,
    search,
    setSearch,
    provider,
    setProvider,
    slots,
    slotsLoading,
    chooseProvider,
    book,
    reschedule,
    checkout,
    childAppointments,
    personOptions,
    practitionerOptions,
    messageOptions,
    join,
    room,
    setRoom,
    assistantOpen,
    setAssistantOpen,
    chat,
    setChat,
    includeRecords,
    setIncludeRecords,
    chatScope,
    screen,
    setScreen,
    queueOutbox,
    queuePayments,
    operationNextOffset,
    policyReadiness,
    command,
    loadMoreOperations,
    exportRecords,
    logout,
  };
  return { ...workspace, pendingConfirm, setPendingConfirm };
}
