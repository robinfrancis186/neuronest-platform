import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Circle,
  Hand,
  MessageCircle,
  RotateCcw,
  Square,
  Star,
  Triangle,
  Users,
} from "lucide-react";
import { useWorkspace } from "../workspace-context";
import { today } from "../ui/fields";
import {
  activityAge,
  ageStage,
  COLOUR_NAMES,
  GAMES,
  gameLevel,
  gameQuestion,
  PICTURE_NAMES,
  pictureDeck,
  PLAY,
  SHAPE_NAMES,
  type GameId,
} from "../activities";
import "./Activities.css";

const SHAPES = [Circle, Square, Triangle, Star];
const PLAY_ICONS = { sounds: MessageCircle, stories: BookOpen, moves: Hand };

function Sprite({ value }: { value: number }) {
  return <span className={`game-sprite sprite-${value}`} aria-hidden="true" />;
}
function Shape({ value }: { value: number }) {
  const Icon = SHAPES[value];
  return (
    <Icon
      className={`play-shape play-shape-${value}`}
      size={64}
      strokeWidth={1.5}
      fill="currentColor"
      aria-hidden="true"
    />
  );
}
function Preview({ id }: { id: GameId }) {
  return (
    <div className={`game-preview preview-${id}`} aria-hidden="true">
      {id === "shapes" && (
        <>
          <Shape value={0} />
          <Shape value={2} />
          <Shape value={1} />
        </>
      )}
      {id === "pairs" && (
        <div className="preview-memory">
          {[0, -1, 1, -1, 0, 1].map((v, i) => (
            <span key={i} className={v < 0 ? "card-back" : ""}>
              {v >= 0 && <Sprite value={v} />}
            </span>
          ))}
        </div>
      )}
      {id === "patterns" && (
        <div className="preview-pattern">
          {[0, 1, 0, 1, -1].map((v, i) => (
            <span key={i}>{v < 0 ? "?" : <Shape value={v} />}</span>
          ))}
        </div>
      )}
      {id === "colours" && (
        <div className="preview-colours">
          {COLOUR_NAMES.map((c, i) => (
            <span className={`colour-${i}`} key={c}>
              <i />
              <b />
            </span>
          ))}
        </div>
      )}
      {id === "counting" && (
        <div className="preview-garden">
          <div>
            {[0, 1, 2, 3].map((i) => (
              <Sprite key={i} value={2} />
            ))}
          </div>
          <div className="preview-numbers">
            <span>3</span>
            <span>4</span>
            <span>5</span>
          </div>
        </div>
      )}
      {id === "sizes" && (
        <>
          <span className="preview-ball large">
            <Sprite value={3} />
          </span>
          <span className="preview-ball small">
            <Sprite value={3} />
          </span>
        </>
      )}
    </div>
  );
}

