"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

import {
  DEFAULT_SETTINGS,
  localStorageRepository,
  mergeSettings,
  type ManagerSettings,
  type SettingsRepository,
} from "@/lib/manager-settings";

type Ctx = {
  settings: ManagerSettings;
  /** Shallow-merge update. Nested fields like ``display`` and
   * ``enabledCelebrations`` are deep-merged via ``mergeSettings``. */
  update: (partial: Partial<ManagerSettings>) => void;
  /** Convenience: toggle/replace one key in the celebration map. */
  setCelebrationEnabled: (
    type: keyof ManagerSettings["enabledCelebrations"],
    enabled: boolean,
  ) => void;
  /** Convenience: set a single display toggle. */
  setDisplay: (
    key: keyof ManagerSettings["display"],
    value: boolean,
  ) => void;
  /** Convenience: set a single point override. Pass ``null`` to clear back
   * to the default. */
  setPointOverride: (activityType: string, points: number | null) => void;
  /** Drop all per-activity overrides (returns to backend defaults). */
  resetPoints: () => void;
  /** Reset every section to defaults. */
  reset: () => void;
};

const Context = createContext<Ctx | null>(null);

// Single configuration point. Swap to a composite repo (localStorage +
// server-side ``/settings``) when the backend schema gains support for
// the extended fields.
const repo: SettingsRepository = localStorageRepository;

export function ManagerSettingsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [settings, setSettings] = useState<ManagerSettings>(DEFAULT_SETTINGS);

  // Hydrate from storage on mount. Defaults stay in place during SSR so
  // the first render matches between server and client.
  useEffect(() => {
    setSettings(mergeSettings(repo.load()));
  }, []);

  const persist = useCallback((next: ManagerSettings) => {
    repo.save(next);
    setSettings(next);
  }, []);

  const update = useCallback(
    (partial: Partial<ManagerSettings>) => {
      setSettings((prev) => {
        const merged = mergeSettings({ ...prev, ...partial });
        repo.save(merged);
        return merged;
      });
    },
    [],
  );

  const setCelebrationEnabled = useCallback(
    (type: keyof ManagerSettings["enabledCelebrations"], enabled: boolean) => {
      setSettings((prev) => {
        const next: ManagerSettings = {
          ...prev,
          enabledCelebrations: { ...prev.enabledCelebrations, [type]: enabled },
        };
        repo.save(next);
        return next;
      });
    },
    [],
  );

  const setDisplay = useCallback(
    (key: keyof ManagerSettings["display"], value: boolean) => {
      setSettings((prev) => {
        const next: ManagerSettings = {
          ...prev,
          display: { ...prev.display, [key]: value },
        };
        repo.save(next);
        return next;
      });
    },
    [],
  );

  const setPointOverride = useCallback(
    (activityType: string, points: number | null) => {
      setSettings((prev) => {
        const overrides = { ...prev.pointOverrides };
        if (points === null) delete overrides[activityType];
        else overrides[activityType] = points;
        const next: ManagerSettings = { ...prev, pointOverrides: overrides };
        repo.save(next);
        return next;
      });
    },
    [],
  );

  const resetPoints = useCallback(() => {
    setSettings((prev) => {
      const next: ManagerSettings = { ...prev, pointOverrides: {} };
      repo.save(next);
      return next;
    });
  }, []);

  const reset = useCallback(() => {
    persist(DEFAULT_SETTINGS);
  }, [persist]);

  return (
    <Context.Provider
      value={{
        settings,
        update,
        setCelebrationEnabled,
        setDisplay,
        setPointOverride,
        resetPoints,
        reset,
      }}
    >
      {children}
    </Context.Provider>
  );
}

export function useManagerSettings(): Ctx {
  const ctx = useContext(Context);
  if (!ctx)
    throw new Error(
      "useManagerSettings must be used inside <ManagerSettingsProvider>",
    );
  return ctx;
}
