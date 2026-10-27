import { ArrowRight } from "lucide-react";
import { useTranslation } from "../i18n";
import type { Row } from "../api";

export default function ScreeningForm({
  screen,
  onSubmit,
}: {
  screen: Row;
  onSubmit: (answers: Record<string, unknown>) => void;
}) {
  const tr = useTranslation();
  const questions =
    screen.status === "follow_up_required"
      ? screen.result?.follow_up_questions || []
      : screen.questions ||
        screen.instrument?.questions ||
        screen.instrument?.items ||
        [];
  return (
    <div className="screening-form">
      <h3>{tr("Screening session")}</h3>
      {screen.result && Object.keys(screen.result).length > 0 && (
        <div className="info-banner">
          <div>
            <strong>
              {screen.result.result?.interpretation ||
                screen.result.interpretation ||
                screen.result.status ||
                "Response recorded"}
            </strong>
            <p>
              {screen.result.reason ||
                screen.result.detail ||
                screen.result.disclaimer ||
                screen.result.notice}
            </p>
            <pre>{JSON.stringify(screen.result, null, 2)}</pre>
          </div>
        </div>
      )}
      {!["completed", "reviewed"].includes(screen.status) && questions.length ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const values = Object.fromEntries(new FormData(e.currentTarget));
            onSubmit(
              Object.fromEntries(
                Object.entries(values).map(([k, v]) => [
                  k,
                  v === "true"
                    ? true
                    : v === "false"
                      ? false
                      : Number.isFinite(Number(v))
                        ? Number(v)
                        : v,
                ]),
              ),
            );
          }}
        >
          {questions.map((q: Row, index: number) => (
            <label key={q.id || index}>
              {q.text || q.label || q.prompt}
              <select name={q.id || String(index)} required defaultValue="">
                <option disabled value="">
                  {tr("Choose a response")}
                </option>
                {(
                  q.options || [
                    { value: "true", label: "Yes" },
                    { value: "false", label: "No" },
                  ]
                ).map((v: Row | string) => (
                  <option
                    key={typeof v === "string" ? v : String(v.value)}
                    value={typeof v === "string" ? v : String(v.value)}
                  >
                    {typeof v === "string" ? v : v.label}
                  </option>
                ))}
              </select>
            </label>
          ))}
          <button type="submit">
            {tr("Submit responses")}
            <ArrowRight size={16} />
          </button>
        </form>
      ) : (
        !["completed", "reviewed"].includes(screen.status) && (
          <p className="muted">
            {tr(
              "The engine has not supplied licensed questions for this session. Contact the care team before continuing.",
            )}
          </p>
        )
      )}
    </div>
  );
}
