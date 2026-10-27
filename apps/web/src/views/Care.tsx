import {
  ArrowLeft,
  ArrowUpRight,
  FileText,
  MessageCircle,
  Plus,
  Search,
  ShieldCheck,
} from "lucide-react";
import { useEffect, useState } from "react";
import { api, type Row } from "../api";
import { indiaDateTimeLabel } from "../booking-utils";
import { selectField, textField } from "../ui/fields";
import { Badge, Empty, Section, Status } from "../ui/primitives";
import { doctorDisplayName, money } from "../utils";
import BookingScheduler from "./BookingScheduler";
import PaymentDemo from "./PaymentDemo";
import { Action, AppointmentCards, DataError, Truncation } from "../views/shared";
import { useWorkspace } from "../workspace-context";
import specialist from "../../../../packages/contracts/care-specialist.json";
import "./Care.css";

export default function CareView() {
  const {
    add,
    book,
    busy,
    child,
    childAdd,
    childId,
    chooseProvider,
    command,
    confirmAction,
    date,
    isStaff,
    lang,
    list,
    loading,
    messageOptions,
    provider,
    readiness,
    refresh,
    setError,
    setBusy,
    reschedule,
    search,
    setProvider,
    setAssistantOpen,
    setSearch,
    setTab,
    slots,
    slotsLoading,
    tab,
    tr,
    user,
  } = useWorkspace();
  const [rescheduling, setRescheduling] = useState<Row | null>(null);
  useEffect(() => {
    setRescheduling(null);
    setProvider(null);
  }, [childId, setProvider]);
  useEffect(() => {
    if (tab && !loading)
      document.getElementById(`care-${tab}`)?.scrollIntoView({ block: "start" });
  }, [tab, provider, loading]);
  const primaryView = !["messages", "payments", "referrals"].includes(tab);
  const practitioners = list("practitioners");
  const matchingPractitioners = practitioners.filter(
    (p) =>
      (!p.display_name?.includes("— test only") || p.is_demo === true) &&
      `${doctorDisplayName(p.display_name, p.is_demo)} ${p.specialty} ${p.languages}`
        .toLowerCase()
        .includes(search.trim().toLowerCase()),
  );
  const showSpecialist = Object.values(specialist)
    .join(" ")
    .toLowerCase()
    .includes(search.trim().toLowerCase());
  const resultCount = matchingPractitioners.length + Number(showSpecialist);
  const openBooking = async () => {
    if (busy) return;
    setError("");
    setSearch("");
    setBusy("booking-setup");
    try {
      const current = await api<Row>("readiness/");
      if (current.capabilities?.demo_bookings?.ready) {
        await api("demo-bookings/prepare/", "POST", {});
        refresh();
      }
      setProvider(null);
      setRescheduling(null);
      setTab("specialists");
      document.getElementById("care-specialists")?.scrollIntoView({ block: "start" });
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : tr("Unable to load availability. Please try again."),
      );
    } finally {
      setBusy((current) => (current === "booking-setup" ? "" : current));
    }
  };
  const closeScheduler = () => {
    setProvider(null);
    setTab(rescheduling ? "appointments" : "specialists");
    setRescheduling(null);
  };
  const submitSlot = async (slot: Row) => {
    const visit = `${tr(slot.consultation_mode === "in_person" ? "In-person appointment" : "Online consultation")}${slot.clinic_address ? ` · ${slot.clinic_address}` : ""}`;
    if (rescheduling) {
      const detail = `${child?.name || tr("This child")} · ${doctorDisplayName(provider?.display_name, provider?.is_demo)} · ${indiaDateTimeLabel(slot.starts_at, lang)} · ${visit}. ${tr("Your existing consultation is moved only after the replacement is secured.")}`;
      if (
        await confirmAction({
          title: tr("Confirm appointment change?"),
          detail,
          confirmLabel: tr("Update appointment"),
        })
      ) {
        const result = await command(
          `appointments/${rescheduling.id}/reschedule/`,
          { slot: slot.id },
          "Consultation rescheduled.",
        );
        if (result) closeScheduler();
      }
      return;
    }
    const detail = `${child?.name || tr("This child")} · ${doctorDisplayName(provider?.display_name, provider?.is_demo)} · ${indiaDateTimeLabel(slot.starts_at, lang)} · ${visit}. ${tr("The slot is held for a short time while you pay; it is released if payment is not completed.")}`;
    if (
      await confirmAction({
        title: tr("Hold this consultation?"),
        detail,
        confirmLabel: tr("Hold this time"),
      })
    )
      await book(slot);
  };
  const startReschedule = async (appointment: Row) => {
    const practitioner = list("practitioners").find(
      (candidate) => candidate.id === appointment.practitioner,
    );
    if (!practitioner) {
      await reschedule(appointment);
      return;
    }
    setTab("specialists");
    setRescheduling(appointment);
    await chooseProvider(practitioner);
  };
  return (
    <div className="care-workspace">
      <div className="care-dashboard-heading">
        <div>
          <h2>{tr("Doctor appointments")}</h2>
          <p className="muted">
            {tr("Book an online consultation or an in-person clinic visit.")}
          </p>
        </div>
        <button onClick={() => void openBooking()} disabled={!!busy}>
          <Plus size={18} />
          {tr(busy === "booking-setup" ? "Loading doctors…" : "Book an appointment")}
        </button>
      </div>
      {(readiness?.capabilities?.demo_bookings?.ready ||
        practitioners.some((p) => p.is_demo === true)) && (
        <p className="care-exhibition-mode">
          <strong>{tr("Exhibition mode")}</strong>
          <span>{tr("Fictional booking profiles · Test payments")}</span>
        </p>
      )}
      <nav className="care-tools" aria-label={tr("Appointment tools")}>
        {!primaryView && (
          <button className="text-button" onClick={() => setTab("appointments")}>
            <ArrowLeft size={16} />
            {tr("Back to appointments")}
          </button>
        )}
        {[
          { id: "messages", label: "Messages" },
          { id: "payments", label: "Payments" },
          { id: "referrals", label: "Referrals" },
        ].map((tool) => (
          <button
            className="text-button"
            key={tool.id}
            aria-current={tab === tool.id ? "page" : undefined}
            onClick={() => setTab(tool.id)}
          >
            {tr(tool.label)}
          </button>
        ))}
      </nav>
      {primaryView && user.role === "parent" && (
        <button className="text-button" onClick={() => setTab("payments")}>
          {tr("Try Razorpay test checkout")}
          <ArrowUpRight size={16} />
        </button>
      )}
      <div className="care-dashboard-grid">
        {primaryView && (
          <div id="care-appointments" className="care-dashboard-wide">
            <Section
              title={tr(
                tab === "appointments" ? "Your appointments" : "Upcoming appointments",
              )}
              action={
                <Action onClick={() => setTab("appointments")}>
                  {tr("View all appointments")}
                </Action>
              }
            >
              <AppointmentCards
                onReschedule={startReschedule}
                upcomingOnly={tab !== "appointments"}
              />
            </Section>
          </div>
        )}
        {primaryView && (
          <section
            id="care-specialists"
            className="care-specialists"
            aria-label={tr("Find a specialist")}
          >
            <div className="care-scheduler-heading">
              <h2>{tr("Find a specialist")}</h2>
              {provider && (
                <button
                  className="secondary"
                  onClick={() => setAssistantOpen(true)}
                  aria-label={tr("Open Nest Assistant")}
                >
                  {tr("Ask Nest")}
                </button>
              )}
            </div>
            {provider ? (
              <BookingScheduler
                provider={provider}
                slots={slots}
                loading={slotsLoading}
                child={child}
                language={lang}
                busy={!!busy}
                canBook={
                  !!childId && (user.role === "parent" || (isStaff && !!rescheduling))
                }
                rescheduling={rescheduling}
                tr={tr}
                onBack={closeScheduler}
                onSubmit={submitSlot}
              />
            ) : (
              <>
                <div className="filter-bar">
                  <label className="search-field">
                    <Search size={18} />
                    <input
                      aria-label={tr("Search specialists")}
                      placeholder={tr("Find by name, specialty or language")}
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                  </label>
                  <span className="care-result-count muted">
                    <ShieldCheck size={16} aria-hidden="true" />
                    {tr("Care professionals")}
                    <strong>{resultCount}</strong>
                  </span>
                  {isStaff && (
                    <button
                      onClick={() =>
                        add("Offer a consultation slot", "slots/", [
                          textField("starts_at", "Starts at", "datetime-local"),
                          textField("ends_at", "Ends at", "datetime-local"),
                          selectField(
                            "consultation_mode",
                            "Consultation type",
                            [
                              { value: "online", label: "Online consultation" },
                              { value: "in_person", label: "In-person appointment" },
                            ],
                            "online",
                          ),
                          textField(
                            "clinic_address",
                            "Clinic address (required for in-person visits)",
                            "textarea",
                            false,
                          ),
                        ])
                      }
                    >
                      <Plus size={16} />
                      {tr("Add availability")}
                    </button>
                  )}
                </div>
                <DataError name="practitioners" />
                <Truncation name="practitioners" />
                <div className="provider-grid">
                  {matchingPractitioners.map((p, i) => (
                    <article className="provider-card" key={p.id}>
                      <div className="provider-card-top">
                        <span
                          className={`provider-avatar ${["sage", "lavender", "peach"][i % 3]}`}
                        >
                          {doctorDisplayName(p.display_name, p.is_demo)
                            ?.split(" ")
                            .filter((s: string) => !["Dr.", "Dr"].includes(s))
                            .map((s: string) => s[0])
                            .slice(0, 2)
                            .join("")}
                        </span>
                        {p.is_demo !== true && (
                          <Badge>
                            <ShieldCheck size={12} />
                            {tr("Verified")}
                          </Badge>
                        )}
                      </div>
                      <h2>{doctorDisplayName(p.display_name, p.is_demo)}</h2>
                      <span className="specialty">{tr(p.specialty)}</span>
                      {p.is_demo === true ? (
                        <p>
                          {tr(
                            "Monday–Friday, 10:30 am–3 pm IST. Lunch: 12:30–1:30 pm. 30-minute visits.",
                          )}
                        </p>
                      ) : (
                        p.bio && <p>{tr(p.bio)}</p>
                      )}
                      <div className="provider-meta">
                        <MessageCircle size={14} />
                        {Array.isArray(p.languages)
                          ? p.languages.join(" · ")
                          : p.languages}
                      </div>
                      <div className="provider-footer">
                        <div>
                          <strong>{money(p.fee_minor)}</strong>
                          <small>{tr("per consultation")}</small>
                        </div>
                        <button className="secondary" onClick={() => chooseProvider(p)}>
                          {tr("View availability")}
                          <ArrowUpRight size={16} />
                        </button>
                      </div>
                    </article>
                  ))}
                  {showSpecialist && (
                    <article className="provider-card featured-specialist">
                      <div className="provider-card-top">
                        <span className="provider-avatar sage" aria-hidden="true">
                          KS
                        </span>
                        <Badge>{tr("Specialist profile")}</Badge>
                      </div>
                      <h2>{specialist.displayName}</h2>
                      <span className="specialty">{specialist.specialty}</span>
                      <p className="specialist-institution">{specialist.institution}</p>
                      <dl className="specialist-details">
                        <div>
                          <dt>{tr("Consultation fee (as provided)")}</dt>
                          <dd>{money(specialist.feeMinor)}</dd>
                        </div>
                        <div>
                          <dt>{tr("Availability (as provided)")}</dt>
                          <dd>{specialist.availability}</dd>
                        </div>
                        <div>
                          <dt>{tr("Qualifications (as provided)")}</dt>
                          <dd>{specialist.qualifications}</dd>
                        </div>
                        <div>
                          <dt>{tr("Role")}</dt>
                          <dd>{specialist.role}</dd>
                        </div>
                      </dl>
                      <div className="provider-footer">
                        <p>
                          {tr(
                            "Contact NIPMR to confirm appointments, fees and availability. Booking through NeuroNest is not enabled for this profile.",
                          )}
                        </p>
                        <a
                          className="button secondary"
                          href={specialist.sourceUrl}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {tr("Contact NIPMR")}
                          <ArrowUpRight size={16} />
                        </a>
                      </div>
                    </article>
                  )}
                </div>
                {!resultCount && (
                  <Empty
                    title={
                      lang === "ml"
                        ? "പൊരുത്തപ്പെടുന്ന വിദഗ്ധരെ കണ്ടെത്തിയില്ല"
                        : "No matching specialists"
                    }
                  >
                    <button className="secondary" onClick={() => setSearch("")}>
                      {lang === "ml" ? "തിരച്ചിൽ മായ്ക്കുക" : "Clear search"}
                    </button>
                  </Empty>
                )}
              </>
            )}
          </section>
        )}
        {tab === "messages" && (
          <div id="care-messages">
            <Section
              title={tr("Your care conversations")}
              action={
                <Action
                  onClick={() =>
                    childAdd(
                      "Send a secure message",
                      "messages/",
                      [
                        selectField("recipient", "Send to", messageOptions),
                        textField("body", "Message", "textarea"),
                      ],
                      "For routine care conversations. If you need immediate help, contact local emergency services.",
                    )
                  }
                >
                  {tr("New message")}
                </Action>
              }
            >
              <DataError name="messages" />
              <Truncation name="messages" />
              {list("messages").map((m) => (
                <article
                  className={`message-row ${m.author === user.id ? "mine" : ""}`}
                  key={m.id}
                >
                  <span className="avatar sage">
                    {(m.author_name || "C").slice(0, 1)}
                  </span>
                  <div>
                    <strong>{m.author_name || "Care team"}</strong>
                    <small>{date(m.created_at, true)}</small>
                    <p>{m.body}</p>
                  </div>
                </article>
              ))}
              {!list("messages").length && (
                <Empty title={tr("A direct line to your care team")}>
                  {tr(
                    "Choose a verified professional and start a routine care conversation.",
                  )}
                </Empty>
              )}
            </Section>
          </div>
        )}
        {tab === "payments" && (
          <div id="care-payments">
            {user.role === "parent" && (
              <PaymentDemo
                key={user.id}
                ready={readiness?.capabilities?.payment_demo?.ready === true}
              />
            )}
            <Section title={tr("Payments")}>
              <DataError name="payments" />
              <Truncation name="payments" />
              {list("payments").map((p) => (
                <article className="list-row" key={p.id}>
                  <span className="round-icon sage">
                    <FileText />
                  </span>
                  <div className="grow">
                    <h3>{money(p.amount_minor)}</h3>
                    <small>
                      {date(p.created_at)} · {p.provider_order_id || p.id}
                    </small>
                  </div>
                  <Status value={p.status} />
                  {user.role === "parent" &&
                    list("appointments").some(
                      (a) => a.id === p.appointment && a.is_demo,
                    ) && (
                      <button
                        className="secondary"
                        disabled={!!busy}
                        onClick={() =>
                          void command(
                            `payments/${p.id}/verify/`,
                            {},
                            "Payment status checked.",
                          )
                        }
                      >
                        {tr("Check payment status")}
                      </button>
                    )}
                  {!isStaff && ["captured", "paid"].includes(p.status) && (
                    <button
                      className="text-button"
                      onClick={async () => {
                        if (
                          await confirmAction({
                            title: tr("Request a refund?"),
                            detail: tr(
                              "The provider and operations team review refund requests. The amount returned follows the cancellation policy recorded on this booking.",
                            ),
                            confirmLabel: tr("Request refund"),
                          })
                        )
                          command(
                            `payments/${p.id}/refund/`,
                            {},
                            "Refund request recorded.",
                          );
                      }}
                    >
                      {tr("Request refund")}
                    </button>
                  )}
                </article>
              ))}
              {!list("payments").length && (
                <Empty title={tr("No payments yet")}>
                  {tr("Your booking payments and refunds will be listed here.")}
                </Empty>
              )}
            </Section>
          </div>
        )}
        {tab === "referrals" && (
          <div id="care-referrals">
            <Section
              title={tr("Referrals")}
              action={
                <Action
                  onClick={() =>
                    childAdd("Create a referral", "referrals/", [
                      textField("destination", "Specialist, center or service"),
                      textField("reason", "Reason for referral", "textarea"),
                    ])
                  }
                >
                  {tr("New referral")}
                </Action>
              }
            >
              <DataError name="referrals" />
              <Truncation name="referrals" />
              {list("referrals").map((r) => (
                <article className="list-row" key={r.id}>
                  <span className="round-icon lavender">
                    <ArrowUpRight />
                  </span>
                  <div className="grow">
                    <h3>{r.destination}</h3>
                    <p>{r.reason}</p>
                    <small>{date(r.created_at)}</small>
                  </div>
                  <Status value={r.status} />
                </article>
              ))}
              {!list("referrals").length && <Empty title={tr("Care, connected")} />}
            </Section>
          </div>
        )}
      </div>
    </div>
  );
}
