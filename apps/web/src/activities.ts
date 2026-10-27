export const SHAPE_NAMES = ["Circle", "Square", "Triangle", "Star"];
export const COLOUR_NAMES = ["Red", "Yellow", "Blue", "Green"];
export const PICTURE_NAMES = ["Bee", "Leaf", "Flower", "Ball", "Book", "Blocks"];
export type GameId = "shapes" | "pairs" | "patterns" | "colours" | "counting" | "sizes";
export const GAMES: { id: GameId; title: string; description: string; min: number }[] =
  [
    {
      id: "shapes",
      title: "Find the shape",
      description: "Look at a shape, then find the one that matches.",
      min: 24,
    },
    {
      id: "pairs",
      title: "Match the pairs",
      description: "Turn over two cards at a time to find matching pictures.",
      min: 36,
    },
    {
      id: "patterns",
      title: "Finish the pattern",
      description: "Look at the shapes and choose what comes next.",
      min: 36,
    },
    {
      id: "colours",
      title: "Colour match",
      description: "Find the colour that matches. Name it together as you play.",
      min: 24,
    },
    {
      id: "counting",
      title: "Count the garden",
      description: "Count the flowers and choose the matching number.",
      min: 36,
    },
    {
      id: "sizes",
      title: "Big or small?",
      description: "Look at the two balls and compare their sizes.",
      min: 24,
    },
  ];
export const PLAY = [
  {
    id: "sounds",
    title: "Sound and response",
    description: "Take turns making sounds, words or signs.",
    min: 0,
    max: 17,
    icon: "sounds",
    steps: [
      "Get comfortable together. Notice a sound, word or sign your child chooses to make.",
      "Respond gently by copying it. Pause and give your child time to respond in their own way.",
      "Follow their interest. There is no need to ask them to repeat or make eye contact.",
    ],
  },
  {
    id: "faces",
    title: "Faces and smiles",
    description: "Talk face-to-face during a calm everyday moment.",
    min: 0,
    max: 5,
    icon: "sounds",
    steps: [
      "Hold your baby comfortably and talk softly about what you are doing.",
      "Try a gentle smile or a short sound, then pause to notice their response.",
      "Follow your baby’s cues. Look away or stop if they seem tired or uncomfortable.",
    ],
  },
  {
    id: "songs",
    title: "Songs and pauses",
    description: "Share a familiar song and leave room for a response.",
    min: 0,
    max: 35,
    icon: "sounds",
    steps: [
      "Choose a short, familiar song and sing gently in a language you enjoy.",
      "Pause between lines and notice a look, sound, sign or movement. No response is required.",
      "For older toddlers, invite a familiar action or word without asking them to perform.",
    ],
  },
  {
    id: "peekaboo",
    title: "Peek-a-boo together",
    description: "Take gentle turns appearing and saying hello.",
    min: 6,
    max: 17,
    icon: "moves",
    steps: [
      "Sit comfortably where your baby can see you. Briefly cover your own face with your hands.",
      "Uncover your face and say hello softly. Wait and notice their response.",
      "Keep your baby’s face uncovered. Stop if they are startled or uninterested.",
    ],
  },
  {
    id: "stories",
    title: "Picture stories",
    description: "Explore a picture book together and follow your child’s interest.",
    min: 6,
    max: 999,
    icon: "stories",
    steps: [
      "Choose a sturdy picture book and sit comfortably together. You do not need to read every word.",
      "Name something your child looks at or points to. Pause for a sound, gesture or comment.",
      "Follow their interest and turn the page when they are ready.",
    ],
  },
  {
    id: "moves",
    title: "Copy my moves",
    description: "Take turns with a wave, clap or familiar hand movement.",
    min: 12,
    max: 999,
    icon: "moves",
    steps: [
      "Sit or stand comfortably in a safe space. Try a gentle wave or clap.",
      "Invite your child to join in, or copy a movement they choose instead.",
      "Let your child lead. Do not move their body for them or push an uncomfortable movement.",
    ],
  },
  {
    id: "pointing",
    title: "Point and name",
    description: "Notice and name familiar things in everyday life.",
    min: 12,
    max: 35,
    icon: "stories",
    steps: [
      "Look at a familiar object together, such as a cup or shoe.",
      "Name it and pause. Your child can respond with a look, gesture, sound or word.",
      "Offer two familiar choices and follow what interests them. There is no need to test them.",
    ],
  },
  {
    id: "sorting",
    title: "Sort and discover",
    description: "Group large, safe objects by a feature you notice.",
    min: 24,
    max: 999,
    icon: "moves",
    steps: [
      "Choose a few large, safe objects, such as socks or soft toys. Avoid small parts and sharp objects.",
      "Put two similar objects together and describe what they share.",
      "Let your child make their own groups. Talk about their choices rather than marking them right or wrong.",
    ],
  },
  {
    id: "treasure",
    title: "A noticing walk",
    description: "Find shapes and colours together around your home.",
    min: 36,
    max: 59,
    icon: "moves",
    steps: [
      "Choose a safe room or outdoor space and stay together.",
      "Look for something round, soft or a familiar colour. Let your child suggest what to notice next.",
      "Describe what you find together. Keep household hazards out of reach.",
    ],
  },
  {
    id: "wordchain",
    title: "Build a story",
    description: "Take turns adding one idea to a shared story.",
    min: 60,
    max: 999,
    icon: "stories",
    steps: [
      "Choose a familiar character, toy or picture as the start of your story.",
      "Take turns adding one idea through words, pictures, signs or gestures.",
      "Follow their imagination. Stop while it is still enjoyable, without correcting their story.",
    ],
  },
];

