import { ClipboardList, Heart, Plus, ShieldCheck } from "lucide-react";
import { selectField, textField } from "../ui/fields";
import { Badge, Empty, Section, Status } from "../ui/primitives";
import ScreeningForm from "./ScreeningForm";
import { DataError, Truncation } from "../views/shared";
import { useEffect } from "react";
import "./Journey.css";
import { useWorkspace } from "../workspace-context";

export default function JourneyView() {
  const {
    add,
    childAdd,
    childId,
    command,
    date,
    isStaff,
    list,
    observationForm,
    practitionerOptions,
    screen,
    setModal,
    setScreen,
    tab: selectedTab,
    tr,
    user,
  } = useWorkspace();
  useEffect(() => {
    if (selectedTab)
      document
        .getElementById(`journey-${selectedTab}`)
        ?.scrollIntoView({ block: "start" });
  }, [selectedTab]);
  const observationStatus: Record<string, string> = {
    observed: "Something I noticed",
    not_yet: "Not doing this yet",
    unsure: "I’m not sure",
    lost: "Skill reduced or stopped",
  };
  const observationDomain: Record<string, string> = {
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
  return (
    <>
      <div className="journey-dashboard">
        {
          <div id="journey-observations" className="journey-observations">
            <Section
              title="What have you noticed?"
              eyebrow="PARENT OBSERVATIONS"
              action={
                <button onClick={observationForm}>
                  <Plus size={16} />
                  {tr("Record a concern")}
                </button>
              }
            >
              <div className="observation-guidance">
                <div>
                  <strong>{tr("A place for changes, questions and concerns")}</strong>
                  <p>
                    {tr(
                      "Use this space to record a change, an unusual moment, or a question. Your note is a parent observation for your care team; it is not a diagnosis.",
                    )}
                  </p>
                </div>
                <aside className="clinical-note" aria-label={tr("Need help sooner?")}>
                  <strong>{tr("Need help sooner?")}</strong>
                  <span>
                    {tr(
                      "If there is immediate danger, call 112. If a skill has reduced or stopped, contact your clinician promptly.",
                    )}
                  </span>
                </aside>
              </div>
              <DataError name="observations" />
              <Truncation name="observations" />
              {list("observations").length ? (
                <div className="observation-grid">
                  {list("observations").map((o) => (
                    <article className="observation-card" key={o.id}>
                      <div className="section-head">
                        <Badge>
                          {tr(
                            observationDomain[String(o.domain)] ||
                              String(o.domain).replaceAll("_", " "),
                          )}
                        </Badge>
                        <small>{date(o.observed_on)}</small>
                      </div>
                      <h3>{o.title}</h3>
                      <p>{o.note}</p>
                      <Badge>
                        {tr(observationStatus[String(o.status)] || String(o.status))}
                      </Badge>
                      {o.status === "lost" && (
                        <p className="clinical-note">
                          {tr("Talk with your care team about this change.")}
                        </p>
                      )}
                    </article>
                  ))}
                </div>
              ) : (
                <Empty title="No concerns or observations yet">
                  {tr(
                    "A change, an unusual moment, or a question can be useful to remember. Start here.",
                  )}
                </Empty>
              )}
            </Section>
          </div>
        }
        {
          <div id="journey-screening" className="journey-screening">
            <div className="info-banner">
              <ShieldCheck />
              <div>
                <strong>{tr("Understanding starts with the right support.")}</strong>
                <p>
                  {tr(
                    "Screening can guide a conversation. It does not diagnose autism. Tools are available only for their approved ages, languages and licenses.",
                  )}
                </p>
              </div>
            </div>
            <Section title={tr("Developmental screening")}>
              <DataError name="screenings/instruments" />
              <Truncation name="screenings/instruments" />
              {list("screenings/instruments").map((i) => (
                <article className="list-row" key={i.id || i.instrument_id}>
                  <span className="round-icon lavender">
                    <ClipboardList />
                  </span>
                  <div className="grow">
                    <h3>{i.name || i.title || i.id}</h3>
                    <p>{i.description || i.reason || i.disabled_reason || i.notice}</p>
                    <small>
                      {i.min_age_months !== undefined
                        ? `${i.min_age_months}–${i.max_age_months} months · `
                        : ""}
                      {(i.languages || []).join(", ")}
                    </small>
                  </div>
                  <Status
                    value={i.status || (i.enabled ? "available" : "unavailable")}
                  />
                  <button
                    className="secondary"
                    disabled={
                      !childId ||
                      i.enabled === false ||
                      i.status === "disabled" ||
                      i.license_status === "unlicensed"
                    }
                    onClick={async () => {
                      const result = await command(
                        "screenings/",
                        {
                          child: childId,
                          instrument_id: i.id || i.instrument_id,
                        },
                        "Screening session opened.",
                      );
                      if (result) setScreen({ ...result, instrument: i });
                    }}
                  >
                    {tr("Start")}
                  </button>
                </article>
              ))}
              {!list("screenings/instruments").length && (
                <Empty title={tr("No authorized screening tools available")}>
                  {tr(
                    "Instrument licenses and clinical configuration are required before use.",
                  )}
                </Empty>
              )}
              {screen && (
                <ScreeningForm
                  screen={screen}
                  onSubmit={async (answers) => {
                    const r = await command(
                      `screenings/${screen.id}/submit/`,
                      { answers },
                      "Screening response saved. Review the result with your clinician.",
                    );
                    if (r)
                      setScreen({
                        ...r,
                        instrument: screen.instrument,
                      });
                  }}
                />
              )}
              <h3 className="subheading">{tr("Previous screening sessions")}</h3>
              {list("screenings").map((s) => (
                <div className="list-row" key={s.id}>
                  <div className="grow">
                    <strong>{s.instrument_id}</strong>
                    <p>{date(s.created_at)}</p>
                    {s.result && (
                      <p>
                        {s.result.result?.interpretation ||
                          s.result.interpretation ||
                          s.result.detail ||
                          s.result.status}
                      </p>
                    )}
                  </div>
                  <Status value={s.status} />
                  {["created", "incomplete", "follow_up_required"].includes(
                    s.status,
                  ) && (
                    <button
                      className="secondary"
                      onClick={() =>
                        setScreen({
                          ...s,
                          instrument: list("screenings/instruments").find(
                            (i) => (i.id || i.instrument_id) === s.instrument_id,
                          ),
                        })
                      }
                    >
                      {tr("Resume")}
                    </button>
                  )}
                  {user.role === "doctor" && s.status === "completed" && (
                    <button
                      className="secondary"
                      onClick={() =>
                        add("Review assessment", `screenings/${s.id}/review/`, [
                          textField("note", "Clinical review notes", "textarea"),
                        ])
                      }
                    >
                      {tr("Review")}
                    </button>
                  )}
                </div>
              ))}
            </Section>
          </div>
        }
        {
          <div id="journey-therapy">
            <Section
              title={tr("Therapy & home practice")}
              action={
                <button
                  onClick={() =>
                    childAdd("Plan a therapy session", "therapy-sessions/", [
                      selectField("practitioner", "Practitioner", practitionerOptions),
                      textField(
                        "scheduled_at",
                        "Session date & time",
                        "datetime-local",
                      ),
                      textField(
                        "note",
                        "Home activities and session notes",
                        "textarea",
                        false,
                      ),
                    ])
                  }
                >
                  <Plus size={16} />
                  {tr("Plan session")}
                </button>
              }
            >
              <DataError name="therapy-sessions" />
              <Truncation name="therapy-sessions" />
              {list("therapy-sessions").map((s) => (
                <article className="list-row" key={s.id}>
                  <span className="round-icon lavender">
                    <Heart />
                  </span>
                  <div className="grow">
                    <h3>
                      {s.practitioner_name ||
                        list("practitioners").find((p) => p.id === s.practitioner)
                          ?.display_name ||
                        "Therapy session"}
                    </h3>
                    <p>{date(s.scheduled_at, true)}</p>
                    <p>{s.note}</p>
                  </div>
                  <Status value={s.status} />
                  {isStaff && s.author === user.id && (
                    <button
                      className="secondary"
                      onClick={() =>
                        setModal({
                          title: "Update therapy session",
                          endpoint: `therapy-sessions/${s.id}/`,
                          method: "PATCH",
                          fields: [
                            selectField(
                              "status",
                              "Status",
                              ["scheduled", "completed", "cancelled"],
                              s.status,
                            ),
                            textField(
                              "note",
                              "Progress and home activities",
                              "textarea",
                              false,
                              s.note,
                            ),
                          ],
                        })
                      }
                    >
                      {tr("Update progress")}
                    </button>
                  )}
                </article>
              ))}
              {!list("therapy-sessions").length && (
                <Empty title={tr("A shared plan, a little more support")} />
              )}
            </Section>
          </div>
        }
      </div>
    </>
  );
}
