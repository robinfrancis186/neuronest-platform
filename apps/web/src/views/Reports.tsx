import {
  Activity,
  CalendarCheck2,
  ClipboardList,
  HeartHandshake,
  Target,
} from "lucide-react";
import {
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import type { Child, Row } from "../api";
import { rowsForReportChild } from "../reports-utils";
import { MILESTONE_ANSWERS } from "../milestones";
import "./Reports.css";

export type ReportPeriod = "30d" | "90d" | "all";

/**
 * The caller supplies already-authorized, child-scoped rows. The component also
 * filters an explicit child id defensively before it turns them into a visual.
 */
export type ReportsViewProps = {
  child?: Child | null;
  observations?: readonly Row[];
  goals?: readonly Row[];
  screenings?: readonly Row[];
  therapySessions?: readonly Row[];
  appointments?: readonly Row[];
  milestoneCheckins?: readonly Row[];
  parentQuestionnaires?: readonly Row[];
  onMilestones?: () => void;
  onAssessments?: () => void;
  growth?: readonly Row[];
  truncated?: Record<string, number>;
  errors?: Record<string, string>;
  loading?: boolean;
  onRetry?: () => void;
  tr?: (value: string) => string;
  lang?: "en" | "ml";
};

type DatedRow = { row: Row; at: Date };
type ActivityKind = "observations" | "therapy" | "appointments";
type ActivityPoint = { kind: ActivityKind; at: Date };
type Bucket = { label: string; values: Record<ActivityKind, number> };

const PERIODS: ReadonlyArray<{ key: ReportPeriod; label: string; days?: number }> = [
  { key: "30d", label: "30 days", days: 30 },
  { key: "90d", label: "90 days", days: 90 },
  { key: "all", label: "All recorded" },
];

const ACTIVITY: ReadonlyArray<{ key: ActivityKind; label: string; color: string }> = [
  { key: "observations", label: "Observations", color: "#477968" },
  { key: "therapy", label: "Therapy sessions", color: "#7057a6" },
  { key: "appointments", label: "Appointments", color: "#c87a5b" },
];

const OBSERVATION_DOMAINS: Record<string, string> = {
  communication: "Communication",
  social: "Social connection",
  movement: "Movement",
  motor: "Movement",
  daily_living: "Everyday routines",
  sensory: "Sensory experiences",
  emotional_regulation: "Feelings & behaviour",
  sleep: "Sleep",
  eating: "Eating",
  other: "Something else",
};

const STATUS_LABELS: Record<string, string> = {
  active: "Active",
  achieved: "Achieved",
  paused: "Paused",
  created: "Created",
  incomplete: "Incomplete",
  follow_up_required: "Follow up required",
  completed: "Completed",
  reviewed: "Reviewed",
  clinician_reviewed: "Clinician reviewed",
  unavailable: "Unavailable",
};

function asDate(value: unknown): Date | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const localDate = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  const date = localDate
    ? new Date(Number(localDate[1]), Number(localDate[2]) - 1, Number(localDate[3]))
    : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function rowDate(row: Row, fields: readonly string[]): Date | null {
  for (const field of fields) {
    const date = asDate(row[field]);
    if (date) return date;
  }
  return null;
}

function dated(rows: readonly Row[], fields: readonly string[]): DatedRow[] {
  return rows.flatMap((row) => {
    const at = rowDate(row, fields);
    return at ? [{ row, at }] : [];
  });
}

function withinPeriod(rows: readonly DatedRow[], start: Date, end: Date) {
  return rows.filter(({ at }) => at >= start && at <= end);
}

function titleCase(value: unknown) {
  return String(value || "Other")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function countBy(rows: readonly DatedRow[], field: string) {
  return rows.reduce<Record<string, number>>((counts, { row }) => {
    const key = String(row[field] || "other");
    counts[key] = (counts[key] || 0) + 1;
    return counts;
  }, {});
}

function formatShortDate(value: Date, lang: "en" | "ml") {
  return new Intl.DateTimeFormat(lang === "ml" ? "ml-IN" : "en-IN", {
    day: "numeric",
    month: "short",
  }).format(value);
}

function formatMeasurement(
  value: unknown,
  unit: string,
  lang: "en" | "ml",
  tr: (value: string) => string,
) {
  const number = Number(value);
  if (!Number.isFinite(number)) return tr("Not recorded");
  return `${new Intl.NumberFormat(lang === "ml" ? "ml-IN" : "en-IN", {
    maximumFractionDigits: 2,
  }).format(number)} ${unit}`;
}

function makeBuckets(
  start: Date,
  end: Date,
  points: readonly ActivityPoint[],
  lang: "en" | "ml",
): Bucket[] {
  const count = 6;
  const range = Math.max(end.getTime() - start.getTime(), 1);
  const buckets = Array.from({ length: count }, (_, index) => {
    const bucketStart = new Date(start.getTime() + (range * index) / count);
    const bucketEnd = new Date(start.getTime() + (range * (index + 1)) / count);
    return {
      label:
        index === count - 1
          ? `${formatShortDate(bucketStart, lang)}–${formatShortDate(end, lang)}`
          : `${formatShortDate(bucketStart, lang)}–${formatShortDate(bucketEnd, lang)}`,
      values: { observations: 0, therapy: 0, appointments: 0 },
    };
  });
  for (const point of points) {
    const index = Math.min(
      count - 1,
      Math.max(0, Math.floor(((point.at.getTime() - start.getTime()) / range) * count)),
    );
    buckets[index].values[point.kind] += 1;
  }
  return buckets;
}

function pathFor(buckets: readonly Bucket[], key: ActivityKind, max: number) {
  return buckets
    .map((bucket, index) => {
      const x = 34 + (index * 392) / Math.max(buckets.length - 1, 1);
      const y = 130 - (bucket.values[key] / max) * 92;
      return `${x},${y}`;
    })
    .join(" ");
}

function Metric({
  icon,
  value,
  label,
  detail,
}: {
  icon: ReactNode;
  value: number;
  label: string;
  detail: string;
}) {
  return (
    <article className="reports-metric">
      <span className="reports-metric-icon" aria-hidden="true">
        {icon}
      </span>
      <div>
        <strong>{value}</strong>
        <span>{label}</span>
        <small>{detail}</small>
      </div>
    </article>
  );
}

function EmptyChart({ children }: { children: ReactNode }) {
  return <p className="reports-empty-chart">{children}</p>;
}

export default function ReportsView({
  child,
  observations = [],
  goals = [],
  screenings = [],
  therapySessions = [],
  appointments = [],
  milestoneCheckins = [],
  parentQuestionnaires = [],
  onMilestones,
  onAssessments,
  growth = [],
  truncated = {},
  errors = {},
  loading = false,
  onRetry,
  tr = (value) => value,
  lang = "en",
}: ReportsViewProps) {
  const [period, setPeriod] = useState<ReportPeriod>("30d");
  const tabListRef = useRef<HTMLDivElement>(null);
  const uid = useId();
  const selectedPeriod = PERIODS.find((item) => item.key === period) || PERIODS[0];

  const report = useMemo(() => {
    const now = new Date();
    const scopedObservations = rowsForReportChild(observations, child?.id);
    const scopedGoals = rowsForReportChild(goals, child?.id);
    const scopedScreenings = rowsForReportChild(screenings, child?.id);
    const scopedTherapy = rowsForReportChild(therapySessions, child?.id);
    const scopedAppointments = rowsForReportChild(appointments, child?.id);
    const scopedGrowth = rowsForReportChild(growth, child?.id);
    const observed = dated(scopedObservations, ["observed_on", "created_at"]);
    const achievedGoals = dated(
      scopedGoals.filter((row) => row.status === "achieved"),
      ["achieved_at", "created_at", "target_date"],
    );
    const screeningRows = dated(scopedScreenings, ["reviewed_at", "created_at"]);
    const completedTherapy = dated(
      scopedTherapy.filter((row) => row.status === "completed"),
      ["scheduled_at", "created_at"],
    );
    const completedAppointments = dated(
      scopedAppointments.filter((row) => row.status === "completed"),
      ["ends_at", "starts_at", "created_at"],
    );
    const recordedGrowth = dated(scopedGrowth, ["measured_on", "created_at"]);
    const milestoneRows = dated(rowsForReportChild(milestoneCheckins, child?.id), [
      "created_at",
    ]);
    const questionnaireRows = dated(
      rowsForReportChild(parentQuestionnaires, child?.id),
      ["created_at"],
    );
    const earliest = [
      ...observed,
      ...achievedGoals,
      ...screeningRows,
      ...completedTherapy,
      ...completedAppointments,
      ...recordedGrowth,
      ...milestoneRows,
      ...questionnaireRows,
    ].reduce<Date | null>(
      (first, point) => (!first || point.at < first ? point.at : first),
      null,
    );
    const start = selectedPeriod.days
      ? new Date(now.getTime() - selectedPeriod.days * 24 * 60 * 60 * 1000)
      : earliest || now;
    const filtered = {
      observed: withinPeriod(observed, start, now),
      achievedGoals: withinPeriod(achievedGoals, start, now),
      screenings: withinPeriod(screeningRows, start, now),
      therapy: withinPeriod(completedTherapy, start, now),
      appointments: withinPeriod(completedAppointments, start, now),
      milestoneCheckins: withinPeriod(milestoneRows, start, now).sort(
        (a, b) => b.at.getTime() - a.at.getTime(),
      ),
      parentQuestionnaires: withinPeriod(questionnaireRows, start, now),
    };
    const activity = [
      ...filtered.observed.map(({ at }) => ({ kind: "observations" as const, at })),
      ...filtered.therapy.map(({ at }) => ({ kind: "therapy" as const, at })),
      ...filtered.appointments.map(({ at }) => ({ kind: "appointments" as const, at })),
    ];
    const goalTotals = scopedGoals.reduce(
      (counts, row) => {
        const status = ["active", "achieved", "paused"].includes(String(row.status))
          ? String(row.status)
          : "active";
        counts[status as "active" | "achieved" | "paused"] += 1;
        return counts;
      },
      { active: 0, achieved: 0, paused: 0 },
    );
    const buckets = makeBuckets(start, now, activity, lang);
    return {
      ...filtered,
      activity,
      buckets,
      goalTotals,
      growth: recordedGrowth.sort((a, b) => a.at.getTime() - b.at.getTime()),
      domains: countBy(filtered.observed, "domain"),
      screeningStatuses: countBy(filtered.screenings, "status"),
    };
  }, [
    appointments,
    child?.id,
    goals,
    growth,
    observations,
    milestoneCheckins,
    parentQuestionnaires,
    screenings,
    selectedPeriod.days,
    therapySessions,
    lang,
  ]);

  const maxActivity = Math.max(
    1,
    ...report.buckets.flatMap((bucket) => Object.values(bucket.values)),
  );
  const domainRows = Object.entries(report.domains).sort((a, b) => b[1] - a[1]);
  const domainMax = Math.max(1, ...domainRows.map(([, count]) => count));
  const goalTotal = Object.values(report.goalTotals).reduce(
    (sum, count) => sum + count,
    0,
  );
  const chartDescription = ACTIVITY.map(
    ({ key, label }) =>
      `${tr(label)}: ${report.activity.filter((point) => point.kind === key).length}`,
  ).join(". ");
  const latestGrowth = report.growth.at(-1);
  const hasTruncatedRows = Object.keys(truncated).some((key) =>
    [
      "observations",
      "goals",
      "growth",
      "therapy-sessions",
      "screenings",
      "appointments",
      "milestone-checkins",
      "parent-questionnaires",
    ].includes(key),
  );
  const reportErrors = [
    "observations",
    "goals",
    "growth",
    "therapy-sessions",
    "screenings",
    "appointments",
    "milestone-checkins",
    "parent-questionnaires",
  ].filter((key) => errors[key]);
  const domainLabel = (value: string) =>
    tr(OBSERVATION_DOMAINS[value] || titleCase(value));
  const statusLabel = (value: string) => tr(STATUS_LABELS[value] || titleCase(value));
  const reportTitle = child?.name
    ? lang === "ml"
      ? `${child.name}യുടെ റിപ്പോർട്ട്`
      : `${child.name}’s report`
    : tr("Care report");

  const selectPeriod = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const arrows: Record<string, number> = { ArrowRight: 1, ArrowLeft: -1 };
    let next = -1;
    if (event.key in arrows)
      next = (index + arrows[event.key] + PERIODS.length) % PERIODS.length;
    if (event.key === "Home") next = 0;
    if (event.key === "End") next = PERIODS.length - 1;
    if (next < 0) return;
    event.preventDefault();
    setPeriod(PERIODS[next].key);
    requestAnimationFrame(() => {
      tabListRef.current
        ?.querySelectorAll<HTMLButtonElement>('[role="tab"]')
        [next]?.focus();
    });
  };

  return (
    <section className="reports-view" aria-labelledby={`${uid}-title`}>
      <header className="reports-header">
        <div>
          <p className="reports-overline">{tr("Care activity report")}</p>
          <h2 id={`${uid}-title`}>{reportTitle}</h2>
        </div>
        <div
          className="reports-period-tabs"
          role="tablist"
          aria-label={tr("Report period")}
          ref={tabListRef}
        >
          {PERIODS.map((item, index) => (
            <button
              key={item.key}
              id={`${uid}-${item.key}-tab`}
              type="button"
              role="tab"
              aria-selected={period === item.key}
              aria-controls={`${uid}-${item.key}-panel`}
              tabIndex={period === item.key ? 0 : -1}
              className={period === item.key ? "selected" : ""}
              onClick={() => setPeriod(item.key)}
              onKeyDown={(event) => selectPeriod(event, index)}
            >
              {tr(item.label)}
            </button>
          ))}
        </div>
      </header>

      <div
        id={`${uid}-${period}-panel`}
        role="tabpanel"
        aria-labelledby={`${uid}-${period}-tab`}
        className="reports-panel"
      >
        {loading && <p className="reports-loading">{tr("Loading report data…")}</p>}
        {!!reportErrors.length && (
          <aside className="reports-note reports-error" role="alert">
            <ClipboardList size={19} aria-hidden="true" />
            <div>
              <strong>{tr("Some report data is unavailable")}</strong>
              <p>{tr("The unavailable areas are not counted in the charts below.")}</p>
              {onRetry && (
                <button type="button" className="secondary" onClick={onRetry}>
                  {tr("Retry report")}
                </button>
              )}
            </div>
          </aside>
        )}
        <div className="reports-metrics">
          <Metric
            icon={<Activity size={19} />}
            value={report.observed.length}
            label={tr("observations recorded")}
            detail={
              period === "all"
                ? tr("all recorded activity")
                : `${tr("in the last")} ${tr(selectedPeriod.label)}`
            }
          />
          <Metric
            icon={<Target size={19} />}
            value={report.achievedGoals.length}
            label={tr("goals reached")}
            detail={tr("recorded achievements")}
          />
          <Metric
            icon={<HeartHandshake size={19} />}
            value={report.therapy.length}
            label={tr("therapy sessions completed")}
            detail={tr("completed sessions only")}
          />
          <Metric
            icon={<CalendarCheck2 size={19} />}
            value={report.appointments.length}
            label={tr("appointments completed")}
            detail={tr("completed visits only")}
          />
        </div>

        <div className="reports-grid">
          <figure className="reports-card reports-activity-card">
            <figcaption>
              <div>
                <h3>{tr("Care activity over time")}</h3>
                <p>
                  {tr(
                    "Only completed care and parent-recorded observations are counted.",
                  )}
                </p>
              </div>
              <ul className="reports-legend" aria-label={tr("Activity chart legend")}>
                {ACTIVITY.map((series) => (
                  <li key={series.key}>
                    <span
                      style={{ backgroundColor: series.color }}
                      aria-hidden="true"
                    />
                    {tr(series.label)}
                    <strong>
                      {
                        report.activity.filter((point) => point.kind === series.key)
                          .length
                      }
                    </strong>
                  </li>
                ))}
              </ul>
            </figcaption>
            {report.activity.length ? (
              <>
                <svg
                  className="reports-activity-chart"
                  viewBox="0 0 460 158"
                  role="img"
                  aria-labelledby={`${uid}-activity-title ${uid}-activity-desc`}
                >
                  <title id={`${uid}-activity-title`}>
                    {tr("Care activity for")} {tr(selectedPeriod.label)}
                  </title>
                  <desc id={`${uid}-activity-desc`}>{chartDescription}</desc>
                  <text x="24" y="42" textAnchor="end" className="reports-axis-label">
                    {maxActivity}
                  </text>
                  <text x="24" y="134" textAnchor="end" className="reports-axis-label">
                    0
                  </text>
                  {[38, 84, 130].map((y) => (
                    <line
                      key={y}
                      x1="34"
                      x2="426"
                      y1={y}
                      y2={y}
                      stroke="currentColor"
                      strokeOpacity="0.12"
                      strokeDasharray="4 5"
                    />
                  ))}
                  {ACTIVITY.map((series) => (
                    <polyline
                      key={series.key}
                      points={pathFor(report.buckets, series.key, maxActivity)}
                      fill="none"
                      stroke={series.color}
                      strokeWidth="3"
                      strokeDasharray={
                        series.key === "therapy"
                          ? "7 5"
                          : series.key === "appointments"
                            ? "2 5"
                            : undefined
                      }
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  ))}
                  {ACTIVITY.flatMap((series) =>
                    report.buckets.map((bucket, index) => {
                      const [x, y] = pathFor(report.buckets, series.key, maxActivity)
                        .split(" ")
                        [index].split(",");
                      return (
                        <circle
                          key={`${series.key}-${bucket.label}`}
                          cx={x}
                          cy={y}
                          r="3"
                          fill={series.color}
                        >
                          <title>{`${bucket.label}: ${tr(series.label)} ${bucket.values[series.key]}`}</title>
                        </circle>
                      );
                    }),
                  )}
                </svg>
                <div className="reports-chart-labels" aria-hidden="true">
                  <span>{report.buckets[0]?.label}</span>
                  <span>{report.buckets.at(-1)?.label}</span>
                </div>
                <details className="reports-data-details">
                  <summary>{tr("Care activity over time")}</summary>
                  <div className="reports-table-scroll" tabIndex={0}>
                    <table>
                      <caption>
                        {tr("Care activity for")} {tr(selectedPeriod.label)}
                      </caption>
                      <thead>
                        <tr>
                          <th scope="col">{tr("Report period")}</th>
                          {ACTIVITY.map((series) => (
                            <th key={series.key} scope="col">
                              {tr(series.label)}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {report.buckets.map((bucket, index) => (
                          <tr key={index}>
                            <th scope="row">{bucket.label}</th>
                            {ACTIVITY.map((series) => (
                              <td key={series.key}>{bucket.values[series.key]}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </details>
              </>
            ) : (
              <EmptyChart>
                {tr("No recorded care activity in this period yet.")}
              </EmptyChart>
            )}
          </figure>

          <section className="reports-card" aria-labelledby={`${uid}-goals`}>
            <div className="reports-card-heading">
              <div>
                <h3 id={`${uid}-goals`}>{tr("Goal progress")}</h3>
                <p>{tr("Personal goals, with no comparison or ranking.")}</p>
              </div>
              <Target size={19} aria-hidden="true" />
            </div>
            {goalTotal ? (
              <>
                <div
                  className="reports-goal-bar"
                  role="img"
                  aria-label={`${report.goalTotals.active} ${tr("Active")}, ${report.goalTotals.achieved} ${tr("Achieved")}, ${tr("and")} ${report.goalTotals.paused} ${tr("Paused")} ${tr("goals")}`}
                >
                  {(["active", "achieved", "paused"] as const).map((status) =>
                    report.goalTotals[status] ? (
                      <span
                        key={status}
                        className={`reports-goal-segment ${status}`}
                        style={{ flexGrow: report.goalTotals[status] }}
                      />
                    ) : null,
                  )}
                </div>
                <ul className="reports-status-list">
                  {(["active", "achieved", "paused"] as const).map((status) => (
                    <li key={status}>
                      <span
                        className={`reports-status-dot ${status}`}
                        aria-hidden="true"
                      />
                      <span>{statusLabel(status)}</span>
                      <strong>{report.goalTotals[status]}</strong>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <EmptyChart>{tr("No personal goals recorded yet.")}</EmptyChart>
            )}
          </section>

          <section className="reports-card" aria-labelledby={`${uid}-observations`}>
            <div className="reports-card-heading">
              <div>
                <h3 id={`${uid}-observations`}>{tr("What has been noticed")}</h3>
                <p>{tr("Parent-recorded observations by area.")}</p>
              </div>
              <Activity size={19} aria-hidden="true" />
            </div>
            {domainRows.length ? (
              <dl className="reports-domain-list">
                {domainRows.map(([domain, count]) => (
                  <div key={domain}>
                    <dt>{domainLabel(domain)}</dt>
                    <dd>
                      <span className="reports-domain-track" aria-hidden="true">
                        <span style={{ width: `${(count / domainMax) * 100}%` }} />
                      </span>
                      <strong>{count}</strong>
                    </dd>
                  </div>
                ))}
              </dl>
            ) : (
              <EmptyChart>
                {tr("No observations recorded in this period yet.")}
              </EmptyChart>
            )}
          </section>

          <section className="reports-card" aria-labelledby={`${uid}-checkins`}>
            <div className="reports-card-heading">
              <div>
                <h3 id={`${uid}-checkins`}>{tr("Saved developmental check-ins")}</h3>
                <p>{tr("Parent-reported answers in the selected period.")}</p>
              </div>
              <ClipboardList size={19} aria-hidden="true" />
            </div>
            <dl className="reports-growth-values">
              <div>
                <dt>{tr("Milestone check-ins")}</dt>
                <dd>{report.milestoneCheckins.length}</dd>
              </div>
              {onAssessments && (
                <div>
                  <dt>{tr("Parent questionnaires")}</dt>
                  <dd>{report.parentQuestionnaires.length}</dd>
                </div>
              )}
            </dl>
            {report.milestoneCheckins.length ? (
              <ul className="reports-checkin-list">
                {report.milestoneCheckins.slice(0, 5).map(({ row, at }) => (
                  <li key={row.id}>
                    <strong>
                      {formatShortDate(at, lang)} · {tr("Age at check-in")}:{" "}
                      {row.age_months} {tr("months")}
                    </strong>
                    <p>
                      {MILESTONE_ANSWERS.map(
                        ({ value, label }) =>
                          `${tr(label)}: ${Number.isInteger(row.summary?.counts?.[value]) ? row.summary.counts[value] : "—"}`,
                      ).join(" · ")}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyChart>
                {tr("No milestone check-ins recorded in this period.")}
              </EmptyChart>
            )}
            <div className="reports-checkin-actions">
              {onMilestones && (
                <button className="secondary" onClick={onMilestones}>
                  {tr("Review milestone check-ins")}
                </button>
              )}
              {onAssessments && (
                <button className="secondary" onClick={onAssessments}>
                  {tr("Review parent questionnaires")}
                </button>
              )}
            </div>
          </section>

          <section
            className="reports-card reports-growth-card"
            aria-label={tr("Recorded growth")}
          >
            <div className="reports-card-heading">
              <div>
                <p>
                  {tr(
                    "Chronological measurements only; no percentiles or interpretation.",
                  )}
                </p>
              </div>
              <Activity size={19} aria-hidden="true" />
            </div>
            {latestGrowth ? (
              <dl className="reports-growth-values">
                <div>
                  <dt>{tr("Latest measurement")}</dt>
                  <dd>{formatShortDate(latestGrowth.at, lang)}</dd>
                </div>
                <div>
                  <dt>{tr("Weight")}</dt>
                  <dd>
                    {formatMeasurement(latestGrowth.row.weight_kg, "kg", lang, tr)}
                  </dd>
                </div>
                <div>
                  <dt>{tr("Height")}</dt>
                  <dd>
                    {formatMeasurement(latestGrowth.row.height_cm, "cm", lang, tr)}
                  </dd>
                </div>
                <div>
                  <dt>{tr("Measurements recorded")}</dt>
                  <dd>{report.growth.length}</dd>
                </div>
              </dl>
            ) : (
              <EmptyChart>{tr("No growth measurements recorded yet.")}</EmptyChart>
            )}
          </section>
        </div>

        {hasTruncatedRows && (
          <p className="muted" role="status">
            {tr(
              "This report shows the latest loaded records; older entries may not be included.",
            )}
          </p>
        )}
      </div>
    </section>
  );
}
