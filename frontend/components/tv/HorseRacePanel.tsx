"use client";

import { Flag } from "lucide-react";
import { useEffect, useMemo, useRef } from "react";

import { useCelebrate } from "@/components/celebration/CelebrationProvider";
import { displayName, type LeaderboardEntry } from "@/lib/api";

import { RaceLane } from "./RaceLane";

/** Gap (in policies) under which two leading racers are considered
 * "neck and neck" and both get highlighted. */
const NECK_GAP = 5;

/** Working days per month — tuned for a 5-day office. Used as the
 * multiplier on the daily-policy-goal manager setting to derive each
 * agent's monthly target. Round number on purpose; no calendar math. */
const WORKING_DAYS = 22;

/** Monthly horse-race screen. Each agent runs a lane toward the finish
 * line, position driven by ``policies / monthlyGoal`` for the current
 * monthly window. The leader gets a crown + glow; close runners get a
 * "neck & neck" badge. Crossing the finish triggers a tier-large
 * celebration once per agent per session.
 */
export function HorseRacePanel({
  entries,
  dailyPolicyGoal,
}: {
  /** Sorted leaderboard entries from ``/leaderboard?period=monthly``. */
  entries: LeaderboardEntry[];
  /** Manager-tuned daily goal — multiplied by working days / agents to
   * get each agent's monthly fair-share. */
  dailyPolicyGoal: number;
}) {
  const celebrate = useCelebrate();
  const finishedRef = useRef<Set<number>>(new Set());
  const leaderRef = useRef<number | null>(null);

  const monthlyGoal = useMemo(() => {
    const teamMonthly = dailyPolicyGoal * WORKING_DAYS;
    const perAgent = Math.ceil(teamMonthly / Math.max(1, entries.length));
    // Floor at a meaningful target so a tiny office isn't racing toward 4.
    return Math.max(10, perAgent);
  }, [dailyPolicyGoal, entries.length]);

  // Sort by policies desc — the racer in front is at the top.
  const racers = useMemo(
    () => [...entries].sort((a, b) => b.policies - a.policies),
    [entries],
  );

  const leader = racers[0];
  const second = racers[1];
  const neckAndNeck =
    !!leader &&
    !!second &&
    leader.policies > 0 &&
    leader.policies - second.policies <= NECK_GAP;

  // Fire celebrations on lead change + finish line. We dedupe with refs
  // so re-renders don't replay the same event.
  useEffect(() => {
    if (!leader) return;
    if (leaderRef.current !== null && leaderRef.current !== leader.agent_id) {
      celebrate({
        type: "rank_to_top",
        tier: "large",
        title: `${displayName(leader)} takes the lead`,
        description: `${leader.policies} of ${monthlyGoal} for the month.`,
      });
    }
    leaderRef.current = leader.agent_id;
  }, [leader?.agent_id, leader?.policies, monthlyGoal, celebrate, leader]);

  useEffect(() => {
    for (const r of racers) {
      if (r.policies >= monthlyGoal && !finishedRef.current.has(r.agent_id)) {
        finishedRef.current.add(r.agent_id);
        celebrate({
          type: "team_goal_hit",
          tier: "large",
          title: `${displayName(r)} hit the monthly goal!`,
          description: `${r.policies} policies bound this month.`,
        });
      }
    }
  }, [racers, monthlyGoal, celebrate]);

  if (racers.length === 0) {
    return (
      <div className="flex w-full flex-col items-center justify-center gap-4 self-center">
        <Flag className="h-10 w-10 text-muted-foreground/50" />
        <p className="text-2xl text-muted-foreground">
          No racers yet — add agents to start the month.
        </p>
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col gap-4 self-start">
      {/* Sub-header: shows the goal so viewers know what the finish line
          actually means. */}
      <div className="flex items-center justify-between rounded-2xl border bg-card/30 px-5 py-3 text-sm uppercase tracking-[0.3em] text-muted-foreground">
        <span>{racers.length} racers · this month</span>
        <span className="flex items-center gap-2">
          <Flag className="h-4 w-4" />
          finish line · {monthlyGoal} policies
        </span>
      </div>

      <div className="flex flex-col gap-3">
        {racers.map((entry, i) => (
          <RaceLane
            key={entry.agent_id}
            entry={entry}
            monthlyGoal={monthlyGoal}
            isLeader={i === 0 && entry.policies > 0}
            neckAndNeck={neckAndNeck && (i === 0 || i === 1)}
          />
        ))}
      </div>
    </div>
  );
}
