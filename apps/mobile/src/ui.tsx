import React, { createContext, useContext, useState } from "react";
import {
  Text,
  View,
  TextInput,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Switch,
  Alert,
  Platform,
} from "react-native";
import type { Language } from "./types";
import { translate } from "./i18n";
import { confirmText, type ConfirmOptions } from "./alerts";
import { validDate } from "./draft-queue";
import { themeColors, type Theme } from "./theme";
export const LanguageContext = createContext<Language>("en");
export const ThemeContext = createContext<Theme>("light");

export const useT = () => {
  const language = useContext(LanguageContext);
  return (value: string) => translate(language, value);
};
export const useLanguage = () => useContext(LanguageContext);
export const useColors = () => themeColors[useContext(ThemeContext)];
export function Copy({
  children,
  muted = false,
  style,
}: {
  children: React.ReactNode;
  muted?: boolean;
  style?: object;
}) {
  const t = useT();
  const colors = useColors();
  return (
    <Text style={[styles.copy, { color: muted ? colors.muted : colors.ink }, style]}>
      {typeof children === "string" ? t(children) : children}
    </Text>
  );
}
export function Title({ children }: { children: React.ReactNode }) {
  const colors = useColors();
  return (
    <Text accessibilityRole="header" style={[styles.title, { color: colors.ink }]}>
      {children}
    </Text>
  );
}
export function Button({
  title,
  onPress,
  quiet,
  disabled,
  danger,
}: {
  title: string;
  onPress: () => void;
  quiet?: boolean;
  disabled?: boolean;
  danger?: boolean;
}) {
  const t = useT();
  const colors = useColors();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t(title)}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: quiet ? colors.pale : danger ? colors.danger : colors.teal },
        (pressed || disabled) && { opacity: 0.55 },
      ]}
    >
      <Text
        style={[
          styles.buttonText,
          {
            color: quiet || danger ? (danger ? colors.error : colors.teal) : "#FFFFFF",
          },
        ]}
      >
        {t(title)}
      </Text>
    </Pressable>
  );
}
export function Card({
  title,
  children,
  tint,
}: {
  title?: string;
  children: React.ReactNode;
  tint?: boolean;
}) {
  const t = useT();
  const colors = useColors();
  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: tint ? colors.pale : colors.paper,
          borderColor: colors.line,
        },
      ]}
    >
      {!!title && <Title>{t(title)}</Title>}
      {children}
    </View>
  );
}
export function Badge({ value }: { value: string }) {
  const t = useT();
  const colors = useColors();
  return (
    <View style={[styles.badge, { backgroundColor: colors.pale }]}>
      <Text style={[styles.badgeText, { color: colors.teal }]}>{t(value)}</Text>
    </View>
  );
}
export function Choice({
  label,
  value,
  options,
  onChange,
  required,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
  required?: boolean;
}) {
  const t = useT();
  const colors = useColors();
  return (
    <View
      style={styles.field}
      accessibilityRole="radiogroup"
      accessibilityLabel={t(label)}
    >
      <Copy style={styles.label}>
        {t(label)}
        {required ? " *" : ""}
      </Copy>
      <View style={styles.wrap}>
        {options.map((option) => (
          <Pressable
            key={option.value}
            accessibilityRole="radio"
            accessibilityState={{ checked: value === option.value }}
            aria-checked={value === option.value}
            accessibilityLabel={t(option.label)}
            onPress={() => onChange(option.value)}
            style={[
              styles.chip,
              { backgroundColor: colors.paper, borderColor: colors.line },
              value === option.value && {
                backgroundColor: colors.teal,
                borderColor: colors.teal,
              },
            ]}
          >
            <Text
              style={[
                value === option.value ? styles.chipTextOn : styles.chipText,
                { color: value === option.value ? "#FFFFFF" : colors.ink },
              ]}
            >
              {t(option.label)}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}
export type Field = {
  name: string;
  label: string;
  options?: string[] | { value: string; label: string }[];
  type?:
    | "text"
    | "date"
    | "datetime"
    | "number"
    | "email"
    | "password"
    | "textarea"
    | "boolean";
  required?: boolean;
  initial?: string;
};
/** A validation failure that knows which control it belongs to. */
export class FieldError extends Error {
  constructor(
    readonly field: string,
    message: string,
  ) {
    super(message);
    this.name = "FieldError";
  }
}

export function Form({
  fields,
  submit,
  onSubmit,
  secondary,
  onSecondary,
}: {
  fields: Field[];
  submit: string;
  onSubmit: (data: Record<string, string>) => Promise<void>;
  secondary?: string;
  onSecondary?: (data: Record<string, string>) => Promise<void>;
}) {
  const t = useT();
  const colors = useColors();
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(fields.map((f) => [f.name, f.initial ?? ""])),
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const run = async (handler: (v: Record<string, string>) => Promise<void>) => {
    setError("");
    setFieldErrors({});
    setBusy(true);
    try {
      for (const field of fields) {
        const value = values[field.name]?.trim();
        if (field.required && !value)
          throw new FieldError(field.name, `${t(field.label)}: ${t("Required")}`);
        if (value && field.type === "date" && !validDate(value))
          throw new FieldError(field.name, `${t(field.label)}: YYYY-MM-DD`);
        if (
          value &&
          field.type === "datetime" &&
          (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?(Z|[+-]\d{2}:\d{2})$/.test(value) ||
            !validDate(value.slice(0, 10)) ||
            !Number.isFinite(Date.parse(value)))
        )
          throw new FieldError(field.name, `${t(field.label)}: YYYY-MM-DDTHH:mm+05:30`);
        if (
          value &&
          field.type === "number" &&
          (!Number.isFinite(Number(value)) || Number(value) <= 0)
        )
          throw new FieldError(
            field.name,
            `${t(field.label)}: enter a positive number`,
          );
      }
      await handler(values);
    } catch (err) {
      const failure = err as FieldError;
      setError(failure.message);
      // Put the message on the control that caused it, not only above the form.
      if (failure.field) setFieldErrors({ [failure.field]: failure.message });
    } finally {
      setBusy(false);
    }
  };
  return (
    <View style={{ gap: 12 }}>
      {fields.map((field) =>
        field.options ? (
          <Choice
            key={field.name}
            label={field.label}
            value={values[field.name]}
            options={field.options.map((o) =>
              typeof o === "string" ? { value: o, label: o } : o,
            )}
            onChange={(v) => setValues((s) => ({ ...s, [field.name]: v }))}
            required={field.required}
          />
        ) : field.type === "boolean" ? (
          <View key={field.name} style={styles.row}>
            <Copy>{t(field.label)}</Copy>
            <Switch
              accessibilityLabel={t(field.label)}
              value={values[field.name] === "true"}
              onValueChange={(v) =>
                setValues((s) => ({ ...s, [field.name]: String(v) }))
              }
              trackColor={{ false: colors.line, true: colors.teal }}
            />
          </View>
        ) : (
          <View key={field.name} style={styles.field}>
            <Copy style={styles.label}>
              {t(field.label)}
              {field.required ? " *" : ""}
            </Copy>
            <TextInput
              accessibilityLabel={t(field.label)}
              aria-invalid={!!fieldErrors[field.name]}
              accessibilityHint={fieldErrors[field.name] || undefined}
              value={values[field.name] || ""}
              editable={!busy}
              onChangeText={(v) => setValues((s) => ({ ...s, [field.name]: v }))}
              placeholder={
                field.type === "date"
                  ? "YYYY-MM-DD"
                  : field.type === "datetime"
                    ? "YYYY-MM-DDTHH:mm+05:30"
                    : ""
              }
              placeholderTextColor={colors.muted}
              style={[
                styles.input,
                {
                  borderColor: colors.line,
                  backgroundColor: colors.input,
                  color: colors.ink,
                },
                field.type === "textarea" && {
                  minHeight: 94,
                  textAlignVertical: "top",
                },
              ]}
              multiline={field.type === "textarea"}
              autoCapitalize={
                field.type === "email" || field.type === "password"
                  ? "none"
                  : "sentences"
              }
              autoCorrect={field.type !== "password"}
              secureTextEntry={field.type === "password"}
              keyboardType={
                field.type === "number"
                  ? "decimal-pad"
                  : field.type === "email"
                    ? "email-address"
                    : "default"
              }
              maxLength={
                field.type === "textarea" ? 4000 : field.type === "password" ? 128 : 256
              }
            />
            {!!fieldErrors[field.name] && (
              <Text
                accessibilityRole="alert"
                style={[styles.fieldError, { color: colors.error }]}
              >
                {fieldErrors[field.name]}
              </Text>
            )}
          </View>
        ),
      )}
      {!!error && !Object.keys(fieldErrors).length && (
        <Text accessibilityRole="alert" style={[styles.error, { color: colors.error }]}>
          {error}
        </Text>
      )}
      {busy ? (
        <ActivityIndicator color={colors.teal} accessibilityLabel={t("Loading…")} />
      ) : (
        <View style={styles.wrap}>
          <Button title={submit} onPress={() => void run(onSubmit)} />
          {secondary && onSecondary && (
            <Button quiet title={secondary} onPress={() => void run(onSecondary)} />
          )}
        </View>
      )}
    </View>
  );
}
export function Empty() {
  const t = useT();
  return <Copy muted>{t("No entries yet.")}</Copy>;
}
export function ErrorText({ children }: { children: React.ReactNode }) {
  const colors = useColors();
  return <Copy style={[styles.error, { color: colors.error }]}>{children}</Copy>;
}
/**
 * Confirm a consequential action in the user's own language.
 *
 * The buttons were hardcoded English, so a Malayalam user was asked to confirm
 * discarding a draft or cancelling a booking in a language they may not read.
 * `language` is passed in because this is called from handlers, not components.
 */
/**
 * Confirm a consequential action in the user's own language. The buttons were
 * hardcoded English, so a Malayalam reader was asked to confirm discarding a
 * draft or cancelling a booking in a language they may not read.
 */
export function Confirm(
  title: string,
  detail: string,
  options: ConfirmOptions = {},
): Promise<boolean> {
  const text = confirmText(title, detail, options);
  if (Platform.OS === "web")
    return Promise.resolve(window.confirm(`${text.title}\n\n${text.detail}`));
  return new Promise((resolve) =>
    Alert.alert(
      text.title,
      text.detail,
      [
        { text: text.dismissLabel, style: "cancel", onPress: () => resolve(false) },
        { text: text.confirmLabel, style: "destructive", onPress: () => resolve(true) },
      ],
      { cancelable: true, onDismiss: () => resolve(false) },
    ),
  );
}
export const styles = StyleSheet.create({
  copy: { fontSize: 16, lineHeight: 24, flexShrink: 1 },
  title: { fontSize: 20, fontWeight: "600", marginBottom: 8 },
  card: {
    borderWidth: 1,
    borderRadius: 22,
    padding: 20,
    gap: 12,
    marginBottom: 16,
  },
  button: {
    minHeight: 46,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  buttonText: { fontSize: 15, fontWeight: "600" },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: 8, alignItems: "center" },
  field: { gap: 7 },
  label: { fontWeight: "500", fontSize: 14 },
  input: {
    borderWidth: 1,
    padding: 12,
    borderRadius: 12,
    minHeight: 48,
    fontSize: 16,
  },
  chip: {
    minHeight: 44,
    borderWidth: 1,
    borderRadius: 22,
    paddingVertical: 11,
    paddingHorizontal: 15,
  },
  chipText: { fontSize: 14 },
  chipTextOn: { fontSize: 14, fontWeight: "600" },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    alignSelf: "flex-start",
  },
  badgeText: { fontSize: 13, fontWeight: "600" },
  fieldError: { fontSize: 13, marginTop: 5, fontWeight: "500" },
  error: { lineHeight: 23, fontSize: 15 },
});
