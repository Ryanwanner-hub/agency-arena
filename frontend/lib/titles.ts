/**
 * Agent titles. Each one is unlocked by a specific badge the agent has
 * earned, or by a derivable activity threshold when no badge maps cleanly.
 *
 * Server-side computation: see ``computeEarnedTitles`` — pure function over
 * the agent's profile + activity list.
 */

import type { Activity, AgentProfile } from "./api";
import { computeStreak } from "./status";

export type TitleKey =
  | "the_closer"
  | "quote_king"
  | "referral_beast"
  | "speed_demon"
  | "binder_boss"
  | "comeback_kid";

export type TitleDef = {
  key: TitleKey;
  /** Display label — also the value persisted to ``Agent.title``. */
  label: string;
  description: string;
  /** Plain-text rule shown in the UI when the title is locked. */
  earnedBy: string;
};

export const TITLES: Record<TitleKey, TitleDef> = {
  the_closer: {
    key: "the_closer",
    label: "The Closer",
    description: "Knows how to put points on the board.",
    earnedBy: "Earn the Top Closer badge.",
  },
  quote_king: {
    key: "quote_king",
    label: "Quote King",
    description: "Quote volume that won't quit.",
    earnedBy: "Earn the Quote Machine badge.",
  },
  referral_beast: {
    key: "referral_beast",
    label: "Referral Beast",
    description: "Pipelines built on relationships.",
    earnedBy: "Earn the Referral Champ badge.",
  },
  speed_demon: {
    key: "speed_demon",
    label: "Speed Demon",
    description: "First to the lead, every time.",
    earnedBy: "Log 5+ speed-to-contact activities.",
  },
  binder_boss: {
    key: "binder_boss",
    label: "Binder Boss",
    description: "Stacking policies like Lego.",
    earnedBy: "Bind 5+ policies.",
  },
  comeback_kid: {
    key: "comeback_kid",
    label: "Comeback Kid",
    description: "Streaking back from a quiet stretch.",
    earnedBy: "Hit a 5-day activity streak.",
  },
};

export const TITLE_KEYS: TitleKey[] = Object.keys(TITLES) as TitleKey[];

/** Reverse lookup: stored ``label`` → ``TitleKey`` (or null). Lets the form
 * round-trip the persisted ``Agent.title`` string back to its definition. */
export function titleKeyFromLabel(
  label: string | null | undefined,
): TitleKey | null {
  if (!label) return null;
  for (const key of TITLE_KEYS) {
    if (TITLES[key].label === label) return key;
  }
  return null;
}

export function computeEarnedTitles(
  profile: AgentProfile,
  activities: Activity[],
): Set<TitleKey> {
  const earned = new Set<TitleKey>();
  const badgeNames = new Set(profile.badges.map((b) => b.name));

  // Badge-driven titles
  if (badgeNames.has("Top Closer")) earned.add("the_closer");
  if (badgeNames.has("Quote Machine")) earned.add("quote_king");
  if (badgeNames.has("Referral Champ")) earned.add("referral_beast");

  // Activity-count titles
  const counts: Record<string, number> = {};
  for (const a of activities) {
    counts[a.activity_type] = (counts[a.activity_type] ?? 0) + 1;
  }
  if ((counts.speed_to_contact ?? 0) >= 5) earned.add("speed_demon");
  if ((counts.policy_bound ?? 0) >= 5) earned.add("binder_boss");

  // Streak title
  if (computeStreak(profile.daily_history) >= 5) earned.add("comeback_kid");

  return earned;
}
