import { useEffect, useRef } from "react";
import { AlertTriangle, Check, X } from "lucide-react";
import { useTranslation } from "../i18n";

export type Confirmation = {
  /** Short question, already translated by the caller if it interpolates data. */
  title: string;
  /** What actually happens if they continue. */
  detail?: string;
  confirmLabel?: string;
  /** Override when "Cancel" would be ambiguous — e.g. cancelling an appointment. */
  dismissLabel?: string;
  /** Destructive actions get the danger treatment and a non-default focus. */
  destructive?: boolean;
};

/**
 * Replaces window.confirm for every consequential action.
 *
 * The native dialog cannot be translated, so a Malayalam user was asked to
 * confirm refunds and access revocations in English. It also cannot explain what
 * it is about to do beyond a single line, and it steals focus from the page.
 */
export function ConfirmDialog({
  confirmation,
  onResolve,
}: {
  confirmation: Confirmation;
  onResolve: (confirmed: boolean) => void;
}) {
  const tr = useTranslation();
  const ref = useRef<HTMLDialogElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    const previousFocus = document.activeElement;
    dialog?.showModal();
    // Destructive actions must not have "yes" under a stray Enter press.
    if (confirmation.destructive) cancelRef.current?.focus();
    return () => {
      dialog?.close();
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected)
        previousFocus.focus();
    };
  }, [confirmation.destructive]);
  return (
    <dialog
      ref={ref}
      className="modal confirm"
      aria-labelledby="confirm-title"
      aria-describedby={confirmation.detail ? "confirm-detail" : undefined}
      onCancel={(e) => {
        e.preventDefault();
        onResolve(false);
      }}
    >
      <div className="section-head">
        <h2 id="confirm-title">
          {confirmation.destructive && <AlertTriangle size={18} aria-hidden="true" />}
          {confirmation.title}
        </h2>
        <button
          type="button"
          className="icon-button"
          onClick={() => onResolve(false)}
          aria-label={tr("Close dialog")}
        >
          <X />
        </button>
      </div>
      {confirmation.detail && (
        <p className="muted" id="confirm-detail">
          {confirmation.detail}
        </p>
      )}
      <div className="modal-actions">
        <button
          type="button"
          className="secondary"
          ref={cancelRef}
          onClick={() => onResolve(false)}
        >
          {confirmation.dismissLabel || tr("Cancel")}
        </button>
        <button
          type="button"
          className={confirmation.destructive ? "danger-solid" : ""}
          onClick={() => onResolve(true)}
        >
          {confirmation.confirmLabel || tr("Continue")}
          <Check size={16} />
        </button>
      </div>
    </dialog>
  );
}
