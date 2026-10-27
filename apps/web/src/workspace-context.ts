import { createContext, useContext, type Dispatch, type SetStateAction } from "react";
import type { GuideDestination } from "./assistant-guide";
import type { Appointment, Child, Row, User } from "./api";
import type { Field, Modal, View } from "./ui/fields";
import type { Confirmation } from "./ui/ConfirmDialog";

export type ChatEntry = {
  role: string;
  text: string;
  citations?: Row[];
  status?: string;
  actions?: string[];
  recommendations?: GuideDestination[];
};
export type Option = { value: string; label: string };

/**
 * Everything the signed-in workspace shares between its shell and its views.
 *
 * These values used to live in one component's closure, which is why every view
 * had to live in that same file. Naming the surface here is what lets each view
 * be its own module: a view states what it needs by destructuring, and this type
 * is the one place to look for what a view is allowed to reach for.
 */
export type Workspace = {
  // Identity, role and language.
  user: User;
  isStaff: boolean;
  isAdmin: boolean;
  canWriteClinicalRecords: boolean;
  lang: "en" | "ml";
  setLang: (language: "en" | "ml") => void;
  tr: (text: string) => string;
  t: (key: string) => string;
  date: (value: unknown, full?: boolean) => string;
  age: (dob: string) => string;

  // Navigation.
  view: View;
  nav: View[];
  currentTitle: string;
  navigate: (view: View, tab?: string) => void;
  tab: string;
  setTab: Dispatch<SetStateAction<string>>;

  // Child context and the data loaded for the current view.
  children: Child[];
  /** True only after the child list loaded successfully for this session. */
  childrenLoaded: boolean;
  child: Child | undefined;
  childId: string;
  setChildId: Dispatch<SetStateAction<string>>;
  /** Switch the active child and drop the data loaded for the previous one. */
  selectChild: (id: string) => void;
  list: (key: string) => Row[];
  errors: Record<string, string>;
  /** Key -> total row count, for lists the server returned only a page of. */
  truncated: Record<string, number>;
  loading: boolean;
  refresh: () => void;
  readiness: Row | null;

  // Transient feedback.
  notice: string;
  setNotice: Dispatch<SetStateAction<string>>;
  error: string;
  setError: Dispatch<SetStateAction<string>>;
  busy: string;
  setBusy: Dispatch<SetStateAction<string>>;
  online: boolean;

  // Dialogs and the forms that open them.
  modal: Modal | null;
  setModal: Dispatch<SetStateAction<Modal | null>>;
  /** In-app replacement for window.confirm: translated, styled and focus-managed. */
  confirmAction: (confirmation: Confirmation) => Promise<boolean>;
  add: (
    title: string,
    endpoint: string,
    fields: Field[],
    extra?: Record<string, unknown>,
    description?: string,
  ) => void;
  childAdd: (
    title: string,
    endpoint: string,
    fields: Field[],
    description?: string,
    extra?: Record<string, unknown>,
  ) => void;
  observationForm: () => void;
  recordForm: () => void;
  goalForm: () => void;
  payout: (application: Row) => void;

  // Marketplace, booking and payment.
  search: string;
  setSearch: Dispatch<SetStateAction<string>>;
  provider: Row | null;
  setProvider: Dispatch<SetStateAction<Row | null>>;
  slots: Row[];
  slotsLoading: boolean;
  chooseProvider: (provider: Row) => Promise<void>;
  book: (slot: Row) => Promise<void>;
  reschedule: (appointment: Row) => Promise<void>;
  checkout: (appointment: Appointment) => Promise<void>;
  childAppointments: Row[];
  personOptions: Option[];
  practitionerOptions: Option[];
  messageOptions: Option[];

  // Consultation video.
  join: (appointment: Row) => Promise<void>;
  room: Row | null;
  setRoom: Dispatch<SetStateAction<Row | null>>;

  // Assistant.
  assistantOpen: boolean;
  setAssistantOpen: Dispatch<SetStateAction<boolean>>;
  chat: ChatEntry[];
  setChat: Dispatch<SetStateAction<ChatEntry[]>>;
  includeRecords: boolean;
  setIncludeRecords: Dispatch<SetStateAction<boolean>>;
  chatScope: { current: string };

  // Screening.
  screen: Row | null;
  setScreen: Dispatch<SetStateAction<Row | null>>;

  // Operations.
  queueOutbox: Row[];
  queuePayments: Row[];
  operationNextOffset: number | null;
  policyReadiness: Row | undefined;

  // Server calls shared by every view.
  command: (
    path: string,
    body?: unknown,
    success?: string,
    method?: string,
  ) => Promise<Row | null>;
  loadMoreOperations: () => Promise<void>;
  exportRecords: () => Promise<void>;
  logout: () => Promise<void>;
};

const WorkspaceContext = createContext<Workspace | null>(null);
export const WorkspaceProvider = WorkspaceContext.Provider;

export function useWorkspace(): Workspace {
  const workspace = useContext(WorkspaceContext);
  if (!workspace)
    throw new Error("useWorkspace must be called inside a WorkspaceProvider.");
  return workspace;
}
