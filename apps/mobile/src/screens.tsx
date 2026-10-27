import React, { useEffect, useState } from "react";
import { ActivityIndicator, Linking, Platform, TextInput, View } from "react-native";
import { api, apiPage, ApiError, boundedPagePath, childPath, patch, post } from "./api";
import {
  Badge,
  Button,
  Card,
  Choice,
  Confirm,
  Copy,
  ErrorText,
  Empty,
  Form,
  styles,
  Title,
  useColors,
  useLanguage,
  useT,
  type Field,
} from "./ui";
import {
  visibleName,
  type Answer,
  type Child,
  type Draft,
  type Join,
  type Payment,
  type Row,
  type User,
} from "./types";
import {
  dateLabel,
  indiaDateKey,
  indiaDateLabel,
  indiaTimeLabel,
  money,
  str,
} from "./types";
import { readDrafts, removeDraft, saveDraft, eraseDrafts } from "./storage";
import { replayDrafts, validateObservation } from "./draft-queue";
import { checkout } from "./payment";
import { Consultation } from "./video";
import { upload, download, exportRecords } from "./files";
import { pushToken } from "./push";
import specialist from "../../../packages/contracts/care-specialist.json";
import { learningCatalog } from "../../../packages/contracts/learning-catalog";
import {
  observationTrend,
  reportDays,
  rowsInTimeframe,
  type ReportTimeframe,
} from "./reports";
export type PageProps = {
  child: Child;
  user: User;
  revision: number;
  changed: () => void;
  notify: (message: string) => void;
};
export function useRows(path: string | null, revision: number) {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [truncated, setTruncated] = useState(false);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    if (!path) {
      setRows([]);
      setLoading(false);
      setError("");
      setTruncated(false);
      return;
    }
    const controller = new AbortController();
    setRows([]);
    setLoading(true);
    setError("");
    apiPage<Row>(boundedPagePath(path), { signal: controller.signal })
      .then((page) => {
        if (!controller.signal.aborted) {
          setRows(page.results);
          setTruncated(!!page.next);
        }
      })
      .catch((e) => {
        if (!controller.signal.aborted) setError(e.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [path, revision, retry]);
  return { rows, loading, error, truncated, retry: () => setRetry((v) => v + 1) };
}
export function ListState({ state }: { state: ReturnType<typeof useRows> }) {
  const t = useT();
  return state.loading ? (
    <ActivityIndicator accessibilityLabel={t("Loading…")} />
  ) : state.error ? (
    <View style={{ gap: 8 }}>
      <ErrorText>{state.error}</ErrorText>
      <Button quiet title="Retry" onPress={state.retry} />
    </View>
  ) : state.rows.length ? (
    state.truncated ? (
      <Copy muted>
        {t("Some results are not shown. Refine your search to see more.")}
      </Copy>
    ) : null
  ) : (
    <Empty />
  );
}
function useAction(props: Pick<PageProps, "changed" | "notify">) {
  const busy = React.useRef(false);
  return async (work: () => Promise<unknown>, success = "") => {
    if (busy.current) return;
    busy.current = true;
    try {
      if ((await work()) === false) return;
      props.changed();
      if (success) props.notify(success);
    } catch (error) {
      props.notify((error as Error).message);
    } finally {
      busy.current = false;
    }
  };
}
const today = () => indiaDateKey(new Date().toISOString());
const basic = (
  name: string,
  label: string,
  type: Field["type"] = "text",
  required = true,
): Field => ({ name, label, type, required });
const date = (name: string, label: string, required = true): Field => ({
  ...basic(name, label, "date", required),
  initial: required ? today() : "",
});
const observationFields: Field[] = [
  basic("title", "What happened or changed?"),
  {
    name: "domain",
    label: "What area does it relate to?",
    options: [
      { value: "communication", label: "Communication" },
      { value: "social", label: "Social connection" },
      { value: "movement", label: "Movement" },
      { value: "daily_living", label: "Everyday routines" },
      { value: "sensory", label: "Sensory experiences" },
      { value: "emotional_regulation", label: "Feelings & behaviour" },
      { value: "sleep", label: "Sleep" },
      { value: "eating", label: "Eating" },
      { value: "other", label: "Something else" },
    ],
    required: true,
  },
  {
    name: "status",
    label: "How would you describe it?",
    options: [
      { value: "observed", label: "Something I noticed" },
      { value: "not_yet", label: "Not doing this yet" },
      { value: "unsure", label: "I'm not sure" },
      { value: "lost", label: "Skill reduced or stopped" },
    ],
    required: true,
  },
  date("observed_on", "Observed on"),
  basic("note", "Add any details that may help", "textarea", false),
];
const observationStatusLabels: Record<string, string> = {
  observed: "Something I noticed",
  not_yet: "Not doing this yet",
  unsure: "I'm not sure",
  lost: "Skill reduced or stopped",
};
export function Overview(
  props: PageProps & { go: (tab: string, section?: string) => void },
) {
  const t = useT();
  const appointments = useRows(
    childPath("appointments", props.child.id),
    props.revision,
  );
  const goals = useRows(childPath("goals", props.child.id), props.revision);
  return (
    <>
      <Card tint>
        <Copy muted>{t("Your next step")}</Copy>
        <Title>{t("A little progress, every day.")}</Title>
        <Copy>
          {props.child.name} · {t("Secure care, at your pace.")}
        </Copy>
        <View style={styles.wrap}>
          <Button
            title="Record a concern"
            onPress={() => props.go("Journey", "Observations")}
          />
          <Button
            quiet
            title="Explore care"
            onPress={() => props.go("Care", "Find a professional")}
          />
        </View>
      </Card>
      <Card title="Upcoming care">
        <ListState state={appointments} />
        {appointments.rows
          .filter(
            (a) => !["cancelled", "completed", "expired"].includes(str(a, "status")),
          )
          .slice(0, 3)
          .map((a) => (
            <View key={a.id} style={{ gap: 5 }}>
              <Copy>{str(a, "provider_name") || "Care appointment"}</Copy>
              <Copy muted>{dateLabel(a.starts_at)}</Copy>
              <Badge value={str(a, "status")} />
            </View>
          ))}
        <Button
          quiet
          title="Appointments"
          onPress={() => props.go("Care", "Appointments")}
        />
      </Card>
      <Card title="Small wins">
        <ListState state={goals} />
        {goals.rows.slice(0, 3).map((g) => (
          <View key={g.id} style={styles.row}>
            <Copy>{str(g, "title")}</Copy>
            <Badge value={str(g, "status")} />
          </View>
        ))}
        <Button quiet title="Goals" onPress={() => props.go("Journey", "Goals")} />
      </Card>
    </>
  );
}
function ReportMetric({
  label,
  value,
  detail,
}: {
  label: string;
  value: number;
  detail: string;
}) {
  const colors = useColors();
  return (
    <View
      accessible
      accessibilityLabel={`${label}: ${value}. ${detail}`}
      style={{
        flex: 1,
        minWidth: 148,
        gap: 4,
        padding: 14,
        borderWidth: 1,
        borderColor: colors.line,
        borderRadius: 16,
        backgroundColor: colors.pale,
      }}
    >
      <Copy muted>{label}</Copy>
      <Copy
        style={{ color: colors.teal, fontSize: 28, fontWeight: "700", lineHeight: 34 }}
      >
        {value}
      </Copy>
      <Copy muted>{detail}</Copy>
    </View>
  );
}
function ObservationTrend({ bars }: { bars: number[] }) {
  const colors = useColors();
  const t = useT();
  const maximum = Math.max(...bars, 1);
  return (
    <View
      accessibilityRole="image"
      accessibilityLabel={`${t("Observation trend")}: ${bars.join(", ")} ${t("observations")}`}
      accessibilityHint={t("Observation counts move from earlier to now.")}
      style={{ gap: 8 }}
    >
      <View
        style={{ height: 124, flexDirection: "row", alignItems: "flex-end", gap: 8 }}
      >
        {bars.map((count, index) => (
          <View key={index} style={{ flex: 1, height: "100%", gap: 6 }}>
            <View style={{ flex: 1, justifyContent: "flex-end" }}>
              <View
                style={{
                  height: count
                    ? `${Math.max(12, Math.round((count / maximum) * 100))}%`
                    : 4,
                  borderRadius: 8,
                  backgroundColor: count ? colors.teal : colors.line,
                }}
              />
            </View>
            <Copy muted style={{ textAlign: "center" }}>
              {count}
            </Copy>
          </View>
        ))}
      </View>
      <View style={styles.row}>
        <Copy muted>{t("Earlier")}</Copy>
        <Copy muted>{t("Now")}</Copy>
      </View>
    </View>
  );
}
export function Reports(props: PageProps) {
  const t = useT();
  const [timeframe, setTimeframe] = useState<ReportTimeframe>("30");
  const days = reportDays[timeframe];
  const observations = useRows(
    childPath("observations", props.child.id),
    props.revision,
  );
  const goals = useRows(childPath("goals", props.child.id), props.revision);
  const growth = useRows(childPath("growth", props.child.id), props.revision);
  const recentObservations = rowsInTimeframe(
    observations.rows,
    ["observed_on", "created_at"],
    days,
  );
  const recentGrowth = rowsInTimeframe(
    growth.rows,
    ["measured_on", "created_at"],
    days,
  );
  const activeGoals = goals.rows.filter(
    (row) => str(row, "status") === "active",
  ).length;
  const achievedGoals = goals.rows.filter(
    (row) => str(row, "status") === "achieved",
  ).length;
  const loading = observations.loading || goals.loading || growth.loading;
  const error = observations.error || goals.error || growth.error;
  const retry = () => {
    observations.retry();
    goals.retry();
    growth.retry();
  };
  return (
    <>
      <Card title="Reports">
        <Copy muted>
          {t("Reports show recorded information only. They are not a diagnosis.")}
        </Copy>
        <Choice
          label="Timeframe"
          value={timeframe}
          options={[
            { value: "7", label: "7 days" },
            { value: "30", label: "30 days" },
            { value: "90", label: "90 days" },
          ]}
          onChange={(value) => setTimeframe(value as ReportTimeframe)}
        />
        {loading ? (
          <ActivityIndicator accessibilityLabel={t("Loading…")} />
        ) : error ? (
          <>
            <ErrorText>{error}</ErrorText>
            <Button quiet title="Retry" onPress={retry} />
          </>
        ) : (
          <>
            <View style={[styles.wrap, { alignItems: "stretch" }]}>
              <ReportMetric
                label={t("Observed moments")}
                value={recentObservations.length}
                detail={t("In selected timeframe")}
              />
              <ReportMetric
                label={t("Goals achieved")}
                value={achievedGoals}
                detail={
                  activeGoals ? `${activeGoals} ${t("active")}` : t("No active goals")
                }
              />
              <ReportMetric
                label={t("Growth records")}
                value={recentGrowth.length}
                detail={t("Recorded measurements")}
              />
            </View>
            <View style={{ gap: 8, marginTop: 4 }}>
              <Title>{t("Observation trend")}</Title>
              {recentObservations.length ? (
                <ObservationTrend bars={observationTrend(observations.rows, days)} />
              ) : (
                <Copy muted>{t("No observations in this timeframe.")}</Copy>
              )}
            </View>
          </>
        )}
      </Card>
      <Card title="AI insight">
        <Badge value="Safety gate active" />
        <Copy muted>
          {t(
            "AI insight is off. Nest Assistant can use authorized records only when you opt in and confirm each request.",
          )}
        </Copy>
      </Card>
    </>
  );
}
export function Development(props: PageProps & { section: string }) {
  const { child, section, revision, user, notify, changed } = props;
  const t = useT();
  const colors = useColors();
  const action = useAction(props);
  const resource: Record<string, string> = {
    Observations: "observations",
    Goals: "goals",
    Growth: "growth",
    Vaccinations: "vaccinations",
    Therapy: "therapy-sessions",
  };
  const data = useRows(
    childPath(resource[section] || "observations", child.id),
    revision,
  );
  const practitioners = useRows("practitioners/", 0);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [draftError, setDraftError] = useState("");
  useEffect(() => {
    let active = true;
    readDrafts(user.id)
      .then((d) => {
        if (active) setDrafts(d);
      })
      .catch((e) => {
        if (active) setDraftError(e.message);
      });
    return () => {
      active = false;
    };
  }, [user.id, revision]);
  const submit = async (body: Record<string, string>) => {
    let payload: unknown = {
      ...Object.fromEntries(Object.entries(body).filter(([, v]) => v !== "")),
      child: child.id,
    };
    if (section === "Observations") payload = validateObservation(body, child.id);
    if (section === "Growth")
      payload = {
        child: child.id,
        measured_on: body.measured_on,
        weight_kg: Number(body.weight_kg),
        height_cm: Number(body.height_cm),
      };
    await post(`${resource[section]}/`, payload);
    changed();
    notify(t("Saved."));
  };
  const queue = async (values: Record<string, string>) => {
    await saveDraft(user.id, validateObservation(values, child.id));
    changed();
    notify(
      "Encrypted draft saved on this device. It will sync only after access is checked again.",
    );
  };
  const sync = () =>
    action(async () => {
      const count = await replayDrafts(
        user.id,
        (await readDrafts(user.id)).filter((d) => d.payload.child === child.id),
        async (draft) => {
          const children = await api<Child[]>("children/");
          if (!children.some((c) => c.id === draft.payload.child))
            throw new Error("Child access has changed. This draft was not uploaded.");
          await post("observations/", draft.payload, { "Idempotency-Key": draft.id });
        },
        (id) => removeDraft(user.id, id),
      );
      notify(`${count} drafts synchronized.`);
    });
  const forms: Record<string, { title: string; fields: Field[] }> = {
    Observations: { title: "Record a concern", fields: observationFields },
    Goals: {
      title: "Add goal",
      fields: [
        basic("title", "Title"),
        basic("description", "Description", "textarea", false),
        date("target_date", "Target date", false),
      ],
    },
    Growth: {
      title: "Add measurement",
      fields: [
        date("measured_on", "Measured on"),
        basic("weight_kg", "Weight (kg)", "number"),
        basic("height_cm", "Height (cm)", "number"),
      ],
    },
    Vaccinations: {
      title: "Add vaccination",
      fields: [
        basic("name", "Name"),
        date("administered_on", "Administered on", false),
        date("due_on", "Due on", false),
        basic("note", "Note", "textarea", false),
      ],
    },
    Therapy: {
      title: "Add therapy session",
      fields: [
        {
          name: "practitioner",
          label: "Practitioner",
          options: practitioners.rows.map((p) => ({
            value: p.id,
            label: str(p, "display_name"),
          })),
          required: true,
        },
        basic("scheduled_at", "Scheduled at", "datetime"),
        basic("note", "Note", "textarea", false),
      ],
    },
  };
  const form = forms[section];
  return (
    <>
      {section === "Observations" && (
        <Card tint>
          <Copy>
            Use this space to record a change, an unusual moment, or a question. Your
            note is a parent observation for your care team; it is not a diagnosis.
          </Copy>
          <View style={{ gap: 4, marginTop: 10 }}>
            <Copy style={{ fontWeight: "700" }}>Need help sooner?</Copy>
            <Copy muted>
              If there is immediate danger, call 112. If a skill has reduced or stopped,
              contact your clinician promptly.
            </Copy>
          </View>
        </Card>
      )}
      {section === "Growth" && (
        <Card tint>
          <Copy>
            Personal measurements over time. No reference percentile or medical
            interpretation is generated.
          </Copy>
        </Card>
      )}
      <Card title={section === "Observations" ? "Observations & concerns" : section}>
        <ListState state={data} />
        {data.rows.map((row) => (
          <View
            key={row.id}
            style={{
              gap: 8,
              paddingVertical: 10,
              borderBottomWidth: 1,
              borderColor: colors.line,
            }}
          >
            <Copy style={{ fontWeight: "600" }}>
              {str(row, "title") ||
                str(row, "name") ||
                (section === "Growth"
                  ? `${str(row, "weight_kg")} kg · ${str(row, "height_cm")} cm`
                  : dateLabel(row.scheduled_at))}
            </Copy>
            <Copy muted>
              {str(row, "note") ||
                str(row, "description") ||
                str(row, "measured_on") ||
                str(row, "observed_on")}
            </Copy>
            {!!row.due_on && (
              <Copy muted>
                {t("Due on")}: {str(row, "due_on")}
              </Copy>
            )}
            {!!row.status && (
              <Badge
                value={
                  section === "Observations"
                    ? observationStatusLabels[str(row, "status")] || str(row, "status")
                    : str(row, "status")
                }
              />
            )}
            {section === "Observations" && row.status === "lost" && (
              <Copy style={{ color: colors.error }}>
                Talk with your care team about this change.
              </Copy>
            )}
            {section === "Goals" && (
              <View style={styles.wrap}>
                <Button
                  quiet
                  title={row.status === "achieved" ? "Resume" : "Mark achieved"}
                  onPress={() =>
                    void action(() =>
                      patch(`goals/${row.id}/`, {
                        status: row.status === "achieved" ? "active" : "achieved",
                      }),
                    )
                  }
                />
                <Button
                  quiet
                  title={row.status === "paused" ? "Resume" : "Pause"}
                  onPress={() =>
                    void action(() =>
                      patch(`goals/${row.id}/`, {
                        status: row.status === "paused" ? "active" : "paused",
                      }),
                    )
                  }
                />
              </View>
            )}
          </View>
        ))}
      </Card>
      {form && (
        <Card title={form.title}>
          <Form
            key={`${section}-${child.id}-${revision}`}
            fields={form.fields}
            submit="Save"
            onSubmit={submit}
            secondary={
              section === "Observations" && Platform.OS !== "web"
                ? "Save encrypted draft"
                : undefined
            }
            onSecondary={queue}
          />
        </Card>
      )}
      {section === "Observations" && (drafts.length > 0 || !!draftError) && (
        <Card title="Offline drafts">
          {!!draftError && <ErrorText>{draftError}</ErrorText>}
          {drafts
            .filter((d) => d.payload.child === child.id)
            .map((d) => (
              <View key={d.id} style={styles.row}>
                <Copy>{d.payload.title}</Copy>
                <Button
                  quiet
                  title="Discard"
                  onPress={() =>
                    void action(async () => {
                      if (
                        await Confirm(
                          "Discard encrypted draft?",
                          "This removes the draft from this device. It has not been uploaded.",
                          { confirmLabel: "Discard draft", dismissLabel: "Keep draft" },
                        )
                      )
                        await removeDraft(user.id, d.id);
                    })
                  }
                />
              </View>
            ))}
          <Button title="Sync drafts" onPress={() => void sync()} />
        </Card>
      )}
      {section === "Therapy" && <Referrals {...props} />}
    </>
  );
}
function Referrals(props: PageProps) {
  const data = useRows(childPath("referrals", props.child.id), props.revision);
  return (
    <Card title="Referrals">
      <ListState state={data} />
      {data.rows.map((r) => (
        <View key={r.id}>
          <Copy>{str(r, "reason")}</Copy>
          <Copy muted>
            {str(r, "destination")} · {str(r, "status")}
          </Copy>
        </View>
      ))}
      <Form
        fields={[
          basic("reason", "Reason", "textarea"),
          basic("destination", "Destination"),
        ]}
        submit="Request referral"
        onSubmit={async (values) => {
          await post("referrals/", { ...values, child: props.child.id });
          props.changed();
          props.notify("Saved.");
        }}
      />
    </Card>
  );
}
export function Records(props: PageProps) {
  const records = useRows(childPath("records", props.child.id), props.revision);
  const files = useRows(childPath("attachments", props.child.id), props.revision);
  const [history, setHistory] = useState<Row[] | null>(null);
  const action = useAction(props);
  return (
    <>
      <Card title="Records">
        <Copy muted>
          Records remain online. Signed clinical notes cannot be edited by families.
        </Copy>
        <ListState state={records} />
        {records.rows.map((row) => (
          <View key={row.id} style={{ gap: 6, paddingVertical: 10 }}>
            <Title>{str(row, "title")}</Title>
            <Copy>{str(row, "body")}</Copy>
            <Copy muted>
              {str(row, "author_name")} · {dateLabel(row.created_at)}
            </Copy>
            <Badge value={str(row, "status")} />
          </View>
        ))}
        <View style={styles.wrap}>
          <Button
            quiet
            title="Export records"
            onPress={() =>
              void action(async () => {
                if (
                  !(await Confirm(
                    "Export records?",
                    `Create an authorized export for ${props.child.name}?`,
                  ))
                )
                  return false;
                await exportRecords(props.child.id);
              }, "Export request completed.")
            }
          />
          <Button
            quiet
            title="Access history"
            onPress={() =>
              void action(async () =>
                setHistory(await api<Row[]>(childPath("audit", props.child.id))),
              )
            }
          />
        </View>
        {history &&
          history.map((h) => (
            <Copy key={h.id}>
              {dateLabel(h.created_at)} · {str(h, "action")} · {str(h, "actor_name")}
            </Copy>
          ))}
      </Card>
      <Card title="Family notes">
        <Copy muted>
          Use Journey → Observations for family-entered notes. Clinical records are
          created by the care team.
        </Copy>
      </Card>
      <Card title="Documents">
        <Copy muted>
          New uploads remain quarantined until the server scanner accepts them.
        </Copy>
        <ListState state={files} />
        {files.rows.map((file) => (
          <View key={file.id} style={{ gap: 8 }}>
            <Copy>
              {str(file, "filename") ||
                str(file, "name") ||
                str(file, "original_name") ||
                "Document"}
            </Copy>
            <Badge value={str(file, "scan_status") || str(file, "status")} />
            <Button
              quiet
              title="Download"
              onPress={() =>
                void action(async () => {
                  if (
                    await Confirm(
                      "Download record?",
                      `Share a copy of ${props.child.name}'s document outside NeuroNest?`,
                    )
                  )
                    await download(file.id);
                }, "Download closed.")
              }
            />
          </View>
        ))}
        <Button
          title="Upload document"
          onPress={() =>
            void action(() => upload(props.child.id), "Upload sent for scanning.")
          }
        />
      </Card>
    </>
  );
}
export function Directory(props: PageProps) {
  const t = useT();
  const language = useLanguage();
  const colors = useColors();
  const directory = useRows("practitioners/", props.revision);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Row | null>(null);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedSlot, setSelectedSlot] = useState<Row | null>(null);
  const slots = useRows(
    selected ? `slots/?practitioner=${encodeURIComponent(selected.id)}` : null,
    props.revision,
  );
  const action = useAction(props);
  const availableSlots = slots.rows.filter((slot) => slot.available !== false);
  const dates = Array.from(
    new Set(availableSlots.map((slot) => indiaDateKey(slot.starts_at)).filter(Boolean)),
  );
  const times = availableSlots.filter(
    (slot) => indiaDateKey(slot.starts_at) === selectedDate,
  );
  useEffect(() => {
    setSelected(null);
    setSelectedSlot(null);
    setSelectedDate("");
  }, [props.child.id]);
  const timeRange = (slot: Row) =>
    `${indiaTimeLabel(slot.starts_at, language)} – ${indiaTimeLabel(slot.ends_at, language)} · ${t(slot.consultation_mode === "in_person" ? "In-person appointment" : "Online consultation")}${slot.clinic_address ? ` · ${str(slot, "clinic_address")}` : ""}`;

  useEffect(() => {
    if (!selected) return;
    if (!dates.includes(selectedDate)) {
      setSelectedDate(dates[0] || "");
      setSelectedSlot(null);
    } else if (
      selectedSlot &&
      !availableSlots.some((slot) => slot.id === selectedSlot.id)
    )
      setSelectedSlot(null);
  }, [selected?.id, slots.rows, selectedDate, selectedSlot?.id]);

  if (selected)
    return (
      <Card title="Book a consultation">
        <Title>{str(selected, "display_name")}</Title>
        <Copy>
          {str(selected, "specialty")} · {money(selected.fee_minor)}
        </Copy>
        <Copy muted>Time zone: India Standard Time</Copy>
        <ListState state={slots} />
        {!slots.loading && !slots.error && !availableSlots.length && (
          <Copy muted>
            {t("No open slots right now")} {t("Choose another care professional.")}
          </Copy>
        )}
        {!!dates.length && (
          <Choice
            label="Choose a date"
            value={selectedDate}
            options={dates.map((value) => ({
              value,
              label: indiaDateLabel(
                availableSlots.find((slot) => indiaDateKey(slot.starts_at) === value)
                  ?.starts_at,
                language,
              ),
            }))}
            onChange={(value) => {
              setSelectedDate(value);
              setSelectedSlot(null);
            }}
          />
        )}
        {!!times.length && (
          <Choice
            label="Choose a time"
            value={selectedSlot?.id || ""}
            options={times.map((slot) => ({ value: slot.id, label: timeRange(slot) }))}
            onChange={(id) =>
              setSelectedSlot(times.find((slot) => slot.id === id) || null)
            }
          />
        )}
        {!!selectedSlot && (
          <View
            accessibilityLabel={t("Appointment summary")}
            style={{
              gap: 7,
              padding: 14,
              borderRadius: 14,
              backgroundColor: colors.pale,
            }}
          >
            <Copy style={{ fontWeight: "600" }}>Appointment summary</Copy>
            <Copy>{props.child.name}</Copy>
            <Copy>
              {indiaDateLabel(selectedSlot.starts_at, language)} ·{" "}
              {timeRange(selectedSlot)}
            </Copy>
            <Copy>{money(selected.fee_minor)}</Copy>
            <Button
              title="Hold this time"
              onPress={() =>
                void action(async () => {
                  if (
                    !(await Confirm(
                      "Hold this consultation?",
                      `${props.child.name} · ${str(selected, "display_name")} · ${indiaDateLabel(selectedSlot.starts_at, language)} · ${timeRange(selectedSlot)} · ${money(selected.fee_minor)}. ${t("The slot is held for a short time while you pay; it is released if payment is not completed.")}`,
                    ))
                  )
                    return false;
                  await post("appointments/", {
                    child: props.child.id,
                    slot: selectedSlot.id,
                  });
                  setSelectedSlot(null);
                }, "Slot held. Open Appointments to complete payment.")
              }
            />
          </View>
        )}
        <Button
          quiet
          title="Back to professionals"
          onPress={() => {
            setSelected(null);
            setSelectedDate("");
            setSelectedSlot(null);
          }}
        />
      </Card>
    );

  return (
    <Card title="Find a professional">
      <TextInput
        accessibilityLabel={t("Search specialty or name")}
        style={[
          styles.input,
          {
            borderColor: colors.line,
            backgroundColor: colors.input,
            color: colors.ink,
          },
        ]}
        placeholder={t("Search specialty or name")}
        placeholderTextColor={colors.muted}
        value={query}
        onChangeText={setQuery}
      />
      <ListState state={directory} />
      {Object.values(specialist)
        .join(" ")
        .toLowerCase()
        .includes(query.trim().toLowerCase()) && (
        <View style={{ gap: 8, paddingVertical: 12 }}>
          <Title>{specialist.displayName}</Title>
          <Copy>{specialist.specialty}</Copy>
          <Copy>{specialist.institution}</Copy>
          <Copy>
            {t("Consultation fee (as provided)")}: {money(specialist.feeMinor)}
          </Copy>
          <Copy>
            {t("Availability (as provided)")}: {specialist.availability}
          </Copy>
          <Copy muted>
            {t("Qualifications (as provided)")}: {specialist.qualifications}
          </Copy>
          <Copy>{specialist.role}</Copy>
          <Copy muted>
            {t(
              "Contact NIPMR to confirm appointments, fees and availability. Booking through NeuroNest is not enabled for this profile.",
            )}
          </Copy>
          <Button
            quiet
            title="Contact NIPMR"
            onPress={() =>
              void openExternal(specialist.sourceUrl).catch((e) =>
                props.notify(e.message),
              )
            }
          />
        </View>
      )}
      {directory.rows
        .filter((p) => !str(p, "display_name").includes("— test only"))
        .filter((p) =>
          `${str(p, "display_name")} ${str(p, "specialty")}`
            .toLowerCase()
            .includes(query.toLowerCase()),
        )
        .map((p) => (
          <View key={p.id} style={{ gap: 8, paddingVertical: 12 }}>
            <Title>{str(p, "display_name")}</Title>
            <Copy>
              {str(p, "specialty")} · {str(p, "profession")}
            </Copy>
            <Copy muted>{str(p, "bio")}</Copy>
            <Copy>
              {money(p.fee_minor)} ·{" "}
              {Array.isArray(p.languages)
                ? p.languages.join(", ")
                : str(p, "languages")}
            </Copy>
            <Badge value={p.verified ? "Verified professional" : str(p, "status")} />
            <Button
              quiet
              title="View availability"
              onPress={() => {
                setSelected(p);
                setSelectedDate("");
                setSelectedSlot(null);
              }}
            />
          </View>
        ))}
    </Card>
  );
}
export function Appointments(props: PageProps) {
  const t = useT();
  const colors = useColors();
  const data = useRows(childPath("appointments", props.child.id), props.revision);
  const payments = useRows(childPath("payments", props.child.id), props.revision);
  const [join, setJoin] = useState<(Join & { appointment_id: string }) | null>(null);
  const [reschedule, setReschedule] = useState<Row | null>(null);
  const [replacement, setReplacement] = useState<Row[]>([]);
  useEffect(() => {
    setJoin(null);
    setReschedule(null);
    setReplacement([]);
  }, [props.child.id]);
  const action = useAction(props);
  const pay = (a: Row) =>
    action(async () => {
      const payment = await post<Payment>("payments/", { appointment: a.id });
      await checkout(payment);
      props.notify(
        "Checkout closed. Confirmation arrives from the payment provider. Refresh the appointment.",
      );
    }, "Payment status refreshed.");
  return (
    <>
      {join && (
        <Consultation
          join={join}
          onRejoin={() => post<Join>(`appointments/${join.appointment_id}/join/`, {})}
          onLeave={() => setJoin(null)}
        />
      )}
      <Card title="Appointments">
        <ListState state={data} />
        {data.rows.map((a) => (
          <View
            key={a.id}
            style={{
              gap: 9,
              paddingVertical: 14,
              borderBottomWidth: 1,
              borderColor: colors.line,
            }}
          >
            <Title>{str(a, "provider_name") || "Care appointment"}</Title>
            <Copy>
              {dateLabel(a.starts_at)} · {money(a.amount_minor)}
            </Copy>
            <Copy>
              {t(
                a.consultation_mode === "in_person"
                  ? "In-person appointment"
                  : "Online consultation",
              )}
              {a.clinic_address ? ` · ${str(a, "clinic_address")}` : ""}
            </Copy>
            <Badge value={str(a, "status")} />
            {a.status === "awaiting_payment" && !!a.hold_expires_at && (
              <Copy muted>Hold until {dateLabel(a.hold_expires_at)}</Copy>
            )}
            <View style={styles.wrap}>
              {[
                "awaiting_payment",
                "held",
                "pending_payment",
                "pending",
                "hold",
              ].includes(str(a, "status")) && (
                <Button title="Pay for booking" onPress={() => void pay(a)} />
              )}
              {["confirmed", "in_progress"].includes(str(a, "status")) &&
                a.consultation_mode !== "in_person" && (
                  <Button
                    title="Join consultation"
                    onPress={() =>
                      void action(async () =>
                        setJoin({
                          ...(await post<Join>(`appointments/${a.id}/join/`, {})),
                          appointment_id: a.id,
                        }),
                      )
                    }
                  />
                )}
              {!["cancelled", "completed", "expired"].includes(str(a, "status")) && (
                <>
                  <Button
                    quiet
                    title="Reschedule"
                    onPress={() =>
                      void action(async () => {
                        setReschedule(a);
                        setReplacement(
                          await api<Row[]>(
                            `slots/?practitioner=${encodeURIComponent(str(a, "practitioner"))}`,
                          ),
                        );
                      })
                    }
                  />
                  <Button
                    danger
                    title="Cancel"
                    onPress={() =>
                      void action(async () => {
                        if (
                          await Confirm(
                            "Cancel appointment?",
                            `${props.child.name} · ${dateLabel(a.starts_at)}. Refund eligibility follows the booking policy.`,
                          )
                        )
                          await post(`appointments/${a.id}/cancel/`, {});
                      })
                    }
                  />
                </>
              )}
            </View>
          </View>
        ))}
      </Card>
      {reschedule && (
        <Card title="Reschedule">
          {replacement
            .filter(
              (s) =>
                s.available !== false &&
                (s.consultation_mode || "online") ===
                  (reschedule.consultation_mode || "online"),
            )
            .map((s) => (
              <Button
                key={s.id}
                quiet
                title={`${dateLabel(s.starts_at)}${s.clinic_address ? ` · ${str(s, "clinic_address")}` : ""}`}
                onPress={() =>
                  void action(async () => {
                    if (
                      await Confirm(
                        "Reschedule appointment?",
                        `${props.child.name} · ${dateLabel(s.starts_at)}${s.clinic_address ? ` · ${str(s, "clinic_address")}` : ""}`,
                      )
                    ) {
                      await post(`appointments/${reschedule.id}/reschedule/`, {
                        slot: s.id,
                      });
                      setReschedule(null);
                    }
                  })
                }
              />
            ))}
          <Button quiet title="Close" onPress={() => setReschedule(null)} />
        </Card>
      )}
      <Card title="Payment history">
        <ListState state={payments} />
        {payments.rows
          .filter((p) => data.rows.some((a) => a.id === p.appointment))
          .map((p) => (
            <View key={p.id} style={{ gap: 8 }}>
              <Copy>
                {money(p.amount_minor)} · {str(p, "status")}
              </Copy>
              {["captured", "paid"].includes(str(p, "status")) && (
                <Button
                  quiet
                  title="Request refund"
                  onPress={() =>
                    void action(async () => {
                      if (
                        await Confirm(
                          "Request refund?",
                          "The server checks the booking policy and provider state.",
                        )
                      )
                        await post(`payments/${p.id}/refund/`, {});
                    })
                  }
                />
              )}
            </View>
          ))}
      </Card>
    </>
  );
}
export function Messages(props: PageProps) {
  const messages = useRows(childPath("messages", props.child.id), props.revision);
  const directory = useRows(
    childPath("messages/recipients", props.child.id),
    props.revision,
  );
  return (
    <>
      <Card title="Messages">
        <ListState state={messages} />
        {messages.rows.map((m) => (
          <View key={m.id} style={{ gap: 4 }}>
            <Copy>{str(m, "body")}</Copy>
            <Copy muted>
              {str(m, "author_name")} · {dateLabel(m.created_at)}
            </Copy>
          </View>
        ))}
      </Card>
      <Card title="Send message">
        <Form
          fields={[
            {
              name: "recipient",
              label: "Recipient",
              options: directory.rows.map((p) => ({
                value: p.id,
                label: str(p, "display_name"),
              })),
              required: true,
            },
            basic("body", "Message", "textarea"),
          ]}
          submit="Send"
          onSubmit={async (data) => {
            await post("messages/", { ...data, child: props.child.id });
            props.changed();
            props.notify("Message sent.");
          }}
        />
      </Card>
    </>
  );
}
export async function openExternal(url: string) {
  if (!/^https:\/\//i.test(url))
    throw new Error("This resource does not have a secure web address.");
  await Linking.openURL(url);
}
export function Library({
  revision,
  section,
  notify,
}: {
  revision: number;
  section: string;
  notify: (s: string) => void;
}) {
  const t = useT();
  const data = useRows(section === "Resources" ? "resources/" : "content/", revision);
  return (
    <Card title={section}>
      <ListState state={data} />
      {data.rows
        .filter((row) => section === "Resources" || row.kind === "article")
        .map((row) => (
          <View key={row.id} style={{ gap: 8, paddingVertical: 12 }}>
            <Badge value={str(row, "kind") || str(row, "category") || "Resource"} />
            <Title>{str(row, "title") || str(row, "name")}</Title>
            <Copy>{str(row, "summary") || str(row, "description")}</Copy>
            {!!row.reviewed_at && (
              <Copy muted>Reviewed {dateLabel(row.reviewed_at)}</Copy>
            )}
            {!!(row.url || row.source_url) && (
              <Button
                quiet
                title={section === "Resources" ? "Open resource" : "Read resource"}
                onPress={() =>
                  void openExternal(str(row, "url") || str(row, "source_url")).catch(
                    (e) => notify(e.message),
                  )
                }
              />
            )}
          </View>
        ))}
      {section !== "Resources" && (
        <View
          accessibilityLabel={t("Parent learning")}
          style={{ gap: 10, paddingTop: 18 }}
        >
          <Title>{t("Parent learning")}</Title>
          <Copy muted>
            {t(
              "Search links open YouTube results, not selected or reviewed videos. For learning, not diagnosis.",
            )}
          </Copy>
          {learningCatalog.resources.map((video) => (
            <View key={video.catalogId} style={{ gap: 8, paddingVertical: 10 }}>
              <Title>{video.title}</Title>
              <Copy muted>{video.sourceLabel}</Copy>
              <Copy>{video.summary}</Copy>
              {video.availability === "unavailable" ? (
                <Copy muted>{t("This resource is currently unavailable.")}</Copy>
              ) : (
                <Button
                  quiet
                  title={
                    video.kind === "search"
                      ? "Find videos"
                      : video.kind === "collection"
                        ? "Browse videos"
                        : "Watch video"
                  }
                  onPress={() =>
                    void openExternal(video.sourceUrl).catch((e) => notify(e.message))
                  }
                />
              )}
            </View>
          ))}
        </View>
      )}
    </Card>
  );
}
export function Assistant(props: PageProps & { language: "en" | "ml" }) {
  const [answer, setAnswer] = useState<Answer | null>(null);
  const t = useT();
  const colors = useColors();
  return (
    <Card>
      <Copy muted>
        {t("Help with an observation, a routine, or your next care visit.")}
      </Copy>
      <Copy muted>{t("General information, not a diagnosis.")}</Copy>
      <Form
        fields={[
          basic("message", "Message", "textarea"),
          {
            name: "include_records",
            label: "Include authorized records",
            type: "boolean",
            initial: "false",
          },
        ]}
        submit="Send"
        onSubmit={async (data) => {
          setAnswer(null);
          const include = data.include_records === "true";
          if (
            include &&
            !(await Confirm(
              "Include records?",
              `Send the minimum authorized record context for ${props.child.name} to the AI service?`,
            ))
          )
            return;
          const response = await post<Answer>("assistant/", {
            message: data.message,
            language: props.language,
            child: props.child.id,
            include_records: include,
          });
          setAnswer(response);
        }}
      />
      {answer && (
        <View style={{ gap: 10 }}>
          <Badge value={answer.status} />
          <Copy>{answer.answer}</Copy>
          {!!answer.escalation && answer.escalation !== "none" && (
            <Copy style={{ color: colors.error }}>
              {typeof answer.escalation === "string"
                ? answer.escalation
                : "Contact a qualified professional. For an immediate emergency, call 112."}
            </Copy>
          )}
          {answer.citations?.length > 0 && <Copy muted>{t("Sources")}</Copy>}
          {answer.citations?.map((c) => (
            <Button
              quiet
              key={c.url}
              title={c.title}
              onPress={() =>
                void openExternal(c.url).catch((e) => props.notify(e.message))
              }
            />
          ))}
        </View>
      )}
    </Card>
  );
}
export function Screening(props: PageProps) {
  const instruments = useRows(
    `screenings/instruments/?language=${props.child.language}`,
    props.revision,
  );
  const screens = useRows(childPath("screenings", props.child.id), props.revision);
  const [active, setActive] = useState<Row | null>(null);
  const [instrument, setInstrument] = useState<Row | null>(null);
  const action = useAction(props);
  const followUp = active?.status === "follow_up_required";
  const questions = (
    followUp
      ? active?.follow_up_questions ||
        (active?.result as Row | undefined)?.follow_up_questions ||
        []
      : active?.questions || instrument?.questions || []
  ) as {
    id: string;
    text?: string;
    label?: string;
    options?: { value: string; label: string }[] | string[];
  }[];
  return (
    <>
      <Card title="Screening">
        <Copy>
          Screening supports a clinical conversation. It does not provide a diagnosis.
          Tool age, language and licensing rules are checked by the diagnostic engine.
        </Copy>
        <ListState state={instruments} />
        {instruments.rows.map((i) => (
          <View key={i.id || str(i, "instrument_id")} style={{ gap: 8 }}>
            <Title>{str(i, "name") || str(i, "title") || i.id}</Title>
            <Copy muted>
              {str(i, "description") || str(i, "reason") || str(i, "license_status")}
            </Copy>
            {!!i.notice && <Copy>{str(i, "notice")}</Copy>}
            <Badge
              value={str(i, "status") || (i.enabled ? "Available" : "Unavailable")}
            />
            <Button
              quiet
              title="Start screening"
              disabled={
                i.enabled === false ||
                i.status === "disabled" ||
                i.status === "unavailable"
              }
              onPress={() =>
                void action(async () => {
                  setInstrument(i);
                  setActive(
                    await post<Row>("screenings/", {
                      child: props.child.id,
                      instrument_id: str(i, "instrument_id") || i.id,
                    }),
                  );
                })
              }
            />
          </View>
        ))}
      </Card>
      {active && (
        <Card title="Screening answers">
          {questions.length ? (
            <Form
              key={`${active.id}:${active.status}`}
              fields={questions.map((q) => ({
                name: q.id,
                label: q.text || q.label || q.id,
                options: q.options || ["yes", "no"],
                required: true,
                initial: "",
              }))}
              submit="Submit answers"
              onSubmit={async (data) => {
                const result = await post<Row>(`screenings/${active.id}/submit/`, {
                  answers: data,
                  ...(followUp ? { stage: "follow_up" } : {}),
                });
                setActive(
                  ["completed", "reviewed"].includes(str(result, "status"))
                    ? null
                    : result,
                );
                props.changed();
                props.notify(
                  str(result, "message") ||
                    "Screening submitted. See your result and follow-up status.",
                );
              }}
            />
          ) : (
            <Copy>
              Question content is unavailable. No answers or results have been invented.
            </Copy>
          )}
          <Button quiet title="Close" onPress={() => setActive(null)} />
        </Card>
      )}
      <Card title="Assessment history">
        <ListState state={screens} />
        {screens.rows.map((s) => (
          <View key={s.id} style={{ gap: 8 }}>
            <Copy>
              {str(s, "instrument_id")} · {dateLabel(s.created_at)}
            </Copy>
            <Badge value={str(s, "status")} />
            <Copy>
              {str((s.result || s) as Row, "message") ||
                str((s.result || s) as Row, "notice") ||
                str(s, "review_note")}
            </Copy>
            {["created", "draft", "incomplete", "follow_up_required"].includes(
              str(s, "status"),
            ) && (
              <Button
                quiet
                title="Continue screening"
                onPress={() => {
                  setInstrument(
                    instruments.rows.find((i) => i.id === s.instrument_id) || null,
                  );
                  setActive(s);
                }}
              />
            )}
            <Copy muted>{str(s, "review_status")}</Copy>
          </View>
        ))}
      </Card>
    </>
  );
}
export function FamilyAccess(props: PageProps) {
  const guardians = useRows(childPath("guardianships", props.child.id), props.revision);
  const grants = useRows(childPath("grants", props.child.id), props.revision);
  const directory = useRows("practitioners/", props.revision);
  const action = useAction(props);
  return (
    <>
      <Card title="Invite guardian">
        <Form
          fields={[
            basic("email", "Email", "email"),
            {
              name: "relationship",
              label: "Relationship",
              options: ["parent", "guardian", "caregiver"],
              required: true,
            },
            {
              name: "can_share",
              label: "Can share records",
              type: "boolean",
              initial: "false",
            },
          ]}
          submit="Invite guardian"
          onSubmit={async (v) => {
            if (
              !(await Confirm(
                "Invite guardian?",
                `Allow ${v.email} to access ${props.child.name}'s family record?`,
              ))
            )
              return;
            await post("guardianships/", {
              ...v,
              child: props.child.id,
              can_share: v.can_share === "true",
            });
            props.changed();
            props.notify("Invitation submitted.");
          }}
        />
        <ListState state={guardians} />
        {guardians.rows.map((g) => (
          <View key={g.id} style={{ gap: 6 }}>
            <Copy>
              {str(g, "email") || str(g, "guardian_name")} · {str(g, "relationship")}
            </Copy>
            <Badge value={str(g, "status") || (g.revoked_at ? "Revoked" : "Active")} />
            {!g.revoked_at && (
              <Button
                danger
                title="Revoke"
                onPress={() =>
                  void action(async () => {
                    if (await Confirm("Revoke guardian?", props.child.name))
                      await post(`guardianships/${g.id}/revoke/`, {});
                  })
                }
              />
            )}
          </View>
        ))}
      </Card>
      <Card title="Grant access">
        <Copy muted>
          Choose the professional, exact scope, purpose and expiry. Revocation applies
          to subsequent record requests.
        </Copy>
        <Form
          fields={[
            {
              name: "recipient",
              label: "Recipient",
              options: directory.rows.map((p) => ({
                value: str(p, "user"),
                label: str(p, "display_name"),
              })),
              required: true,
            },
            {
              name: "scopes",
              label: "Scopes",
              options: [
                "records",
                "observations",
                "therapy",
                "screening",
                "messages",
                "export",
              ],
              required: true,
            },
            basic("expires_at", "Expires at", "datetime"),
            basic("purpose", "Purpose", "textarea"),
          ]}
          submit="Grant access"
          onSubmit={async (v) => {
            if (
              !(await Confirm(
                "Share records?",
                `${props.child.name} · ${v.scopes} · until ${v.expires_at}`,
              ))
            )
              return;
            await post("grants/", { ...v, child: props.child.id, scopes: [v.scopes] });
            props.changed();
            props.notify("Access granted.");
          }}
        />
        <ListState state={grants} />
        {grants.rows.map((g) => (
          <View key={g.id} style={{ gap: 7 }}>
            <Copy>
              {str(g, "recipient_name") ||
                String(
                  directory.rows.find((p) => str(p, "user") === str(g, "recipient"))
                    ?.display_name || str(g, "recipient"),
                )}{" "}
              · {Array.isArray(g.scopes) ? g.scopes.join(" · ") : str(g, "scopes")}
            </Copy>
            <Copy muted>{dateLabel(g.expires_at)}</Copy>
            {g.revoked_at ? (
              <Badge value="Revoked" />
            ) : (
              <Button
                danger
                title="Revoke"
                onPress={() =>
                  void action(async () => {
                    if (await Confirm("Revoke access?", props.child.name))
                      await post(`grants/${g.id}/revoke/`, {});
                  })
                }
              />
            )}
          </View>
        ))}
      </Card>
    </>
  );
}
export function Notifications(
  props: Pick<PageProps, "revision" | "changed" | "notify">,
) {
  const data = useRows("notifications/", props.revision);
  const action = useAction(props);
  return (
    <Card title="Notifications">
      <ListState state={data} />
      {data.rows.map((n) => (
        <View key={n.id} style={{ gap: 8 }}>
          <Copy>{str(n, "title") || str(n, "body")}</Copy>
          <Copy muted>
            {str(n, "message")} · {dateLabel(n.created_at)}
          </Copy>
          {!n.read_at && (
            <Button
              quiet
              title="Mark read"
              onPress={() => void action(() => post(`notifications/${n.id}/read/`, {}))}
            />
          )}
        </View>
      ))}
    </Card>
  );
}
export function Preferences({
  language,
  setLanguage,
  displayName,
  onDisplayNameChanged,
  notify,
}: {
  language: "en" | "ml";
  setLanguage: (l: "en" | "ml") => void;
  displayName: string;
  onDisplayNameChanged: (displayName: string) => void;
  notify: (s: string) => void;
}) {
  const [saved, setSaved] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    api<Record<string, unknown>>("preferences/")
      .then(setSaved)
      .catch((e) => setError(e.message));
  }, []);
  const savedDisplayName =
    typeof saved?.display_name === "string" ? saved.display_name : displayName;
  return (
    <Card title="Preferences">
      {!!error && <ErrorText>{error}</ErrorText>}
      {saved && (
        <Form
          fields={[
            {
              name: "display_name",
              label: "Your name",
              initial: visibleName(savedDisplayName),
              required: false,
            },
            {
              name: "language",
              label: "Language",
              initial: String(saved.language || language),
              options: [
                { value: "en", label: "English" },
                { value: "ml", label: "Malayalam" },
              ],
            },
            {
              name: "email",
              label: "Email reminders",
              type: "boolean",
              initial: String(saved.email ?? true),
            },
            {
              name: "push",
              label: "Push reminders",
              type: "boolean",
              initial: String(saved.push ?? false),
            },
          ]}
          submit="Save preferences"
          onSubmit={async (v) => {
            const enablePush = v.push === "true";
            const nextDisplayName = v.display_name.trim();
            const updated = await patch<Record<string, unknown>>("preferences/", {
              ...(nextDisplayName && { display_name: nextDisplayName }),
              language: v.language,
              email: v.email === "true",
              push: enablePush,
              push_token: enablePush ? await pushToken() : "",
            });
            const updatedDisplayName = visibleName(
              typeof updated.display_name === "string"
                ? updated.display_name
                : nextDisplayName,
            );
            if (updatedDisplayName) onDisplayNameChanged(updatedDisplayName);
            setSaved(updated);
            setLanguage(v.language as "en" | "ml");
            notify("Saved.");
          }}
        />
      )}
    </Card>
  );
}
export function Privacy(
  props: Pick<PageProps, "user" | "revision" | "changed" | "notify"> & {
    child?: Child;
  },
) {
  const data = useRows("privacy-requests/", props.revision);
  return (
    <Card title="Privacy">
      <Copy>
        Submit a request for access, correction, deletion or a privacy concern. Record
        retention obligations are reviewed before deletion.
      </Copy>
      {Platform.OS !== "web" && (
        <Button
          danger
          title="Delete offline drafts"
          onPress={() =>
            void (async () => {
              if (
                await Confirm(
                  "Delete offline drafts?",
                  "Remove all encrypted drafts for your account on this device?",
                )
              ) {
                await eraseDrafts(props.user.id);
                props.changed();
                props.notify("Drafts deleted.");
              }
            })().catch((e) => props.notify(e.message))
          }
        />
      )}
      <Form
        fields={[
          {
            name: "kind",
            label: "Request type",
            options: [
              "export",
              "correction",
              "deletion",
              "complaint",
              "adult_transition",
            ],
            required: true,
          },
          basic("detail", "Details", "textarea"),
        ]}
        submit="Submit request"
        onSubmit={async (v) => {
          if (v.kind === "adult_transition" && !props.child)
            throw new Error(
              "Select the historical profile for the adulthood transition.",
            );
          if (
            !(await Confirm(
              "Submit privacy request?",
              `${v.kind} for ${v.kind === "adult_transition" ? props.child?.name : "your account"}`,
            ))
          )
            return;
          await post("privacy-requests/", {
            ...v,
            ...(v.kind === "adult_transition" ? { child: props.child?.id } : {}),
          });
          props.changed();
          props.notify("Request submitted.");
        }}
      />
      <ListState state={data} />
      {data.rows.map((r) => (
        <Copy key={r.id}>
          {str(r, "kind")} · {str(r, "status")} · {dateLabel(r.created_at)}
        </Copy>
      ))}
    </Card>
  );
}
export const childFields: Field[] = [
  basic("name", "Name"),
  basic("date_of_birth", "Date of birth", "date"),
  {
    name: "language",
    label: "Language",
    options: [
      { value: "en", label: "English" },
      { value: "ml", label: "Malayalam" },
    ],
    required: true,
  },
];

export function Invitations(
  props: Pick<PageProps, "user" | "revision" | "changed" | "notify">,
) {
  const state = useRows("guardianships/", props.revision);
  const action = useAction(props);
  const invitations = state.rows.filter(
    (row) => row.email === props.user.email && row.status === "invited",
  );
  if (!invitations.length) return null;
  return (
    <Card title="Family invitations">
      {invitations.map((row) => (
        <View key={row.id} style={{ gap: 8 }}>
          <Copy>
            {str(row, "relationship")} · {str(row, "scopes")}
          </Copy>
          <Copy>
            Accept only an invitation you recognize. The server checks the inviting
            guardian's current authority.
          </Copy>
          <Button
            title="Accept invitation"
            onPress={() =>
              void action(async () => {
                if (
                  !(await Confirm(
                    "Accept invitation?",
                    "Join this family with the listed caregiver permissions?",
                  ))
                )
                  return false;
                await post(`guardianships/${row.id}/accept/`, {});
              }, "Invitation accepted.")
            }
          />
        </View>
      ))}
    </Card>
  );
}
