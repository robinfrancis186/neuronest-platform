import { ArrowUpRight, Video } from "lucide-react";
import type { ReactNode } from "react";
import type { Appointment, Row } from "../api";
import { doctorDisplayName, money } from "../utils";
import { Empty, Status } from "../ui/primitives";
import { useWorkspace } from "../workspace-context";

/** Pieces shared by more than one view; each reads what it needs from the workspace. */
export function DataError({ name }: { name: string }) {
  const { errors, refresh, tr } = useWorkspace();
  return errors[name] ? (
    <div role="alert" className="inline-error">
      {errors[name]}{" "}
      <button className="text-button" onClick={refresh}>
        {tr("Retry")}
      </button>
    </div>
  ) : null;
}
/**
 * A page of a longer list must not look like the whole list. Records, audit trails
 * and observations grow without limit, and a parent scrolling to the bottom of 100
 * rows has no way to tell the difference on their own.
 */
export function Truncation({ name }: { name: string }) {
  const { truncated, list, tr } = useWorkspace();
  const total = truncated[name];
  if (!total) return null;
  return (
    <p className="muted truncation" role="status">
      {tr("Showing the most recent {shown} of {total}.")
        .replace("{shown}", String(list(name).length))
        .replace("{total}", String(total))}{" "}
      {tr("Narrow your search or open a specific entry to see more.")}
    </p>
  );
}

export function Action({
  children,
  onClick,
}: {
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button className="text-button" onClick={onClick}>
      {children}
      <ArrowUpRight size={15} />
    </button>
  );
}
export function AppointmentCards({
  onReschedule,
  upcomingOnly = false,
}: {
  upcomingOnly?: boolean;
  onReschedule?: (appointment: Row) => void;
}) {
  const {
    checkout,
    child,
    confirmAction,
    childAppointments,
    readiness,
    errors,
    loading,
    children,
    command,
    date,
    isStaff,
    join,
    reschedule,
    tr,
  } = useWorkspace();
  const appointments = upcomingOnly
    ? childAppointments.filter(
        (a) =>
          ["awaiting_payment", "confirmed", "in_progress"].includes(a.status) &&
          new Date(a.ends_at).getTime() >= Date.now(),
      )
    : childAppointments;
  return (
    <>
      <DataError name="appointments" />
      <Truncation name="appointments" />
      {appointments.length
        ? appointments.map((a) => (
            <article className="appointment-row" key={a.id}>
              <div className="date-square">
                <span>
                  {new Date(a.starts_at).toLocaleDateString("en", {
                    month: "short",
                  })}
                </span>
                <strong>{new Date(a.starts_at).getDate()}</strong>
              </div>
              <div className="grow">
                <strong>
                  {doctorDisplayName(a.provider_name, a.is_demo) || tr("Consultation")}
                </strong>
                {isStaff && (
                  <small>
                    {children.find((c) => c.id === a.child)?.name ||
                      "Patient access unavailable"}
                  </small>
                )}
                <p>
                  {date(a.starts_at, true)} · {money(a.amount_minor)}
                </p>
                <p className="appointment-mode">
                  {tr(
                    a.consultation_mode === "in_person"
                      ? "In-person appointment"
                      : "Online consultation",
                  )}
                  {a.clinic_address && <> · {a.clinic_address}</>}
                </p>
                <Status value={a.status} />
                {a.consultation_mode !== "in_person" &&
                  ["confirmed", "in_progress"].includes(a.status) &&
                  readiness &&
                  !readiness.capabilities?.video?.ready && (
                    <small>
                      {tr("Online video visits are currently unavailable.")}
                    </small>
                  )}
                {a.status === "awaiting_payment" && (
                  <small className="hold">
                    {tr("Hold expires")}
                    {date(a.hold_expires_at, true)}
                  </small>
                )}
              </div>
              <div className="row-actions">
                {a.status === "awaiting_payment" && !isStaff && (
                  <button onClick={() => checkout(a as Appointment)}>
                    {tr("Pay & confirm")}
                  </button>
                )}
                {["confirmed", "in_progress"].includes(a.status) &&
                  a.consultation_mode !== "in_person" && (
                    <button
                      className="secondary"
                      disabled={!readiness?.capabilities?.video?.ready}
                      onClick={() => join(a)}
                    >
                      <Video size={15} />
                      {tr("Join online visit")}
                    </button>
                  )}
                {a.status === "confirmed" &&
                  isStaff &&
                  new Date(a.starts_at) <= new Date() && (
                    <button
                      className="secondary"
                      onClick={() =>
                        command(
                          `appointments/${a.id}/complete/`,
                          {},
                          "Visit completed.",
                        )
                      }
                    >
                      {tr("Complete")}
                    </button>
                  )}
                {["awaiting_payment", "confirmed"].includes(a.status) && (
                  <button
                    className="text-button"
                    onClick={() => (onReschedule ? onReschedule(a) : reschedule(a))}
                  >
                    {tr("Reschedule")}
                  </button>
                )}
                {a.status === "confirmed" &&
                  isStaff &&
                  new Date(a.ends_at) < new Date() && (
                    <button
                      className="text-button"
                      onClick={() =>
                        command(
                          `appointments/${a.id}/no-show/`,
                          {},
                          "Visit marked as a no-show.",
                        )
                      }
                    >
                      {tr("Mark no-show")}
                    </button>
                  )}
                {["awaiting_payment", "confirmed"].includes(a.status) && (
                  <button
                    className="text-button danger"
                    onClick={async () => {
                      if (
                        await confirmAction({
                          title: tr("Cancel this appointment?"),
                          detail: `${child?.name || tr("the selected patient")} · ${date(a.starts_at, true)}. ${tr("Any refund follows the cancellation policy recorded on this booking.")}`,
                          confirmLabel: tr("Cancel appointment"),
                          dismissLabel: tr("Keep appointment"),
                          destructive: true,
                        })
                      )
                        command(
                          `appointments/${a.id}/cancel/`,
                          {},
                          "Appointment cancelled.",
                        );
                    }}
                  >
                    {tr("Cancel")}
                  </button>
                )}
              </div>
            </article>
          ))
        : !loading &&
          !errors.appointments && (
            <Empty
              title={tr(
                upcomingOnly ? "No upcoming appointments." : "A little room for care",
              )}
            >
              {tr("Book time with a specialist when your family needs it.")}
            </Empty>
          )}
    </>
  );
}
