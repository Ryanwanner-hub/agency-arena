/**
 * Manager-level preferences that compose with the existing per-feature
 * providers (theme, sound, celebration). Keeps cross-cutting toggles like
 * display columns, point overrides, and TV defaults in one place.
 *
 * Persistence is intentionally pluggable — the default
 * ``localStorageRepository`` is a swap-in for a future API-backed
 * implementation that writes to the backend ``settings`` table without
 * any consumer-side changes. See ``SettingsRepository`` below.
 */

import type { AnimationIntensity, CelebrationStyle, ThemeKey } from "./themes";

/** Mirror of ``CelebrationType`` from ``CelebrationProvider``. Inlined here
 * to keep the persistence layer free of provider imports — those would
 * create a cycle since ``SoundProvider`` (used by ``CelebrationProvider``)
 * needs to read these settings at runtime. */
export type CelebrationType =
  | "badge_earned"
  | "streak_continued"
  | "referral_received"
  | "policy_bound"
  | "referral_converted"
  | "personal_goal_hit"
  | "rank_change"
  | "rank_to_top"
  | "contest_won"
  | "team_goal_hit"
  | "hat_trick";

export type DisplayToggles = {
  showPremium: boolean;
  showCloseRate: boolean;
  showReferrals: boolean;
  showRankMovement: boolean;
};

/** ``"theme"`` means defer to the active theme's value; explicit values
 * override regardless of theme. ``"match"`` for TV theme means the TV page
 * uses whatever theme is active at the time it opens. */
export type ManagerSettings = {
  animationIntensity: AnimationIntensity | "theme";
  tvDefaultTheme: ThemeKey | "match";
  tvSoundOnly: boolean;
  enabledCelebrations: Record<CelebrationType, boolean>;
  defaultCelebrationStyle: CelebrationStyle | "theme";
  /** Sparse override map. Missing keys fall back to ``DEFAULT_POINTS``. */
  pointOverrides: Record<string, number>;
  display: DisplayToggles;
  /** Team-wide daily policy target — drives the /tv office-goal bar
   * and the team-goal panel. Synced server-side so every device sees
   * the same number. */
  dailyPolicyGoal: number;
};

export const ACTIVITY_TYPES = [
  "quote_started",
  "quote_completed",
  "policy_bound",
  "multi_policy_bonus",
  "referral_received",
  "referral_converted",
  "followup_completed",
  "speed_to_contact",
  "review_requested",
  "review_received",
  "cross_sell_attempt",
  "cross_sell_sold",
] as const;

export type ActivityType = (typeof ACTIVITY_TYPES)[number];

/** Mirror of ``backend/app/scoring.py::POINTS_BY_ACTIVITY``. Single source
 * of truth for the UI's "default" reset action. If backend defaults shift,
 * update both. */
export const DEFAULT_POINTS: Record<ActivityType, number> = {
  quote_started: 5,
  quote_completed: 10,
  policy_bound: 30,
  multi_policy_bonus: 20,
  referral_received: 10,
  referral_converted: 40,
  followup_completed: 8,
  speed_to_contact: 10,
  review_requested: 5,
  review_received: 25,
  cross_sell_attempt: 5,
  cross_sell_sold: 25,
};

export const ACTIVITY_LABEL: Record<ActivityType, string> = {
  quote_started: "Quote started",
  quote_completed: "Quote completed",
  policy_bound: "Policy bound",
  multi_policy_bonus: "Multi-policy bonus",
  referral_received: "Referral received",
  referral_converted: "Referral converted",
  followup_completed: "Follow-up completed",
  speed_to_contact: "Speed to contact",
  review_requested: "Review requested",
  review_received: "Review received",
  cross_sell_attempt: "Cross-sell attempt",
  cross_sell_sold: "Cross-sell sold",
};

