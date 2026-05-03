"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

import { API_BASE } from "@/lib/api";
import {
  DEFAULT_THEME,
  THEMES,
  THEME_KEYS,
  type ThemeConfig,
  type ThemeKey,
} from "@/lib/themes";

const STORAGE_KEY = "agency-arena.theme";

type Ctx = {
  /** Active theme key. */
  theme: ThemeKey;
  /** Full config for the active theme — colors + behavioral knobs. */
  config: ThemeConfig;
  /** All themes (for the switcher). */
  available: ThemeConfig[];
  setTheme: (next: ThemeKey) => void;
};

const ThemeContext = createContext<Ctx | null>(null);

function isValidTheme(value: unknown): value is ThemeKey {
  return typeof value === "string" && (THEME_KEYS as string[]).includes(value);
}

function applyTheme(key: ThemeKey) {
  if (typeof document === "undefined") return;
  const cfg = THEMES[key];
  document.documentElement.setAttribute("data-theme", key);
  document.documentElement.setAttribute(
    "data-animation",
    cfg.animationIntensity,
  );
}

/** Persistence layer abstraction. Today: localStorage primary, server
 * settings as best-effort sync. Swappable to anything that exposes the
 * same two methods if/when we want pure DB persistence. */
const storage = {
  read(): ThemeKey | null {
    if (typeof window === "undefined") return null;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw && isValidTheme(raw)) return raw;
    } catch {
      // ignore
    }
    return null;
  },
  write(key: ThemeKey): void {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(STORAGE_KEY, key);
    } catch {
      // ignore
    }
    // Best-effort DB sync — non-blocking; failure doesn't roll back the
    // local change. Lets us add cross-device theme later without touching
    // the consumer.
    fetch(`${API_BASE}/settings`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ theme: key }),
      keepalive: true,
    }).catch(() => {});
  },
};

export function ThemeProvider({
  initialTheme,
  children,
}: {
  initialTheme: ThemeKey;
  children: React.ReactNode;
}) {
  const [theme, setThemeState] = useState<ThemeKey>(initialTheme);

  // Hydrate from localStorage if it differs from the SSR-provided value.
  // This means localStorage is the local source of truth: if the user
  // picked a theme on this device, that wins on next load.
  useEffect(() => {
    const stored = storage.read();
    if (stored && stored !== theme) {
      setThemeState(stored);
      applyTheme(stored);
    } else {
      applyTheme(theme);
    }
    // intentionally only on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setTheme = useCallback((next: ThemeKey) => {
    setThemeState(next);
    applyTheme(next);
    storage.write(next);
  }, []);

  return (
    <ThemeContext.Provider
      value={{
        theme,
        config: THEMES[theme],
        available: THEME_KEYS.map((k) => THEMES[k]),
        setTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): Ctx {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside <ThemeProvider>");
  return ctx;
}

// Convenience re-export of the type so consumers can stay agnostic of
// where the theme registry lives.
export type { ThemeKey, ThemeConfig } from "@/lib/themes";
