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

export type SoundKey =
  | "policy_bound"
  | "badge_earned"
  | "leaderboard_change"
  | "contest_win";

type Note = { freq: number; start: number; duration: number; gain?: number };

// Each sound is a tiny synthesized chime. No external audio assets.
const SOUND_SPECS: Record<SoundKey, { duration: number; notes: Note[] }> = {
  // Bright C-major arpeggio — celebratory.
  policy_bound: {
    duration: 0.7,
    notes: [
      { freq: 523.25, start: 0.0, duration: 0.18 }, // C5
      { freq: 659.25, start: 0.07, duration: 0.18 }, // E5
      { freq: 783.99, start: 0.14, duration: 0.2 }, // G5
      { freq: 1046.5, start: 0.22, duration: 0.4 }, // C6 (held)
    ],
  },
  // Ascending major-7 — magical, sparkle-y.
  badge_earned: {
    duration: 0.75,
    notes: [
      { freq: 659.25, start: 0.0, duration: 0.16 }, // E5
      { freq: 830.61, start: 0.06, duration: 0.16 }, // G#5
      { freq: 1046.5, start: 0.13, duration: 0.18 }, // C6
      { freq: 1318.51, start: 0.22, duration: 0.45 }, // E6 (held)
    ],
  },
  // Two-note glissando — quiet rank shift signal.
  leaderboard_change: {
    duration: 0.35,
    notes: [
      { freq: 783.99, start: 0.0, duration: 0.1, gain: 0.08 },
      { freq: 1046.5, start: 0.06, duration: 0.18, gain: 0.1 },
    ],
  },
  // Fanfare — C-G-C-E ascending.
  contest_win: {
    duration: 1.1,
    notes: [
      { freq: 523.25, start: 0.0, duration: 0.18 }, // C5
      { freq: 783.99, start: 0.12, duration: 0.18 }, // G5
      { freq: 1046.5, start: 0.24, duration: 0.18 }, // C6
      { freq: 1318.51, start: 0.36, duration: 0.55, gain: 0.14 }, // E6
    ],
  },
};

const STORAGE_KEY = "agency-arena.sound";
const DEFAULT_GAIN = 0.12;

type Settings = { muted: boolean; volume: number };
const DEFAULT_SETTINGS: Settings = { muted: false, volume: 0.7 };

type SoundCtx = {
  play: (key: SoundKey) => void;
  muted: boolean;
  volume: number;
  setMuted: (m: boolean) => void;
  setVolume: (v: number) => void;
  ready: boolean;
};

const SoundContext = createContext<SoundCtx | null>(null);

async function renderBuffer(
  spec: (typeof SOUND_SPECS)[SoundKey],
  sampleRate: number,
): Promise<AudioBuffer> {
  const length = Math.ceil(spec.duration * sampleRate);
  const offline = new OfflineAudioContext(1, length, sampleRate);
  for (const note of spec.notes) {
    const osc = offline.createOscillator();
    const gain = offline.createGain();
    osc.type = "sine";
    osc.frequency.value = note.freq;
    osc.connect(gain).connect(offline.destination);

    const peak = note.gain ?? DEFAULT_GAIN;
    const t0 = note.start;
    const t1 = note.start + note.duration;
    gain.gain.setValueAtTime(0, t0);
    gain.gain.linearRampToValueAtTime(peak, t0 + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, t1);
    osc.start(t0);
    osc.stop(t1);
  }
  return await offline.startRendering();
}

export function SoundProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [ready, setReady] = useState(false);
  const manager = useManagerSettings();
  const tvOnlyRef = useRef(manager.settings.tvSoundOnly);
  tvOnlyRef.current = manager.settings.tvSoundOnly;

  const ctxRef = useRef<AudioContext | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);
  const buffersRef = useRef<Partial<Record<SoundKey, AudioBuffer>>>({});

  // Hydrate persisted settings.
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<Settings>;
        setSettings({ ...DEFAULT_SETTINGS, ...parsed });
      }
    } catch {
      // ignore
    }
  }, []);

  // Persist + apply volume.
  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch {
      // ignore
    }
    if (masterGainRef.current && ctxRef.current) {
      masterGainRef.current.gain.setTargetAtTime(
        settings.muted ? 0 : settings.volume,
        ctxRef.current.currentTime,
        0.02,
      );
    }
  }, [settings]);

  const ensureContext = useCallback((): AudioContext | null => {
    if (typeof window === "undefined") return null;
    if (ctxRef.current) return ctxRef.current;
    const Ctor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!Ctor) return null;

    const ctx = new Ctor();
    const gain = ctx.createGain();
    gain.gain.value = settings.muted ? 0 : settings.volume;
    gain.connect(ctx.destination);
    ctxRef.current = ctx;
    masterGainRef.current = gain;

    // Pre-render all 4 sounds in parallel into AudioBuffers. Once these
    // resolve, future plays are O(1): just connect a BufferSource.
    const sampleRate = ctx.sampleRate;
    const keys = Object.keys(SOUND_SPECS) as SoundKey[];
    Promise.all(
      keys.map((k) =>
        renderBuffer(SOUND_SPECS[k], sampleRate).then((buf) => {
          buffersRef.current[k] = buf;
        }),
      ),
    )
      .then(() => setReady(true))
      .catch(() => {
        // partial readiness is OK — we'll skip missing buffers in play()
        setReady(true);
      });

    return ctx;
  }, [settings.muted, settings.volume]);

  // Browsers require AudioContext to be created in response to a user gesture.
  // Wire one-shot listeners that init on the first interaction so buffers
  // are preloaded by the time real sound triggers fire.
  useEffect(() => {
    const init = () => {
      ensureContext();
      window.removeEventListener("pointerdown", init);
      window.removeEventListener("keydown", init);
    };
    window.addEventListener("pointerdown", init, { once: true });
    window.addEventListener("keydown", init, { once: true });
    return () => {
      window.removeEventListener("pointerdown", init);
      window.removeEventListener("keydown", init);
    };
  }, [ensureContext]);

  const play = useCallback(
    (key: SoundKey) => {
      if (settings.muted) return;
      // TV-only mode: silence everywhere except the /tv board. Path check
      // is cheap and reads from the live URL so the gate flips instantly
      // when the user navigates.
      if (
        tvOnlyRef.current &&
        typeof window !== "undefined" &&
        !window.location.pathname.startsWith("/tv")
      ) {
        return;
      }
      const ctx = ensureContext();
      if (!ctx) return;
      // If suspended (e.g. tab inactive), resume — no-op if already running.
      if (ctx.state === "suspended") {
        ctx.resume().catch(() => {});
      }
      const buf = buffersRef.current[key];
      if (!buf || !masterGainRef.current) return;
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.connect(masterGainRef.current);
      src.start();
    },
    [settings.muted, ensureContext],
  );

  const setMuted = useCallback(
    (muted: boolean) => setSettings((s) => ({ ...s, muted })),
    [],
  );
  const setVolume = useCallback(
    (volume: number) =>
      setSettings((s) => ({ ...s, volume: Math.max(0, Math.min(1, volume)) })),
    [],
  );

  return (
    <SoundContext.Provider
      value={{
        play,
        muted: settings.muted,
        volume: settings.volume,
        setMuted,
        setVolume,
        ready,
      }}
    >
      {children}
    </SoundContext.Provider>
  );
}

export function useSound(): SoundCtx {
  const ctx = useContext(SoundContext);
  if (!ctx) throw new Error("useSound must be used inside <SoundProvider>");
  return ctx;
}
