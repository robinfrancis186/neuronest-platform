import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Globe2,
  MapPin,
  ShieldCheck,
  Video,
} from "lucide-react";
import type { Child, Row } from "../api";
import {
  INDIA_TIME_ZONE,
  indiaCalendarDays,
  indiaDateTimeLabel,
  indiaDateFromKey,
  indiaDayKey,
  indiaMonthStart,
  indiaTimeLabel,
} from "../booking-utils";
import { doctorDisplayName, money } from "../utils";

type SchedulerProps = {
  provider: Row;
  slots: Row[];
  loading?: boolean;
  child: Child | undefined;
  language: "en" | "ml";
  busy: boolean;
  canBook: boolean;
  rescheduling?: Row | null;
  tr: (text: string) => string;
  onBack: () => void;
  onSubmit: (slot: Row) => Promise<void>;
};

function minutes(slot: Row) {
  const start = new Date(String(slot.starts_at)).getTime();
  const end = new Date(String(slot.ends_at)).getTime();
  const duration = Math.round((end - start) / 60000);
  return Number.isFinite(duration) && duration > 0 ? duration : 30;
}

/** A compact IST scheduler. The server remains the authority on availability. */
export default function BookingScheduler({
  provider,
  slots,
  loading = false,
  child,
  language,
  busy,
  canBook,
  rescheduling,
  tr,
  onBack,
  onSubmit,
}: SchedulerProps) {
  const [mode, setMode] = useState("online");
  useEffect(() => {
    setMode(
      rescheduling?.consultation_mode ||
        (slots.some((slot) => (slot.consultation_mode || "online") === "online")
          ? "online"
          : slots[0]?.consultation_mode || "online"),
    );
  }, [provider.id, slots, rescheduling?.consultation_mode]);
  const availableSlots = useMemo(
    () =>
      slots.filter(
        (slot) =>
          slot.available !== false && (slot.consultation_mode || "online") === mode,
      ),
    [slots, mode],
  );
  const signature = availableSlots
    .map(
      (slot) => `${slot.id}:${slot.starts_at}:${slot.available}:${slot.clinic_address}`,
    )
    .join("|");
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedSlot, setSelectedSlot] = useState<Row | null>(null);
  const [visibleMonth, setVisibleMonth] = useState(() =>
    indiaMonthStart(slots[0]?.starts_at),
  );
  const [reviewing, setReviewing] = useState(false);

  useEffect(() => {
    const first = availableSlots[0];
    setSelectedDate(first ? indiaDayKey(first.starts_at) : "");
    setSelectedSlot(null);
    setReviewing(false);
    if (first) setVisibleMonth(indiaMonthStart(first.starts_at));
  }, [provider.id, signature]);

  const locale = language === "ml" ? "ml-IN" : "en-IN";
  const days = useMemo(() => indiaCalendarDays(visibleMonth), [visibleMonth]);
  const availableDays = useMemo(
    () => new Set(availableSlots.map((slot) => indiaDayKey(slot.starts_at))),
    [availableSlots],
  );
  const slotsForDay = availableSlots.filter(
    (slot) => indiaDayKey(slot.starts_at) === selectedDate,
  );
  const months = [
    ...new Set(availableSlots.map((slot) => indiaMonthStart(slot.starts_at).getTime())),
  ].sort((a, b) => a - b);
  const monthIndex = months.indexOf(visibleMonth.getTime());
  const duration = selectedSlot ? minutes(selectedSlot) : 30;
  const timeZone = "Asia/Kolkata (IST)";
  const isReschedule = !!rescheduling;
  const actionLabel = isReschedule ? tr("Update appointment") : tr("Hold this time");

  return (
    <section className="booking-shell" aria-labelledby="booking-title">
      <div className="booking-provider">
        <button className="back-link" onClick={onBack}>
          <ChevronLeft size={16} />
          {tr(isReschedule ? "Back to appointments" : "All specialists")}
        </button>
        <div className="booking-provider-identity">
          <span className="provider-avatar sage" aria-hidden="true">
            {doctorDisplayName(provider.display_name, provider.is_demo)
              ?.split(" ")
              .filter((part: string) => !["Dr.", "Dr"].includes(part))
              .map((part: string) => part[0])
              .slice(0, 2)
              .join("")}
          </span>
          <div>
            <span className="booking-kicker">
              {provider.is_demo === true ? (
                <Clock3 size={14} />
              ) : (
                <ShieldCheck size={14} />
              )}
              {provider.is_demo === true
                ? tr("Appointment availability")
                : tr("Verified care professional")}
            </span>
            <h2 id="booking-title">
              {tr(isReschedule ? "Choose a new time" : "Schedule a consultation")}
            </h2>
            <p>{doctorDisplayName(provider.display_name, provider.is_demo)}</p>
            <small>{provider.specialty}</small>
          </div>
        </div>
        <dl className="booking-provider-details">
          <div>
            <dt>{tr("Consultation")}</dt>
            <dd>
              {mode === "in_person" ? <MapPin size={15} /> : <Video size={15} />}{" "}
              {tr(
                mode === "in_person" ? "In-person appointment" : "Online consultation",
              )}
            </dd>
          </div>
          <div>
            <dt>{tr("Fee")}</dt>
            <dd>{money(provider.fee_minor)}</dd>
          </div>
          <div>
            <dt>{tr("Timezone")}</dt>
            <dd>
              <Globe2 size={15} /> {timeZone}
            </dd>
          </div>
        </dl>
      </div>

      <div className="booking-mode" role="group" aria-label={tr("Consultation type")}>
        {[
          { value: "online", label: "Online consultation" },
          { value: "in_person", label: "In-person appointment" },
        ].map((option) => (
          <button
            key={option.value}
            className="secondary"
            aria-pressed={mode === option.value}
            disabled={
              loading ||
              !slots.some(
                (slot) =>
                  slot.available !== false &&
                  (slot.consultation_mode || "online") === option.value,
              ) ||
              (!!rescheduling &&
                option.value !== (rescheduling.consultation_mode || "online"))
            }
            onClick={() => {
              setMode(option.value);
              setSelectedSlot(null);
              setReviewing(false);
            }}
          >
            {tr(option.label)}
          </button>
        ))}
      </div>
      {loading ? (
        <div className="booking-empty" role="status">
          {tr("Loading available times…")}
        </div>
      ) : !availableSlots.length ? (
        <div className="booking-empty" role="status">
          <CalendarDays size={22} />
          <h3>{tr("No open slots right now")}</h3>
          <p>
            {tr(
              "Check back with this specialist, or choose another care professional.",
            )}
          </p>
        </div>
      ) : (
        <div className="booking-layout">
          <div className="booking-calendar-panel">
            <div className="booking-panel-head">
              <div>
                <span className="booking-step">1</span>
                <h3>{tr("Select a date")}</h3>
              </div>
              <div className="calendar-controls">
                <button
                  className="calendar-arrow"
                  disabled={monthIndex <= 0}
                  onClick={() => setVisibleMonth(new Date(months[monthIndex - 1]))}
                  aria-label={tr("Previous available month")}
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  className="calendar-arrow"
                  disabled={monthIndex < 0 || monthIndex >= months.length - 1}
                  onClick={() => setVisibleMonth(new Date(months[monthIndex + 1]))}
                  aria-label={tr("Next available month")}
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
            <p className="booking-month" aria-live="polite">
              {visibleMonth.toLocaleDateString(locale, {
                timeZone: INDIA_TIME_ZONE,
                month: "long",
                year: "numeric",
              })}
            </p>
            <div className="calendar-weekdays" aria-hidden="true">
              {Array.from({ length: 7 }, (_, index) =>
                new Date(Date.UTC(2024, 0, index + 7, 12)).toLocaleDateString(locale, {
                  timeZone: INDIA_TIME_ZONE,
                  weekday: "narrow",
                }),
              ).map((weekday, index) => (
                <span key={`${weekday}-${index}`}>{weekday}</span>
              ))}
            </div>
            <div
              className="calendar-grid"
              role="group"
              aria-label={tr("Select a date")}
            >
              {days.map((day, index) => {
                if (!day)
                  return <span className="calendar-blank" key={`blank-${index}`} />;
                const key = indiaDayKey(day);
                const available = availableDays.has(key);
                const dayLabel = day.toLocaleDateString(locale, {
                  timeZone: INDIA_TIME_ZONE,
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                });
                return (
                  <button
                    key={key}
                    className={`calendar-day ${available ? "available" : ""} ${selectedDate === key ? "selected" : ""}`}
                    disabled={!available}
                    aria-pressed={selectedDate === key}
                    aria-label={`${dayLabel}${available ? ` — ${tr("Available")}` : ""}`}
                    onClick={() => {
                      setSelectedDate(key);
                      setSelectedSlot(null);
                      setReviewing(false);
                    }}
                  >
                    {day.toLocaleDateString(locale, {
                      timeZone: INDIA_TIME_ZONE,
                      day: "numeric",
                    })}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="booking-times-panel">
            <div className="booking-panel-head">
              <div>
                <span className="booking-step">2</span>
                <h3>{tr("Select a time")}</h3>
              </div>
              <Clock3 size={18} aria-hidden="true" />
            </div>
            <p className="booking-selected-date">
              {selectedDate
                ? indiaDateFromKey(selectedDate)?.toLocaleDateString(locale, {
                    timeZone: INDIA_TIME_ZONE,
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                  }) || ""
                : tr("Select an available day to see times.")}
            </p>
            <div
              className="time-slot-list"
              role="group"
              aria-label={tr("Available times")}
            >
              {slotsForDay.map((slot) => (
                <button
                  key={slot.id}
                  className={`time-slot ${selectedSlot?.id === slot.id ? "selected" : ""}`}
                  disabled={!canBook}
                  aria-pressed={selectedSlot?.id === slot.id}
                  onClick={() => {
                    setSelectedSlot(slot);
                    setReviewing(false);
                  }}
                >
                  <Clock3 size={15} />
                  {indiaTimeLabel(slot.starts_at, language)}
                  {mode === "in_person" && (
                    <span className="slot-clinic-address">{slot.clinic_address}</span>
                  )}
                  <small>
                    {minutes(slot)} {tr("minutes")}
                  </small>
                </button>
              ))}
              {!slotsForDay.length && (
                <p className="muted">{tr("No times available for this date.")}</p>
              )}
            </div>
          </div>

          <aside
            className={`booking-summary ${reviewing ? "reviewing" : ""}`}
            aria-live="polite"
          >
            <div className="booking-panel-head">
              <div>
                <span className="booking-step">3</span>
                <h3>
                  {tr(reviewing ? "Review your appointment" : "Your appointment")}
                </h3>
              </div>
              {reviewing && <Check size={19} aria-hidden="true" />}
            </div>
            {selectedSlot ? (
              <>
                <strong>
                  {doctorDisplayName(provider.display_name, provider.is_demo)}
                </strong>
                <p>{indiaDateTimeLabel(selectedSlot.starts_at, language)}</p>
                <dl className="booking-summary-list">
                  <div>
                    <dt>{tr("For")}</dt>
                    <dd>{child?.name || tr("This child")}</dd>
                  </div>
                  <div>
                    <dt>{tr("Length")}</dt>
                    <dd>
                      {duration} {tr("minutes")}
                    </dd>
                  </div>
                  <div>
                    <dt>{tr("Consultation")}</dt>
                    <dd>
                      {tr(
                        mode === "in_person"
                          ? "In-person appointment"
                          : "Online consultation",
                      )}
                    </dd>
                  </div>
                  {mode === "in_person" && (
                    <div>
                      <dt>{tr("Clinic address")}</dt>
                      <dd>{selectedSlot.clinic_address}</dd>
                    </div>
                  )}
                  <div>
                    <dt>{tr("Fee")}</dt>
                    <dd>{money(provider.fee_minor)}</dd>
                  </div>
                </dl>
                {reviewing ? (
                  <>
                    <p className="booking-disclosure">
                      {isReschedule
                        ? tr(
                            "Your existing consultation is moved only after the replacement is secured.",
                          )
                        : tr(
                            "The slot is held for a short time while you pay; it is released if payment is not completed.",
                          )}
                    </p>
                    <div className="booking-summary-actions">
                      <button className="secondary" onClick={() => setReviewing(false)}>
                        {tr("Back to schedule")}
                      </button>
                      <button
                        disabled={busy || !canBook}
                        onClick={() => onSubmit(selectedSlot)}
                      >
                        {actionLabel}
                        <ChevronRight size={16} />
                      </button>
                    </div>
                  </>
                ) : (
                  <button
                    className="booking-continue"
                    onClick={() => setReviewing(true)}
                  >
                    {tr("Continue to review")}
                    <ChevronRight size={16} />
                  </button>
                )}
              </>
            ) : (
              <div className="booking-summary-empty">
                <CalendarDays size={20} />
                <p>{tr("Choose a time to review your appointment details.")}</p>
              </div>
            )}
          </aside>
        </div>
      )}
    </section>
  );
}
