import type { View } from "./ui/fields";

/**
 * The URL is the source of truth for where you are in the workspace.
 *
 * Destination and tab live in the path, the selected child in the query string,
 * so browser back/forward, refresh and a pasted link all land in the same place.
 * `/auth/callback` is reserved for secure email verification and recovery links.
 */
export const VIEWS: View[] = [
  "today",
  "journey",
  "milestones",
  "activities",
  "assessments",
  "reports",
  "care",
  "library",
  "account",
  "records",
  "notifications",
  "operations",
];

const TABS: Partial<Record<View, readonly string[]>> = {
  activities: [
    "shapes",
    "pairs",
    "patterns",
    "colours",
    "counting",
    "sizes",
    "sounds",
    "stories",
    "moves",
    "faces",
    "songs",
    "peekaboo",
    "pointing",
    "sorting",
    "treasure",
    "wordchain",
  ],
  today: ["observations", "screening", "therapy"],
  journey: ["observations", "milestones", "screening", "therapy"],
  care: ["specialists", "appointments", "messages", "payments", "referrals"],
  library: ["all", "video", "article", "resources"],
  records: ["records", "health", "files", "sharing"],
  operations: [
    "providers",
    "content",
    "resources",
    "finance",
    "privacy",
    "queues",
    "readiness",
  ],
};

export function validTab(view: View | null, tab: string) {
  return view && TABS[view]?.includes(tab) ? tab : "";
}

export type Place = { view: View | null; tab: string; child: string };

export function readPlace(): Place {
  const [, first = "", second = ""] = window.location.pathname.split("/");
  if (first === "journey" && second === "health")
    return {
      view: "records",
      tab: "health",
      child: new URLSearchParams(window.location.search).get("child") || "",
    };
  if (first === "journey" && second === "milestones")
    return {
      view: "milestones",
      tab: "",
      child: new URLSearchParams(window.location.search).get("child") || "",
    };
  const view =
    first === "journey"
      ? "today"
      : (VIEWS as string[]).includes(first)
        ? (first as View)
        : null;
  const tab = view && /^[a-z0-9-]{1,40}$/.test(second) ? second : "";
  return {
    view,
    tab: validTab(view, tab),
    child: new URLSearchParams(window.location.search).get("child") || "",
  };
}

export function placeUrl({ view, tab, child }: Place): string {
  if (view === "journey") view = "today";
  const selectedTab = validTab(view, tab);
  const path = view ? `/${view}${selectedTab ? `/${selectedTab}` : ""}` : "/";
  const query = child ? `?child=${encodeURIComponent(child)}` : "";
  return `${path}${query}`;
}

/** Replace when only the child changed, push when the destination changed. */
export function writePlace(place: Place, mode: "push" | "replace") {
  const url = placeUrl(place);
  if (url === window.location.pathname + window.location.search) return;
  window.history[mode === "push" ? "pushState" : "replaceState"]({}, "", url);
}
