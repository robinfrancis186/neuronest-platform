import { useEffect, useRef, useState } from "react";
import { api } from "../api";
import {
  MILESTONE_ANSWERS,
  completeMilestoneAnswers,
  milestoneNextStep,
  type MilestoneAnswer,
  type MilestoneCatalog,
  type MilestoneCheckIn,
} from "../milestones";
import { Section } from "../ui/primitives";
import { safeExternal } from "../ui/fields";
import { useWorkspace } from "../workspace-context";
import { DataError, Truncation } from "./shared";
import "./Milestones.css";

export default function MilestonesView() {
  const { child, childId, date, lang, list, navigate, refresh, tr, user } =
    useWorkspace();
  const [catalog, setCatalog] = useState<MilestoneCatalog | null>(null);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  const [answers, setAnswers] = useState<Record<string, MilestoneAnswer>>({});
  const [concern, setConcern] = useState<string>();
  const [skillLoss, setSkillLoss] = useState<string>();
  const [saved, setSaved] = useState<MilestoneCheckIn | null>(null);
  const [pending, setPending] = useState(false);
  const [aiDeferred, setAiDeferred] = useState(false);
  const [aiNotice, setAiNotice] = useState("");
  const resultHeading = useRef<HTMLHeadingElement>(null);
  const offerHeading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (saved?.id) {
      (offerHeading.current || resultHeading.current)?.focus();
      window.scrollTo(0, 0);
    }
  }, [saved?.id, saved?.ai_explanation?.status, lang]);
  useEffect(() => {
    if (!childId) return;
    const controller = new AbortController();
    setError("");
    setCatalog(null);
    setAnswers({});
    setConcern(undefined);
    setSkillLoss(undefined);
    api<MilestoneCatalog>(
      `milestone-checkins/catalog/?child=${encodeURIComponent(childId)}`,
      "GET",
      undefined,
      controller.signal,
    )
      .then(setCatalog)
      .catch((e) => {
        if (!controller.signal.aborted) setError(e.message);
      });
    return () => controller.abort();
  }, [childId, revision]);

  if (!childId || !child) return <p>{tr("Choose a child profile first")}</p>;
  const band = catalog?.band;
  const history = list("milestone-checkins") as MilestoneCheckIn[];
  const isParent = user.role === "parent";
  const hasExplanation =
    saved?.ai_explanation?.status === "generated" &&
    saved.ai_explanation.language === lang;
  const nextStep = saved ? milestoneNextStep(saved) : null;
  const submit = async () => {
    if (
      !catalog ||
      !band ||
      !completeMilestoneAnswers(band.items, answers) ||
      concern === undefined ||
      skillLoss === undefined ||
      pending
    )
      return;
    setPending(true);
    setError("");
    try {
      const result = await api<MilestoneCheckIn>("milestone-checkins/", "POST", {
        child: childId,
        catalog_version: catalog.version,
        band_months: band.months,
        answers,
        parent_concern: concern === "yes",
        skill_loss: skillLoss === "yes",
      });
      setSaved(result);
      setAiNotice("");
      setAiDeferred(false);
      refresh();
    } catch (e) {
      setError(
        e instanceof Error ? e.message : tr("Unable to save. Please try again."),
      );
    } finally {
      setPending(false);
    }
  };
  const explain = async () => {
    if (!saved || pending) return;
    setPending(true);
    setAiNotice("");
    try {
      const explanation = await api<MilestoneCheckIn["ai_explanation"]>(
        `milestone-checkins/${saved.id}/explain/`,
        "POST",
        { consent: true, language: lang },
      );
      if (explanation.status === "generated")
        setSaved({ ...saved, ai_explanation: explanation });
      else
        setAiNotice(
          tr(
            explanation.detail ||
              "AI explanation is unavailable. Your saved summary is still available.",
          ),
        );
    } catch {
      setAiNotice(
        tr("AI explanation is unavailable. Your saved summary is still available."),
      );
    } finally {
      setPending(false);
    }
  };
  return (
    <div className="milestone-checkin">
      {error && (
        <div className="inline-error" role="alert">
          {error}{" "}
          <button className="text-button" onClick={() => setRevision((v) => v + 1)}>
            {tr("Reload checklist")}
          </button>
        </div>
      )}
      {!catalog && !error && <p role="status">{tr("Loading age-based questions…")}</p>}
      {catalog && !saved && (
        <Section title="Age-based developmental check-in">
          {band ? (
            <>
              {isParent ? (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    void submit();
                  }}
                >
                  <fieldset disabled={pending} className="checkin-fields">
                    <legend className="visually-hidden">
                      {tr("Developmental questions")}
                    </legend>
                    {band.items.map((item) => (
                      <fieldset className="checkin-question" key={item.id}>
                        <legend>
                          <small>{tr(item.domain)}</small>
                          {item.label[lang]}
                        </legend>
                        <div className="checkin-options">
                          {MILESTONE_ANSWERS.map((option) => (
                            <label
                              key={option.value}
                              className={
                                answers[item.id] === option.value ? "selected" : ""
                              }
                            >
                              <input
                                type="radio"
                                required
                                name={item.id}
                                value={option.value}
                                checked={answers[item.id] === option.value}
                                onChange={() =>
                                  setAnswers({ ...answers, [item.id]: option.value })
                                }
                              />
                              {tr(option.label)}
                            </label>
                          ))}
                        </div>
                      </fieldset>
                    ))}
                    {[
                      {
                        id: "parent-concern",
                        title:
                          "Do you have any concerns about your child’s development?",
                        value: concern,
                        set: setConcern,
                      },
                      {
                        id: "skill-loss",
                        title: "Has your child lost a skill they used to have?",
                        value: skillLoss,
                        set: setSkillLoss,
                      },
                    ].map((question) => (
                      <fieldset className="checkin-question" key={question.id}>
                        <legend>{tr(question.title)}</legend>
                        <div className="checkin-options">
                          {["yes", "no"].map((value) => (
                            <label
                              key={value}
                              className={question.value === value ? "selected" : ""}
                            >
                              <input
                                type="radio"
                                required
                                name={question.id}
                                value={value}
                                checked={question.value === value}
                                onChange={() => question.set(value)}
                              />
                              {tr(value === "yes" ? "Yes" : "No")}
                            </label>
                          ))}
                        </div>
                      </fieldset>
                    ))}
                  </fieldset>
                  {skillLoss === "yes" && (
                    <p className="clinical-note" role="status">
                      {tr(
                        "Contact a qualified healthcare professional promptly about a lost skill. Do not wait for this check-in or an AI reply.",
                      )}
                    </p>
                  )}
                  <div className="checkin-submit">
                    <span aria-live="polite">
                      {Object.keys(answers).length} / {band.items.length}{" "}
                      {tr("questions answered")}
                    </span>
                    <button
                      disabled={
                        pending ||
                        !completeMilestoneAnswers(band.items, answers) ||
                        concern === undefined ||
                        skillLoss === undefined
                      }
                    >
                      {pending ? tr("Saving…") : tr("Submit check-in")}
                    </button>
                  </div>
                </form>
              ) : (
                <p>
                  {tr(
                    "Parents complete this check-in. Authorized care professionals can review saved responses below.",
                  )}
                </p>
              )}
            </>
          ) : (
            <p>
              {tr(
                "These checklists cover ages 2 to 71 completed months. Discuss developmental questions with your clinician at any age.",
              )}
            </p>
          )}
        </Section>
      )}
      {saved && (
        <Section title="Your developmental observations" className="checkin-result">
          <p>
            {date(saved.created_at, true)} · {tr("Age at check-in")}: {saved.age_months}{" "}
            {tr("months")} · {tr("Checklist by age")} {saved.band_months}
          </p>
          {hasExplanation && nextStep && (
            <section className="checkin-ai" aria-labelledby="milestone-ai-title">
              <p className="checkin-guidance-label">
                {tr("Checklist-based follow-up guidance")}
              </p>
              <h3 id="milestone-ai-title" ref={resultHeading} tabIndex={-1}>
                {tr(nextStep.title)}
              </h3>
              <p>{tr(nextStep.description)}</p>
              <dl className="checkin-probability">
                <dt>{tr("Disorder probability")}</dt>
                <dd>{tr("Not estimated from milestone answers")}</dd>
              </dl>
              <button className="secondary" onClick={() => navigate("care")}>
                {tr("Book a doctor’s appointment")}
              </button>
            </section>
          )}
          {isParent &&
            !hasExplanation &&
            (catalog?.ai_enabled ? (
              aiDeferred ? (
                <button className="text-button" onClick={() => setAiDeferred(false)}>
                  {tr("Show AI review options")}
                </button>
              ) : (
                <section
                  className="checkin-ai-controls"
                  aria-labelledby="checkin-ai-offer"
                >
                  <h3 id="checkin-ai-offer" ref={offerHeading} tabIndex={-1}>
                    {tr(
                      "Would you like an AI review of your child’s milestone answers?",
                    )}
                  </h3>
                  <p className="muted">
                    {tr(
                      "Only checklist questions and answers are shared with the AI service. Names and medical records are excluded.",
                    )}
                  </p>
                  <div className="checkin-actions">
                    <button disabled={pending} onClick={() => void explain()}>
                      {pending ? tr("Working…") : tr("Yes, show AI review")}
                    </button>
                    <button
                      className="secondary"
                      disabled={pending}
                      onClick={() => setAiDeferred(true)}
                    >
                      {tr("Not now")}
                    </button>
                  </div>
                </section>
              )
            ) : (
              <p className="muted">
                {tr(
                  "AI explanations are not enabled. The saved summary above is based only on your responses.",
                )}
              </p>
            ))}
          {aiNotice && <p role="status">{aiNotice}</p>}
          {!hasExplanation && (
            <>
              <h3 ref={resultHeading} tabIndex={-1}>
                {tr(
                  saved.summary.follow_up_recommended
                    ? "Discuss these observations with your clinician"
                    : "All listed skills reported as achieved",
                )}
              </h3>
              <p>
                {tr(
                  saved.skill_loss
                    ? "Contact a qualified healthcare professional promptly about a lost skill. Do not wait for this check-in or an AI reply."
                    : saved.summary.follow_up_recommended
                      ? "Share skills marked In progress, Not yet or Not sure, and any concerns, with a qualified healthcare professional. Ask whether a validated developmental screening or further evaluation is appropriate."
                      : "Your answers report the selected skills as achieved. This short checklist cannot confirm typical development or rule out a concern. Continue regular developmental reviews and raise any concerns with your clinician.",
                )}
              </p>
            </>
          )}
          <dl className="checkin-counts">
            {MILESTONE_ANSWERS.map((option) => (
              <div key={option.value}>
                <dt>{tr(option.label)}</dt>
                <dd>{saved.summary.counts[option.value]}</dd>
              </div>
            ))}
          </dl>
          <ul className="checkin-response-list">
            {saved.summary.items.map((item) => (
              <li key={item.id}>
                <span>{item.label[lang]}</span>
                <strong>
                  {tr(
                    MILESTONE_ANSWERS.find((option) => option.value === item.answer)
                      ?.label || item.answer,
                  )}
                </strong>
              </li>
            ))}
          </ul>
          {!hasExplanation && (
            <p>
              {tr(
                "Based on saved parent responses. No disorder probability or clinical score is calculated.",
              )}
            </p>
          )}
          {saved.summary.research_reference && (
            <details className="checkin-research">
              <summary>{tr("Research age context")}</summary>
              {saved.summary.research_reference.estimates.length ? (
                <>
                  <p>
                    {tr(
                      "These estimates describe related tasks in a historical Netherlands study. They are not predictions about your child, Indian norms, or scores for your answers. The research tasks differ from this checklist.",
                    )}
                  </p>
                  <ul>
                    {saved.summary.research_reference.estimates.map((estimate) => (
                      <li key={estimate.research_item}>
                        <span>{estimate.label[lang]}</span>
                        <strong>
                          {estimate.estimated_per_100 === 0
                            ? tr("Fewer than 5 in 100")
                            : estimate.estimated_per_100 === 100
                              ? tr("More than 95 in 100")
                              : `${tr("About")} ${estimate.estimated_per_100} ${tr("in 100")}`}
                        </strong>
                      </li>
                    ))}
                  </ul>
                  <p className="muted">
                    {tr("Estimated to perform the research task at this age.")}{" "}
                    {saved.summary.research_reference.covered_items} /{" "}
                    {saved.summary.research_reference.total_items}{" "}
                    {tr(
                      "checklist items have related age data. Unmatched items are not estimated.",
                    )}
                  </p>
                </>
              ) : (
                <p>
                  {tr(
                    "The available research does not support an estimate for these tasks at this age. Your saved answers remain available above.",
                  )}
                </p>
              )}
              <a
                href={safeExternal(saved.summary.research_reference.source.url)}
                target="_blank"
                rel="noreferrer"
              >
                {tr("Research source")}: {saved.summary.research_reference.source.title}
              </a>
              <p className="muted">
                {tr("Age estimates adapted by NeuroNest.")}{" "}
                {saved.summary.research_reference.source.license}
              </p>
            </details>
          )}
          <div className="checkin-actions">
            {!hasExplanation && (
              <button className="secondary" onClick={() => navigate("care")}>
                {tr("Find your care team")}
              </button>
            )}
            {isParent && (
              <button
                onClick={() => {
                  setSaved(null);
                  setAnswers({});
                  setConcern(undefined);
                  setSkillLoss(undefined);
                  setAiDeferred(false);
                  setAiNotice("");
                }}
              >
                {tr("Start another check-in")}
              </button>
            )}
          </div>
          <p className="checkin-boundary">
            <a
              href={safeExternal(saved.summary.source_url)}
              target="_blank"
              rel="noreferrer"
            >
              {tr("View age reference")}
            </a>
          </p>
        </Section>
      )}
      <DataError name="milestone-checkins" />
      <Truncation name="milestone-checkins" />
      {history.length > 0 && (
        <Section title="Saved milestone check-ins">
          <ul className="checkin-history">
            {history.slice(0, 5).map((row) => (
              <li key={row.id}>
                <span>
                  {date(row.created_at, true)} · {row.band_months}{" "}
                  {tr("month checklist")}
                </span>
                <button
                  className="text-button"
                  disabled={pending}
                  onClick={() => {
                    setSaved(row);
                    setAiDeferred(false);
                    setAiNotice("");
                    setError("");
                  }}
                >
                  {tr("View summary")}
                </button>
              </li>
            ))}
          </ul>
        </Section>
      )}
    </div>
  );
}
