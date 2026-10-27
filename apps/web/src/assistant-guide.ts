import { VIEWS, validTab } from "./routing.ts";
import type { View } from "./ui/fields";

export type GuideDestination = {
  id: string;
  view: View;
  tab: string;
  label: string;
  description: string;
};

export function guideDestinations(
  value: unknown,
  role: string,
  nav: View[],
): GuideDestination[] {
  if (!Array.isArray(value)) return [];
  return value.filter((row): row is GuideDestination => {
    if (!row || typeof row !== "object") return false;
    const d = row as Record<string, unknown>;
    return (
      typeof d.id === "string" &&
      /^[a-z-]{1,60}$/.test(d.id) &&
      typeof d.view === "string" &&
      VIEWS.includes(d.view as View) &&
      (nav.includes(d.view as View) ||
        d.view === "notifications" ||
        (d.view === "records" && !["admin", "mentor"].includes(role))) &&
      (d.view !== "operations" || role === "admin") &&
      typeof d.tab === "string" &&
      validTab(d.view as View, d.tab) === d.tab &&
      typeof d.label === "string" &&
      d.label.length > 0 &&
      d.label.length <= 160 &&
      typeof d.description === "string" &&
      d.description.length <= 300
    );
  });
}
