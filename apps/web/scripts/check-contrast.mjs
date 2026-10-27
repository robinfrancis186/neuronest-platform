/**
 * Text must stay legible in both themes.
 *
 * Colours are tokens now, so this reads the light palette from `:root` and the
 * dark overrides from the explicit theme block, then checks the same
 * foreground/background pairs against WCAG AA in each. A dark theme that shipped
 * without this would be one unreadable badge away from being useless.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const css = readFileSync(new URL("../src/styles.css", import.meta.url), "utf8");

function luminance(hex) {
  const full =
    hex.length === 4
      ? hex
          .slice(1)
          .split("")
          .map((x) => x + x)
          .join("")
      : hex.slice(1, 7);
  return full
    .match(/../g)
    .map((x) => parseInt(x, 16) / 255)
    .map((x) => (x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4))
    .reduce((sum, x, i) => sum + x * [0.2126, 0.7152, 0.0722][i], 0);
}
function contrast(a, b) {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (light + 0.05) / (dark + 0.05);
}

/** Tokens declared in the first `:root`, then the explicit dark override on top. */
function palette(themed) {
  const darkStart = css.indexOf(':root[data-theme="dark"]');
  assert.ok(darkStart >= 0, "dark theme selector is present");
  const source = themed ? css.slice(darkStart) : css.slice(0, darkStart);
  const tokens = {};
  for (const [, name, value] of source.matchAll(
    /--([a-z-]+):\s*(#[0-9a-fA-F]{3,8})\s*;/g,
  ))
    tokens[name] = value;
  return themed ? { ...palette(false), ...tokens } : tokens;
}

// Every pair a reader actually has to resolve, named by role rather than by hex.
const PAIRS = [
  ["body text on page", "text", "page"],
  ["body text on card", "text", "surface"],
  ["muted text on page", "muted", "page"],
  ["muted text on card", "muted", "surface"],
  ["muted text on sunken", "muted", "surface-sunken"],
  ["brand text on card", "forest", "surface"],
  ["leaf label on sage", "leaf", "sage"],
  ["badge text on sage", "on-sage", "sage"],
  ["badge text on peach", "on-peach", "peach"],
  ["badge text on sand", "on-sand", "peach"],
  ["plum text on lavender", "plum", "lavender"],
  ["error text on card", "error", "surface"],
  ["notice text on sunken", "on-notice", "surface-sunken"],
  ["sidebar text", "navigation-text", "navigation"],
  ["sidebar secondary text", "navigation-muted", "navigation"],
  ["active navigation", "navigation-text", "navigation-active"],
  ["sidebar note", "navigation-muted", "navigation-hover"],
  ["header controls", "muted", "header"],
  ["selected tab", "forest-deep", "border"],
];

let failures = 0;
for (const dark of [false, true]) {
  const tokens = palette(dark);
  console.log(`\n${dark ? "dark" : "light"} theme`);
  for (const [label, fg, bg] of PAIRS) {
    assert.ok(tokens[fg], `--${fg} is defined`);
    assert.ok(tokens[bg], `--${bg} is defined`);
    const value = contrast(tokens[fg], tokens[bg]);
    const ok = value >= 4.5;
    if (!ok) failures++;
    console.log(`  ${ok ? "ok  " : "FAIL"} ${label}: ${value.toFixed(2)}:1`);
  }
}
assert.equal(failures, 0, `${failures} colour pairs fall below the 4.5:1 floor`);
