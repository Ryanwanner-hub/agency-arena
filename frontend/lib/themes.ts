/**
 * Centralized theme registry. Single source of truth for everything that
 * varies between themes — colors, card styling, animation intensity, and
 * celebration energy. CSS variables and behavioral knobs are defined
 * here; ``ThemeProvider`` reads from this module, the layout injects a
 * generated stylesheet at the top of the document, and components can
 * call ``useTheme()`` to consume the active config.
 *
 * Adding a new theme is a one-entry change in ``THEMES`` below.
 */

export type ThemeKey = "corporate" | "neon" | "sports" | "casino";

export type AnimationIntensity = "minimal" | "normal" | "high";

export type CelebrationStyle =
  | "confetti"
  | "fireworks"
  | "trophy_drop"
  | "neon_pulse"
  | "casino_jackpot";

export type CardStyleKey = "flat" | "soft" | "bordered" | "glowing";

export type BadgeStyleKey = "minimal" | "gradient" | "embossed";

export type RowStyleKey = "clean" | "scoreboard" | "card" | "neon";

export type CssVarMap = Record<string, string>;

export type ThemeConfig = {
  key: ThemeKey;
  label: string;
  description: string;

  /** HSL strings keyed by CSS custom property. Values are space-separated
   * H S L (no `hsl()` wrapper) so they compose with `hsl(var(--x) / .5)`
   * for alpha modulation. */
  cssVars: CssVarMap;

  // ─── Behavioral knobs (read by components via useTheme) ───
  animationIntensity: AnimationIntensity;
  celebrationStyle: CelebrationStyle;
  cardStyle: CardStyleKey;
  badgeStyle: BadgeStyleKey;
  rowStyle: RowStyleKey;

  /** 3-color preview chip used by the switcher: [bg, primary, accent]. */
  swatches: [string, string, string];
};

export const DEFAULT_THEME: ThemeKey = "corporate";

