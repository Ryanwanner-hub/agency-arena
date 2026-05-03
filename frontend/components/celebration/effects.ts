import confetti from "canvas-confetti";

import type { CelebrationStyle } from "@/lib/themes";

import type { CelebrationType } from "./CelebrationProvider";
import type { Tier } from "./tiers";

/** Tier-aware particle counts. Multiplied per style. */
const TIER_BASE: Record<Tier, { primary: number; spread: number; scalar: number }> = {
  small: { primary: 30, spread: 50, scalar: 0.7 },
  medium: { primary: 100, spread: 80, scalar: 0.9 },
  large: { primary: 140, spread: 100, scalar: 1.2 },
};

const COLOR_PRESETS: Record<CelebrationType, string[]> = {
  badge_earned: ["#8b5cf6", "#a78bfa", "#ddd6fe", "#ede9fe"],
  streak_continued: ["#f97316", "#fb923c", "#fdba74", "#fed7aa"],
  referral_received: ["#0ea5e9", "#38bdf8", "#7dd3fc", "#bae6fd"],
  policy_bound: ["#fbbf24", "#f59e0b", "#fde68a", "#fef3c7"],
  referral_converted: ["#10b981", "#34d399", "#6ee7b7", "#a7f3d0"],
  personal_goal_hit: ["#3b82f6", "#60a5fa", "#93c5fd", "#dbeafe"],
  rank_change: ["#3b82f6", "#60a5fa", "#dbeafe", "#bfdbfe"],
  rank_to_top: ["#fbbf24", "#fde047", "#fef08a", "#fef9c3"],
  contest_won: ["#fbbf24", "#f59e0b", "#fde047", "#fef9c3"],
  team_goal_hit: ["#ec4899", "#f472b6", "#fbcfe8", "#fce7f3"],
  hat_trick: ["#d946ef", "#e879f9", "#f5d0fe", "#fae8ff"],
};

/** Casino jackpot uses a fixed gold palette regardless of event type. */
const JACKPOT_COLORS = ["#facc15", "#eab308", "#fde047", "#ca8a04", "#ffffff"];

/** Z-index above TV mode's z-[999] so celebrations layer on the
 * fullscreen scoreboard. Confetti canvas defaults to 100 — bump it. */
const CONFETTI_Z = 1015;

function bursts(opts: confetti.Options) {
  return confetti({
    ...opts,
    zIndex: CONFETTI_Z,
    disableForReducedMotion: true,
  });
}

/** Fire the burst flavor that matches the active theme's celebration
 * style. Pure side-effect — overlays (trophy drop / neon pulse) are
 * mounted by ``CelebrationOverlay``, not here. */
export function fireBurst(
  type: CelebrationType,
  tier: Tier,
  style: CelebrationStyle,
): void {
  const base = TIER_BASE[tier];
  const colors = style === "casino_jackpot" ? JACKPOT_COLORS : COLOR_PRESETS[type];

  switch (style) {
    case "confetti":
      // Single, theme-coloured burst. Tier defines density.
      bursts({
        particleCount: base.primary,
        spread: base.spread,
        origin: { y: tier === "small" ? 0.85 : 0.55 },
        colors,
        ticks: tier === "large" ? 240 : 180,
        scalar: base.scalar,
      });
      return;

    case "fireworks":
      // Staggered multi-burst from random origins. Each pop is small but
      // they overlap into a fireworks finale.
      fireFireworks(colors, base, tier);
      return;

    case "trophy_drop":
      // Trophy is the main event (CSS overlay). Light confetti underneath
      // to add motion without competing with the falling trophy.
      bursts({
        particleCount: Math.round(base.primary * 0.5),
        spread: base.spread,
        origin: { y: 0.65 },
        colors,
        ticks: 180,
        scalar: base.scalar * 0.85,
      });
      return;

    case "neon_pulse":
      // The radial pulse handles the wow-factor; confetti is medium so
      // the popup card still reads.
      bursts({
        particleCount: Math.round(base.primary * 0.9),
        spread: base.spread,
        origin: { y: 0.55 },
        colors,
        ticks: 200,
        scalar: base.scalar,
      });
      // Secondary cyan accent burst from below — leans into the neon vibe.
      if (tier !== "small") {
        setTimeout(
          () =>
            bursts({
              particleCount: Math.round(base.primary * 0.5),
              spread: base.spread + 20,
              origin: { y: 0.95 },
              colors: ["#22d3ee", "#06b6d4", "#0ea5e9"],
              ticks: 220,
              scalar: base.scalar * 0.9,
            }),
          250,
        );
      }
      return;

    case "casino_jackpot":
      jackpotShow(base, tier);
      return;
  }
}

function fireFireworks(colors: string[], base: typeof TIER_BASE.small, tier: Tier) {
  const bursts_count = tier === "large" ? 6 : tier === "medium" ? 4 : 2;
  for (let i = 0; i < bursts_count; i++) {
    setTimeout(
      () =>
        bursts({
          particleCount: Math.round(base.primary * 0.4),
          spread: 60,
          origin: {
            x: 0.15 + Math.random() * 0.7,
            y: 0.25 + Math.random() * 0.35,
          },
          colors,
          ticks: 220,
          scalar: base.scalar,
          startVelocity: 35,
        }),
      i * 220,
    );
  }
}

function jackpotShow(base: typeof TIER_BASE.small, tier: Tier) {
  const scale = (n: number) => Math.round(n * 1.6);
  // 1: top-center
  bursts({
    particleCount: scale(base.primary),
    spread: 100,
    origin: { y: 0.3 },
    colors: JACKPOT_COLORS,
    ticks: 250,
    scalar: 1.2,
  });
  // 2: side cannons
  setTimeout(() => {
    bursts({
      particleCount: scale(90),
      angle: 60,
      spread: 65,
      origin: { x: 0, y: 0.6 },
      colors: JACKPOT_COLORS,
      ticks: 220,
      scalar: 1.0,
    });
    bursts({
      particleCount: scale(90),
      angle: 120,
      spread: 65,
      origin: { x: 1, y: 0.6 },
      colors: JACKPOT_COLORS,
      ticks: 220,
      scalar: 1.0,
    });
  }, 350);
  // 3: encore center
  setTimeout(() => {
    bursts({
      particleCount: scale(110),
      spread: 110,
      origin: { y: 0.5 },
      colors: JACKPOT_COLORS,
      ticks: 240,
      scalar: 1.0,
    });
  }, 750);
  // 4: gold rain finale (only on large)
  if (tier === "large") {
    setTimeout(() => {
      bursts({
        particleCount: scale(90),
        startVelocity: 30,
        gravity: 0.6,
        spread: 360,
        ticks: 350,
        origin: { x: 0.5, y: 0 },
        colors: JACKPOT_COLORS,
        scalar: 0.9,
        shapes: ["circle"],
      });
    }, 1200);
  }
}
