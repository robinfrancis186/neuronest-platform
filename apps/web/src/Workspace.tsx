import { Suspense, lazy, useEffect, useRef } from "react";
import {
  Bell,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Heart,
  Moon,
  MessageCircle,
  Sun,
  Users,
  X,
} from "lucide-react";
import type { Dispatch, SetStateAction } from "react";
import type { Row, User } from "./api";
import ChildPicker from "./ChildPicker";
import { icons, selectField, textField, today, type View } from "./ui/fields";
import { ConfirmDialog } from "./ui/ConfirmDialog";
import { MobileNav } from "./ui/MobileNav";
import { ModalForm } from "./ui/ModalForm";
import { useWorkspaceState } from "./use-workspace";
import { LanguageSelect } from "./ui/LanguageSelect";
import { WorkspaceProvider } from "./workspace-context";
import TodayView from "./views/Today";
import JourneyView from "./views/Journey";
import MilestonesView from "./views/Milestones";
import AssessmentView from "./views/Assessment";
import ReportsView from "./views/Reports";
import CareView from "./views/Care";
import RecordsView from "./views/Records";
import LibraryView from "./views/Library";
import PaymentDemo from "./views/PaymentDemo";
import AssistantView from "./views/Assistant";
import AccountView from "./views/Account";
import NotificationsView from "./views/Notifications";
import OperationsView from "./views/Operations";

const VideoRoom = lazy(() => import("./VideoRoom"));
const ActivitiesView = lazy(() => import("./views/Activities"));

