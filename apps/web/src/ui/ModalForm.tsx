import { useEffect, useRef, useState, type FormEvent } from "react";
import { Check, X } from "lucide-react";
import { api, type ApiError, type Row } from "../api";
import { useTranslation } from "../i18n";
import { cleanForm } from "../utils";
import type { Field, Modal } from "./fields";

/** Point the control at its own hint and its own error, not at a page-level paragraph. */
function describedBy(field: Field, fieldErrors: Record<string, string>) {
  const ids = [
    field.hint ? `${field.name}-hint` : "",
    fieldErrors[field.name] ? `${field.name}-error` : "",
  ].filter(Boolean);
  return ids.length ? ids.join(" ") : undefined;
}

export function ModalForm({
  modal,
  onClose,
  onSaved,
}: {
  modal: Modal;
  onClose: () => void;
  onSaved: (row: Row) => void;
}) {
  const tr = useTranslation();
  const ref = useRef<HTMLDialogElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  useEffect(() => {
    const dialog = ref.current;
    const previousFocus = document.activeElement;
    dialog?.showModal();
    return () => {
      dialog?.close();
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected)
        previousFocus.focus();
    };
  }, []);
  useEffect(() => {
    const first = Object.keys(fieldErrors)[0];
    if (first)
      ref.current?.querySelector<HTMLElement>(`[name="${CSS.escape(first)}"]`)?.focus();
  }, [fieldErrors]);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setFieldErrors({});
    try {
      const data = cleanForm(
        Object.fromEntries(new FormData(e.currentTarget)),
        modal.fields.filter((f) => f.type === "number").map((f) => f.name),
      );
      for (const f of modal.fields)
        if (f.type === "datetime-local" && data[f.name])
          data[f.name] = new Date(String(data[f.name])).toISOString();
      const row = await api(
        modal.endpoint,
        modal.method || "POST",
        modal.transform
          ? modal.transform({ ...data, ...modal.extra })
          : { ...data, ...modal.extra },
      );
      onSaved(row);
    } catch (e) {
      const failure = e as ApiError;
      setError(failure.message);
      setFieldErrors(failure.fields || {});
    } finally {
      setBusy(false);
    }
  }
  return (
    <dialog
      ref={ref}
      onCancel={onClose}
      className="modal"
      aria-labelledby="modal-title"
    >
      <form onSubmit={submit}>
        <div className="section-head">
          <h2 id="modal-title">{tr(modal.title)}</h2>
          <button
            type="button"
            className="icon-button"
            onClick={onClose}
            aria-label={tr("Close dialog")}
          >
            <X />
          </button>
        </div>
        {modal.description && <p className="muted">{tr(modal.description)}</p>}
        <div className="form-fields">
          {modal.fields.map((f) => (
            <label key={f.name}>
              {tr(f.label)}
              {f.required && <span className="required"> *</span>}
              {f.type === "select" ? (
                <select
                  name={f.name}
                  required={f.required}
                  defaultValue={f.value ?? f.options?.[0]?.value}
                  aria-invalid={fieldErrors[f.name] ? true : undefined}
                  aria-describedby={describedBy(f, fieldErrors)}
                >
                  {f.options?.map((o) => (
                    <option key={o.value} value={o.value}>
                      {tr(o.label)}
                    </option>
                  ))}
                </select>
              ) : f.type === "textarea" ? (
                <textarea
                  name={f.name}
                  required={f.required}
                  defaultValue={f.value}
                  rows={4}
                  aria-invalid={fieldErrors[f.name] ? true : undefined}
                  aria-describedby={describedBy(f, fieldErrors)}
                />
              ) : (
                <input
                  type={f.type || "text"}
                  name={f.name}
                  required={f.required}
                  defaultValue={f.value}
                  min={f.min}
                  max={f.max}
                  step={f.type === "number" ? "any" : undefined}
                  inputMode={f.type === "number" ? "decimal" : undefined}
                  autoComplete={f.autoComplete ?? "off"}
                  aria-invalid={fieldErrors[f.name] ? true : undefined}
                  aria-describedby={describedBy(f, fieldErrors)}
                />
              )}{" "}
              {f.hint && <small id={`${f.name}-hint`}>{tr(f.hint)}</small>}
              {fieldErrors[f.name] && (
                <small id={`${f.name}-error`} className="field-error" role="alert">
                  {fieldErrors[f.name]}
                </small>
              )}
            </label>
          ))}
        </div>
        {error && !Object.keys(fieldErrors).length && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
        <div className="modal-actions">
          <button type="button" className="secondary" onClick={onClose}>
            {tr("Cancel")}
          </button>
          <button disabled={busy}>
            {tr(busy ? "Saving…" : "Save changes")}
            <Check size={16} />
          </button>
        </div>
      </form>
    </dialog>
  );
}
