import {
  Activity,
  Download,
  FileText,
  LockKeyhole,
  Plus,
  ShieldCheck,
  Upload,
} from "lucide-react";
import { download } from "../api";
import { selectField, textField, today } from "../ui/fields";
import { Badge, Section, Status } from "../ui/primitives";
import { Action, DataError, Truncation } from "../views/shared";
import { useEffect } from "react";
import "./Records.css";
import { useWorkspace } from "../workspace-context";

export default function RecordsView() {
  const {
    add,
    canWriteClinicalRecords,
    child,
    childId,
    childAdd,
    command,
    confirmAction,
    date,
    exportRecords,
    isStaff,
    lang,
    list,
    loading,
    personOptions,
    recordForm,
    setError,
    setModal,
    tab,
    tr,
    user,
  } = useWorkspace();
  useEffect(() => {
    if (tab && !loading)
      document.getElementById(`records-${tab}`)?.scrollIntoView({ block: "start" });
  }, [tab, loading]);
  return (
    <div className="records-dashboard">
      <div id="records-records" className="records-dashboard-wide">
        <Section
          title={`${child?.name || "Your child"}’s health records`}
          action={
            <div className="row-actions">
              <button className="secondary" onClick={exportRecords} disabled={!childId}>
                <Download size={16} />
                {tr("Export")}
              </button>
              {canWriteClinicalRecords && (
                <button onClick={recordForm}>
                  <Plus size={16} />
                  {tr("Add record")}
                </button>
              )}
            </div>
          }
        >
          <DataError name="records" />
          <Truncation name="records" />
          {list("records").map((r) => (
            <article className="record-card" key={r.id}>
              <div className="section-head">
                <div className="row-actions">
                  <span className="round-icon sage">
                    <FileText />
                  </span>
                  <div>
                    <h3>{r.title}</h3>
                    <small>
                      {r.kind} · {r.author_name} · {date(r.created_at)}
                    </small>
                  </div>
                </div>
                <Status value={r.status} />
              </div>
              <p className="record-body">{r.body}</p>
              {r.amendment_of && (
                <small>
                  {tr("Amendment ·")}
                  {r.amendment_reason}
                </small>
              )}
              {canWriteClinicalRecords &&
                r.author === user.id &&
                r.status === "draft" && (
                  <button
                    className="secondary"
                    onClick={async () => {
                      if (
                        await confirmAction({
                          title: tr("Sign this record?"),
                          detail: `${tr("Signing marks this as the clinical record for {child}.").replace("{child}", child?.name || tr("this child"))} ${tr("A signed record can no longer be edited, only amended with a reason.")}`,
                          confirmLabel: tr("Sign record"),
                        })
                      )
                        command(`records/${r.id}/sign/`, {}, "Clinical record signed.");
                    }}
                  >
                    <ShieldCheck size={15} />
                    {tr("Sign record")}
                  </button>
                )}
              {canWriteClinicalRecords &&
                r.author === user.id &&
                r.status === "signed" && (
                  <button
                    className="text-button"
                    onClick={() =>
                      add("Amend signed record", `records/${r.id}/amend/`, [
                        textField("body", "Corrected record", "textarea", true, r.body),
                        textField("reason", "Reason for amendment", "textarea"),
                      ])
                    }
                  >
                    {tr("Create amendment")}
                  </button>
                )}
            </article>
          ))}
        </Section>
      </div>
        <div id="records-health" className="records-health records-dashboard-wide">
          <Section
            title={tr("Growth over time")}
            action={
              <Action
                onClick={() =>
                  childAdd("Record a growth measurement", "growth/", [
                    textField("measured_on", "Measured on", "date", true, today()),
                    textField("weight_kg", "Weight (kg)", "number"),
                    textField("height_cm", "Height (cm)", "number"),
                  ])
                }
              >
                {tr("Add measurement")}
              </Action>
            }
          >
            <p className="muted">
              {tr("Your measurements, without unvalidated percentile comparisons.")}
            </p>
            {list("growth").length > 1 && (
              <div className="growth-chart">
                <svg
                  viewBox="0 0 450 160"
                  role="img"
                  aria-label={tr("Recorded weight measurements over time")}
                >
                  <path
                    d="M20 130H430M20 80H430M20 30H430"
                    stroke="#dfe5dc"
                    strokeDasharray="4"
                  />
                  {(() => {
                    const rows = [...list("growth")].sort((a, b) =>
                      a.measured_on.localeCompare(b.measured_on),
                    );
                    const max = Math.max(...rows.map((g) => Number(g.weight_kg))) * 1.2;
                    const points = rows.map(
                      (g, i) =>
                        `${20 + (i * 410) / Math.max(rows.length - 1, 1)},${140 - (Number(g.weight_kg) / max) * 120}`,
                    );
                    return (
                      <>
                        <polyline
                          points={points.join(" ")}
                          fill="none"
                          stroke="#477968"
                          strokeWidth="3"
                        />
                        {points.map((p, i) => (
                          <circle
                            key={i}
                            cx={p.split(",")[0]}
                            cy={p.split(",")[1]}
                            r="4"
                            fill="#477968"
                          />
                        ))}
                      </>
                    );
                  })()}
                </svg>
                <small>{tr("Weight (kg) · chronological measurements")}</small>
              </div>
            )}
            {list("growth").map((g) => (
              <div className="list-row" key={g.id}>
                <span className="round-icon sage">
                  <Activity />
                </span>
                <div className="grow">
                  <strong>
                    {g.weight_kg} kg · {g.height_cm} cm
                  </strong>
                  <small>{date(g.measured_on)}</small>
                </div>
              </div>
            ))}
          </Section>
          <Section
            title={tr("Vaccination record")}
            action={
              <Action
                onClick={() =>
                  childAdd("Add vaccination record", "vaccinations/", [
                    textField("name", "Vaccine name"),
                    textField("administered_on", "Given on", "date", false),
                    textField("due_on", "Next due", "date", false),
                    textField("note", "Notes", "textarea", false),
                  ])
                }
              >
                {tr("Add record")}
              </Action>
            }
          >
            {list("vaccinations").map((v) => (
              <div className="list-row" key={v.id}>
                <span className="round-icon lavender">
                  <ShieldCheck />
                </span>
                <div className="grow">
                  <h3>{v.name}</h3>
                  <p>
                    {v.administered_on
                      ? `Given ${date(v.administered_on)}`
                      : `Due ${date(v.due_on)}`}
                  </p>
                  <small>{v.note}</small>
                </div>
                <Badge tone={v.administered_on ? "sage" : "sand"}>
                  {v.administered_on ? "Recorded" : "Upcoming"}
                </Badge>
              </div>
            ))}
            <p className="clinical-note">
              {tr(
                "Confirm vaccination timing with your clinician. This record does not determine eligibility.",
              )}
            </p>
          </Section>
        </div>
      <div id="records-files">
        <Section
          title={tr("Documents & reports")}
          action={
            <label className="button upload-label">
              <Upload size={16} />
              {tr("Upload document")}
              <input
                className="visually-hidden"
                type="file"
                accept=".pdf,.png,.jpg,.jpeg,.txt"
                disabled={!childId}
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const form = new FormData();
                  form.append("child", childId);
                  form.append("file", file);
                  await command(
                    "attachments/",
                    form,
                    "Document received and quarantined for scanning.",
                  );
                  e.target.value = "";
                }}
              />
            </label>
          }
        >
          <p className="muted">
            {tr(
              "Uploads stay quarantined until scanning accepts them. Access is checked again on every download.",
            )}
          </p>
          <DataError name="attachments" />
          <Truncation name="attachments" />
          {list("attachments").map((a) => (
            <div className="list-row" key={a.id}>
              <span className="round-icon peach">
                <FileText />
              </span>
              <div className="grow">
                <h3>{a.filename}</h3>
                <small>
                  {Math.round(a.size / 1024)} KB · {date(a.created_at)}
                </small>
                <p>{a.scan_detail}</p>
              </div>
              <Status value={a.scan_status} />
              <button
                className="secondary"
                disabled={!["clean", "accepted"].includes(a.scan_status)}
                onClick={() =>
                  download(`attachments/${a.id}/content/`, a.filename).catch((e) =>
                    setError(e.message),
                  )
                }
              >
                <Download size={15} />
                {tr("Download")}
              </button>
            </div>
          ))}
        </Section>
      </div>
      <div id="records-sharing">
        <Section
          title={tr("Your family, your permissions")}
          action={
            user.role === "parent" &&
            childId && (
              <button
                onClick={() =>
                  setModal({
                    title: `Share ${child?.name || "child"}’s records`,
                    endpoint: "grants/",
                    extra: { child: childId },
                    description:
                      "Choose the information and an expiry. You can revoke this permission at any time.",
                    fields: [
                      selectField("recipient", "Care professional", personOptions),
                      selectField("scopes", "Information to share", [
                        {
                          value: "messages",
                          label: "Messages only (required for mentors)",
                        },
                        {
                          value: "observations,therapy,messages",
                          label: "Development, therapy and messages",
                        },
                        {
                          value: "records",
                          label: "Health records only",
                        },
                        {
                          value: "records,export",
                          label: "Health records and authorized exports",
                        },
                        {
                          value: "records,observations,therapy,screening,messages",
                          label:
                            "Care records, development, therapy, screening and messages",
                        },
                      ]),
                      textField("purpose", "Purpose of sharing"),
                      textField("expires_at", "Access expires", "datetime-local"),
                    ],
                    transform: (d) => ({
                      ...d,
                      scopes: String(d.scopes).split(","),
                    }),
                  })
                }
              >
                <Plus size={16} />
                {tr("Share with care team")}
              </button>
            )
          }
        >
          <div className="info-banner compact">
            <LockKeyhole size={20} />
            <p>
              {tr(
                "Every access is child-specific. Expired or revoked access stops future reads, exports and downloads.",
              )}
            </p>
          </div>
          <DataError name="grants" />
          <Truncation name="grants" />
          {list("grants").map((g) => (
            <div className="list-row" key={g.id}>
              <span className="round-icon sage">
                <ShieldCheck />
              </span>
              <div className="grow">
                <h3>
                  {list("practitioners").find((p) => p.user === g.recipient)
                    ?.display_name ||
                    g.recipient_name ||
                    "Care professional"}
                </h3>
                <p>{g.purpose}</p>
                <small>
                  {(g.scopes || []).join(" · ")}
                  {tr("· Expires")}
                  {date(g.expires_at)}
                </small>
              </div>
              <Status
                value={
                  g.revoked_at
                    ? "revoked"
                    : new Date(g.expires_at) < new Date()
                      ? "expired"
                      : "active"
                }
              />
              {!g.revoked_at && !isStaff && (
                <button
                  className="text-button danger"
                  onClick={async () => {
                    if (
                      await confirmAction({
                        title: tr("Revoke this access?"),
                        detail:
                          lang === "ml"
                            ? `ഈ പരിചരണ വിദഗ്ധന് ${child?.name ? `${child.name}-യുടെ` : "ഈ കുട്ടിയുടെ"} രേഖകളിലേക്കുള്ള പ്രവേശനം ഉടൻ നഷ്ടമാകും; നടന്നുകൊണ്ടിരിക്കുന്ന കൂടിക്കാഴ്ചയിലേക്കുള്ള പ്രവേശനവും ഉൾപ്പെടെ.`
                            : `This care professional immediately loses access to ${child?.name || tr("this child")}’s records, including any consultation in progress.`,
                        confirmLabel: tr("Revoke access"),
                        destructive: true,
                      })
                    )
                      command(
                        `grants/${g.id}/revoke/`,
                        {},
                        "Care-team access revoked.",
                      );
                  }}
                >
                  {tr("Revoke access")}
                </button>
              )}
            </div>
          ))}
        </Section>
      </div>
    </div>
  );
}