/** The signed-in shell: navigation, page chrome, dialogs, and the current view. */
export default function Workspace(props: {
  user: User;
  lang: "en" | "ml";
  setLang: (language: "en" | "ml") => void;
  theme: "light" | "dark";
  setTheme: Dispatch<SetStateAction<"light" | "dark">>;
  childSelectionRequired: boolean;
  onChildSelected: () => void;
  onProfileUpdated: Dispatch<SetStateAction<User | null>>;
  onSignedOut: () => void;
}) {
  const workspace = useWorkspaceState(props);
  const {
    age,
    add,
    assistantOpen,
    child,
    childId,
    children,
    childrenLoaded,
    currentTitle,
    error,
    errors,
    isAdmin,
    isStaff,
    lang,
    list,
    loading,
    modal,
    nav,
    navigate,
    notice,
    online,
    readiness,
    refresh,
    room,
    selectChild,
    setError,
    setAssistantOpen,
    setLang,
    setModal,
    setNotice,
    setRoom,
    t,
    tr,
    truncated,
    user,
    view,
  } = workspace;
  const { pendingConfirm, setPendingConfirm } = workspace;
  const displayName = user.display_name?.trim();
  // Older accounts can still carry an email as their display name. Never echo it
  // into the family dashboard; a verified full name wins, otherwise greet plainly.
  const profileName = displayName && !displayName.includes("@") ? displayName : "";
  const bookingOpen =
    view === "care" &&
    !!workspace.provider &&
    !["messages", "payments", "referrals"].includes(workspace.tab);
  const mobileNav: View[] =
    isStaff && user.role !== "mentor" ? [...nav, "records"] : nav;
  const createChildProfile = () =>
    add(
      "Start your child’s profile",
      "children/",
      [
        textField("name", "Child’s name"),
        { ...textField("date_of_birth", "Date of birth", "date"), max: today() },
        selectField("language", "Preferred language", [
          { value: "en", label: "English" },
          { value: "ml", label: "Malayalam" },
        ]),
      ],
      {},
      "Start with the essentials. You can add more whenever you are ready.",
    );
  if (props.childSelectionRequired && user.role === "parent") {
    if (view === "care" && workspace.tab === "payments")
      return (
        <WorkspaceProvider value={workspace}>
          <section className="child-picker-page">
            <header className="child-picker-header">
              <div className="child-picker-brand">
                <img src="/brand/neuronest-mark.png" alt="" />
                <span>NeuroNest</span>
              </div>
              <button className="secondary" onClick={() => navigate("today")}>
                {tr("Back to child profiles")}
              </button>
            </header>
            <main className="child-picker-main">
              <h1>{tr("Project payment demo")}</h1>
              <PaymentDemo
                key={user.id}
                ready={readiness?.capabilities?.payment_demo?.ready === true}
              />
            </main>
          </section>
        </WorkspaceProvider>
      );
    return (
      <WorkspaceProvider value={workspace}>
        <ChildPicker
          children={children}
          childrenLoaded={childrenLoaded}
          error={error}
          profileName={profileName}
          age={age}
          tr={tr}
          onSelect={(id) => {
            selectChild(id);
            props.onChildSelected();
          }}
          onAddChild={createChildProfile}
          onRetry={() => {
            setError("");
            refresh();
          }}
          onSignOut={() => void workspace.logout()}
          onTestPayment={() => navigate("care", "payments")}
        />
        {modal && (
          <ModalForm
            modal={modal}
            onClose={() => setModal(null)}
            onSaved={(row) => {
              setModal(null);
              setNotice("Saved successfully.");
              refresh();
              if (typeof row.id === "string") {
                selectChild(row.id);
                props.onChildSelected();
              }
            }}
          />
        )}
      </WorkspaceProvider>
    );
  }
  return (
    <WorkspaceProvider value={workspace}>
      <div className="app-shell">
        <a className="skip-link" href="#main-content">
          {tr("Skip to main content")}
        </a>
        <aside className="sidebar">
          <a
            className="brand"
            href="#"
            onClick={(e) => {
              e.preventDefault();
              navigate(isAdmin ? "operations" : "today");
            }}
          >
            <span className="brand-mark">
              <img src="/brand/neuronest-mark.png" alt="" />
            </span>
            NeuroNest
          </a>
          <div className="workspace-label">
            {isAdmin
              ? tr("OPERATIONS WORKSPACE")
              : isStaff
                ? tr("CLINICIAN WORKSPACE")
                : tr("YOUR FAMILY SPACE")}
          </div>
          <nav aria-label={tr("Main navigation")}>
            {nav
              .filter((key) => key !== "account")
              .map((key) => {
                const Icon = icons[key];
                return (
                  <button
                    key={key}
                    className={`nav-item ${view === key ? "active" : ""}`}
                    aria-current={view === key ? "page" : undefined}
                    onClick={() => navigate(key)}
                  >
                    <Icon size={20} />
                    <span>{isStaff && key === "today" ? tr("Overview") : t(key)}</span>
                    {view === key && <span className="nav-active-dot" />}
                  </button>
                );
              })}
          </nav>
          {!isAdmin && user.role !== "mentor" && (
            <>
              <div className="sidebar-divider" />
              <nav aria-label={tr("Care tools")}>
                {(["records"] as View[]).map((key) => {
                  const Icon = icons[key];
                  return (
                    <button
                      key={key}
                      className={`nav-item ${view === key ? "active" : ""}`}
                      aria-current={view === key ? "page" : undefined}
                      onClick={() => navigate(key)}
                    >
                      <Icon size={19} />
                      <span>{t(key)}</span>
                    </button>
                  );
                })}
              </nav>
            </>
          )}
          {view !== "today" && (
            <div className="sidebar-note">
              <div className="little-heart">
                <Heart size={18} />
              </div>
              <strong>{tr("At your own pace.")}</strong>
              <p>
                {tr("Every child’s journey is different. Every little step matters.")}
              </p>
              <span className="note-line" />
            </div>
          )}
          <button
            className="sidebar-user"
            aria-current={view === "account" ? "page" : undefined}
            onClick={() => navigate("account")}
          >
            <span className="avatar peach">{profileName.slice(0, 1) || "N"}</span>
            <span>
              <strong>{profileName || tr("Your account")}</strong>
              <small>
                {user.role === "parent" ? tr("Family account") : tr(user.role)}
              </small>
            </span>
            <ChevronRight size={16} />
          </button>
        </aside>
        <div className="main-wrap">
          <header className="topbar">
            <div className="breadcrumb">
              <img
                className="topbar-mark"
                src="/brand/neuronest-mark.png"
                alt="NeuroNest"
              />
              <ChevronRight size={14} aria-hidden="true" />
              <span>{currentTitle}</span>
            </div>
            <div className="topbar-actions">
              <button
                className="icon-button"
                aria-label={tr(
                  props.theme === "light" ? "Use dark theme" : "Use light theme",
                )}
                aria-pressed={props.theme === "dark"}
                onClick={() =>
                  props.setTheme((value) => (value === "light" ? "dark" : "light"))
                }
                title={tr(
                  props.theme === "light" ? "Use dark theme" : "Use light theme",
                )}
              >
                {props.theme === "light" ? <Moon size={18} /> : <Sun size={18} />}
              </button>
              <LanguageSelect value={lang} onChange={setLang} />
              <button
                className="icon-button notification-button"
                aria-label={tr("View notifications")}
                onClick={() => navigate("notifications")}
              >
                <Bell size={19} />
                {list("notifications").some((n) => !n.read_at) && <span />}
              </button>
              <span className="avatar small lavender">
                {profileName.slice(0, 1) || "N"}
              </span>
            </div>
          </header>
          <main id="main-content" tabIndex={-1} aria-busy={loading}>
            <div className="page-intro">
              <div>
                {view === "today" && <h1 className="visually-hidden">{t("today")}</h1>}
                <div className="eyebrow">
                  {view === "today"
                    ? new Date().toLocaleDateString(lang === "ml" ? "ml-IN" : "en-IN", {
                        weekday: "long",
                        day: "numeric",
                        month: "long",
                      })
                    : isStaff
                      ? tr("CONNECTED CLINICAL CARE")
                      : tr("A HOME FOR EVERY LITTLE STEP")}
                </div>
                {view !== "today" && (
                  <>
                    <h1>
                      {view === "journey"
                        ? lang === "ml"
                          ? `${child?.name || "കുട്ടി"}യുടെ വളർച്ച`
                          : `${child?.name || "Your child"}’s journey`
                        : view === "assessments"
                          ? tr("A thoughtful check-in, at your pace.")
                          : view === "reports"
                            ? tr("A clearer picture, built from your records.")
                            : view === "care"
                              ? tr("Care")
                              : view === "library"
                                ? tr("Parent learning")
                                : view === "records"
                                  ? tr("Your story, kept together.")
                                  : currentTitle}
                    </h1>
                    {!["activities", "assessments", "reports", "care"].includes(
                      view,
                    ) && (
                      <p>
                        {view === "journey"
                          ? tr(
                              "Notice the moments. Celebrate the progress. Follow your child’s own rhythm.",
                            )
                          : view === "milestones"
                            ? tr(
                                "Answer questions for your child’s age and review your saved observations.",
                              )
                            : view === "records"
                              ? tr(
                                  "Manage records and decide who can see them. You stay in control.",
                                )
                              : view === "library"
                                ? tr(
                                    "Learn about child development, developmental differences and available support.",
                                  )
                                : tr("Everything you need, thoughtfully connected.")}
                      </p>
                    )}
                  </>
                )}
              </div>
              {!isAdmin && (
                <div className="child-switcher">
                  <span className="avatar sage">
                    {child?.name?.slice(0, 1) || <Users size={18} />}
                  </span>
                  <label>
                    <span>{isStaff ? tr("SELECTED PATIENT") : tr("GROWING WITH")}</span>
                    <select
                      aria-label={tr("Select child profile")}
                      value={childId}
                      onChange={(e) => selectChild(e.target.value)}
                    >
                      {children.length ? (
                        children.map((c) => (
                          <option value={c.id} key={c.id}>
                            {c.name} · {age(c.date_of_birth)}
                          </option>
                        ))
                      ) : (
                        <option value="">{tr("No child profiles")}</option>
                      )}
                    </select>
                  </label>
                  <ChevronDown size={15} />
                </div>
              )}
            </div>
            {!online && (
              <div className="banner" role="status">
                {tr(
                  "You’re offline. Records need a secure connection. Reconnect before saving or refreshing.",
                )}
              </div>
            )}
            {error && (
              <div className="error" role="alert">
                {error}
                <button
                  className="icon-button"
                  onClick={() => setError("")}
                  aria-label={tr("Dismiss error")}
                >
                  <X size={16} />
                </button>
              </div>
            )}
            {notice && (
              <div className="toast" role="status">
                <CheckCircle2 size={19} />
                {tr(notice)}
                <button
                  className="icon-button"
                  onClick={() => setNotice("")}
                  aria-label={tr("Dismiss notification")}
                >
                  <X size={16} />
                </button>
              </div>
            )}
            {loading && (
              <div
                className="loading-bar"
                role="status"
                aria-label={tr("Loading current records")}
              />
            )}
            {view === "today" && <TodayView />}
            {view === "journey" && <JourneyView />}
            {view === "milestones" && (
              <MilestonesView key={`${childId}:${child?.date_of_birth}`} />
            )}
            {view === "assessments" && <AssessmentView />}
            {view === "activities" && (
              <Suspense fallback={<p role="status">{tr("Loading activities…")}</p>}>
                <ActivitiesView key={`${childId}:${workspace.tab}`} />
              </Suspense>
            )}
            {view === "reports" && (
              <ReportsView
                child={child}
                observations={list("observations")}
                goals={list("goals")}
                growth={list("growth")}
                screenings={list("screenings")}
                therapySessions={list("therapy-sessions")}
                appointments={list("appointments")}
                milestoneCheckins={list("milestone-checkins")}
                parentQuestionnaires={list("parent-questionnaires")}
                onMilestones={() => navigate("milestones")}
                onAssessments={
                  user.role === "parent" ? () => navigate("assessments") : undefined
                }
                truncated={truncated}
                errors={errors}
                loading={loading}
                onRetry={refresh}
                tr={tr}
                lang={lang}
              />
            )}
            {view === "care" && <CareView />}
            {view === "records" && <RecordsView />}
            {view === "library" && <LibraryView />}
            {view === "account" && <AccountView />}
            {view === "notifications" && <NotificationsView />}
            {view === "operations" && <OperationsView />}
          </main>
        </div>
        {!bookingOpen && (
          <button
            type="button"
            className="assistant-launcher"
            aria-label={tr("Open Nest Assistant")}
            aria-controls="assistant-dialog"
            aria-expanded={assistantOpen}
            aria-haspopup="dialog"
            onClick={() => setAssistantOpen(true)}
          >
            <span className="assistant-launcher-icon" aria-hidden="true">
              <MessageCircle size={20} strokeWidth={1.8} />
            </span>
            <span className="assistant-launcher-label">{tr("Ask Nest")}</span>
            <ChevronRight
              size={20}
              className="assistant-launcher-chevron"
              strokeWidth={1.8}
              aria-hidden="true"
            />
          </button>
        )}
        <AssistantDialog open={assistantOpen} onClose={() => setAssistantOpen(false)} />
        <MobileNav
          destinations={mobileNav}
          view={view}
          navigate={navigate}
          label={tr("Mobile navigation")}
          name={(destination) =>
            lang === "ml"
              ? (
                  {
                    milestones: "വളർച്ച",
                    activities: "കളികൾ",
                    assessments: "ചെക്ക്-ഇൻ",
                    reports: "റിപ്പോർട്ട്",
                    records: "രേഖകൾ",
                  } as Partial<Record<View, string>>
                )[destination] || t(destination)
              : t(destination)
          }
          moreLabel={tr("More")}
        />
        {pendingConfirm && (
          <ConfirmDialog
            confirmation={pendingConfirm.confirmation}
            onResolve={(confirmed) => {
              pendingConfirm.resolve(confirmed);
              setPendingConfirm(null);
            }}
          />
        )}
        {modal && (
          <ModalForm
            modal={modal}
            onClose={() => setModal(null)}
            onSaved={(row) => {
              setModal(null);
              if (typeof row?.display_name === "string")
                props.onProfileUpdated((current) =>
                  current ? { ...current, display_name: row.display_name } : current,
                );
              setNotice("Saved successfully.");
              refresh();
            }}
          />
        )}
        {room && (
          <VideoOverlay
            room={room}
            error={error}
            onError={setError}
            onClose={() => setRoom(null)}
            tr={tr}
          />
        )}
      </div>
    </WorkspaceProvider>
  );
}

function AssistantDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open) {
      if (!dialog.open) dialog.showModal();
      requestAnimationFrame(() =>
        dialog.querySelector<HTMLTextAreaElement>('textarea[name="message"]')?.focus(),
      );
    } else if (dialog.open) dialog.close();
  }, [open]);
  useEffect(() => () => ref.current?.close(), []);
  return (
    <dialog
      ref={ref}
      id="assistant-dialog"
      className="assistant-dialog"
      aria-labelledby="assistant-dialog-title"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      <AssistantView
        compact
        headingId="assistant-dialog-title"
        onClose={onClose}
        active={open}
      />
    </dialog>
  );
}

function VideoOverlay({
  room,
  error,
  onError,
  onClose,
  tr,
}: {
  room: Row;
  error: string;
  onError: (message: string) => void;
  onClose: () => void;
  tr: (text: string) => string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    const previousFocus = document.activeElement;
    dialog?.showModal();
    return () => {
      dialog?.close();
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected)
        previousFocus.focus();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className="video-overlay"
      aria-label={tr("Private consultation")}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <div className="video-top">
        <span>{tr(room.is_demo ? "Demo consultation · recording disabled" : "Private consultation · recording disabled")}</span>
        {room.is_demo && !room.demo_doctor && (
          <a className="button secondary" target="_blank" rel="noopener" href={`/care/appointments?${new URLSearchParams({ child: String(room.child), demo_call: String(room.appointment) })}`}>
            {tr("Open demo doctor view")}
          </a>
        )}
        <button className="secondary" onClick={onClose}>
          <X size={16} />
          {tr("Leave consultation")}
        </button>
      </div>
      <Suspense fallback={<p>{tr("Connecting to your consultation…")}</p>}>
        <VideoRoom room={room} onLeave={onClose} onError={onError} />
      </Suspense>
    </dialog>
  );
}
