import { translate, type Language } from "../i18n";

export function LanguageSelect({
  value,
  onChange,
}: {
  value: Language;
  onChange: (language: Language) => void;
}) {
  return (
    <select
      className="language-button"
      aria-label={translate("App language", value)}
      value={value}
      onChange={(event) => onChange(event.target.value as Language)}
    >
      <option value="en" lang="en">
        English
      </option>
      <option value="ml" lang="ml">
        മലയാളം
      </option>
    </select>
  );
}
