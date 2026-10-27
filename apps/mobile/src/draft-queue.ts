import type { Draft } from "./types";
/** Each acknowledged draft is removed immediately; a later failure cannot replay it. */
export async function replayDrafts(
  owner: string,
  drafts: Draft[],
  send: (draft: Draft) => Promise<void>,
  remove: (id: string) => Promise<void>,
) {
  let sent = 0;
  for (const draft of drafts) {
    if (draft.owner !== owner)
      throw new Error("This draft belongs to another account.");
    await send(draft);
    await remove(draft.id);
    sent++;
  }
  return sent;
}
export const validDate = (value: string) =>
  /^\d{4}-\d{2}-\d{2}$/.test(value) &&
  Number.isFinite(Date.parse(value)) &&
  new Date(value).toISOString().slice(0, 10) === value;
const observationDomains = [
  "communication",
  "social",
  "movement",
  "daily_living",
  "sensory",
  "emotional_regulation",
  "sleep",
  "eating",
  "other",
  // Keep drafts from early clients editable and syncable after the label changed.
  "motor",
];
export function validateObservation(data: Record<string, string>, child: string) {
  if (!child || !data.title?.trim())
    throw new Error("Select a child and enter an observation.");
  if (!validDate(data.observed_on || ""))
    throw new Error("Use a valid date: YYYY-MM-DD.");
  if (!observationDomains.includes(data.domain))
    throw new Error("Select an observation domain.");
  if (!["observed", "not_yet", "unsure", "lost"].includes(data.status))
    throw new Error("Select an observation status.");
  return {
    child,
    domain: data.domain || "communication",
    title: data.title.trim(),
    status: data.status,
    note: data.note || "",
    observed_on: data.observed_on,
  };
}
