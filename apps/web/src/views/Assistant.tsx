import {
  ArrowRight,
  BookOpen,
  ChevronLeft,
  ExternalLink,
  Grid2X2,
  MessageCircle,
  RefreshCw,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { api, apiPage } from "../api";
import { activityAge } from "../activities";
import {
  activityDestinations,
  activityRequest,
  recommendActivities,
} from "../assistant-activities";
import type { MilestoneCheckIn } from "../milestones";
import { today } from "../ui/fields";
import { guideDestinations, type GuideDestination } from "../assistant-guide";
import { safeExternal } from "../ui/fields";
import { icons } from "../ui/fields";
import { useWorkspace } from "../workspace-context";
import "./Assistant.css";

export default function AssistantView({
  compact = false,
  headingId,
  onClose,
  active = true,
}: {
  compact?: boolean;
  headingId?: string;
  onClose?: () => void;
  active?: boolean;
}) {
  const messageRef = useRef<HTMLTextAreaElement>(null);
  const streamRef = useRef<HTMLDivElement>(null);
  const followLatest = useRef(true);
  const [draft, setDraft] = useState("");
  const [guide, setGuide] = useState<GuideDestination[]>([]);
  const [directory, setDirectory] = useState(false);
  const [guideError, setGuideError] = useState(false);
  const [guideRevision, setGuideRevision] = useState(0);
  const {
    busy,
    chat,
    chatScope,
    child,
    childId,
    childrenLoaded,
    lang,
    nav,
    navigate,
    online,
    setBusy,
    setChat,
    tr,
    user,
  } = useWorkspace();
  useEffect(() => {
    setDraft("");
    setDirectory(false);
    followLatest.current = true;
  }, [childId, lang]);
  useEffect(() => {
    if (!active) return;
    const controller = new AbortController();
    setGuide([]);
    setGuideError(false);
    api<{ destinations: unknown }>(
      `assistant-guide/?language=${lang}`,
      "GET",
      undefined,
      controller.signal,
    )
      .then((result) => {
        if (!controller.signal.aborted)
          setGuide(guideDestinations(result.destinations, user.role, nav));
      })
      .catch(() => {
        if (!controller.signal.aborted) setGuideError(true);
      });
    return () => controller.abort();
    // The role determines permitted routes; nav is rebuilt on each workspace render.
  }, [active, lang, user.role, guideRevision]);
  useEffect(() => {
    if (followLatest.current && streamRef.current)
      streamRef.current.scrollTop = streamRef.current.scrollHeight;
  }, [chat, busy]);
  const go = (destination: GuideDestination) => {
    onClose?.();
    navigate(destination.view, destination.tab);
    requestAnimationFrame(() =>
      document.getElementById("main-content")?.focus({ preventScroll: true }),
    );
  };
  const activityOptions = nav.includes("activities")
    ? activityDestinations(activityAge(child?.date_of_birth, today()), tr)
    : [];
  const suggestions = async () => {
    let checkins: MilestoneCheckIn[] = [];
    let unavailable = false;
    if (childId) {
      try {
        checkins = (
          await apiPage<MilestoneCheckIn>(
            `milestone-checkins/?child=${encodeURIComponent(childId)}&limit=1`,
          )
        ).results;
      } catch {
        unavailable = true;
      }
    }
    return recommendActivities(
      childId,
      activityAge(child?.date_of_birth, today()),
      checkins,
      lang,
      tr,
      unavailable,
    );
  };
  const send = async (message: string, activities = false) => {
    message = message.trim();
    if (!message || busy || !online || (activities && !childrenLoaded)) return;
    followLatest.current = true;
    setDirectory(false);
    setChat((c) => [...c, { role: "user", text: message }]);
    setDraft("");
    setBusy("assistant");
    const context = chatScope.current;
    try {
      const result = activities
        ? null
        : await api("assistant/", "POST", {
            message,
            language: lang,
            include_records: false,
            app_help: true,
          });
      if (context !== chatScope.current) return;
      if (
        nav.includes("activities") &&
        (activities ||
          ((activityRequest(message) || result?.actions?.includes("activities")) &&
            (!result?.escalation || result.escalation === "none") &&
            result?.status === "navigation"))
      ) {
        const recommended = await suggestions();
        if (context === chatScope.current)
          setChat((c) => [...c, { role: "assistant", ...recommended }]);
        return;
      }
      if (context === chatScope.current && result)
        setChat((c) => [
          ...c,
          {
            role: "assistant",
            text:
              result.answer ||
              tr("Tell me what you want to do, and I’ll help you find it."),
            citations: result.citations,
            actions: Array.isArray(result.actions)
              ? result.actions.filter(
                  (id: unknown): id is string => typeof id === "string",
                )
              : [],
            status:
              result.escalation && result.escalation !== "none"
                ? "escalation"
                : result.status,
          },
        ]);
    } catch {
      if (context === chatScope.current)
        setChat((c) => [
          ...c,
          {
            role: "assistant",
            text: tr(
              "I couldn’t find a page just now. Try a shortcut below or ask again.",
            ),
            status: "unavailable",
          },
        ]);
    } finally {
      setBusy((current) => (current === "assistant" ? "" : current));
    }
  };
  const shortcuts = ["milestones", "booking", "reports", "records"]
    .map((id) => guide.find((d) => d.id === id))
    .filter((d): d is GuideDestination => !!d);
  if (shortcuts.length === 0) shortcuts.push(...guide.slice(0, 4));
  const destinationButton = (d: GuideDestination, detailed = false) => {
    const Icon = icons[d.view];
    return (
      <button
        type="button"
        className={`assistant-destination${detailed ? " detailed" : ""}`}
        key={d.id}
        onClick={() => go(d)}
      >
        <span className="assistant-destination-icon">
          <Icon size={18} aria-hidden="true" />
        </span>
        <span>
          <strong>{d.label}</strong>
          {detailed && <small>{d.description}</small>}
        </span>
        <ArrowRight size={16} aria-hidden="true" />
      </button>
    );
  };
  return (
    <div className={`assistant-layout nest-chat${compact ? " assistant-widget" : ""}`}>
      <section className="card chat-card">
        <div className="section-head">
          <div className="row-actions">
            <span className="assistant-brand-mark" aria-hidden="true">
              <img src="/brand/neuronest-mark.png" alt="" />
            </span>
            <div>
              <h2 id={headingId}>{tr("Nest Assistant")}</h2>
              <small>
                {tr("Your guide to NeuroNest")}
                {child ? ` · ${child.name}` : ""}
              </small>
            </div>
          </div>
          {onClose && (
            <button
              type="button"
              className="icon-button assistant-close"
              onClick={onClose}
              aria-label={tr("Close dialog")}
            >
              <X size={19} />
            </button>
          )}
        </div>
        <div
          className="chat-stream"
          ref={streamRef}
          role="log"
          aria-label={tr("Conversation")}
          aria-live="polite"
          onScroll={() => {
            const el = streamRef.current;
            if (el)
              followLatest.current =
                el.scrollHeight - el.scrollTop - el.clientHeight < 64;
          }}
        >
          {directory ? (
            <div className="assistant-directory">
              <button
                type="button"
                className="text-button"
                onClick={() => setDirectory(false)}
              >
                <ChevronLeft size={16} />
                {tr("Back to conversation")}
              </button>
              <h3>{tr("Where would you like to go?")}</h3>
              <div className="assistant-directory-list">
                {guide.map((d) => destinationButton(d, true))}
              </div>
            </div>
          ) : chat.length === 0 ? (
            <div className="chat-welcome">
              <span className="nest-welcome-symbol">
                <MessageCircle size={26} strokeWidth={1.6} aria-hidden="true" />
              </span>
              <h3>{tr("What would you like to do?")}</h3>
              <p>{tr("Tell me what you need. I’ll help you find the right place.")}</p>
              {nav.includes("activities") && (
                <button
                  type="button"
                  className="secondary"
                  disabled={!!busy || !online || !childrenLoaded}
                  onClick={() => void send(tr("Suggest activities for my child"), true)}
                >
                  {tr("Suggest activities for my child")}
                </button>
              )}
              <div className="assistant-shortcuts">
                {shortcuts.map((d) => destinationButton(d))}
              </div>
              {!guide.length && !guideError && (
                <p role="status">{tr("Loading page shortcuts…")}</p>
              )}
              <button
                type="button"
                className="text-button assistant-browse"
                onClick={() => setDirectory(true)}
                disabled={!guide.length}
              >
                <Grid2X2 size={15} />
                {tr("Browse all sections")}
              </button>
            </div>
          ) : (
            chat.map((m, i) => (
              <article key={i} className={`chat-message ${m.role}`}>
                <div>
                  <strong>
                    {m.role === "user" ? tr("You") : tr("Nest Assistant")}
                  </strong>
                  <p>{m.text}</p>
                  {!!m.recommendations?.length && (
                    <div className="assistant-result-actions">
                      {m.recommendations
                        .filter((d) =>
                          activityOptions.some((option) => option.id === d.id),
                        )
                        .map((d) => destinationButton(d, true))}
                    </div>
                  )}
                  {!!m.actions?.length && (
                    <div className="assistant-result-actions">
                      {m.actions
                        .map((id) => guide.find((d) => d.id === id))
                        .filter((d): d is GuideDestination => !!d)
                        .map((d) => destinationButton(d, true))}
                    </div>
                  )}
                  {!!m.citations?.length && (
                    <div className="citations">
                      {m.citations.map(
                        (c, j) =>
                          safeExternal(c.url) && (
                            <a
                              key={j}
                              href={safeExternal(c.url)}
                              target="_blank"
                              rel="noreferrer"
                            >
                              <BookOpen size={13} />
                              {c.title}
                              <ExternalLink size={11} />
                            </a>
                          ),
                      )}
                    </div>
                  )}
                </div>
              </article>
            ))
          )}
          {busy === "assistant" && (
            <div className="nest-pending" role="status">
              <RefreshCw size={15} className="spin" />
              {tr("Finding the right place…")}
            </div>
          )}
        </div>
        {guideError && (
          <p className="nest-offline" role="status">
            {tr("Page shortcuts couldn’t load. You can still ask for help.")}{" "}
            <button
              type="button"
              className="text-button"
              onClick={() => setGuideRevision((v) => v + 1)}
            >
              {tr("Try again")}
            </button>
          </p>
        )}
        {!online && (
          <p className="nest-offline" role="status">
            {tr(
              "You’re offline. Saved shortcuts still work; send your message when reconnected.",
            )}
          </p>
        )}
        {chat.length > 0 && !directory && nav.includes("activities") && (
          <button
            type="button"
            className="text-button assistant-browse conversation-browse"
            disabled={!!busy || !online || !childrenLoaded}
            onClick={() => void send(tr("Suggest activities for my child"), true)}
          >
            {tr("Suggest activities for my child")}
          </button>
        )}
        {chat.length > 0 && !directory && (
          <button
            type="button"
            className="text-button assistant-browse conversation-browse"
            onClick={() => setDirectory(true)}
            disabled={!guide.length}
          >
            <Grid2X2 size={15} />
            {tr("Browse all sections")}
          </button>
        )}
        <form
          className="chat-composer"
          onSubmit={(e) => {
            e.preventDefault();
            void send(draft);
          }}
        >
          <label className="visually-hidden" htmlFor="chat-message">
            {tr("Message to Nest Assistant")}
          </label>
          <textarea
            id="chat-message"
            ref={messageRef}
            name="message"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                e.currentTarget.form?.requestSubmit();
              }
            }}
            rows={2}
            placeholder={tr("Ask me where to find something…")}
            maxLength={4000}
            required
          />
          <button
            aria-label={tr("Send message")}
            disabled={!!busy || !online || !draft.trim()}
          >
            {busy === "assistant" ? (
              <RefreshCw className="spin" size={19} />
            ) : (
              <ArrowRight size={20} />
            )}
          </button>
        </form>
      </section>
    </div>
  );
}
