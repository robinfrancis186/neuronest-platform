import { Bell, RefreshCw } from "lucide-react";
import { Empty, Section } from "../ui/primitives";
import { DataError, Truncation } from "../views/shared";
import { useWorkspace } from "../workspace-context";

export default function NotificationsView() {
  const { command, date, list, refresh, tr } = useWorkspace();
  return (
    <Section
      title={tr("A little nudge, when it matters")}
      action={
        <button className="secondary" onClick={refresh}>
          <RefreshCw size={15} />
          {tr("Refresh")}
        </button>
      }
    >
      <DataError name="notifications" />
      <Truncation name="notifications" />
      {list("notifications").map((n) => (
        <article className={`list-row ${!n.read_at ? "unread" : ""}`} key={n.id}>
          <span className="round-icon sage">
            <Bell />
          </span>
          <div className="grow">
            <h3>{n.title || n.kind || "An update for your family"}</h3>
            <p>{n.body || n.message}</p>
            <small>{date(n.created_at, true)}</small>
          </div>
          {!n.read_at && (
            <button
              className="text-button"
              onClick={() =>
                command(
                  `notifications/${n.id}/read/`,
                  {},
                  "Notification marked as read.",
                )
              }
            >
              {tr("Mark read")}
            </button>
          )}
        </article>
      ))}
      {!list("notifications").length && (
        <Empty title={tr("You’re all caught up")}>
          {tr("Appointment reminders and care updates will appear here.")}
        </Empty>
      )}
    </Section>
  );
}
