export type ThemeColorSet = {
  accent: string;
  accentHover: string;
  accentRing: string;
  accentText: string;
};

export type CustomTheme = {
  swatch: string;
  light: ThemeColorSet;
  dark: ThemeColorSet;
};

export const DEFAULT_CUSTOM_THEME: CustomTheme = {
  swatch: "#7c3aed",
  light: { accent: "#7c3aed", accentHover: "#6d28d9", accentRing: "rgba(124,58,237,0.22)", accentText: "#ffffff" },
  dark:  { accent: "#7c3aed", accentHover: "#6d28d9", accentRing: "rgba(124,58,237,0.22)", accentText: "#ffffff" },
};

function hexToRgb(hex: string): [number, number, number] | null {
  const m = hex.replace("#", "").match(/^([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i);
  return m ? [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)] : null;
}

function linearize(c: number): number {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
}

export function luminance(hex: string): number {
  const rgb = hexToRgb(hex);
  if (!rgb) return 0;
  return 0.2126 * linearize(rgb[0]) + 0.7152 * linearize(rgb[1]) + 0.0722 * linearize(rgb[2]);
}

export function autoAccentText(hex: string): string {
  return luminance(hex) >= 0.22 ? "#111827" : "#ffffff";
}

function clamp(n: number) { return Math.max(0, Math.min(255, Math.round(n))); }

export function darkenHex(hex: string, amount: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  return "#" + rgb.map(c => clamp(c * (1 - amount)).toString(16).padStart(2, "0")).join("");
}

export function lightenHex(hex: string, amount: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  return "#" + rgb.map(c => clamp(c + (255 - c) * amount).toString(16).padStart(2, "0")).join("");
}

export function hexToRing(hex: string, opacity = 0.22): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return `rgba(0,0,0,${opacity})`;
  return `rgba(${rgb.join(",")},${opacity})`;
}

export function buildColorSet(accent: string, mode: "light" | "dark"): ThemeColorSet {
  return {
    accent,
    accentHover: mode === "dark" ? lightenHex(accent, 0.18) : darkenHex(accent, 0.13),
    accentRing: hexToRing(accent, 0.22),
    accentText: autoAccentText(accent),
  };
}

export function buildCustomTheme(lightAccent: string, darkAccent: string): CustomTheme {
  return {
    swatch: lightAccent,
    light: buildColorSet(lightAccent, "light"),
    dark: buildColorSet(darkAccent, "dark"),
  };
}
