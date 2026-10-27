import { ExternalLink, Plus, ShieldCheck } from "lucide-react";
import { safeExternal, selectField, textField } from "../ui/fields";
import { Empty, Section, Status } from "../ui/primitives";
import { money } from "../utils";
import { DataError, Truncation } from "../views/shared";
import { Tabs } from "../ui/Tabs";
import { useWorkspace } from "../workspace-context";

export default function OperationsView() {
  const {
    add,
    busy,
    command,
    confirmAction,
    date,
    list,
    loadMoreOperations,
    operationNextOffset,
    payout,
    policyReadiness,
    queueOutbox,
    queuePayments,
    readiness,
    setModal,
    setTab,
    tab,
    tr,
  } = useWorkspace();
  return (
    <>
      <Tabs
        label="Operations sections"
        active={tab || "providers"}
        onSelect={setTab}
        tabs={[
          { key: "providers", label: "Provider verification" },
          { key: "content", label: "Content review" },
          { key: "resources", label: "Support directory" },
          { key: "finance", label: "Payments" },
          { key: "privacy", label: "Privacy & incidents" },
          { key: "queues", label: "Queues & disputes" },
          { key: "readiness", label: "System readiness" },
        ]}
      />
      {(tab || "providers") === "providers" && (
        <Section title={tr("Build a trusted care network")}>
          <DataError name="provider-applications" />
          <Truncation name="provider-applications" />
          {list("provider-applications").map((p) => (
            <article className="record-card" key={p.id}>
              <div className="section-head">
                <div>
                  <h3>{p.display_name}</h3>
                  <small>
                    {p.profession} · {p.specialty} · {p.registration_number}
                  </small>
                </div>
                <Status value={p.status} />
              </div>
              <p>{p.bio}</p>
              <p>
                {(p.languages || []).join(", ")} · {money(p.fee_minor)}
              </p>
              <p>{p.review_reason}</p>
              <button
                className="secondary"
                onClick={() =>
                  add(
                    "Review provider application",
                    `provider-applications/${p.id}/review/`,
                    [
                      selectField("status", "Decision", [
                        "approved",
                        "rejected",
                        "suspended",
                      ]),
                      textField("reason", "Evidence and review reason", "textarea"),
                    ],
                    {},
                    "Verify professional registration and credentials before approving this application.",
                  )
                }
              >
                {tr("Review application")}
                <ShieldCheck size={16} />
              </button>
              {p.status === "approved" && (
                <button className="text-button" onClick={() => payout(p)}>
                  {tr("Set up payouts")}
                </button>
              )}
            </article>
          ))}
          {!list("provider-applications").length && (
            <Empty title={tr("No applications awaiting your attention")} />
          )}
        </Section>
      )}
      {tab === "content" && (
        <Section
          title={tr("Thoughtful information starts here")}
          action={
            <button
              onClick={() =>
                add("Add learning resource", "content/", [
                  textField("title", "Title"),
                  selectField("kind", "Type", ["article", "video"]),
                  selectField("language", "Language", ["en", "ml"]),
                  textField(
                    "summary",
                    "Accessible summary / text alternative",
                    "textarea",
                  ),
                  textField("url", "Article or YouTube URL", "url"),
                  textField("source_url", "Supporting source URL", "url"),
                ])
              }
            >
              <Plus size={16} />
              {tr("Add resource")}
            </button>
          }
        >
          <DataError name="content" />
          <Truncation name="content" />
          {list("content").map((c) => (
            <div className="record-card" key={c.id}>
              <div className="section-head">
                <h3>{c.title}</h3>
                <Status value={c.review_status} />
              </div>
              <p>{c.summary}</p>
              {safeExternal(c.source_url) && (
                <a href={safeExternal(c.source_url)} target="_blank" rel="noreferrer">
                  {tr("Inspect source")}
                  <ExternalLink size={13} />
                </a>
              )}
              <div className="row-actions">
                <button
                  className="secondary"
                  onClick={() =>
                    add("Review learning resource", `content/${c.id}/review/`, [
                      selectField("status", "Decision", ["approved", "rejected"]),
                      textField(
                        "reason",
                        "Clinical and language review notes",
                        "textarea",
                      ),
                    ])
                  }
                >
                  {tr("Review resource")}
                </button>
              </div>
            </div>
          ))}
          {!list("content").length && (
            <Empty title={tr("No learning resources need review")} />
          )}
        </Section>
      )}
      {tab === "resources" && (
        <Section
          title={tr("Support directory")}
          action={
            <button
              onClick={() =>
                add("Add support resource", "resources/", [
                  textField("name", "Resource name"),
                  selectField("kind", "Resource type", [
                    "center",
                    "school",
                    "government",
                    "resource",
                  ]),
                  textField("location", "Location"),
                  textField("summary", "Summary", "textarea"),
                  textField("url", "Official website", "url"),
                ])
              }
            >
              <Plus size={16} />
              {tr("Add support resource")}
            </button>
          }
        >
          <DataError name="resources" />
          <Truncation name="resources" />
          {list("resources").map((r) => (
            <article className="record-card" key={r.id}>
              <div className="section-head">
                <h3>{r.name}</h3>
                <Status value={r.review_status} />
              </div>
              <p>{r.summary}</p>
              <small>
                {r.location} · {r.kind}
              </small>
              {safeExternal(r.url) && (
                <p>
                  <a href={safeExternal(r.url)} target="_blank" rel="noreferrer">
                    {tr("Inspect source")}
                  </a>
                </p>
              )}
              <button
                className="secondary"
                onClick={() =>
                  add("Review support resource", `resources/${r.id}/review/`, [
                    selectField("status", "Decision", ["approved", "rejected"]),
                  ])
                }
              >
                {tr("Review resource")}
              </button>
            </article>
          ))}
        </Section>
      )}
      {tab === "finance" && (
        <Section title={tr("Payments & reconciliation")}>
          <DataError name="payments" />
          <Truncation name="payments" />
          {list("payments").map((p) => (
            <div className="list-row" key={p.id}>
              <div className="grow">
                <h3>{money(p.amount_minor)}</h3>
                <small>{p.provider_order_id || p.id}</small>
                <p>
                  {tr("Refunded")}
                  {money(p.refunded_minor)}
                </p>
              </div>
              <Status value={p.status} />
              <button
                className="secondary"
                onClick={() =>
                  command(
                    `payments/${p.id}/reconcile/`,
                    {},
                    "Reconciliation completed.",
                  )
                }
              >
                {tr("Reconcile")}
              </button>
              {p.status === "captured" && (
                <>
                  <button
                    className="text-button"
                    onClick={() =>
                      command(
                        `payments/${p.id}/transfer/`,
                        {},
                        "Payout request submitted. Check provider status before considering it settled.",
                      )
                    }
                  >
                    {tr("Request payout")}
                  </button>
                  <button
                    className="text-button"
                    onClick={async () => {
                      if (
                        await confirmAction({
                          title: tr("Request a full refund?"),
                          detail: tr(
                            "This returns the entire captured amount to the payer. Provider payout and reconciliation are affected.",
                          ),
                          confirmLabel: tr("Refund in full"),
                          destructive: true,
                        })
                      )
                        command(
                          `payments/${p.id}/refund/`,
                          {},
                          "Refund request recorded.",
                        );
                    }}
                  >
                    {tr("Refund")}
                  </button>
                </>
              )}
            </div>
          ))}
          {!list("payments").length && <Empty title={tr("No financial events yet")} />}
        </Section>
      )}
      {tab === "privacy" && (
        <Section title={tr("Privacy requests & support incidents")}>
          <DataError name="privacy-requests" />
          <Truncation name="privacy-requests" />
          {list("privacy-requests").map((p) => (
            <article className="record-card" key={p.id}>
              <div className="section-head">
                <h3>{p.kind.replaceAll("_", " ")}</h3>
                <Status value={p.status} />
              </div>
              <p>{p.detail}</p>
              <small>{date(p.created_at)}</small>
              <p>{p.response}</p>
              {p.evidence_reference && (
                <small>
                  {tr("Evidence")}: {p.evidence_reference}
                </small>
              )}
              {["correction", "export", "complaint"].includes(String(p.kind)) && (
                <button
                  className="secondary"
                  onClick={() =>
                    add(
                      "Resolve privacy request",
                      `privacy-requests/${p.id}/resolve/`,
                      [
                        selectField("status", "Status", [
                          "in_review",
                          "resolved",
                          "rejected",
                        ]),
                        textField("response", "Response and evidence", "textarea"),
                      ],
                    )
                  }
                >
                  {tr("Review request")}
                </button>
              )}
              {p.kind === "adult_transition" &&
                ["open", "in_review", "revoked"].includes(String(p.status)) && (
                  <button
                    className="secondary"
                    onClick={() =>
                      add(
                        "Review adulthood transfer",
                        `privacy-requests/${p.id}/review/`,
                        [
                          textField("subject", "Verified adult account ID"),
                          textField("evidence_reference", "Identity review reference"),
                        ],
                        {},
                        "Confirm identity outside this form. The named adult must explicitly accept before historical access changes.",
                      )
                    }
                  >
                    {tr("Review transfer")}
                  </button>
                )}
              {p.kind === "adult_transition" && p.status === "completed" && (
                <button
                  className="text-button danger"
                  onClick={() =>
                    add(
                      "Revoke adulthood transfer",
                      `privacy-requests/${p.id}/revoke-transition/`,
                      [
                        textField(
                          "evidence_reference",
                          "Identity correction reference",
                        ),
                      ],
                      {},
                      "This stops subsequent access for both the former guardian and adult subject until a separately reviewed transfer is accepted.",
                    )
                  }
                >
                  {tr("Revoke transfer")}
                </button>
              )}
              {p.kind === "deletion" &&
                ["open", "in_review"].includes(String(p.status)) && (
                  <button
                    className="secondary"
                    onClick={() =>
                      setModal({
                        title: "Review account deletion request",
                        endpoint: `privacy-requests/${p.id}/review/`,
                        fields: [
                          textField("evidence_reference", "Verification reference"),
                          textField(
                            "retention_holds",
                            "Retention holds, one per line",
                            "textarea",
                          ),
                        ],
                        description:
                          "This can disable an account and revoke access. It does not erase medical or financial records.",
                        transform: (d) => ({
                          evidence_reference: d.evidence_reference,
                          retention_holds: String(d.retention_holds)
                            .split("\n")
                            .map((value) => value.trim())
                            .filter(Boolean),
                        }),
                      })
                    }
                  >
                    {tr("Review deletion")}
                  </button>
                )}
              {p.kind === "deletion" && p.status === "approved" && (
                <button
                  className="text-button danger"
                  onClick={() =>
                    add(
                      "Execute account closure",
                      `privacy-requests/${p.id}/execute/`,
                      [],
                      {},
                      "The reviewed account is disabled and access is revoked. Retained clinical and financial records stay under documented holds.",
                    )
                  }
                >
                  {tr("Disable account")}
                </button>
              )}
              {p.kind === "deletion" && p.status === "retention_blocked" && (
                <button
                  className="secondary"
                  onClick={() =>
                    add(
                      "Restore disabled account",
                      `privacy-requests/${p.id}/restore/`,
                      [textField("evidence_reference", "Restoration review reference")],
                    )
                  }
                >
                  {tr("Restore account")}
                </button>
              )}
            </article>
          ))}
          {!list("privacy-requests").length && <Empty title={tr("No open requests")} />}
        </Section>
      )}
      {tab === "queues" && (
        <Section title={tr("Delivery queues & payment disputes")}>
          <DataError name="operations" />
          <Truncation name="operations" />
          {queueOutbox.map((item) => (
            <article className="list-row" key={`outbox-${item.id}`}>
              <div className="grow">
                <h3>{String(item.kind).replaceAll(".", " ")}</h3>
                <small>
                  {date(item.created_at)} · {item.required_action}
                </small>
              </div>
              <Status value={item.status} />
              {item.retry_allowed === true && (
                <button
                  className="secondary"
                  onClick={() =>
                    add(
                      "Retry reviewed delivery",
                      `operations/${item.id}/retry/`,
                      [
                        selectField("reason", "Reason", [
                          "configuration_restored",
                          "provider_recovered",
                          "reviewed_transient_failure",
                        ]),
                      ],
                      {},
                      "Only the existing allowlisted delivery is retried. Financial actions are never replayed here.",
                    )
                  }
                >
                  {tr("Retry delivery")}
                </button>
              )}
            </article>
          ))}
          {queuePayments.map((item) => (
            <article className="list-row" key={`payment-${item.id}`}>
              <div className="grow">
                <h3>{String(item.kind).replaceAll(".", " ")}</h3>
                <small>
                  {date(item.created_at)} · {item.required_action}
                </small>
              </div>
              <Status value={item.status} />
              {String(item.kind).startsWith("payment.dispute.") && (
                <button
                  className="secondary"
                  onClick={() =>
                    add(
                      "Record dispute review",
                      `operations/${item.id}/resolve-dispute/`,
                      [
                        selectField("resolution", "Resolution", [
                          "evidence_submitted",
                          "provider_closed",
                          "escalated",
                        ]),
                        textField("evidence_reference", "Provider case reference"),
                      ],
                      {},
                      "This records reviewed evidence only. It does not transfer, refund, or adjudicate money.",
                    )
                  }
                >
                  {tr("Review dispute")}
                </button>
              )}
            </article>
          ))}
          {operationNextOffset !== null && (
            <button
              className="secondary"
              disabled={busy === "operations/more"}
              onClick={() => void loadMoreOperations()}
            >
              {tr(busy === "operations/more" ? "Loading queue items…" : "Load more queue items")}
            </button>
          )}
          {!queueOutbox.length && !queuePayments.length && (
            <Empty title={tr("No queue items need review")} />
          )}
        </Section>
      )}
      {tab === "readiness" && (
        <Section title={tr("Readiness is evidence, not a label")}>
          <p className="muted">
            {tr(
              "External integrations and clinical capabilities remain unavailable until their configuration and evidence are in place.",
            )}
          </p>
          {readiness ? (
            <pre className="readiness-json">{JSON.stringify(readiness, null, 2)}</pre>
          ) : (
            <Empty title={tr("Readiness is unavailable")} />
          )}
          {policyReadiness && (
            <pre className="readiness-json">
              {JSON.stringify(policyReadiness, null, 2)}
            </pre>
          )}
        </Section>
      )}
    </>
  );
}
