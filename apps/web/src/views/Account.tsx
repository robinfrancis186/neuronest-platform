import { ArrowUpRight, LogOut, Users } from "lucide-react";
import { selectField, textField, today } from "../ui/fields";
import { Badge, Empty, Section, Status } from "../ui/primitives";
import { Action, DataError, Truncation } from "../views/shared";
import { useWorkspace } from "../workspace-context";

export default function AccountView() {
  const {
    add,
    age,
    child,
    childAdd,
    childId,
    children,
    command,
    confirmAction,
    date,
    isStaff,
    lang,
    list,
    logout,
    payout,
    setLang,
    setModal,
    tr,
    user,
  } = useWorkspace();
  const profileName = user.display_name.includes("@") ? "" : user.display_name;
  return (
    <div className="columns">
      <div className="stack">
        <Section
          title={tr("Your family profiles")}
          action={
            user.role === "parent" && (
              <Action
                onClick={() =>
                  add("Welcome a little one to your nest", "children/", [
                    textField("name", "Child’s name"),
                    {
                      ...textField("date_of_birth", "Date of birth", "date"),
                      max: today(),
                    },
                    selectField("language", "Preferred language", [
                      { value: "en", label: "English" },
                      { value: "ml", label: "Malayalam" },
                    ]),
                  ])
                }
              >
                {tr("Add child")}
              </Action>
            )
          }
        >
          {children.map((c) => (
            <div className="list-row" key={c.id}>
              <span className="avatar sage">{c.name.slice(0, 1)}</span>
              <div className="grow">
                <h3>{c.name}</h3>
                <small>
                  {date(c.date_of_birth)} · {age(c.date_of_birth)}
                </small>
                <p>
                  {c.language === "ml" ? "മലയാളം" : "English"} ·{" "}
                  {c.transition_status?.replaceAll("_", " ")}
                </p>
              </div>
              {user.role === "parent" && (
                <button
                  className="text-button"
                  onClick={() =>
                    setModal({
                      title: `Edit ${c.name}’s profile`,
                      endpoint: `children/${c.id}/`,
                      method: "PATCH",
                      fields: [
                        textField("name", "Name", "text", true, c.name),
                        selectField(
                          "language",
                          "Preferred language",
                          [
                            { value: "en", label: "English" },
                            { value: "ml", label: "Malayalam" },
                          ],
                          c.language,
                        ),
                      ],
                    })
                  }
                >
                  {tr("Edit")}
                </button>
              )}
            </div>
          ))}
          {!children.length && (
            <Empty
              title={
                isStaff
                  ? "No consented patients yet"
                  : "Make a little space for your child"
              }
            />
          )}
        </Section>
        <Section
          title={tr("Your family circle")}
          action={
            user.role === "parent" &&
            childId && (
              <Action
                onClick={() =>
                  setModal({
                    title: `Invite a guardian for ${child?.name || "your child"}`,
                    endpoint: "guardianships/",
                    extra: { child: childId },
                    fields: [
                      textField("email", "Guardian email", "email"),
                      selectField("relationship", "Relationship", [
                        "parent",
                        "guardian",
                        "caregiver",
                      ]),
                      selectField("can_share", "May this guardian share records?", [
                        {
                          value: "false",
                          label: "No — limited caregiver access",
                        },
                        {
                          value: "true",
                          label: "Yes — may manage sharing",
                        },
                      ]),
                      selectField("scopes", "Caregiver permissions", [
                        {
                          value: "observations,therapy,messages",
                          label: "Development, therapy and messages",
                        },
                        { value: "messages", label: "Messages only" },
                        {
                          value: "records,observations,therapy,screening,messages",
                          label:
                            "Records, development, therapy, screening and messages",
                        },
                      ]),
                    ],
                    transform: (d) => ({
                      ...d,
                      can_share: d.can_share === "true",
                      scopes: String(d.scopes).split(","),
                    }),
                  })
                }
              >
                {tr("Invite guardian")}
              </Action>
            )
          }
        >
          <DataError name="guardianships" />
          <Truncation name="guardianships" />
          {list("guardianships")
            .filter(
              (g) =>
                g.child === childId ||
                (g.status === "invited" && g.email === user.email),
            )
            .map((g) => (
              <article className="list-row" key={g.id}>
                <span className="round-icon peach">
                  <Users />
                </span>
                <div className="grow">
                  <h3>{g.email}</h3>
                  <small>
                    {g.relationship} ·{" "}
                    {g.can_share ? "Can manage sharing" : "Limited access"}
                  </small>
                </div>
                <Status value={g.status} />
                {g.status === "invited" && g.email === user.email && (
                  <button
                    className="secondary"
                    onClick={() =>
                      command(
                        `guardianships/${g.id}/accept/`,
                        {},
                        "Guardian invitation accepted.",
                      )
                    }
                  >
                    {tr("Accept")}
                  </button>
                )}
                {g.status !== "revoked" && !isStaff && g.email !== user.email && (
                  <button
                    className="text-button danger"
                    onClick={async () => {
                      if (
                        await confirmAction({
                          title: tr("Revoke this guardian’s access?"),
                          detail:
                            lang === "ml"
                              ? `${g.email}-ന് ${child?.name ? `${child.name}-യുടെ` : "ഈ കുട്ടിയുടെ"} പ്രൊഫൈൽ, രേഖകൾ, സന്ദേശങ്ങൾ എന്നിവയിലേക്കുള്ള പ്രവേശനം ഉടൻ നഷ്ടമാകും.`
                              : `${g.email} will immediately lose access to ${child?.name || tr("this child")}’s profile, records and messages.`,
                          confirmLabel: tr("Revoke access"),
                          destructive: true,
                        })
                      )
                        command(
                          `guardianships/${g.id}/revoke/`,
                          {},
                          "Guardian access revoked.",
                        );
                    }}
                  >
                    {tr("Revoke")}
                  </button>
                )}
              </article>
            ))}
          {!list("guardianships").length && (
            <p className="muted">
              {tr(
                "Invite the people who support your family. Choose their level of access.",
              )}
            </p>
          )}
        </Section>
        <Section
          title={tr("Privacy & support")}
          action={
            <span className="row-actions">
              <Action
                onClick={() =>
                  add("How can we help?", "privacy-requests/", [
                    selectField("kind", "Request type", [
                      "correction",
                      "export",
                      "deletion",
                      "complaint",
                    ]),
                    textField("detail", "Tell us more", "textarea"),
                  ])
                }
              >
                {tr("New request")}
              </Action>
              <Action
                onClick={() =>
                  childAdd(
                    "Start adulthood transition",
                    "privacy-requests/",
                    [textField("detail", "Transfer request", "textarea")],
                    "Available only from the eighteenth birthday. A verified adult account must later accept the transfer.",
                    { kind: "adult_transition" },
                  )
                }
              >
                {tr("Start transition")}
              </Action>
            </span>
          }
        >
          {list("privacy-requests").map((p) => (
            <div className="list-row" key={p.id}>
              <div className="grow">
                <strong>{p.kind.replaceAll("_", " ")}</strong>
                <p>{p.detail}</p>
                {p.response && <p>{p.response}</p>}
              </div>
              <Status value={p.status} />
            </div>
          ))}
          {!list("privacy-requests").length && (
            <p className="muted">
              {tr(
                "Request a correction, export, deletion, or support with your child’s transition to adulthood.",
              )}
            </p>
          )}
        </Section>
      </div>
      <div className="stack">
        <Section
          title={tr("Your account")}
          action={
            <Action
              onClick={() =>
                setModal({
                  title: "Your name",
                  endpoint: "preferences/",
                  method: "PATCH",
                  fields: [
                    textField("display_name", "Your name", "text", true, profileName),
                  ],
                })
              }
            >
              {tr("Edit name")}
            </Action>
          }
        >
          <div className="account-summary">
            <span className="avatar large lavender">
              {profileName.slice(0, 1) || "N"}
            </span>
            <h3>{profileName || tr("Your account")}</h3>
            <p>{user.email}</p>
            <Badge>{user.role}</Badge>
          </div>
          <div className="preferences">
            <label>
              {tr("App language")}
              <select
                value={lang}
                onChange={(e) => {
                  setLang(e.target.value as "en" | "ml");
                  command(
                    "preferences/",
                    { language: e.target.value },
                    "Language preference saved.",
                    "PATCH",
                  );
                }}
              >
                <option value="en">{tr("English")}</option>
                <option value="ml">മലയാളം</option>
              </select>
            </label>
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={list("preferences")[0]?.email ?? true}
                onChange={(e) =>
                  command(
                    "preferences/",
                    { email: e.target.checked },
                    "Notification preference saved.",
                    "PATCH",
                  )
                }
              />
              {tr("Email reminders")}
            </label>
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={list("preferences")[0]?.push ?? false}
                onChange={(e) =>
                  command(
                    "preferences/",
                    { push: e.target.checked },
                    "Push preference saved. Register a device through the mobile app.",
                    "PATCH",
                  )
                }
              />
              {tr("Mobile push reminders")}
            </label>
          </div>
          <button className="secondary wide" onClick={logout}>
            <LogOut size={16} />
            {tr("Sign out")}
          </button>
        </Section>
        <Section title={tr("Join the care network")}>
          <p className="muted">
            {tr(
              "Doctors, therapists and mentors can apply to support families on NeuroNest.",
            )}
          </p>
          <button
            className="secondary wide"
            onClick={() =>
              setModal({
                title: "Apply to the care network",
                endpoint: "provider-applications/",
                fields: [
                  textField(
                    "display_name",
                    "Professional name",
                    "text",
                    true,
                    user.display_name,
                  ),
                  selectField("profession", "Profession", [
                    "doctor",
                    "therapist",
                    "mentor",
                  ]),
                  textField("specialty", "Specialty"),
                  textField("registration_number", "Professional registration number"),
                  selectField("languages", "Consultation languages", [
                    { value: "en", label: "English" },
                    { value: "ml", label: "Malayalam" },
                    {
                      value: "en,ml",
                      label: "English and Malayalam",
                    },
                  ]),
                  textField(
                    "fee_minor",
                    "Consultation fee in paise (₹1 = 100 paise)",
                    "number",
                  ),
                  textField("bio", "Professional background", "textarea"),
                ],
                transform: (d) => ({
                  ...d,
                  languages: String(d.languages).split(","),
                }),
              })
            }
          >
            {tr("Apply as a professional")}
            <ArrowUpRight size={16} />
          </button>
          {list("provider-applications").map((p) => (
            <div className="list-row" key={p.id}>
              <div className="grow">
                <strong>{p.specialty}</strong>
                <p>{p.review_reason}</p>
              </div>
              <Status value={p.status} />
              {p.status === "approved" && (
                <button className="text-button" onClick={() => payout(p)}>
                  {tr("Set up payouts")}
                </button>
              )}
            </div>
          ))}
        </Section>
      </div>
    </div>
  );
}
