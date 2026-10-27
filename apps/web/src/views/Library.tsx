import {
  ArrowUpRight,
  BookOpen,
  ExternalLink,
  Play,
  Search,
  ShieldCheck,
  Users,
  Video,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
  learningCatalog,
  type LearningResource,
} from "../../../../packages/contracts/learning-catalog";
import { youtubeThumbnail } from "../youtube-thumbnail";
import { safeExternal } from "../ui/fields";
import { Badge, Empty, Section, Status } from "../ui/primitives";
import { DataError, Truncation } from "../views/shared";
import { Tabs } from "../ui/Tabs";
import { useWorkspace } from "../workspace-context";

export default function LibraryView() {
  const { date, list, search, setSearch, setTab, tab, tr } = useWorkspace();
  const [playing, setPlaying] = useState<LearningResource | null>(null);
  const resources = learningCatalog.resources.filter((resource) =>
    `${resource.title} ${resource.summary} ${resource.sourceLabel}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );
  return (
    <>
      <div className="filter-bar">
        <label className="search-field">
          <Search size={18} />
          <input
            aria-label={tr("Search learning resources")}
            placeholder={tr("What would you like to understand?")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        <Tabs
          className="compact"
          label="Library sections"
          active={tab || "all"}
          onSelect={setTab}
          tabs={[
            { key: "all", label: "All learning" },
            { key: "video", label: "Topics" },
            { key: "article", label: "Read" },
            { key: "resources", label: "Local support" },
          ]}
        />
      </div>
      {tab === "resources" ? (
        <Section title={tr("A network beyond your screen")}>
          <DataError name="resources" />
          <Truncation name="resources" />
          {list("resources")
            .filter((r) => r.review_status === "approved")
            .filter((r) =>
              `${r.name} ${r.location} ${r.kind}`
                .toLowerCase()
                .includes(search.toLowerCase()),
            )
            .map((r) => (
              <article className="list-row" key={r.id}>
                <span className="round-icon sage">
                  <Users />
                </span>
                <div className="grow">
                  <h3>{r.name}</h3>
                  <p>{r.summary}</p>
                  <small>
                    {r.location} · {r.kind}
                    {tr("· Reviewed")}
                    {date(r.verified_at)}
                  </small>
                </div>
                {safeExternal(r.url) && (
                  <a
                    className="button secondary"
                    href={safeExternal(r.url)}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {tr("Visit resource")}
                    <ExternalLink size={15} />
                  </a>
                )}
              </article>
            ))}
          {!list("resources").length && (
            <Empty title={tr("Curated support resources appear here")} />
          )}
        </Section>
      ) : (
        <>
          {(tab === "all" || !tab || tab === "video") && (
            <section
              className="submitted-learning"
              aria-labelledby="parent-topics-title"
            >
              <div className="submitted-learning-head">
                <h2 id="parent-topics-title">{tr("Understanding neurodevelopment")}</h2>
              </div>
              <div className="content-grid">
                {resources.map((resource) => (
                  <LearningCard
                    key={resource.catalogId}
                    resource={resource}
                    onPlay={setPlaying}
                  />
                ))}
              </div>
              {!resources.length && <Empty title={tr("No matching topics")} />}
            </section>
          )}
          {tab !== "video" && (
            <>
              <DataError name="content" />
              <Truncation name="content" />
              <div className="content-grid">
                {list("content")
                  .filter(
                    (c) =>
                      c.review_status === "approved" &&
                      c.kind === "article" &&
                      (!tab || tab === "all" || c.kind === tab) &&
                      `${c.title} ${c.summary}`
                        .toLowerCase()
                        .includes(search.toLowerCase()),
                  )
                  .map((c, i) => (
                    <article className="content-card" key={c.id}>
                      <div className={`content-art art-${i % 3}`}>
                        <div className="art-shape" />
                        <span>
                          <BookOpen size={36} />
                        </span>
                      </div>
                      <div className="content-copy">
                        <div className="section-head">
                          <span className="eyebrow">{tr("Read")}</span>
                          <Badge tone="cream">
                            {c.language === "ml" ? "മലയാളം" : "English"}
                          </Badge>
                        </div>
                        <h2>{c.title}</h2>
                        <p>{c.summary}</p>
                        <div className="content-footer">
                          <small>
                            <ShieldCheck size={13} />
                            {tr("Reviewed resource")}
                          </small>
                          {c.available === false ? (
                            <Status value="unavailable" />
                          ) : (
                            safeExternal(c.url || c.source_url) && (
                              <a
                                className="text-button"
                                href={safeExternal(c.url || c.source_url)}
                                target="_blank"
                                rel="noreferrer"
                              >
                                {tr("Read resource")}
                                <ArrowUpRight size={16} />
                              </a>
                            )
                          )}
                        </div>
                      </div>
                    </article>
                  ))}
              </div>
            </>
          )}
        </>
      )}
      {playing && (
        <LearningPlayer resource={playing} onClose={() => setPlaying(null)} />
      )}
    </>
  );
}

function LearningCard({
  resource,
  onPlay,
}: {
  resource: LearningResource;
  onPlay: (resource: LearningResource) => void;
}) {
  const { tr } = useWorkspace();
  const sourceUrl = safeExternal(resource.sourceUrl);
  const play = youtubeThumbnail(resource) ? () => onPlay(resource) : undefined;
  const label =
    resource.kind === "search"
      ? "Find videos"
      : resource.kind === "collection"
        ? "Browse videos"
        : "Watch video";
  return (
    <article className="content-card learning-topic">
      <LearningPreview resource={resource} onPlay={play} />
      <div className="learning-topic-copy">
        <h3>{resource.title}</h3>
        <small>{resource.sourceLabel}</small>
        <p>{resource.summary}</p>
        {resource.availability === "unavailable" ? (
          <p role="status">{tr("This resource is currently unavailable.")}</p>
        ) : play ? (
          <button type="button" className="text-button" onClick={play}>
            {tr("Watch video")} <Play size={16} aria-hidden="true" />
          </button>
        ) : (
          sourceUrl && (
            <a
              className="text-button"
              href={sourceUrl}
              target="_blank"
              rel="noreferrer"
            >
              {tr(label)}
              <ArrowUpRight size={16} />
              <span className="visually-hidden">
                {" "}
                — {resource.title} ({tr("opens in a new tab")})
              </span>
            </a>
          )
        )}
      </div>
    </article>
  );
}

function LearningPreview({
  resource,
  onPlay,
}: {
  resource: LearningResource;
  onPlay?: () => void;
}) {
  const { tr } = useWorkspace();
  const [failed, setFailed] = useState(false);
  const thumbnail = youtubeThumbnail(resource);
  const href = safeExternal(resource.sourceUrl);
  const available = resource.availability !== "unavailable";
  const label =
    resource.kind === "collection"
      ? "Browse videos"
      : resource.kind === "search"
        ? "Find videos"
        : "Watch video";
  const preview =
    thumbnail && !failed ? (
      <>
        <img
          src={thumbnail}
          alt=""
          width={480}
          height={360}
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
        />
        <span className="learning-preview-play" aria-hidden="true">
          <Play size={24} fill="currentColor" />
        </span>
        <span className="learning-preview-label" aria-hidden="true">
          YouTube
        </span>
      </>
    ) : (
      <span className="learning-preview-fallback" aria-hidden="true">
        {resource.kind === "collection" ? (
          <BookOpen size={34} />
        ) : resource.kind === "search" ? (
          <Search size={34} />
        ) : (
          <Video size={34} />
        )}
        <span>
          {tr(
            resource.kind === "collection"
              ? "Video collection"
              : resource.kind === "search"
                ? "Find videos"
                : "Video preview unavailable",
          )}
        </span>
      </span>
    );
  return onPlay ? (
    <button
      type="button"
      className="learning-preview"
      onClick={onPlay}
      aria-label={`${tr("Watch video")}: ${resource.title}`}
    >
      {preview}
    </button>
  ) : href && available ? (
    <a
      className="learning-preview"
      href={href}
      target="_blank"
      rel="noreferrer"
      aria-label={`${tr(label)}: ${resource.title} (${tr("opens in a new tab")})`}
    >
      {preview}
    </a>
  ) : (
    <div className="learning-preview">{preview}</div>
  );
}

function LearningPlayer({
  resource,
  onClose,
}: {
  resource: LearningResource;
  onClose: () => void;
}) {
  const { lang, tr } = useWorkspace();
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
      className="learning-player"
      aria-labelledby="learning-player-title"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target !== event.currentTarget) return;
        const rect = event.currentTarget.getBoundingClientRect();
        if (
          event.clientX < rect.left ||
          event.clientX > rect.right ||
          event.clientY < rect.top ||
          event.clientY > rect.bottom
        )
          onClose();
      }}
    >
      <header className="learning-player-header">
        <h2 id="learning-player-title">{resource.title}</h2>
        <button
          type="button"
          className="icon-button"
          aria-label={tr("Close video")}
          onClick={onClose}
        >
          <X size={22} aria-hidden="true" />
        </button>
      </header>
      <iframe
        className="learning-player-frame"
        src={`https://www.youtube-nocookie.com/embed/${resource.youtubeId}?autoplay=1&playsinline=1&rel=0&hl=${lang}`}
        title={`${tr("Watch video")}: ${resource.title}`}
        referrerPolicy="strict-origin"
        allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
        allowFullScreen
      />
      <footer className="learning-player-footer">
        <span>{resource.sourceLabel}</span>
        <a
          href={resource.sourceUrl}
          target="_blank"
          rel="noreferrer"
          className="text-button"
        >
          {tr("Open on YouTube")} <ExternalLink size={15} aria-hidden="true" />
        </a>
      </footer>
    </dialog>
  );
}
