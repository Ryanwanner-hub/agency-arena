import type { CelebrationType } from "./CelebrationProvider";

export type Tier = "small" | "medium" | "large";

/** How long each tier stays on screen before auto-dismissing. */
export const TIER_DURATION_MS: Record<Tier, number> = {
  small: 2000,
  medium: 3500,
  large: 5500,
};

/** Default tier per event type. Callers can override. */
export const DEFAULT_TIER: Record<CelebrationType, Tier> = {
  // Small wins — quick chime + corner toast.
  badge_earned: "small",
  streak_continued: "small",
  referral_received: "small",

  // Medium wins — top-center card with confetti.
  policy_bound: "medium",
  referral_converted: "medium",
  personal_goal_hit: "medium",

  // Big moments — fullscreen overlay with the active style's flourish.
  rank_change: "large",
  rank_to_top: "large",
  contest_won: "large",
  team_goal_hit: "large",
  hat_trick: "large",
};

/** Per-type visual metadata shared across all tier renderers so the
 * celebration reads coherently regardless of which tier is picked. */
export const TYPE_META: Record<
  CelebrationType,
  {
    emoji: string;
    label: string;
    /** Tailwind ring color tokens for the rendered card. */
    ring: string;
    /** Gradient + text colors for the icon chip. */
    chip: string;
    /** Chip text token (for the small uppercase label). */
    accentText: string;
  }
> = {
  badge_earned: {
    emoji: "🏅",
    label: "Badge earned",
    ring: "ring-violet-300",
    chip: "from-violet-200 to-violet-100",
    accentText: "text-violet-700",
  },
  streak_continued: {
    emoji: "🔥",
    label: "Streak +1",
    ring: "ring-orange-300",
    chip: "from-orange-200 to-orange-100",
    accentText: "text-orange-700",
  },
  referral_received: {
    emoji: "📥",
    label: "Referral in",
    ring: "ring-sky-300",
    chip: "from-sky-200 to-sky-100",
    accentText: "text-sky-700",
  },
  policy_bound: {
    emoji: "🎯",
    label: "Policy bound",
    ring: "ring-amber-300",
    chip: "from-amber-200 to-amber-100",
    accentText: "text-amber-700",
  },
  referral_converted: {
    emoji: "🤝",
    label: "Referral converted",
    ring: "ring-emerald-300",
    chip: "from-emerald-200 to-emerald-100",
    accentText: "text-emerald-700",
  },
  personal_goal_hit: {
    emoji: "🎯",
    label: "Goal hit",
    ring: "ring-blue-300",
    chip: "from-blue-200 to-blue-100",
    accentText: "text-blue-700",
  },
  rank_change: {
    emoji: "📈",
    label: "Rank up",
    ring: "ring-blue-300",
    chip: "from-blue-200 to-blue-100",
    accentText: "text-blue-700",
  },
  rank_to_top: {
    emoji: "👑",
    label: "Now #1",
    ring: "ring-amber-300",
    chip: "from-amber-200 to-yellow-100",
    accentText: "text-amber-700",
  },
  contest_won: {
    emoji: "🏆",
    label: "Contest won",
    ring: "ring-amber-300",
    chip: "from-amber-200 to-amber-100",
    accentText: "text-amber-700",
  },
  team_goal_hit: {
    emoji: "🎉",
    label: "Team goal",
    ring: "ring-pink-300",
    chip: "from-pink-200 to-pink-100",
    accentText: "text-pink-700",
  },
  hat_trick: {
    emoji: "🎩",
    label: "Hat trick",
    ring: "ring-fuchsia-300",
    chip: "from-fuchsia-200 to-fuchsia-100",
    accentText: "text-fuchsia-700",
  },
};
