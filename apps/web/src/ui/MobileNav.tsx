import { useEffect, useId, useRef, useState } from "react";
import { MoreHorizontal, X } from "lucide-react";
import { icons, type View } from "./fields";

/**
 * The bottom bar is the only navigation on a phone, so every destination has to
 * stay reachable — but seven of them do not fit across 320px. They only fitted
 * before because the labels were set to 8px, which is not a readable size.
 *
 * So the bar shows the first few destinations and gathers the rest behind More,
 * which is the platform convention on both iOS and Android. Labels stay legible
 * and on one line, and nothing becomes unreachable.
 */
/**
 * How many destinations fit beside More at a readable label size. Labels are
 * never shrunk or truncated to make room — the count gives way instead, so the
 * bar still fits a 240px viewport (a phone at 150% browser zoom).
 */
const RUNGS = [
  // 320px is the reflow floor WCAG asks for; below it a phone is at high browser
  // zoom, and the bar must still fit rather than push More off the screen.
  { query: "(max-width: 319px)", visible: 2 },
  { query: "(max-width: 359px)", visible: 2 },
  { query: "(max-width: 600px)", visible: 3 },
];

function useVisibleLimit() {
  const measure = () =>
    typeof window === "undefined"
      ? Infinity
      : (RUNGS.find((rung) => window.matchMedia(rung.query).matches)?.visible ??
        Infinity);
  const [limit, setLimit] = useState(measure);
  useEffect(() => {
    const queries = RUNGS.map((rung) => window.matchMedia(rung.query));
    const update = () => setLimit(measure());
    update();
    queries.forEach((q) => q.addEventListener("change", update));
    return () => queries.forEach((q) => q.removeEventListener("change", update));
  }, []);
  return limit;
}

export function MobileNav({
  destinations,
  view,
  navigate,
  label,
  name,
  moreLabel,
}: {
  destinations: View[];
  view: View;
  navigate: (v: View) => void;
  label: string;
  /** Translates a destination key into its visible name. */
  name: (v: View) => string;
  moreLabel: string;
}) {
  const limit = useVisibleLimit();
  const overflowing = destinations.length > limit + 1;
  const visible = overflowing ? destinations.slice(0, limit) : destinations;
  const hidden = overflowing ? destinations.slice(limit) : [];
  const [open, setOpen] = useState(false);
  const sheetId = useId();
  const moreRef = useRef<HTMLButtonElement>(null);
  const firstItemRef = useRef<HTMLButtonElement>(null);

  // Leaving a destination inside the sheet should close it, and so should growing
  // the viewport past the point where the sheet exists at all.
  useEffect(() => setOpen(false), [view]);
  useEffect(() => {
    if (!overflowing) setOpen(false);
  }, [overflowing]);
  useEffect(() => {
    if (!open) return;
    firstItemRef.current?.focus();
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        moreRef.current?.focus();
      }
    };
    document.addEventListener("keydown", escape);
    return () => document.removeEventListener("keydown", escape);
  }, [open]);

  const item = (destination: View, ref?: React.Ref<HTMLButtonElement>) => {
    const Icon = icons[destination];
    return (
      <button
        key={destination}
        ref={ref}
        className={view === destination ? "active" : ""}
        aria-current={view === destination ? "page" : undefined}
        onClick={() => navigate(destination)}
      >
        <Icon size={20} />
        <span>{name(destination)}</span>
      </button>
    );
  };

  return (
    <>
      {open && (
        <div
          className="mobile-more-scrim"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}
      {open && (
        <div
          className="mobile-more-sheet"
          id={sheetId}
          role="dialog"
          aria-label={moreLabel}
        >
          <div className="mobile-more-head">
            <h2>{moreLabel}</h2>
            <button
              type="button"
              className="icon-button"
              onClick={() => {
                setOpen(false);
                moreRef.current?.focus();
              }}
              aria-label={moreLabel}
            >
              <X size={18} />
            </button>
          </div>
          <div className="mobile-more-items">
            {hidden.map((destination, index) =>
              item(destination, index === 0 ? firstItemRef : undefined),
            )}
          </div>
        </div>
      )}
      <nav className="mobile-nav" aria-label={label}>
        {visible.map((destination) => item(destination))}
        {overflowing && (
          <button
            ref={moreRef}
            type="button"
            className={hidden.includes(view) ? "active" : ""}
            aria-expanded={open}
            aria-haspopup="dialog"
            aria-controls={open ? sheetId : undefined}
            onClick={() => setOpen((value) => !value)}
          >
            <MoreHorizontal size={20} />
            <span>{moreLabel}</span>
          </button>
        )}
      </nav>
    </>
  );
}
