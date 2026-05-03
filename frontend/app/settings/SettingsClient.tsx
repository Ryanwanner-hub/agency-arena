"use client";

import {
  RotateCcw,
  Tv,
  Volume2,
  VolumeX,
} from "lucide-react";
import { useEffect, useState } from "react";

import { useCelebrationSettings } from "@/components/celebration/CelebrationProvider";
import { useManagerSettings } from "@/components/settings/ManagerSettingsProvider";
import { useSound } from "@/components/sound/SoundProvider";
import { useTheme } from "@/components/theme/ThemeProvider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ACTIVITY_LABEL,
  ACTIVITY_TYPES,
  ALL_CELEBRATION_TYPES,
  ANIMATION_INTENSITIES,
  CELEBRATION_LABEL,
  CELEBRATION_STYLES,
  DEFAULT_POINTS,
} from "@/lib/manager-settings";
import { THEMES, THEME_KEYS } from "@/lib/themes";
import { cn } from "@/lib/utils";

export function SettingsClient() {
  // Avoid SSR/CSR mismatches: localStorage-backed values are only known
  // after mount, so we render a stable shell first and the live state on
  // the second pass.
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Configure how Agency Arena looks, sounds, and rewards across the
          office.
        </p>
      </header>

      {hydrated && (
        <>
          <ThemeSection />
          <SoundSection />
          <CelebrationSection />
          <PointSection />
          <DisplaySection />
        </>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────
// 1. Theme Settings
// ────────────────────────────────────────────────────────────────────────

function ThemeSection() {
  const { theme, available, setTheme } = useTheme();
  const { settings, update } = useManagerSettings();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Theme</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <Field
          label="Active theme"
          help="Applies immediately to all users on this device."
        >
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {available.map((t) => {
              const active = theme === t.key;
              return (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setTheme(t.key)}
                  className={cn(
                    "flex items-center gap-3 rounded-md border p-3 text-left transition-colors",
                    active
                      ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                      : "hover:bg-muted/40",
                  )}
                >
                  <span className="flex h-9 w-12 shrink-0 overflow-hidden rounded-md ring-1 ring-border">
                    <span
                      className="h-full flex-1"
                      style={{ background: t.swatches[0] }}
                    />
                    <span
                      className="h-full flex-1"
                      style={{ background: t.swatches[1] }}
                    />
                    <span
                      className="h-full flex-1"
                      style={{ background: t.swatches[2] }}
                    />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{t.label}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {t.description}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </Field>

        <Field
          label="Animation intensity"
          help="Override the active theme's animation level."
        >
          <Segmented
            value={settings.animationIntensity}
            options={[
              { key: "theme", label: "Use theme" },
              ...ANIMATION_INTENSITIES.map((a) => ({
                key: a.key,
                label: a.label,
              })),
            ]}
            onChange={(v) =>
              update({ animationIntensity: v as typeof settings.animationIntensity })
            }
          />
        </Field>

        <Field
          label="Default TV mode theme"
          help="The /tv board opens with this theme regardless of the active theme."
        >
          <Select
            value={settings.tvDefaultTheme}
            onChange={(v) =>
              update({ tvDefaultTheme: v as typeof settings.tvDefaultTheme })
            }
            options={[
              { key: "match", label: "Match active theme" },
              ...THEME_KEYS.map((k) => ({ key: k, label: THEMES[k].label })),
            ]}
          />
        </Field>
      </CardContent>
    </Card>
  );
}

// ────────────────────────────────────────────────────────────────────────
// 2. Sound Settings
// ────────────────────────────────────────────────────────────────────────

function SoundSection() {
  const { muted, volume, setMuted, setVolume, play } = useSound();
  const { settings, update } = useManagerSettings();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sound</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <Toggle
          label="Mute all"
          help="Disables all sound effects across the app."
          checked={muted}
          onChange={setMuted}
          icon={muted ? VolumeX : Volume2}
        />

        <Field label="Master volume" help={`${Math.round(volume * 100)}%`}>
          <div className="flex items-center gap-3">
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={volume}
              onChange={(e) => setVolume(Number(e.target.value))}
              disabled={muted}
              className="flex-1 accent-primary disabled:opacity-50"
              aria-label="Master volume"
            />
            <button
              type="button"
              onClick={() => play("policy_bound")}
              disabled={muted}
              className="rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-muted disabled:opacity-50"
            >
              Test
            </button>
          </div>
        </Field>

        <Toggle
          label="TV mode only"
          help="Only the /tv scoreboard plays sound; the dashboard stays silent."
          checked={settings.tvSoundOnly}
          onChange={(v) => update({ tvSoundOnly: v })}
          icon={Tv}
        />
      </CardContent>
    </Card>
  );
}

// ────────────────────────────────────────────────────────────────────────
// 3. Celebration Settings
// ────────────────────────────────────────────────────────────────────────

function CelebrationSection() {
  const { settings: celSettings, setSettings: setCelSettings } =
    useCelebrationSettings();
  const { settings, setCelebrationEnabled, update } = useManagerSettings();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Celebrations</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <Toggle
          label="Enable celebrations"
          help="Master switch for confetti, fireworks, and tier popups."
          checked={celSettings.enabled}
          onChange={(v) => setCelSettings({ enabled: v })}
        />

        <Toggle
          label="Celebration sound"
          help="Plays a chime on top of the visual burst."
          checked={celSettings.sound}
          onChange={(v) => setCelSettings({ sound: v })}
        />

        <Field
          label="Default celebration style"
          help="Override the active theme's burst style."
        >
          <Select
            value={settings.defaultCelebrationStyle}
            onChange={(v) =>
              update({
                defaultCelebrationStyle:
                  v as typeof settings.defaultCelebrationStyle,
              })
            }
            options={[
              { key: "theme", label: "Use theme default" },
              ...CELEBRATION_STYLES.map((s) => ({ key: s.key, label: s.label })),
            ]}
          />
        </Field>

        <Field
          label="Trigger types"
          help="Disable a row to suppress that celebration type. Master switch above wins."
        >
          <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
            {ALL_CELEBRATION_TYPES.map((type) => (
              <Toggle
                key={type}
                label={CELEBRATION_LABEL[type]}
                checked={settings.enabledCelebrations[type]}
                onChange={(v) => setCelebrationEnabled(type, v)}
                compact
              />
            ))}
          </div>
        </Field>
      </CardContent>
    </Card>
  );
}

// ────────────────────────────────────────────────────────────────────────
// 4. Point Settings
// ────────────────────────────────────────────────────────────────────────

function PointSection() {
  const { settings, setPointOverride, resetPoints } = useManagerSettings();

  const dirty = Object.keys(settings.pointOverrides).length > 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardTitle>Point values</CardTitle>
          <button
            type="button"
            onClick={resetPoints}
            disabled={!dirty}
            className="inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium hover:bg-muted disabled:opacity-50"
          >
            <RotateCcw className="h-3 w-3" />
            Reset to default
          </button>
        </div>
      </CardHeader>
      <CardContent>
        <p className="mb-3 text-xs text-muted-foreground">
          Edits apply to future scoring and sync back to the API. Existing
          activities keep the points they were originally scored with.
        </p>
        <div className="overflow-hidden rounded-md border">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-2 text-left font-semibold">Activity</th>
                <th className="px-4 py-2 text-right font-semibold">Default</th>
                <th className="px-4 py-2 text-right font-semibold">Override</th>
              </tr>
            </thead>
            <tbody>
              {ACTIVITY_TYPES.map((type) => {
                const def = DEFAULT_POINTS[type];
                const override = settings.pointOverrides[type];
                const value = override ?? def;
                const isOverride = override !== undefined && override !== def;
                return (
                  <tr key={type} className="border-t">
                    <td className="px-4 py-2.5">{ACTIVITY_LABEL[type]}</td>
                    <td className="px-4 py-2.5 text-right font-mono tabular-nums text-muted-foreground">
                      {def}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <input
                        type="number"
                        min={0}
                        step={1}
                        value={value}
                        onChange={(e) => {
                          const next = Number(e.target.value);
                          setPointOverride(
                            type,
                            Number.isFinite(next) ? next : null,
                          );
                        }}
                        onBlur={(e) => {
                          const next = Number(e.target.value);
                          if (next === def) setPointOverride(type, null);
                        }}
                        className={cn(
                          "w-20 rounded-md border bg-background px-2 py-1 text-right font-mono tabular-nums",
                          isOverride && "border-primary bg-primary/5",
                        )}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

// ────────────────────────────────────────────────────────────────────────
// 5. Display Settings
// ────────────────────────────────────────────────────────────────────────

function DisplaySection() {
  const { settings, setDisplay } = useManagerSettings();
  const d = settings.display;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Display</CardTitle>
      </CardHeader>
      <CardContent className="space-y-1">
        <Toggle
          label="Show premium amounts"
          help="Reveals deal $ values in the activity feed and recent wins."
          checked={d.showPremium}
          onChange={(v) => setDisplay("showPremium", v)}
        />
        <Toggle
          label="Show close rate"
          help="The Close Rate column in the leaderboard."
          checked={d.showCloseRate}
          onChange={(v) => setDisplay("showCloseRate", v)}
        />
        <Toggle
          label="Show referrals"
          help="The Referral Leader card on the dashboard top strip."
          checked={d.showReferrals}
          onChange={(v) => setDisplay("showReferrals", v)}
        />
        <Toggle
          label="Show rank movement"
          help="The ↑/↓ chip on rank tiles when an agent moves between polls."
          checked={d.showRankMovement}
          onChange={(v) => setDisplay("showRankMovement", v)}
        />
      </CardContent>
    </Card>
  );
}

// ────────────────────────────────────────────────────────────────────────
// Generic primitives
// ────────────────────────────────────────────────────────────────────────

function Field({
  label,
  help,
  children,
}: {
  label: string;
  help?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium">{label}</label>
      {help && <p className="text-xs text-muted-foreground">{help}</p>}
      <div className="pt-1">{children}</div>
    </div>
  );
}

function Toggle({
  label,
  help,
  checked,
  onChange,
  icon: Icon,
  compact = false,
}: {
  label: string;
  help?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  icon?: React.ComponentType<{ className?: string }>;
  compact?: boolean;
}) {
  return (
    <label
      className={cn(
        "flex cursor-pointer items-center justify-between gap-3 rounded-md transition-colors hover:bg-muted/40",
        compact ? "px-2 py-1.5" : "px-1 py-2",
      )}
    >
      <div className="flex items-center gap-2 min-w-0">
        {Icon && <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />}
        <div className="min-w-0">
          <p className={cn("font-medium", compact ? "text-sm" : "text-sm")}>
            {label}
          </p>
          {help && !compact && (
            <p className="text-xs text-muted-foreground">{help}</p>
          )}
        </div>
      </div>
      <Switch checked={checked} onChange={onChange} />
    </label>
  );
}

function Switch({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors",
        checked ? "bg-primary" : "bg-muted",
      )}
    >
      <span
        className={cn(
          "inline-block h-4 w-4 transform rounded-full bg-card shadow-sm transition-transform",
          checked ? "translate-x-4" : "translate-x-0.5",
        )}
      />
    </button>
  );
}

function Segmented<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { key: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="inline-flex flex-wrap gap-1 rounded-md border bg-muted/30 p-1">
      {options.map((opt) => {
        const active = value === opt.key;
        return (
          <button
            key={opt.key}
            type="button"
            onClick={() => onChange(opt.key)}
            className={cn(
              "rounded px-3 py-1 text-xs font-medium transition-colors",
              active
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

function Select<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { key: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as T)}
      className="rounded-md border bg-background px-3 py-1.5 text-sm"
    >
      {options.map((opt) => (
        <option key={opt.key} value={opt.key}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}