export default function ActivitiesView() {
  const { child, childrenLoaded, navigate, tab, tr } = useWorkspace();
  const heading = useRef<HTMLHeadingElement>(null);
  const [session, setSession] = useState(0);
  const months = activityAge(child?.date_of_birth, today());
  const games = months === null ? [] : GAMES.filter((g) => months >= g.min);
  const play =
    months === null ? [] : PLAY.filter((p) => months >= p.min && months <= p.max);
  const selectedGame = GAMES.find((g) => g.id === tab);
  const selectedPlay = PLAY.find((p) => p.id === tab);
  const selected = selectedGame || selectedPlay;
  useEffect(() => {
    if (selected) heading.current?.focus();
  }, [selected]);
  const back = (
    <button className="text-button" onClick={() => navigate("activities")}>
      <ArrowLeft size={17} />
      {tr("All activities")}
    </button>
  );

  if (!childrenLoaded) return <p role="status">{tr("Loading activities…")}</p>;
  if (months === null)
    return (
      <section className="activities-empty">
        <Hand size={32} aria-hidden="true" />
        <h2>{tr("Choose a child profile first")}</h2>
        <p>
          {tr(
            "A valid date of birth is needed to suggest activities. Select or update your child’s profile.",
          )}
        </p>
        <button onClick={() => navigate("account")}>{tr("Open account")}</button>
      </section>
    );
  if (selected)
    return (
      <section className="activity-session" aria-labelledby="activity-title">
        <div className="activity-session-nav">
          {back}
          {selectedGame && months >= 24 && (
            <button className="secondary" onClick={() => setSession((n) => n + 1)}>
              <RotateCcw size={16} />
              {tr("Restart game")}
            </button>
          )}
        </div>
        <h2 id="activity-title" ref={heading} tabIndex={-1}>
          {tr(selected.title)}
        </h2>
        {selectedGame && months < 24 ? (
          <>
            <p>
              {tr(
                "For children under 2, choose shared play away from the screen. These game controls are for older children.",
              )}
            </p>
            <button onClick={() => navigate("activities")}>
              {tr("See age-matched play")}
            </button>
          </>
        ) : selectedPlay ? (
          <>
            <p>{tr(selectedPlay.description)}</p>
            <ol className="activity-steps">
              {selectedPlay.steps.map((step) => (
                <li key={step}>{tr(step)}</li>
              ))}
            </ol>
            {selectedPlay.id === "stories" && months >= 36 && (
              <p className="activity-note">
                {tr(
                  "For older children, take turns imagining what happens next. Accept their own version of the story.",
                )}
              </p>
            )}
            <p className="activity-note">
              {tr(
                "Keep it gentle and child-led. Stop when your child seems tired, uncomfortable or uninterested.",
              )}
            </p>
          </>
        ) : (
          selectedGame && (
            <>
              <p>{tr(selectedGame.description)}</p>
              <div className="game-level">
                <Users size={16} aria-hidden="true" />
                {tr("With an adult")}
                <span aria-hidden="true">·</span>
                {tr(ageStage(months))}
                <span aria-hidden="true">·</span>
                {selectedGame.id === "pairs" ? (
                  <>
                    {gameLevel(months).pairs} {tr("pairs to find")}
                  </>
                ) : (
                  <>
                    {gameLevel(months).rounds} {tr("short rounds")}
                  </>
                )}
              </div>
              {months < selectedGame.min && (
                <p className="activity-note">
                  {tr(
                    "Caregiver preview: this game is outside the current age suggestions. Start with the recommended activities for your child.",
                  )}
                </p>
              )}
              <Game
                key={`${session}:${months}`}
                kind={selectedGame.id}
                months={months}
                tr={tr}
              />
            </>
          )
        )}
      </section>
    );

  return (
    <div className="activities-page">
      <div className="activities-hero">
        <div>
          <h2>
            {tr("Picked for")} {tr(ageStage(months))}
          </h2>
          <p>
            {tr(
              months < 24
                ? "Shared play for you and your child. No child screen games at this age."
                : "Short games and shared play, at their own pace.",
            )}
          </p>
        </div>
        <div className="activities-hero-art" aria-hidden="true">
          <Sprite value={3} />
          <Sprite value={5} />
        </div>
      </div>
      {games.length > 0 && (
        <section aria-labelledby="screen-games-title">
          <div className="activities-section-title">
            <h2 id="screen-games-title">{tr("Games to play together")}</h2>
          </div>
          <div className="activities-grid">
            {games.map((game) => (
              <article className={`activity-card game-${game.id}`} key={game.id}>
                <Preview id={game.id} />
                <div className="activity-card-copy">
                  <h3>{tr(game.title)}</h3>
                  <p>{tr(game.description)}</p>
                  <div className="activity-card-bottom">
                    <span>
                      <Users size={16} aria-hidden="true" />
                      {tr("With an adult")}
                    </span>
                    <button
                      aria-label={`${tr("Play")}: ${tr(game.title)}`}
                      onClick={() => navigate("activities", game.id)}
                    >
                      {tr("Play")}
                      <ArrowRight size={16} aria-hidden="true" />
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}
      <section aria-labelledby="play-together-title">
        <div className="activities-section-title">
          <h2 id="play-together-title">{tr("Away from the screen")}</h2>
        </div>
        <div className="guided-activities">
          {play.map((activity) => {
            const Icon = PLAY_ICONS[activity.icon as keyof typeof PLAY_ICONS];
            return (
              <button
                className="guided-activity"
                key={activity.id}
                onClick={() => navigate("activities", activity.id)}
                aria-label={`${tr("Try together")}: ${tr(activity.title)}`}
              >
                <span className="activity-icon" aria-hidden="true">
                  <Icon size={25} />
                </span>
                <span>
                  <strong>{tr(activity.title)}</strong>
                  <span>{tr(activity.description)}</span>
                </span>
                <ArrowRight size={18} aria-hidden="true" />
              </button>
            );
          })}
        </div>
      </section>
      <footer className="activities-footnote">
        <a
          href="https://www.who.int/tools/your-life-your-health/life-phase/newborns-and-children-under-5-years/engaging-and-having-fun-with-newborns-and-children-under-5-years"
          target="_blank"
          rel="noreferrer"
        >
          {tr("Parent play and screen-time guidance")}
        </a>
      </footer>
    </div>
  );
}

type GameProps = { months: number; tr: (value: string) => string };
function Game({ kind, ...props }: GameProps & { kind: GameId }) {
  return kind === "pairs" ? (
    <MemoryGame {...props} />
  ) : (
    <ChoiceGame kind={kind} {...props} />
  );
}
function Finished({ tr }: Pick<GameProps, "tr">) {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => heading.current?.focus(), []);
  return (
    <div className="activity-finished" role="status">
      <Sprite value={5} />
      <h3 tabIndex={-1} ref={heading}>
        {tr("You finished this activity!")}
      </h3>
      <p>{tr("Try some off-screen play together, or restart when you are ready.")}</p>
    </div>
  );
}
function MemoryGame({ months, tr }: GameProps) {
  const prompt = useRef<HTMLHeadingElement>(null);
  const [deck] = useState(() => pictureDeck(gameLevel(months).pairs));
  const [turned, setTurned] = useState<number[]>([]);
  const [matched, setMatched] = useState<number[]>([]);
  useEffect(() => {
    if (matched.length) prompt.current?.focus();
  }, [matched.length]);
  if (matched.length === deck.length) return <Finished tr={tr} />;
  const mismatch = turned.length === 2;
  return (
    <div className="activity-game memory-game">
      <h3 className="activity-progress" ref={prompt} tabIndex={-1}>
        {tr("Pairs found")}: {matched.length / 2} / {deck.length / 2}
      </h3>
      <div className="memory-board" role="group" aria-label={tr("Matching cards")}>
        {deck.map((value, index) => {
          const open = turned.includes(index) || matched.includes(index);
          return (
            <button
              key={index}
              className={`memory-card ${open ? "is-open" : ""} ${matched.includes(index) ? "is-matched" : ""}`}
              disabled={open || mismatch}
              aria-label={`${tr("Card")} ${index + 1}: ${tr(open ? PICTURE_NAMES[value] : "Face down")}`}
              onClick={() => {
                if (open || turned.length === 2) return;
                if (turned.length === 1 && deck[turned[0]] === value) {
                  setMatched([...matched, turned[0], index]);
                  setTurned([]);
                } else setTurned([...turned, index]);
              }}
            >
              {open ? <Sprite value={value} /> : <span aria-hidden="true">?</span>}
            </button>
          );
        })}
      </div>
      <div className="activity-feedback" role="status">
        {tr(
          mismatch
            ? "Different pictures. Look at both, then try another pair."
            : "Choose two cards to find a pair.",
        )}
      </div>
      {mismatch && (
        <button
          autoFocus
          onClick={() => {
            setTurned([]);
            prompt.current?.focus();
          }}
        >
          {tr("Try another pair")}
        </button>
      )}
    </div>
  );
}
function ChoiceGame({ kind, months, tr }: GameProps & { kind: GameId }) {
  const prompt = useRef<HTMLHeadingElement>(null);
  const [round, setRound] = useState(0);
  const [choice, setChoice] = useState<number | null>(null);
  const level = gameLevel(months);
  const q = gameQuestion(kind, months, round);
  useEffect(() => {
    if (round) prompt.current?.focus();
  }, [round]);
  if (round === level.rounds) return <Finished tr={tr} />;
  const success = choice === q.answer;
  const name = (value: number) =>
    kind === "colours"
      ? COLOUR_NAMES[value]
      : kind === "counting"
        ? String(value)
        : kind === "sizes"
          ? value === 0
            ? "Small ball"
            : "Big ball"
          : SHAPE_NAMES[value];
  return (
    <div className={`activity-game choice-game choice-${kind}`}>
      <p className="activity-progress">
        {tr("Round")} {round + 1} / {level.rounds}
      </p>
      <div className="shape-prompt">
        {kind === "shapes" && <Shape value={q.answer} />}
        {kind === "colours" && (
          <span className={`colour-swatch colour-${q.answer}`} aria-hidden="true" />
        )}
        <h3 ref={prompt} tabIndex={-1}>
          {kind === "shapes"
            ? `${tr("Find this shape")}: ${tr(name(q.answer))}`
            : kind === "colours"
              ? `${tr("Find this colour")}: ${tr(name(q.answer))}`
              : tr(
                  kind === "counting"
                    ? "How many flowers?"
                    : kind === "sizes"
                      ? q.answer === 0
                        ? "Find the smaller ball"
                        : "Find the bigger ball"
                      : "What comes next?",
                )}
        </h3>
      </div>
      {kind === "patterns" && (
        <div
          className="pattern-sequence"
          role="img"
          aria-label={q.sequence.map((v) => tr(name(v))).join(", ")}
        >
          {q.sequence.map((v, i) => (
            <span key={i}>
              <Shape value={v} />
            </span>
          ))}
          <span aria-hidden="true">?</span>
        </div>
      )}
      {kind === "counting" && (
        <div
          className="counting-garden"
          role="img"
          aria-label={`${q.answer} ${tr("flowers")}`}
        >
          {Array.from({ length: q.answer }, (_, i) => (
            <Sprite value={2} key={i} />
          ))}
        </div>
      )}
      <div
        className={`shape-options options-${q.choices.length}`}
        role="group"
        aria-label={tr("Choose an answer")}
      >
        {q.choices.map((value) => (
          <button
            className={`shape-option ${success && choice === value ? "is-correct" : ""}`}
            key={value}
            disabled={success}
            aria-pressed={choice === value}
            aria-label={tr(name(value))}
            onClick={() => setChoice(value)}
          >
            {kind === "colours" ? (
              <span className={`colour-swatch colour-${value}`} aria-hidden="true" />
            ) : kind === "counting" ? (
              <span className="number-choice" aria-hidden="true">
                {value}
              </span>
            ) : kind === "sizes" ? (
              <span className={`size-ball size-${value}`}>
                <span
                  className="size-ball-inner"
                  style={{
                    width: value === 0 ? (months >= 60 ? "78%" : "55%") : "100%",
                  }}
                >
                  <Sprite value={3} />
                </span>
              </span>
            ) : (
              <Shape value={value} />
            )}
            <span>{tr(name(value))}</span>
          </button>
        ))}
      </div>
      <div className="activity-feedback" role="status">
        {choice !== null &&
          tr(success ? "You found it!" : "Have another look. You can try again.")}
      </div>
      {success && (
        <button
          autoFocus
          onClick={() => {
            setRound(round + 1);
            setChoice(null);
          }}
        >
          {tr(round === level.rounds - 1 ? "Finish activity" : "Next round")}
          <ArrowRight size={16} />
        </button>
      )}
    </div>
  );
}
