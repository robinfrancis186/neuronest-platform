export type Theme = "light" | "dark";

const light = {
  bg: "#F7F6F0",
  paper: "#FFFFFF",
  input: "#FCFCF9",
  ink: "#183E39",
  muted: "#64736D",
  teal: "#166F61",
  pale: "#E6F1E9",
  line: "#DDE4DC",
  orange: "#BA622F",
  error: "#9B3333",
  danger: "#FAE9E5",
  toast: "#183E39",
};

export type ThemeColors = typeof light;

export const themeColors: Record<Theme, ThemeColors> = {
  light,
  dark: {
    bg: "#101918",
    paper: "#182624",
    input: "#13211F",
    ink: "#EFF8F1",
    muted: "#B6C6BE",
    teal: "#55C5AD",
    pale: "#213B35",
    line: "#36534A",
    orange: "#E3A964",
    error: "#FFB4AB",
    danger: "#4B2928",
    toast: "#07100E",
  },
};

export const themeFromStoredValue = (value: string | null): Theme =>
  value === "dark" ? "dark" : "light";
