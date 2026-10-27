import { ArrowLeft, ArrowRight, Plus } from "lucide-react";
import { selectField, textField, today } from "../ui/fields";
import { Section, Status } from "../ui/primitives";
import JourneyView from "./Journey";
import { DataError } from "./shared";
import { useWorkspace } from "../workspace-context";
import "./Today.css";
import { doctorDisplayName } from "../utils";

export default function TodayView() {
  const {
    child,
    childAppointments,
    children,
    childrenLoaded,
    date,
    errors,
    lang,
    list,
    loading,
    navigate,
    observationForm,
    tab,
    tr,
    add,
    user,
  } = useWorkspace();
  const nextAppointment = childAppointments
    .filter(
      (appointment) =>
        ["confirmed", "awaiting_payment"].includes(appointment.status) &&
        new Date(appointment.starts_at).getTime() >= Date.now(),
    )
    .sort((a, b) => Date.parse(a.starts_at) - Date.parse(b.starts_at))[0];
  const recentNotes = [...list("observations")]
    .sort((a, b) => String(b.observed_on).localeCompare(String(a.observed_on)))
    .slice(0, 3);
  if (childrenLoaded && !children.length && !child && user.role === "parent") {
    const firstName = user.display_name?.includes("@")
      ? ""
      : user.display_name?.trim().split(/\s+/u)[0];
    return (
      <FamilyWelcome
        greeting={
          lang === "ml"
            ? firstName
              ? `${firstName}, സ്വാഗതം.`
              : "സ്വാഗതം."
            : firstName
              ? `Welcome, ${firstName}.`
              : "Welcome."
        }
        onCreate={() =>
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
          )
        }
        onExplore={() => navigate("library")}
        tr={tr}
      />
    );
  }
  if (tab) {
    return (
      <>
        <button className="text-button home-back" onClick={() => navigate("today")}>
          <ArrowLeft size={16} />
          {tr("Back to Home")}
        </button>
        <JourneyView />
      </>
    );
  }
  return (
    <div className="home-dashboard">
      <Section title="Record an observation" className="home-compose">
        <p>{tr("Keep a note of a new skill, a change, or a concern.")}</p>
        <button onClick={observationForm} disabled={!child}>
          <Plus size={16} />
          {tr("Add observation")}
        </button>
      </Section>
      <Section title="Next appointment" className="home-appointment">
        <DataError name="appointments" />
        {nextAppointment ? (
          <>
            <h3>
              {doctorDisplayName(
                nextAppointment.provider_name,
                nextAppointment.is_demo,
              ) || tr("Appointments")}
            </h3>
            <p>{date(nextAppointment.starts_at, true)}</p>
            <Status value={nextAppointment.status} />
            <button
              className="text-button"
              onClick={() => navigate("care", "appointments")}
            >
              {tr("View appointment")}
              <ArrowRight size={16} />
            </button>
          </>
        ) : (
          !loading &&
          !errors.appointments && (
            <>
              <p>{tr("No upcoming appointments.")}</p>
              <button className="text-button" onClick={() => navigate("care")}>
                {tr("Find your care team")}
                <ArrowRight size={16} />
              </button>
            </>
          )
        )}
      </Section>
      <Section
        title="Recent notes"
        className="home-notes"
        action={
          <button
            className="text-button"
            onClick={() => navigate("today", "observations")}
          >
            {tr("View all")}
            <ArrowRight size={16} />
          </button>
        }
      >
        <DataError name="observations" />
        {recentNotes.map((note) => (
          <article className="home-note" key={note.id}>
            <div>
              <h3>{note.title}</h3>
              {note.note && <p>{note.note}</p>}
            </div>
            <time dateTime={note.observed_on}>{date(note.observed_on)}</time>
          </article>
        ))}
        {!recentNotes.length && !loading && !errors.observations && (
          <p>{tr("No observations yet. Your notes will appear here.")}</p>
        )}
      </Section>
    </div>
  );
}

function FamilyWelcome({
  greeting,
  onCreate,
  onExplore,
  tr,
}: {
  greeting: string;
  onCreate: () => void;
  onExplore: () => void;
  tr: (value: string) => string;
}) {
  return (
    <Section title={greeting} className="home-onboarding">
      <p>
        {tr(
          "Add your child’s profile to start recording observations and planning care.",
        )}
      </p>
      <div className="home-onboarding-actions">
        <button onClick={onCreate}>
          <Plus size={17} />
          {tr("Create a child profile")}
        </button>
        <button className="text-button" onClick={onExplore}>
          {tr("Explore the library")}
          <ArrowRight size={16} />
        </button>
      </div>
    </Section>
  );
}