/** Date-only input, using the same India day key as the rest of the workspace. */
export function activityAge(dob: string | undefined, day: string): number | null {
  const parse = (value: string | undefined) => {
    if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
    const [y, m, d] = value.split("-").map(Number);
    const date = new Date(Date.UTC(y, m - 1, d));
    return date.getUTCFullYear() === y &&
      date.getUTCMonth() === m - 1 &&
      date.getUTCDate() === d
      ? [y, m, d]
      : null;
  };
  const born = parse(dob),
    now = parse(day);
  if (!born || !now || dob! > day) return null;
  return (now[0] - born[0]) * 12 + now[1] - born[1] - (now[2] < born[2] ? 1 : 0);
}

export function ageStage(months: number): string {
  return months < 6
    ? "0–5 months"
    : months < 12
      ? "6–11 months"
      : months < 24
        ? "1 year"
        : months < 36
          ? "2 years"
          : months < 60
            ? "3–4 years"
            : "5 years and up";
}
export function gameLevel(months: number) {
  return {
    choices: months < 36 ? 2 : months < 60 ? 3 : 4,
    rounds: months < 36 ? 3 : months < 60 ? 4 : 5,
    pairs: months < 48 ? 2 : months < 72 ? 4 : 6,
    countTo: months < 48 ? 3 : months < 60 ? 5 : 8,
  };
}
export function pictureDeck(pairs: number): number[] {
  const cards = Array.from({ length: pairs * 2 }, (_, i) => i % pairs);
  for (let i = cards.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [cards[i], cards[j]] = [cards[j], cards[i]];
  }
  return cards;
}
export function gameQuestion(kind: GameId, months: number, round: number) {
  const level = gameLevel(months);
  const options = Array.from({ length: level.choices }, (_, i) => i);
  if (kind === "counting") {
    const answer =
      ((round * (months >= 60 ? 3 : 1) + (months >= 48 ? 1 : 0)) % level.countTo) + 1;
    const choices = Array.from(
      { length: Math.min(level.choices, level.countTo) },
      (_, i) => ((answer - 1 + i) % level.countTo) + 1,
    );
    choices.push(...choices.splice(0, round % choices.length));
    return { answer, choices, sequence: [] };
  }
  if (kind === "sizes") return { answer: round % 2, choices: [0, 1], sequence: [] };
  if (kind === "patterns") {
    const a = round % level.choices,
      b = (a + 1) % level.choices;
    return months < 60
      ? { answer: b, choices: options, sequence: [a, b, a] }
      : round % 2
        ? { answer: b, choices: options, sequence: [a, a, b, a, a] }
        : {
            answer: (a + 2) % level.choices,
            choices: options,
            sequence: [a, b, (a + 2) % level.choices, a, b],
          };
  }
  return { answer: round % level.choices, choices: options, sequence: [] };
}
