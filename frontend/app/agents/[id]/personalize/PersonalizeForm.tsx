"use client";

import { ArrowLeft, Check, Lock, Upload } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

import {
  AVATAR_PRESETS,
  Avatar,
  FRAME_META,
  type AvatarFrame,
  type AvatarPreset,
} from "@/components/avatar/Avatar";
import { AvatarPreview } from "@/components/avatar/AvatarPreview";
import {
  useCelebrationSettings,
} from "@/components/celebration/CelebrationProvider";
import { BadgeDisplay } from "@/components/dashboard/BadgeDisplay";
import { useSound } from "@/components/sound/SoundProvider";
import { emitAgentUpdated } from "@/lib/agent-events";
import {
  API_BASE,
  type Agent,
  type AgentProfile,
} from "@/lib/api";
import { computeStreak } from "@/lib/status";
import { TITLES, TITLE_KEYS, titleKeyFromLabel, type TitleKey } from "@/lib/titles";
import { cn } from "@/lib/utils";

const COLOR_PALETTE: { value: string | null; label: string; swatch: string }[] = [
  { value: null, label: "Auto", swatch: "transparent" },
  { value: "#ef4444", label: "Red", swatch: "#ef4444" },
  { value: "#f97316", label: "Orange", swatch: "#f97316" },
  { value: "#f59e0b", label: "Amber", swatch: "#f59e0b" },
  { value: "#eab308", label: "Gold", swatch: "#eab308" },
  { value: "#22c55e", label: "Green", swatch: "#22c55e" },
  { value: "#10b981", label: "Emerald", swatch: "#10b981" },
  { value: "#14b8a6", label: "Teal", swatch: "#14b8a6" },
  { value: "#06b6d4", label: "Cyan", swatch: "#06b6d4" },
  { value: "#3b82f6", label: "Blue", swatch: "#3b82f6" },
  { value: "#6366f1", label: "Indigo", swatch: "#6366f1" },
  { value: "#8b5cf6", label: "Violet", swatch: "#8b5cf6" },
  { value: "#ec4899", label: "Pink", swatch: "#ec4899" },
  { value: "#64748b", label: "Slate", swatch: "#64748b" },
];

const FRAME_KEYS: AvatarFrame[] = [
  "default",
  "gold",
  "silver",
  "bronze",
  "badge",
  "streak",
];

const ALLOWED_MIME = ["image/png", "image/jpeg", "image/webp"];
const MAX_BYTES = 2 * 1024 * 1024;

type Draft = {
  nickname: string;
  avatar_url: string | null;
  avatar_preset: AvatarPreset | null;
  avatar_color: string | null;
  avatar_frame: AvatarFrame | null;
  title: string | null;
};

function draftFromAgent(agent: Agent): Draft {
  return {
    nickname: agent.nickname ?? "",
    avatar_url: agent.avatar_url,
    avatar_preset: (agent.avatar_preset as AvatarPreset | null) ?? null,
    avatar_color: agent.avatar_color,
    avatar_frame: (agent.avatar_frame as AvatarFrame | null) ?? null,
    title: agent.title,
  };
}

function diffPatch(agent: Agent, draft: Draft): Partial<Agent> {
  const patch: Partial<Agent> = {};
  const trimmedNick = draft.nickname.trim();
  const newNick = trimmedNick.length > 0 ? trimmedNick : null;
  if (newNick !== (agent.nickname ?? null)) patch.nickname = newNick;
  if (draft.avatar_url !== agent.avatar_url) patch.avatar_url = draft.avatar_url;
  if (draft.avatar_preset !== agent.avatar_preset)
    patch.avatar_preset = draft.avatar_preset;
  if (draft.avatar_color !== agent.avatar_color)
    patch.avatar_color = draft.avatar_color;
  if (draft.avatar_frame !== agent.avatar_frame)
    patch.avatar_frame = draft.avatar_frame;
  if (draft.title !== agent.title) patch.title = draft.title;
  return patch;
}

