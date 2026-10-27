import { useEffect, useRef } from "react";
import { useTranslation } from "../i18n";

export type TabDefinition = { key: string; label: string };

/**
 * A real tab list: arrow keys move between tabs, Home/End jump to the ends, and
 * only the selected tab is in the tab order. These were buttons in a role="group"
 * with aria-pressed, which announces a set of toggles rather than a set of views
 * and leaves a keyboard user tabbing through every tab to reach the panel.
 */
export function Tabs({
  label,
  tabs,
  active,
  onSelect,
  className = "",
}: {
  label: string;
  tabs: TabDefinition[];
  active: string;
  onSelect: (key: string) => void;
  className?: string;
}) {
  const tr = useTranslation();
  const ref = useRef<HTMLDivElement>(null);
  /*
   * The strip scrolls when the labels do not fit, so a tab that is selected from
   * outside — a deep link, a restored place, a programmatic change — can sit far
   * off the right edge with the strip still at zero. The reader then cannot see
   * which tab they are on. Bring the selected one into view whenever it changes.
   */
  useEffect(() => {
    const strip = ref.current;
    const selected = strip?.querySelector<HTMLElement>(
      '[role="tab"][aria-selected="true"]',
    );
    if (!strip || !selected) return;
    if (strip.scrollWidth <= strip.clientWidth) return;
    const left = selected.offsetLeft - (strip.clientWidth - selected.offsetWidth) / 2;
    strip.scrollTo({
      left: Math.max(0, left),
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "auto"
        : "smooth",
    });
  }, [active, tabs]);
  const move = (event: React.KeyboardEvent, index: number) => {
    const step: Record<string, number> = { ArrowRight: 1, ArrowLeft: -1 };
    let next = -1;
    if (event.key in step) next = (index + step[event.key] + tabs.length) % tabs.length;
    if (event.key === "Home") next = 0;
    if (event.key === "End") next = tabs.length - 1;
    if (next < 0) return;
    event.preventDefault();
    onSelect(tabs[next].key);
    ref.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]')[next]?.focus();
  };
  return (
    <div
      className={`tabs ${className}`.trim()}
      role="tablist"
      aria-label={tr(label)}
      ref={ref}
    >
      {tabs.map((tab, index) => (
        <button
          key={tab.key}
          role="tab"
          id={`tab-${tab.key}`}
          aria-selected={active === tab.key}
          aria-controls={`panel-${tab.key}`}
          tabIndex={active === tab.key ? 0 : -1}
          className={active === tab.key ? "selected" : ""}
          onClick={() => onSelect(tab.key)}
          onKeyDown={(event) => move(event, index)}
        >
          {tr(tab.label)}
        </button>
      ))}
    </div>
  );
}

/** The region a tab controls, so the relationship is announced both ways. */
export function TabPanel({
  tab,
  children,
}: {
  tab: string;
  children: React.ReactNode;
}) {
  return (
    <div
      role="tabpanel"
      id={`panel-${tab}`}
      aria-labelledby={`tab-${tab}`}
      tabIndex={-1}
    >
      {children}
    </div>
  );
}