export const THEMES: Record<ThemeKey, ThemeConfig> = {
  corporate: {
    key: "corporate",
    label: "Corporate Clean",
    description: "White, navy accents, minimal animations.",
    animationIntensity: "minimal",
    celebrationStyle: "confetti",
    cardStyle: "bordered",
    badgeStyle: "minimal",
    rowStyle: "clean",
    swatches: ["#ffffff", "#1e3a8a", "#dbeafe"],
    cssVars: {
      "--background": "0 0% 100%",
      "--foreground": "222 47% 11%",
      "--card": "0 0% 100%",
      "--card-foreground": "222 47% 11%",
      "--primary": "221 83% 53%",
      "--primary-foreground": "210 40% 98%",
      "--secondary": "210 40% 96%",
      "--secondary-foreground": "222 47% 11%",
      "--muted": "210 40% 96%",
      "--muted-foreground": "215 16% 47%",
      "--accent": "210 40% 96%",
      "--accent-foreground": "222 47% 11%",
      "--border": "214 32% 91%",
      "--input": "214 32% 91%",
      "--ring": "221 83% 53%",
      "--radius": "0.5rem",
      "--destructive": "0 72% 51%",
      "--destructive-foreground": "0 0% 98%",
      "--card-glow": "0 0 0 transparent",
      "--body-bg": "hsl(var(--background))",
      "--leaderboard-row-hover": "hsl(var(--muted) / 0.5)",
      "--hero-strip-overlay": "hsl(var(--muted))",
    },
  },

  neon: {
    key: "neon",
    label: "Neon Arena",
    description: "Dark backdrop, electric magenta + cyan glow.",
    animationIntensity: "high",
    celebrationStyle: "neon_pulse",
    cardStyle: "glowing",
    badgeStyle: "gradient",
    rowStyle: "neon",
    swatches: ["#0d0a1e", "#ec4899", "#22d3ee"],
    cssVars: {
      "--background": "240 30% 6%",
      "--foreground": "180 60% 92%",
      "--card": "240 35% 10%",
      "--card-foreground": "180 60% 92%",
      "--primary": "320 95% 60%",
      "--primary-foreground": "240 30% 8%",
      "--secondary": "240 30% 16%",
      "--secondary-foreground": "180 60% 92%",
      "--muted": "240 30% 14%",
      "--muted-foreground": "200 30% 65%",
      "--accent": "175 90% 55%",
      "--accent-foreground": "240 30% 8%",
      "--border": "240 30% 22%",
      "--input": "240 30% 18%",
      "--ring": "320 95% 60%",
      "--radius": "0.5rem",
      "--destructive": "350 95% 60%",
      "--destructive-foreground": "0 0% 98%",
      "--card-glow": "0 0 22px hsl(320 95% 60% / 0.18)",
      "--body-bg":
        "radial-gradient(circle at 20% 0%, hsl(320 80% 14%) 0%, hsl(240 35% 6%) 55%)",
      "--leaderboard-row-hover": "hsl(320 95% 60% / 0.08)",
      "--hero-strip-overlay": "hsl(175 90% 55% / 0.12)",
    },
  },

  sports: {
    key: "sports",
    label: "SportsCenter",
    description: "Scoreboard layout, bold red and gold, team energy.",
    animationIntensity: "normal",
    celebrationStyle: "trophy_drop",
    cardStyle: "soft",
    badgeStyle: "gradient",
    rowStyle: "scoreboard",
    swatches: ["#f5f5f5", "#dc2626", "#facc15"],
    cssVars: {
      "--background": "0 0% 96%",
      "--foreground": "0 0% 8%",
      "--card": "0 0% 100%",
      "--card-foreground": "0 0% 8%",
      "--primary": "0 84% 50%",
      "--primary-foreground": "0 0% 100%",
      "--secondary": "0 0% 92%",
      "--secondary-foreground": "0 0% 12%",
      "--muted": "0 0% 92%",
      "--muted-foreground": "0 0% 35%",
      "--accent": "48 96% 50%",
      "--accent-foreground": "0 0% 8%",
      "--border": "0 0% 80%",
      "--input": "0 0% 85%",
      "--ring": "0 84% 50%",
      "--radius": "0.25rem",
      "--destructive": "0 84% 50%",
      "--destructive-foreground": "0 0% 98%",
      "--card-glow": "0 4px 0 hsl(0 0% 8% / 0.08)",
      "--body-bg": "hsl(var(--background))",
      "--leaderboard-row-hover": "hsl(0 84% 50% / 0.05)",
      "--hero-strip-overlay": "hsl(48 96% 50% / 0.18)",
    },
  },

  casino: {
    key: "casino",
    label: "Casino Night",
    description: "Felt green, gold trim, jackpot celebrations.",
    animationIntensity: "high",
    celebrationStyle: "casino_jackpot",
    cardStyle: "glowing",
    badgeStyle: "embossed",
    rowStyle: "card",
    swatches: ["#0f3a23", "#eab308", "#dc2626"],
    cssVars: {
      "--background": "145 55% 9%",
      "--foreground": "45 70% 92%",
      "--card": "145 45% 13%",
      "--card-foreground": "45 70% 92%",
      "--primary": "45 90% 55%",
      "--primary-foreground": "145 50% 10%",
      "--secondary": "145 35% 18%",
      "--secondary-foreground": "45 70% 92%",
      "--muted": "145 35% 16%",
      "--muted-foreground": "45 25% 70%",
      "--accent": "0 75% 55%",
      "--accent-foreground": "45 70% 92%",
      "--border": "45 35% 28%",
      "--input": "145 35% 20%",
      "--ring": "45 90% 55%",
      "--radius": "0.5rem",
      "--destructive": "0 75% 55%",
      "--destructive-foreground": "45 70% 92%",
      "--card-glow":
        "0 0 0 1px hsl(45 90% 55% / 0.25), 0 8px 24px hsl(145 60% 4% / 0.5)",
      "--body-bg":
        "radial-gradient(circle at 50% 0%, hsl(145 55% 13%) 0%, hsl(145 60% 6%) 70%)",
      "--leaderboard-row-hover": "hsl(45 90% 55% / 0.08)",
      "--hero-strip-overlay": "hsl(45 90% 55% / 0.1)",
    },
  },
};

export const THEME_KEYS: ThemeKey[] = Object.keys(THEMES) as ThemeKey[];

/** Render a `<style>`-ready string covering all themes. Injected once in
 * the document `<head>` so theme switching is just changing the
 * `data-theme` attribute (no FOUC, no JS to apply colors). */
export function generateThemeStylesheet(): string {
  const blocks = THEME_KEYS.map((key) => {
    const cfg = THEMES[key];
    const vars = Object.entries(cfg.cssVars)
      .map(([prop, value]) => `  ${prop}: ${value};`)
      .join("\n");
    // Default theme also wires :root so SSR before any data-theme attribute
    // still has a sensible fallback set.
    const selector =
      key === DEFAULT_THEME
        ? `:root, [data-theme="${key}"]`
        : `[data-theme="${key}"]`;
    return `${selector} {\n${vars}\n}`;
  });
  return blocks.join("\n\n");
}
