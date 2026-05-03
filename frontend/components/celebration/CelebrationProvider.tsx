"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

import { useManagerSettings } from "@/components/settings/ManagerSettingsProvider";
import { useSound } from "@/components/sound/SoundProvider";
import { useTheme } from "@/components/theme/ThemeProvider";

import { fireBurst } from "./effects";
import { Large } from "./Large";
import { Medium } from "./Medium";
import { NeonPulse } from "./NeonPulse";
import { Small } from "./Small";
import { TrophyDrop } from "./TrophyDrop";
import { DEFAULT_TIER, TIER_DURATION_MS, type Tier } from "./tiers";

// CelebrationType lives in lib/manager-settings.ts so the persistence
// layer can reference it without importing from this provider (which
// would create a cycle through SoundProvider). Re-exported here for
// existing consumers that import from the provider.
export type { CelebrationType } from "@/lib/manager-settings";
import type { CelebrationType } from "@/lib/manager-settings";

export type CelebrationEvent = {
  type: CelebrationType;
  /** Optional override; default tier comes from ``DEFAULT_TIER[type]``. */
  tier?: Tier;
  title: string;
  description?: string;
};

export type CelebrationSettings = {
  enabled: boolean;
  sound: boolean;
};

const DEFAULT_SETTINGS: CelebrationSettings = { enabled: true, sound: true };
const STORAGE_KEY = "agency-arena.celebrations";

const CelebrateContext = createContext<((e: CelebrationEvent) => void) | null>(
  null,
);
const SettingsContext = createContext<{
  settings: CelebrationSettings;
  setSettings: (next: Partial<CelebrationSettings>) => void;
} | null>(null);

/** Internal: holds the active event + the resolved tier so the overlay
 * doesn't have to recompute. */
type ActiveEvent = CelebrationEvent & { tier: Tier; uid: string };

export function CelebrationProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const sound = useSound();
  const themeCtx = useTheme();
  const manager = useManagerSettings();
  const [settings, setSettingsState] =
    useState<CelebrationSettings>(DEFAULT_SETTINGS);
  const [event, setEvent] = useState<ActiveEvent | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const settingsRef = useRef(settings);
  const soundRef = useRef(sound);
  const themeRef = useRef(themeCtx);
  const managerRef = useRef(manager);

  settingsRef.current = settings;
  soundRef.current = sound;
  themeRef.current = themeCtx;
  managerRef.current = manager;

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<CelebrationSettings>;
        setSettingsState({ ...DEFAULT_SETTINGS, ...parsed });
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const setSettings = useCallback((next: Partial<CelebrationSettings>) => {
    setSettingsState((prev) => {
      const merged = { ...prev, ...next };
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
      } catch {
        // ignore
      }
      return merged;
    });
  }, []);

  const celebrate = useCallback((evt: CelebrationEvent) => {
    const current = settingsRef.current;
    if (!current.enabled) return;
    // Per-type opt-out from manager settings. Master switch above wins;
    // if the master is on, individual types can still suppress.
    const mgr = managerRef.current.settings;
    if (mgr.enabledCelebrations[evt.type] === false) return;
    const tier: Tier = evt.tier ?? DEFAULT_TIER[evt.type] ?? "medium";
    const style =
      mgr.defaultCelebrationStyle === "theme"
        ? themeRef.current.config.celebrationStyle
        : mgr.defaultCelebrationStyle;

    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setEvent({ ...evt, tier, uid: `${Date.now()}-${Math.random()}` });
    fireBurst(evt.type, tier, style);

    if (current.sound) {
      // Map celebration types to existing sound keys. Big rank moves and
      // contest/team wins get the heavier fanfare; small wins use chimes.
      let key: "policy_bound" | "badge_earned" | "leaderboard_change" | "contest_win";
      if (
        tier === "large" &&
        (evt.type === "rank_to_top" ||
          evt.type === "contest_won" ||
          evt.type === "team_goal_hit" ||
          evt.type === "hat_trick" ||
          evt.type === "rank_change")
      ) {
        key = "contest_win";
      } else if (evt.type === "rank_change" || evt.type === "rank_to_top") {
        key = "leaderboard_change";
      } else if (evt.type === "badge_earned") {
        key = "badge_earned";
      } else {
        key = "policy_bound";
      }
      soundRef.current.play(key);
    }
    timeoutRef.current = setTimeout(
      () => setEvent(null),
      TIER_DURATION_MS[tier],
    );
  }, []);

  return (
    <SettingsContext.Provider value={{ settings, setSettings }}>
      <CelebrateContext.Provider value={celebrate}>
        {children}
        <CelebrationOverlay event={event} />
      </CelebrateContext.Provider>
    </SettingsContext.Provider>
  );
}

export function useCelebrate() {
  const ctx = useContext(CelebrateContext);
  if (!ctx)
    throw new Error("useCelebrate must be used inside <CelebrationProvider>");
  return ctx;
}

/** Public name for the celebration trigger. Same hook as ``useCelebrate``. */
export const useCelebration = useCelebrate;

export function useCelebrationSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx)
    throw new Error(
      "useCelebrationSettings must be used inside <CelebrationProvider>",
    );
  return ctx;
}

/** Composite overlay: tier popup + style-specific decoration. Mounted by
 * the provider; can also be rendered manually if a surface wants to
 * preview a celebration. */
export function CelebrationOverlay({ event }: { event: ActiveEvent | null }) {
  const { config } = useTheme();
  const { settings } = useManagerSettings();
  if (!event) return null;
  const tier = event.tier;
  const style =
    settings.defaultCelebrationStyle === "theme"
      ? config.celebrationStyle
      : settings.defaultCelebrationStyle;
  const keyId = event.uid;
  return (
    <>
      {/* Style decoration sits behind / around the tier popup. */}
      {style === "neon_pulse" && <NeonPulse keyId={keyId} />}
      {style === "trophy_drop" && <TrophyDrop keyId={keyId} />}

      {/* Tier popup */}
      {tier === "small" && <Small event={event} />}
      {tier === "medium" && <Medium event={event} />}
      {tier === "large" && <Large event={event} />}
    </>
  );
}
