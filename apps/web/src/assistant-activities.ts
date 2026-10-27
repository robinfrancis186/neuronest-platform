import { GAMES, PLAY, ageStage } from "./activities.ts";
import type { GuideDestination } from "./assistant-guide.ts";
import type { MilestoneCheckIn } from "./milestones.ts";

type Tr = (text: string) => string;
const PLAY_AREAS: Record<string, string[]> = {
  communication: ["sounds", "stories", "pointing", "wordchain", "songs"],
  social: ["peekaboo", "faces", "moves", "pairs", "stories"],
  cognitive: ["patterns", "pairs", "counting", "shapes", "sorting"],
  movement: ["moves", "sorting", "sizes", "shapes"],
  daily_living: ["sorting", "moves", "sizes"],
  sensory: ["sounds", "stories", "colours", "treasure"],
};
const ANSWERS = { in_progress: "In progress", not_yet: "Not yet", unsure: "Not sure" };
const WEIGHTS = { in_progress: 2, not_yet: 3, unsure: 1 };

export function activityRequest(message: string) {
  return /\b(activit(?:y|ies)|games?)\b|കളി|കളികൾ|കളിക്കാൻ|പ്രവർത്തന/iu.test(message);
}

export function activityDestinations(
  months: number | null,
  tr: Tr,
): GuideDestination[] {
  if (months === null) return [];
  return [
    ...GAMES.filter((g) => months >= g.min),
    ...PLAY.filter((p) => months >= p.min && months <= p.max),
  ].map((p) => ({
    id: `activity-${p.id}`,
    view: "activities",
    tab: p.id,
    label: tr(p.title),
    description: tr(p.description),
  }));
}

export function recommendActivities(
  childId: string,
  months: number | null,
  checkins: MilestoneCheckIn[],
  language: "en" | "ml",
  tr: Tr,
  recordsUnavailable = false,
): { text: string; actions: string[]; recommendations: GuideDestination[] } {
  const result = {
    text: "",
    actions: [] as string[],
    recommendations: [] as GuideDestination[],
  };
  if (!childId || months === null)
    return {
      ...result,
      text: tr(
        "Choose a child with a valid date of birth to get activity suggestions.",
      ),
      actions: ["account"],
    };
  const latest = checkins
    .filter((c) => c.child === childId)
    .sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
  if (latest?.skill_loss)
    return {
      ...result,
      text: tr(
        "Your latest check-in reports a lost skill. Contact a qualified healthcare professional promptly. Do not wait for games or an assistant reply.",
      ),
      actions: ["booking", "milestones"],
    };
  const current = latest && ageStage(latest.age_months) === ageStage(months);
  const items = current ? latest.summary.items.filter((i) => i.answer in WEIGHTS) : [];
  const options = activityDestinations(months, tr);
  const defaults = [
    "sounds",
    "faces",
    "stories",
    "shapes",
    "pairs",
    "wordchain",
    "colours",
    "moves",
  ];
  const ranked = options
    .map((d) => {
      const matches = items
        .filter((i) => PLAY_AREAS[i.domain]?.includes(d.tab))
        .sort(
          (a, b) =>
            WEIGHTS[b.answer as keyof typeof WEIGHTS] -
            WEIGHTS[a.answer as keyof typeof WEIGHTS],
        );
      const item = matches[0];
      const score = item
        ? WEIGHTS[item.answer as keyof typeof WEIGHTS] * 100 -
          PLAY_AREAS[item.domain].indexOf(d.tab)
        : 0;
      return {
        d,
        item,
        score,
        order: defaults.includes(d.tab) ? defaults.indexOf(d.tab) : 99,
      };
    })
    .sort((a, b) => b.score - a.score || a.order - b.order);
  const selected = ranked.slice(0, 3);
  const game = ranked.find((r) => GAMES.some((g) => g.id === r.d.tab));
  if (game && !selected.some((r) => GAMES.some((g) => g.id === r.d.tab)))
    selected[selected.length - 1] = game;
  result.recommendations = selected.map(({ d, item }) => ({
    ...d,
    description: item
      ? `${tr("From your check-in")}: ${item.label[language]} — ${tr(ANSWERS[item.answer as keyof typeof ANSWERS])}. ${d.description}`
      : `${tr("Selected for their age")}. ${d.description}`,
  }));
  const basis = recordsUnavailable
    ? "I couldn’t load the saved check-in. These suggestions use age only."
    : !latest
      ? "These suggestions use age only. Complete a milestone check-in for suggestions based on your answers."
      : !current
        ? "Your saved check-in is from an earlier age group. These suggestions use the current age; complete a new check-in to update them."
        : items.length === 0
          ? "Your latest saved answers mark the listed skills as observed. Here are age-matched ways to keep playing together."
          : "These suggestions use the current age and your latest saved milestone answers. Skills marked In progress, Not yet or Not sure guide the play choices.";
  result.text = `${tr(basis)}${current ? `\n${tr("Age at check-in")}: ${latest.age_months} ${tr("months")}.` : ""}`;
  if (!current || recordsUnavailable) result.actions.push("milestones");
  if (current && latest.parent_concern) {
    result.text += `\n${tr("You reported a concern. Share it with your care professional; play suggestions do not replace a review.")}`;
    result.actions.push("booking");
  }
  return result;
}
