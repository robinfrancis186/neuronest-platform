import {
  Bell,
  BookOpen,
  ChartNoAxesCombined,
  ClipboardCheck,
  FileText,
  Flower2,
  Flag,
  Gamepad2,
  Heart,
  Home,
  Settings,
  UserRound,
} from "lucide-react";
import { indiaDayKey } from "../booking-utils";
import { safeUrl } from "../utils";

export type View =
  | "today"
  | "journey"
  | "milestones"
  | "activities"
  | "assessments"
  | "reports"
  | "care"
  | "library"
  | "account"
  | "records"
  | "notifications"
  | "operations";
export type Field = {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
  options?: Array<{ value: string; label: string }>;
  value?: string;
  min?: string;
  max?: string;
  hint?: string;
  autoComplete?: string;
};
export type Modal = {
  title: string;
  description?: string;
  fields: Field[];
  endpoint: string;
  method?: string;
  extra?: Record<string, unknown>;
  transform?: (data: Record<string, unknown>) => Record<string, unknown>;
};
export const labels: Record<string, [string, string]> = {
  today: ["Home", "ഹോം"],
  journey: ["Journey", "വളർച്ച"],
  milestones: ["Milestones", "വളർച്ചാ നാഴികക്കല്ലുകൾ"],
  activities: ["Activities", "കളികളും പ്രവർത്തനങ്ങളും"],
  assessments: ["Assessments", "രക്ഷിതൃ ചെക്ക്-ഇൻ"],
  reports: ["Reports", "പുരോഗതി റിപ്പോർട്ട്"],
  care: ["Care", "പരിചരണം"],
  library: ["Library", "അറിവ്"],
  account: ["Account", "അക്കൗണ്ട്"],
  records: ["Health records", "ആരോഗ്യ രേഖകൾ"],
  notifications: ["Notifications", "അറിയിപ്പുകൾ"],
  operations: ["Operations", "നിർവഹണം"],
};
export const icons = {
  today: Home,
  journey: Flower2,
  milestones: Flag,
  activities: Gamepad2,
  assessments: ClipboardCheck,
  reports: ChartNoAxesCombined,
  care: Heart,
  library: BookOpen,
  account: UserRound,
  records: FileText,
  notifications: Bell,
  operations: Settings,
};
export const today = (now = new Date()) => indiaDayKey(now.toISOString());
export const textField = (
  name: string,
  label: string,
  type = "text",
  required = true,
  value?: string,
): Field => ({ name, label, type, required, value });
export const selectField = (
  name: string,
  label: string,
  options: string[] | Array<{ value: string; label: string }>,
  value?: string,
): Field => ({
  name,
  label,
  type: "select",
  required: true,
  options: options.map((v) =>
    typeof v === "string" ? { value: v, label: v.replaceAll("_", " ") } : v,
  ),
  value,
});
export const safeExternal = (url: unknown) => safeUrl(url);
