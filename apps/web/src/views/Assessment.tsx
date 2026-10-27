import { ArrowLeft, ArrowRight, CheckCircle2, ClipboardList } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
  isCompleteParentQuestionnaire,
  PARENT_QUESTIONNAIRE_ANSWERS,
  PARENT_QUESTIONNAIRE_ID,
  PARENT_QUESTIONNAIRE_SECTIONS,
  PARENT_QUESTIONNAIRE_VERSION,
  type ParentQuestionnaireAnswers,
} from "../assessments-utils";
import { Empty } from "../ui/primitives";
import { useWorkspace } from "../workspace-context";
import { DataError, Truncation } from "./shared";
import "./Assessment.css";

/** A parent-authored reflection, deliberately separate from clinical screening. */
export default function AssessmentView() {
  const { busy, child, childId, command, date, list, navigate, tr, user } =
    useWorkspace();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<ParentQuestionnaireAnswers>({});
  const [complete, setComplete] = useState(false);
  const questionRef = useRef<HTMLLegendElement>(null);
  const focusQuestionOnStepChange = useRef(false);
  const section = PARENT_QUESTIONNAIRE_SECTIONS[step];
  const isSaving = busy === "parent-questionnaires/";

  useEffect(() => {
    setStep(0);
    setAnswers({});
    setComplete(false);
  }, [childId]);
  useEffect(() => {
    if (!focusQuestionOnStepChange.current) return;
    focusQuestionOnStepChange.current = false;
    questionRef.current?.focus();
  }, [step]);
  const goToStep = (nextStep: number) => {
    focusQuestionOnStepChange.current = true;
    setStep(nextStep);
  };

  if (user.role !== "parent") {
    return (
      <div className="info-banner assessment-access-note">
        <ClipboardList />
        <div>
          <strong>{tr("Parent questionnaire")}</strong>
          <p>{tr("This check-in is available in a child’s family account.")}</p>
        </div>
      </div>
    );
  }
  if (!childId || !child) {
    return (
      <Empty title={tr("Choose a child profile first")}>
        {tr("Select a child to begin a parent questionnaire.")}
      </Empty>
    );
  }

  const answer = answers[section.id];
  const next = async () => {
    if (!answer) return;
    if (step < PARENT_QUESTIONNAIRE_SECTIONS.length - 1) {
      goToStep(step + 1);
      return;
    }
    if (!isCompleteParentQuestionnaire(answers)) return;
    const saved = await command(
      "parent-questionnaires/",
      {
        child: childId,
        questionnaire_id: PARENT_QUESTIONNAIRE_ID,
        questionnaire_version: PARENT_QUESTIONNAIRE_VERSION,
        answers,
      },
      "Parent questionnaire saved.",
    );
    if (saved) setComplete(true);
  };

  if (complete) {
    return (
      <section
        className="assessment-complete card"
        aria-labelledby="assessment-complete-title"
      >
        <span className="assessment-complete-icon" aria-hidden="true">
          <CheckCircle2 />
        </span>
        <div className="eyebrow">{tr("PARENT QUESTIONNAIRE")}</div>
        <h2 id="assessment-complete-title">{tr("Your reflections are saved.")}</h2>
        <p>
          {tr(
            "This check-in is parent-entered information only. It does not provide a diagnosis, prediction, or AI score.",
          )}
        </p>
        <div className="assessment-actions">
          <button className="secondary" onClick={() => navigate("reports")}>
            {tr("View report")}
          </button>
          <button
            onClick={() => {
              setAnswers({});
              setStep(0);
              setComplete(false);
            }}
          >
            {tr("Start another check-in")}
          </button>
        </div>
      </section>
    );
  }

  const history = list("parent-questionnaires");
  return (
    <div className="assessment-view">
      <button
        className="assessment-back text-button"
        onClick={() => navigate("journey", "observations")}
      >
        <ArrowLeft size={17} />
        {tr("Back")}
      </button>
      <div className="assessment-heading">
        <div>
          <div className="eyebrow">
            {tr("PARENT QUESTIONNAIRE")} · {child.name}
          </div>
          <h2>{tr(section.title)}</h2>
        </div>
        <span className="assessment-section-count" aria-live="polite">
          {tr("Section")} {step + 1} {tr("of")} {PARENT_QUESTIONNAIRE_SECTIONS.length}
        </span>
      </div>
      <div className="assessment-progress">
        <progress
          aria-label={tr("Questionnaire progress")}
          value={step + 1}
          max={PARENT_QUESTIONNAIRE_SECTIONS.length}
        >
          {step + 1} {tr("of")} {PARENT_QUESTIONNAIRE_SECTIONS.length}
        </progress>
      </div>
      <form
        className="assessment-form card"
        onSubmit={(event) => {
          event.preventDefault();
          void next();
        }}
      >
        <fieldset>
          <legend ref={questionRef} tabIndex={-1}>
            {tr(section.question)}
          </legend>
          <p>
            {tr("Choose the option that best reflects what you notice day to day.")}
          </p>
          <div className="assessment-options">
            {PARENT_QUESTIONNAIRE_ANSWERS.map((option) => (
              <label
                key={option.value}
                className={answer === option.value ? "selected" : ""}
              >
                <input
                  type="radio"
                  name={section.id}
                  value={option.value}
                  checked={answer === option.value}
                  onChange={() =>
                    setAnswers((current) => ({
                      ...current,
                      [section.id]: option.value,
                    }))
                  }
                />
                <span>{tr(option.label)}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <div className="assessment-actions">
          <button
            type="button"
            className="secondary"
            disabled={step === 0 || isSaving}
            onClick={() => goToStep(Math.max(0, step - 1))}
          >
            <ArrowLeft size={17} />
            {tr("Previous")}
          </button>
          <button type="submit" disabled={!answer || isSaving}>
            {isSaving
              ? tr("Saving…")
              : step === PARENT_QUESTIONNAIRE_SECTIONS.length - 1
                ? tr("Save check-in")
                : tr("Next")}
            {!isSaving && <ArrowRight size={17} />}
          </button>
        </div>
      </form>
      <DataError name="parent-questionnaires" />
      <Truncation name="parent-questionnaires" />
      {history.length > 0 && (
        <section
          className="assessment-history card"
          aria-labelledby="assessment-history-title"
        >
          <div>
            <div className="eyebrow">{tr("SAVED CHECK-INS")}</div>
            <h2 id="assessment-history-title">
              {tr("Previous parent questionnaires")}
            </h2>
          </div>
          <ul>
            {history.slice(0, 3).map((row) => (
              <li key={row.id}>
                <ClipboardList size={18} aria-hidden="true" />
                <span>
                  <strong>{tr("Developmental check-in")}</strong>
                  <small>{date(row.created_at, true)}</small>
                </span>
                <span className="assessment-history-count">
                  {PARENT_QUESTIONNAIRE_SECTIONS.length} {tr("sections recorded")}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
