export const PARENT_QUESTIONNAIRE_ID = "developmental-check-in";
export const PARENT_QUESTIONNAIRE_VERSION = "1";

export const PARENT_QUESTIONNAIRE_ANSWERS = [
  { value: "never", label: "Never" },
  { value: "sometimes", label: "Sometimes" },
  { value: "often", label: "Often" },
  { value: "almost_always", label: "Almost always" },
  { value: "concerned", label: "I’m concerned" },
] as const;

export type ParentQuestionnaireAnswer =
  (typeof PARENT_QUESTIONNAIRE_ANSWERS)[number]["value"];

export const PARENT_QUESTIONNAIRE_SECTIONS = [
  {
    id: "communication",
    title: "Communication & language",
    question:
      "How often does your child use words, sounds, signs, or other ways to share an idea or need?",
  },
  {
    id: "connection",
    title: "Social connection",
    question:
      "How often does your child respond in a way that feels comfortable for them when someone they know tries to connect?",
  },
  {
    id: "play",
    title: "Play & everyday routines",
    question:
      "How often does your child show, share, or invite someone into an activity they enjoy?",
  },
  {
    id: "sensory",
    title: "Sensory experiences",
    question:
      "How often do sounds, touch, movement, or changes in the environment make everyday activities harder?",
  },
  {
    id: "coordination",
    title: "Movement & coordination",
    question:
      "How often does your child need extra support with movement, coordination, or everyday tasks?",
  },
  {
    id: "regulation",
    title: "Feelings, sleep & regulation",
    question:
      "How often does your child need extra support to settle after feeling overwhelmed, upset, or tired?",
  },
] as const;

export type ParentQuestionnaireSection = (typeof PARENT_QUESTIONNAIRE_SECTIONS)[number];
export type ParentQuestionnaireAnswers = Partial<
  Record<ParentQuestionnaireSection["id"], ParentQuestionnaireAnswer>
>;

/** A completed check-in has one descriptive response for each authored section. */
export function isCompleteParentQuestionnaire(answers: ParentQuestionnaireAnswers) {
  const allowed = new Set(PARENT_QUESTIONNAIRE_ANSWERS.map(({ value }) => value));
  return PARENT_QUESTIONNAIRE_SECTIONS.every((section) => {
    const answer = answers[section.id];
    return typeof answer === "string" && allowed.has(answer as ParentQuestionnaireAnswer);
  });
}