export function PersonalizeForm({
  agent: initialAgent,
  profile,
  earnedTitles,
}: {
  agent: Agent;
  profile: AgentProfile;
  earnedTitles: TitleKey[];
}) {
  const [agent, setAgent] = useState<Agent>(initialAgent);
  const [draft, setDraft] = useState<Draft>(() => draftFromAgent(initialAgent));
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const earnedSet = useMemo(() => new Set(earnedTitles), [earnedTitles]);
  const sound = useSound();
  const { settings: celebrationSettings, setSettings: setCelebrationSettings } =
    useCelebrationSettings();

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));

  const patch = diffPatch(agent, draft);
  const dirty = Object.keys(patch).length > 0;
  const streak = computeStreak(profile.daily_history);

  // The currently-selected title (key form). null when no title is set or
  // the stored label doesn't map to any known title.
  const selectedTitleKey = titleKeyFromLabel(draft.title);

  async function handleSave() {
    if (!dirty || saving) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/agents/${agent.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!res.ok) {
        throw new Error(`API ${res.status}: ${await res.text()}`);
      }
      const updated = (await res.json()) as Agent;
      setAgent(updated);
      setDraft(draftFromAgent(updated));
      emitAgentUpdated(updated);
      setSavedAt(Date.now());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  async function handleUpload(file: File) {
    setError(null);
    if (!ALLOWED_MIME.includes(file.type)) {
      setError(`Use PNG, JPEG, or WebP — got ${file.type}.`);
      return;
    }
    if (file.size > MAX_BYTES) {
      setError(
        `Too large (${(file.size / 1024 / 1024).toFixed(1)} MB) — max 2 MB.`,
      );
      return;
    }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(`${API_BASE}/agents/${agent.id}/avatar`, {
        method: "POST",
        body: fd,
      });
      if (!res.ok) throw new Error(`API ${res.status}: ${await res.text()}`);
      const updated = (await res.json()) as Agent;
      setAgent(updated);
      setDraft((d) => ({
        ...d,
        avatar_url: updated.avatar_url,
        avatar_preset: null,
      }));
      emitAgentUpdated(updated);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  // Subtle "saved" pulse on the button label for ~2s.
  useEffect(() => {
    if (savedAt === null) return;
    const id = setTimeout(() => setSavedAt(null), 2200);
    return () => clearTimeout(id);
  }, [savedAt]);

  return (
    <div className="space-y-6 pb-24">
      {/* Breadcrumb / header */}
      <header>
        <Link
          href="/agents"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3 w-3" />
          Agents
        </Link>
        <div className="mt-2 flex items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              Personalize
            </h1>
            <p className="text-sm text-muted-foreground">
              {agent.name}
              {agent.nickname ? ` · ${agent.nickname}` : ""}
              {agent.title ? ` · ${agent.title}` : ""}
            </p>
          </div>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Form sections (2/3) */}
        <div className="space-y-6 lg:col-span-2">
          <Section title="Identity" subtitle="How the team sees this agent.">
            <Field label="Nickname">
              <input
                type="text"
                value={draft.nickname}
                onChange={(e) => set("nickname", e.target.value)}
                placeholder={agent.name}
                maxLength={60}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </Field>
          </Section>

          <Section
            title="Avatar"
            subtitle="Upload a photo or pick a preset emoji."
          >
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="mb-3 flex w-full items-center justify-center gap-2 rounded-md border-2 border-dashed bg-muted/30 px-4 py-3 text-sm font-medium hover:bg-muted disabled:opacity-50"
            >
              <Upload className="h-4 w-4" />
              {uploading
                ? "Uploading…"
                : draft.avatar_url
                  ? "Replace uploaded image"
                  : "Upload image (PNG / JPEG / WebP, max 2 MB)"}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleUpload(file);
              }}
            />

            <p className="mb-2 text-[11px] uppercase tracking-wider text-muted-foreground">
              Preset
            </p>
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-8">
              {AVATAR_PRESETS.map((p) => {
                const selected =
                  draft.avatar_preset === p.key && !draft.avatar_url;
                return (
                  <button
                    key={p.key}
                    type="button"
                    onClick={() =>
                      setDraft((d) => ({
                        ...d,
                        avatar_preset: selected ? null : p.key,
                        // picking a preset clears the uploaded image so the
                        // emoji actually shows
                        avatar_url: selected ? d.avatar_url : null,
                      }))
                    }
                    className={cn(
                      "flex flex-col items-center gap-1 rounded-md border p-2 text-xs transition-colors hover:bg-muted/40",
                      selected &&
                        "border-primary bg-primary/5 ring-1 ring-primary",
                    )}
                  >
                    <Avatar
                      name={agent.name}
                      avatarPreset={p.key}
                      backgroundColor={draft.avatar_color}
                      size="md"
                    />
                    <span className="font-medium">{p.label}</span>
                  </button>
                );
              })}
            </div>
            {draft.avatar_url && (
              <button
                type="button"
                onClick={() => set("avatar_url", null)}
                className="mt-2 text-xs font-medium text-rose-600 hover:underline"
              >
                Remove uploaded image
              </button>
            )}
          </Section>

          <Section title="Background color" subtitle="Behind preset / initials.">
            <div className="grid grid-cols-7 gap-2 sm:grid-cols-14">
              {COLOR_PALETTE.map((c) => {
                const selected = draft.avatar_color === c.value;
                return (
                  <button
                    key={c.label}
                    type="button"
                    onClick={() => set("avatar_color", c.value)}
                    aria-label={c.label}
                    title={c.label}
                    className={cn(
                      "h-9 w-9 rounded-full border-2 transition-all",
                      selected
                        ? "border-foreground scale-110"
                        : "border-transparent hover:scale-105",
                    )}
                    style={{
                      background:
                        c.value === null
                          ? "repeating-linear-gradient(45deg, hsl(var(--muted)) 0 4px, hsl(var(--card)) 4px 8px)"
                          : c.swatch,
                    }}
                  />
                );
              })}
            </div>
          </Section>

          <Section
            title="Frame"
            subtitle="Ring around the avatar. Defaults to rank-based when unset."
          >
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
              {FRAME_KEYS.map((f) => {
                const selected = draft.avatar_frame === f;
                return (
                  <button
                    key={f}
                    type="button"
                    onClick={() => set("avatar_frame", f)}
                    className={cn(
                      "flex flex-col items-center gap-1.5 rounded-md border p-3 text-center text-xs transition-colors hover:bg-muted/40",
                      selected &&
                        "border-primary bg-primary/5 ring-1 ring-primary",
                    )}
                  >
                    <Avatar
                      name={agent.name}
                      avatarPreset={draft.avatar_preset}
                      backgroundColor={draft.avatar_color}
                      avatarUrl={draft.avatar_url}
                      frame={f}
                      size="sm"
                    />
                    <span className="font-medium">{FRAME_META[f].label}</span>
                  </button>
                );
              })}
            </div>
          </Section>

          <Section
            title="Title"
            subtitle="Pick a title you've earned through play."
          >
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => set("title", null)}
                className={cn(
                  "flex flex-col items-start gap-0.5 rounded-md border p-3 text-left text-xs transition-colors hover:bg-muted/40",
                  draft.title === null &&
                    "border-primary bg-primary/5 ring-1 ring-primary",
                )}
              >
                <span className="font-medium">No title</span>
                <span className="text-[10px] text-muted-foreground">
                  Just your name and nickname.
                </span>
              </button>
              {TITLE_KEYS.map((key) => {
                const t = TITLES[key];
                const isEarned = earnedSet.has(key);
                const selected = selectedTitleKey === key;
                return (
                  <button
                    key={key}
                    type="button"
                    disabled={!isEarned}
                    onClick={() => set("title", t.label)}
                    className={cn(
                      "relative flex flex-col items-start gap-0.5 rounded-md border p-3 text-left text-xs transition-colors",
                      isEarned ? "hover:bg-muted/40" : "opacity-60",
                      selected &&
                        "border-primary bg-primary/5 ring-1 ring-primary",
                      !isEarned && "cursor-not-allowed",
                    )}
                  >
                    <div className="flex w-full items-center justify-between gap-2">
                      <span className="font-medium">{t.label}</span>
                      {!isEarned && (
                        <Lock className="h-3 w-3 text-muted-foreground" />
                      )}
                      {isEarned && selected && (
                        <Check className="h-3.5 w-3.5 text-primary" />
                      )}
                    </div>
                    <span className="text-[10px] text-muted-foreground">
                      {isEarned ? t.description : t.earnedBy}
                    </span>
                  </button>
                );
              })}
            </div>
            {earnedTitles.length === 0 && (
              <p className="mt-2 text-[11px] text-muted-foreground">
                No titles earned yet — keep at it.
              </p>
            )}
          </Section>

          <Section
            title="Earned badges"
            subtitle={`${profile.badges.length} earned · view-only`}
          >
            <BadgeDisplay
              badges={profile.badges}
              layout="grid"
              emptyMessage="No badges yet — they unlock as activity adds up."
            />
          </Section>

          <Section
            title="Preferences"
            subtitle="Saved on this device."
          >
            <PreferenceRow
              label="Sound effects"
              description="Chimes on policy bound, badge earned, rank shifts."
              checked={!sound.muted}
              onChange={(v) => sound.setMuted(!v)}
            />
            <PreferenceRow
              label="Celebrations"
              description="Confetti and popup on big wins."
              checked={celebrationSettings.enabled}
              onChange={(v) => setCelebrationSettings({ enabled: v })}
            />
          </Section>

          {error && (
            <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
              {error}
            </div>
          )}
        </div>

        {/* Sticky preview (1/3) */}
        <aside className="lg:sticky lg:top-6 lg:self-start">
          <div className="rounded-xl border bg-card p-6 shadow-sm">
            <p className="mb-4 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Live preview
            </p>
            <div className="flex flex-col items-center gap-4 text-center">
              <AvatarPreview
                name={draft.nickname.trim() || agent.name}
                avatarUrl={draft.avatar_url}
                avatarPreset={draft.avatar_preset}
                avatarColor={draft.avatar_color}
                avatarFrame={draft.avatar_frame}
                caption=""
              />
              <div>
                <h3 className="text-xl font-semibold leading-tight">
                  {draft.nickname.trim() || agent.name}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {agent.role.replace(/_/g, " ")}
                </p>
                {draft.title && (
                  <p className="mt-1.5 text-[11px] font-semibold uppercase tracking-wider text-primary">
                    {draft.title}
                  </p>
                )}
              </div>
              <dl className="grid w-full grid-cols-3 gap-2 border-t pt-4">
                <Stat label="Streak" value={`${streak}d`} />
                <Stat
                  label="Lifetime pts"
                  value={profile.lifetime.total_points}
                />
                <Stat label="Badges" value={profile.badges.length} />
              </dl>
            </div>

            <div className="mt-5 space-y-2">
              <button
                type="button"
                onClick={handleSave}
                disabled={!dirty || saving}
                className={cn(
                  "w-full rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50",
                  savedAt && "ring-2 ring-emerald-300",
                )}
              >
                {saving ? "Saving…" : savedAt ? "Saved ✓" : "Save changes"}
              </button>
              {dirty && !saving && (
                <button
                  type="button"
                  onClick={() => setDraft(draftFromAgent(agent))}
                  className="w-full rounded-md border bg-background px-4 py-2 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  Discard changes
                </button>
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
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
    <section className="rounded-xl border bg-card p-5 shadow-sm">
      <div className="mb-3">
        <h2 className="text-base font-semibold">{title}</h2>
        {subtitle && (
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        )}
      </div>
      {children}
    </section>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      {children}
    </label>
  );
}

function PreferenceRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-3 rounded-md p-2 hover:bg-muted/40">
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-1 h-4 w-4 cursor-pointer accent-primary"
      />
    </label>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <dt className="text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
      </dt>
      <dd className="font-mono text-base font-semibold tabular-nums">
        {value}
      </dd>
    </div>
  );
}

