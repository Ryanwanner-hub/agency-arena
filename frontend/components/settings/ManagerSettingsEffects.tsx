"use client";

import { useEffect } from "react";

import { useTheme } from "@/components/theme/ThemeProvider";

import { useManagerSettings } from "./ManagerSettingsProvider";

/** Side-effect bridge between ``useManagerSettings`` and globals (the
 * ``<html>`` element, etc.). Mounted once near the top of the tree —
 * keeps the provider free of DOM coupling and lives inside both Theme
 * and ManagerSettings contexts so it can resolve the ``"theme"`` default
 * to a concrete value. */
export function ManagerSettingsEffects() {
  const { config } = useTheme();
  const { settings } = useManagerSettings();

  // Animation intensity: ``"theme"`` defers to the active theme's value;
  // anything else overrides the attribute the ThemeProvider set on mount.
  useEffect(() => {
    if (typeof document === "undefined") return;
    const intensity =
      settings.animationIntensity === "theme"
        ? config.animationIntensity
        : settings.animationIntensity;
    document.documentElement.setAttribute("data-animation", intensity);
  }, [settings.animationIntensity, config.animationIntensity]);

  return null;
}
