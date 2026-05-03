"use client";

import { Check, Flame, Pencil, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Avatar } from "@/components/avatar/Avatar";
import { AvatarCustomizationForm } from "@/components/avatar/AvatarCustomizationForm";
import { AvatarPicker } from "@/components/avatar/AvatarPicker";
import { BadgeDisplay } from "@/components/dashboard/BadgeDisplay";
import { useTheme } from "@/components/theme/ThemeProvider";
import { useSound } from "@/components/sound/SoundProvider";
import {
  api,
  displayName,
  type Agent,
  type AgentProfile,
} from "@/lib/api";
import { computeStreak } from "@/lib/status";
import { cn } from "@/lib/utils";

import { useCurrentAgent } from "./CurrentAgentProvider";

export function PersonalizationPanel({ onClose }: { onClose: () => void }) {
  const { agent, updateAgent, switchTo } = useCurrentAgent();
  const { theme, available: availableThemes, setTheme } = useTheme();
  const sound = useSound();

  const [pickingAvatar, setPickingAvatar] = useState(false);
  const [customizingAvatar, setCustomizingAvatar] = useState(false);
  const [nickname, setNickname] = useState(agent.nickname ?? "");
  const [title, setTitle] = useState(agent.title ?? "");
  const [profile, setProfile] = useState<AgentProfile | null>(null);
  const [allAgents, setAllAgents] = useState<Agent[] | null>(null);
  const [savingField, setSavingField] = useState<"nickname" | "title" | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);

  // Reset dirty form fields when we switch to a different agent.
  useEffect(() => {
    setNickname(agent.nickname ?? "");
    setTitle(agent.title ?? "");
  }, [agent.id, agent.nickname, agent.title]);

  // Fetch profile (lifetime stats, badges, daily history) for the current agent.
  useEffect(() => {
    let cancelled = false;
    api<AgentProfile>(`/agents/${agent.id}/profile`)
      .then((p) => {
        if (!cancelled) setProfile(p);
      })
      .catch(() => {
        // non-fatal
      });
    return () => {
      cancelled = true;
    };
  }, [agent.id]);

  // Fetch the list of all agents once for the user-switcher.
  useEffect(() => {
    api<Agent[]>("/agents")
      .then(setAllAgents)
      .catch(() => {
        // non-fatal
      });
  }, []);

  // Esc closes
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const streak = useMemo(
    () => (profile ? computeStreak(profile.daily_history) : 0),
    [profile],
  );

  async function commitField(field: "nickname" | "title", value: string) {
    setSavingField(field);
    setError(null);
    try {
      const trimmed = value.trim();
      await updateAgent({ [field]: trimmed.length > 0 ? trimmed : null });
    } catch (e) {
      setError(e instanceof Error ? e.message : `Failed to save ${field}`);
    } finally {
      setSavingField(null);
    }
  }

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/30 backdrop-blur-[1px]"
        onClick={onClose}
        aria-hidden
      />
      <aside
        className="fixed right-0 top-0 z-50 h-full w-full max-w-md overflow-y-auto border-l bg-card shadow-xl"
        role="dialog"
        aria-label="Personalization"
      >
        {/* Header — clickable avatar opens the picker */}
        <header className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b bg-card px-6 py-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setPickingAvatar(true)}
              className="group relative shrink-0 rounded-full focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
              aria-label="Change avatar"
            >
              <Avatar
                name={displayName(agent)}
                avatarUrl={agent.avatar_url}
                avatarPreset={agent.avatar_preset}
                size="lg"
              />
              <span className="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full border-2 border-card bg-primary text-primary-foreground opacity-0 transition-opacity group-hover:opacity-100">
                <Pencil className="h-2.5 w-2.5" />
              </span>
            </button>
            <div className="min-w-0">
              <h2 className="truncate text-lg font-semibold leading-tight">
                {displayName(agent)}
              </h2>
              <p className="text-xs text-muted-foreground">
                {agent.role.replace(/_/g, " ")}
              </p>
              {agent.title && (
                <p className="mt-1 text-[11px] font-medium uppercase tracking-wider text-primary">
                  {agent.title}
                </p>
              )}
              <div className="mt-1 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setCustomizingAvatar(true)}
                  className="text-[11px] font-medium text-primary hover:underline"
                >
                  Customize fully…
                </button>
                <a
                  href={`/agents/${agent.id}/personalize`}
                  className="text-[11px] font-medium text-muted-foreground hover:text-foreground hover:underline"
                >
                  Open page →
                </a>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="space-y-6 px-6 py-5">
          {/* Quick stats */}
          <div className="grid grid-cols-3 gap-2">
            <Stat
              label="Streak"
              value={`${streak}d`}
              icon={Flame}
              accent={
                streak >= 5
                  ? "text-orange-600"
                  : streak >= 3
                    ? "text-amber-600"
                    : "text-muted-foreground"
              }
            />
            <Stat
              label="Lifetime pts"
              value={profile?.lifetime.total_points ?? "—"}
            />
            <Stat
              label="Badges"
              value={profile?.badges.length ?? "—"}
            />
          </div>

          {error && (
            <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
              {error}
            </div>
          )}

          {/* Identity */}
          <Section title="Identity">
            <Field label="Nickname" hint={savingField === "nickname" ? "Saving…" : undefined}>
              <input
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                onBlur={() => {
                  if ((nickname.trim() || null) !== (agent.nickname ?? null)) {
                    commitField("nickname", nickname);
                  }
                }}
                placeholder={agent.name}
                maxLength={60}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </Field>

            <Field label="Title" hint={savingField === "title" ? "Saving…" : undefined}>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={() => {
                  if ((title.trim() || null) !== (agent.title ?? null)) {
                    commitField("title", title);
                  }
                }}
                placeholder="Add a title — e.g. Top Closer"
                maxLength={80}
                list="title-suggestions"
                className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
              {profile && profile.badges.length > 0 && (
                <datalist id="title-suggestions">
                  {profile.badges.map((b) => (
                    <option key={b.id} value={b.name} />
                  ))}
                </datalist>
              )}
            </Field>
          </Section>

          {/* Appearance */}
          <Section title="Appearance">
            <div className="grid grid-cols-2 gap-2">
              {availableThemes.map((t) => {
                const active = theme === t.key;
                const [bg, primary, accent] = t.swatches;
                return (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => setTheme(t.key)}
                    className={cn(
                      "flex items-center gap-2 rounded-md border p-2 text-left transition-colors hover:bg-muted/40",
                      active && "border-primary bg-primary/5",
                    )}
                  >
                    <span
                      className="flex h-8 w-10 shrink-0 overflow-hidden rounded ring-1 ring-border"
                      aria-hidden
                    >
                      <span className="h-full flex-1" style={{ background: bg }} />
                      <span className="h-full flex-1" style={{ background: primary }} />
                      <span className="h-full flex-1" style={{ background: accent }} />
                    </span>
                    <span className="min-w-0 flex-1 text-xs font-medium">
                      {t.label}
                    </span>
                    {active && <Check className="h-4 w-4 shrink-0 text-primary" />}
                  </button>
                );
              })}
            </div>
          </Section>

          {/* Sound */}
          <Section title="Sound">
            <label className="mb-2 flex cursor-pointer items-center justify-between gap-2 rounded-md p-2 hover:bg-muted/40">
              <div>
                <p className="text-sm font-medium">Mute all sounds</p>
                <p className="text-xs text-muted-foreground">
                  Silences chimes, fanfares, and rank-change cues.
                </p>
              </div>
              <input
                type="checkbox"
                checked={sound.muted}
                onChange={(e) => sound.setMuted(e.target.checked)}
                className="h-4 w-4 cursor-pointer accent-primary"
              />
            </label>
            <div className={cn("space-y-1.5 px-2", sound.muted && "opacity-50")}>
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium">Volume</span>
                <span className="font-mono text-muted-foreground">
                  {Math.round(sound.volume * 100)}%
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={sound.volume}
                disabled={sound.muted}
                onChange={(e) => sound.setVolume(parseFloat(e.target.value))}
                className="w-full cursor-pointer accent-primary disabled:cursor-not-allowed"
              />
            </div>
          </Section>

          {/* Achievements */}
          <Section
            title="Achievements"
            subtitle={profile ? `${profile.badges.length} earned` : ""}
          >
            {!profile ? (
              <p className="text-xs text-muted-foreground">Loading…</p>
            ) : (
              <BadgeDisplay
                badges={profile.badges}
                layout="grid"
                emptyMessage="No badges yet — keep going."
              />
            )}
          </Section>

          {/* Switch user */}
          {allAgents && allAgents.length > 1 && (
            <Section
              title="Switch user"
              subtitle="Demo: see the app as a different agent"
            >
              <select
                value={agent.id}
                onChange={(e) => {
                  const next = allAgents.find(
                    (a) => a.id === parseInt(e.target.value, 10),
                  );
                  if (next) switchTo(next);
                }}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              >
                {allAgents.map((a) => (
                  <option key={a.id} value={a.id}>
                    {displayName(a)} · {a.role.replace(/_/g, " ")}
                  </option>
                ))}
              </select>
            </Section>
          )}
        </div>
      </aside>

      {pickingAvatar && (
        <AvatarPicker
          agent={agent}
          onClose={() => setPickingAvatar(false)}
          onSaved={async (updated) => {
            // The picker hits the API directly; update provider state so the
            // top-bar avatar refreshes alongside.
            await updateAgent({
              avatar_url: updated.avatar_url,
              avatar_preset: updated.avatar_preset,
            }).catch(() => {});
            setPickingAvatar(false);
          }}
        />
      )}

      {customizingAvatar && (
        <AvatarCustomizationForm
          agent={agent}
          onClose={() => setCustomizingAvatar(false)}
          // The form already PATCHes + emits — provider's subscriber syncs
          // its own state, so no explicit handler is needed here.
        />
      )}
    </>
  );
}

function Stat({
  label,
  value,
  icon: Icon,
  accent,
}: {
  label: string;
  value: string | number;
  icon?: typeof Flame;
  accent?: string;
}) {
  return (
    <div className="rounded-md border bg-muted/20 p-3">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p
        className={cn(
          "mt-0.5 flex items-center gap-1.5 font-mono text-lg font-semibold",
          accent,
        )}
      >
        {Icon && <Icon className="h-4 w-4" />}
        {value}
      </p>
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="mb-3 block">
      <span className="mb-1.5 flex items-center justify-between text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {label}
        {hint && <span className="font-normal normal-case">{hint}</span>}
      </span>
      {children}
    </label>
  );
}

function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="mb-2 flex items-baseline justify-between">
        <h3 className="text-sm font-semibold">{title}</h3>
        {subtitle && (
          <span className="text-[11px] text-muted-foreground">{subtitle}</span>
        )}
      </div>
      {children}
    </section>
  );
}
