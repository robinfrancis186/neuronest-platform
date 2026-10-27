export type MilestoneAnswer = "yes" | "in_progress" | "not_yet" | "unsure";
export type MilestoneItem = {
  id: string;
  domain: string;
  label: { en: string; ml: string };
};
export type MilestoneBand = {
  months: number;
  source_url: string;
  items: MilestoneItem[];
};
export type MilestoneCatalog = {
  version: string;
  age_months: number;
  band: MilestoneBand | null;
  notice: string;
  ai_enabled: boolean;
};
export type MilestoneCheckIn = {
  id: string;
  child: string;
  created_at: string;
  band_months: number;
  age_months: number;
  catalog_version: string;
  answers: Record<string, MilestoneAnswer>;
  skill_loss: boolean;
  parent_concern: boolean;
  summary: {
    kind: "parent_observation_summary";
    counts: Record<MilestoneAnswer, number>;
    follow_up_recommended: boolean;
    source_url: string;
    items: (MilestoneItem & { answer: MilestoneAnswer })[];
    research_reference?: {
      kind: "research_age_reference";
      version: string;
      source: { title: string; url: string; license: string };
      estimates: {
        research_item: string;
        label: { en: string; ml: string };
        estimated_per_100: number;
        nearby_train_children: number;
      }[];
      covered_items: number;
      total_items: number;
    } | null;
  };
  ai_explanation: {
    answer?: string;
    language?: string;
    status?: string;
    notice?: string;
    detail?: string;
    citations?: { title: string; url: string }[];
    method?: string;
    model?: string;
    decision?: "all_observed" | "some_not_yet" | "emerging_or_uncertain";
  };
};
export const MILESTONE_ANSWERS: { value: MilestoneAnswer; label: string }[] = [
  { value: "yes", label: "Yes" },
  { value: "in_progress", label: "In progress" },
  { value: "not_yet", label: "Not yet" },
  { value: "unsure", label: "Not sure" },
];
export function milestoneNextStep(
  checkIn: Pick<MilestoneCheckIn, "skill_loss" | "parent_concern" | "summary">,
) {
  if (checkIn.skill_loss)
    return {
      title: "Contact a clinician promptly",
      description:
        "You reported a lost skill. Contact a qualified healthcare professional promptly; do not wait for another check-in or an AI reply.",
    };
  if (checkIn.parent_concern || checkIn.summary.follow_up_recommended)
    return {
      title: "Arrange a developmental review",
      description:
        "Discuss your concerns and any emerging, unobserved or uncertain skills with a qualified healthcare professional. Ask whether a validated developmental screening or further evaluation is appropriate.",
    };
  return {
    title: "Continue regular developmental checks",
    description:
      "Keep regular developmental appointments and discuss any new concerns with your clinician. Observing these skills does not rule out a developmental condition.",
  };
}
export function completeMilestoneAnswers(
  items: MilestoneItem[],
  answers: Record<string, MilestoneAnswer>,
) {
  return (
    items.length > 0 &&
    Object.keys(answers).length === items.length &&
    items.every((item) =>
      MILESTONE_ANSWERS.some((option) => option.value === answers[item.id]),
    )
  );
}