export const ALL_CELEBRATION_TYPES: CelebrationType[] = [
  "badge_earned",
  "streak_continued",
  "referral_received",
  "policy_bound",
  "referral_converted",
  "personal_goal_hit",
  "rank_change",
  "rank_to_top",
  "contest_won",
  "team_goal_hit",
  "hat_trick",
];

export const CELEBRATION_LABEL: Record<CelebrationType, string> = {
  badge_earned: "Badge earned",
  streak_continued: "Streak continued",
  referral_received: "Referral received",
  policy_bound: "Policy bound",
  referral_converted: "Referral converted",
  personal_goal_hit: "Personal goal hit",
  rank_change: "Rank change",
  rank_to_top: "Rank to top",
  contest_won: "Contest won",
  team_goal_hit: "Team goal hit",
  hat_trick: "Hat trick (3 in a day)",
};

export const CELEBRATION_STYLES: { key: CelebrationStyle; label: string }[] = [
  { key: "confetti", label: "Confetti" },
  { key: "fireworks", label: "Fireworks" },
  { key: "trophy_drop", label: "Trophy drop" },
  { key: "neon_pulse", label: "Neon pulse" },
  { key: "casino_jackpot", label: "Casino jackpot" },
];

export const ANIMATION_INTENSITIES: {
  key: AnimationIntensity;
  label: string;
}[] = [
  { key: "minimal", label: "Minimal" },
  { key: "normal", label: "Normal" },
  { key: "high", label: "High" },
];

export const DEFAULT_SETTINGS: ManagerSettings = {
  animationIntensity: "theme",
  tvDefaultTheme: "match",
  tvSoundOnly: false,
  enabledCelebrations: Object.fromEntries(
    ALL_CELEBRATION_TYPES.map((t) => [t, true]),
  ) as Record<CelebrationType, boolean>,
  defaultCelebrationStyle: "theme",
  pointOverrides: {},
  display: {
    showPremium: true,
    showCloseRate: true,
    showReferrals: true,
    showRankMovement: true,
  },
  dailyPolicyGoal: 6,
};

export const STORAGE_KEY = "agency-arena.manager-settings";

/** Persistence boundary. Today: localStorage. Tomorrow: a composite that
 * reads localStorage first (instant), then merges with a server response
 * keyed by the manager's user id. The provider is agnostic — it only
 * cares about ``load()`` and ``save()``. */
export interface SettingsRepository {
  load(): Partial<ManagerSettings> | null;
  save(settings: ManagerSettings): void;
}

export const localStorageRepository: SettingsRepository = {
  load() {
    if (typeof window === "undefined") return null;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      return JSON.parse(raw) as Partial<ManagerSettings>;
    } catch {
      return null;
    }
  },
  save(settings) {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch {
      // ignore quota / privacy-mode failures
    }
  },
};

/** Deep-merge a (possibly partial / older-shape) saved blob into a fully
 * populated settings object. New defaults appear automatically when fields
 * are added; users don't need to clear localStorage. */
export function mergeSettings(
  partial: Partial<ManagerSettings> | null,
): ManagerSettings {
  if (!partial) return DEFAULT_SETTINGS;
  return {
    ...DEFAULT_SETTINGS,
    ...partial,
    enabledCelebrations: {
      ...DEFAULT_SETTINGS.enabledCelebrations,
      ...(partial.enabledCelebrations ?? {}),
    },
    pointOverrides: { ...(partial.pointOverrides ?? {}) },
    display: { ...DEFAULT_SETTINGS.display, ...(partial.display ?? {}) },
  };
}

/** Look up the effective points for an activity. Override wins over
 * default; missing key returns 0 to mirror backend behavior. */
export function effectivePoints(
  activityType: string,
  overrides: Record<string, number>,
): number {
  if (activityType in overrides) return overrides[activityType];
  if (activityType in DEFAULT_POINTS) {
    return DEFAULT_POINTS[activityType as ActivityType];
  }
  return 0;
}
