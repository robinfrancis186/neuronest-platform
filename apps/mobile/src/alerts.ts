import { translate } from "./i18n";
import type { Language } from "./types";

export type ConfirmOptions = {
  language?: Language;
  confirmLabel?: string;
  dismissLabel?: string;
};

/**
 * The platform alert is global UI invoked from handlers, not from a component,
 * so it cannot read the language off React context. The app keeps this in step.
 */
let alertLanguage: Language = "en";
export const setAlertLanguage = (language: Language) => {
  alertLanguage = language;
};
export const getAlertLanguage = () => alertLanguage;

/**
 * Resolve the wording of a confirmation in the reader's language.
 *
 * Kept apart from the component module so it is pure, testable, and cannot be
 * bypassed by a caller that forgets to translate its own labels.
 */
export function confirmText(
  title: string,
  detail: string,
  options: ConfirmOptions = {},
) {
  const language = options.language || alertLanguage;
  const t = (value: string) => translate(language, value);
  return {
    title: t(title),
    detail: t(detail),
    confirmLabel: t(options.confirmLabel || "Continue"),
    dismissLabel: t(options.dismissLabel || "Cancel"),
  };
}
