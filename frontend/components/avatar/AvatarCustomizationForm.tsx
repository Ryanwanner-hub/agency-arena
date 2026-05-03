"use client";

import { Upload, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { emitAgentUpdated } from "@/lib/agent-events";
import { API_BASE, type Agent } from "@/lib/api";
import { cn } from "@/lib/utils";

import {
  AVATAR_PRESETS,
  Avatar,
  FRAME_META,
  STATUS_META,
  type AvatarFrame,
  type AvatarPreset,
  type AvatarStatus,
} from "./Avatar";
import { AvatarPreview } from "./AvatarPreview";

/** Fixed background palette. ``null`` = "Auto" (preset gradient or
 * primary-colored initials fallback). */
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

const STATUS_KEYS: AvatarStatus[] = [
  "on_fire",
  "hot_streak",
  "closer_mode",
  "referral_beast",
  "needs_spark",
];

const ALLOWED_MIME = ["image/png", "image/jpeg", "image/webp"];
const MAX_BYTES = 2 * 1024 * 1024;

type Draft = {
  nickname: string;
  avatar_url: string | null;
  avatar_preset: AvatarPreset | null;
  avatar_color: string | null;
  avatar_frame: AvatarFrame | null;
  status_effect: AvatarStatus | null;
};

function draftFromAgent(agent: Agent): Draft {
  return {
    nickname: agent.nickname ?? "",
    avatar_url: agent.avatar_url,
    avatar_preset: (agent.avatar_preset as AvatarPreset | null) ?? null,
    avatar_color: agent.avatar_color,
    avatar_frame: (agent.avatar_frame as AvatarFrame | null) ?? null,
    status_effect: (agent.status_effect as AvatarStatus | null) ?? null,
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
  if (draft.status_effect !== agent.status_effect)
    patch.status_effect = draft.status_effect;
  return patch;
}

export function AvatarCustomizationForm({
  agent,
  onClose,
  onSaved,
}: {
  agent: Agent;
  onClose: () => void;
  onSaved?: (updated: Agent) => void;
}) {
  const [draft, setDraft] = useState<Draft>(() => draftFromAgent(agent));
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset draft if a different agent's record arrives (e.g. user-switcher).
  useEffect(() => {
    setDraft(draftFromAgent(agent));
    setError(null);
  }, [agent.id, agent.updated_at]);

  // Esc closes
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const patch = diffPatch(agent, draft);
  const dirty = Object.keys(patch).length > 0;

  async function handleSave() {
    if (!dirty || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/agents/${agent.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!res.ok) {
        const body = await res.text();
        throw new Error(`API ${res.status}: ${body || res.statusText}`);
      }
      const updated = (await res.json()) as Agent;
      emitAgentUpdated(updated);
      onSaved?.(updated);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save");
      setSubmitting(false);
    }
  }

  async function handleUpload(file: File) {
    setError(null);
    if (!ALLOWED_MIME.includes(file.type)) {
      setError(`Use PNG, JPEG, or WebP — got ${file.type}.`);
      return;
    }
    if (file.size > MAX_BYTES) {
      setError(`Too large (${(file.size / 1024 / 1024).toFixed(1)} MB) — max 2 MB.`);
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
      emitAgentUpdated(updated);
      // Sync our draft so the new URL shows in the preview without a save.
      setDraft((d) => ({
        ...d,
        avatar_url: updated.avatar_url,
        avatar_preset: null,
      }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));

  return (
    <>
      <div
        className="fixed inset-0 z-[60] bg-black/40"
        onClick={onClose}
        aria-hidden
      />
      <aside
        className="fixed right-0 top-0 z-[70] h-full w-full max-w-lg overflow-y-auto border-l bg-card shadow-2xl"
        role="dialog"
        aria-label="Customize avatar"
      >
        <header className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b bg-card px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold">Customize avatar</h2>
            <p className="text-xs text-muted-foreground">{agent.name}</p>
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
          <AvatarPreview
            name={draft.nickname.trim() || agent.name}
            avatarUrl={draft.avatar_url}
            avatarPreset={draft.avatar_preset}
            avatarColor={draft.avatar_color}
            avatarFrame={draft.avatar_frame}
            statusEffect={draft.status_effect}
          />

          <Section title="Nickname" subtitle="Shown alongside your real name.">
            <input
              type="text"
              value={draft.nickname}
              onChange={(e) => set("nickname", e.target.value)}
              placeholder={agent.name}
              maxLength={60}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </Section>

          <Section title="Image" subtitle="Upload your own photo or pick a preset emoji.">
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
            <div className="grid grid-cols-4 gap-2">
              {AVATAR_PRESETS.map((p) => {
                const selected =
                  draft.avatar_preset === p.key && !draft.avatar_url;
                return (
                  <button
                    key={p.key}
                    type="button"
                    onClick={() =>
                      set("avatar_preset", selected ? null : p.key)
                    }
                    onDoubleClick={() => {
                      // Picking a preset clears the uploaded image so the
                      // emoji actually shows.
                      setDraft((d) => ({
                        ...d,
                        avatar_preset: p.key,
                        avatar_url: null,
                      }));
                    }}
                    className={cn(
                      "flex flex-col items-center gap-1 rounded-md border p-2 text-xs transition-colors hover:bg-muted/40",
                      selected && "border-primary bg-primary/5 ring-1 ring-primary",
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
            {draft.avatar_url && (draft.avatar_preset || draft.avatar_color) && (
              <p className="mt-2 text-[11px] text-muted-foreground">
                Uploaded image is showing — clear it below to see preset/color.
              </p>
            )}
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

          <Section
            title="Background color"
            subtitle="Solid color behind preset / initials. Auto = preset gradient."
          >
            <div className="grid grid-cols-7 gap-2">
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
            <div className="grid grid-cols-3 gap-2">
              {FRAME_KEYS.map((f) => {
                const selected = draft.avatar_frame === f;
                return (
                  <button
                    key={f}
                    type="button"
                    onClick={() => set("avatar_frame", f)}
                    className={cn(
                      "flex flex-col items-center gap-1.5 rounded-md border p-3 text-center text-xs transition-colors hover:bg-muted/40",
                      selected && "border-primary bg-primary/5 ring-1 ring-primary",
                    )}
                  >
                    <Avatar
                      name={draft.nickname.trim() || agent.name}
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
            {draft.avatar_frame !== null && (
              <button
                type="button"
                onClick={() => set("avatar_frame", null)}
                className="mt-2 text-xs font-medium text-muted-foreground hover:underline"
              >
                Reset to rank-based frame
              </button>
            )}
          </Section>

          <Section
            title="Status effect"
            subtitle="Persistent vibe. Leaderboard view still computes its own per row."
          >
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => set("status_effect", null)}
                className={cn(
                  "flex flex-col items-start gap-1 rounded-md border p-3 text-left text-xs transition-colors hover:bg-muted/40",
                  draft.status_effect === null &&
                    "border-primary bg-primary/5 ring-1 ring-primary",
                )}
              >
                <span className="font-medium">None</span>
                <span className="text-[10px] text-muted-foreground">
                  Use leaderboard-computed status.
                </span>
              </button>
              {STATUS_KEYS.map((s) => {
                const selected = draft.status_effect === s;
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => set("status_effect", s)}
                    className={cn(
                      "flex items-center gap-3 rounded-md border p-3 text-left text-xs transition-colors hover:bg-muted/40",
                      selected && "border-primary bg-primary/5 ring-1 ring-primary",
                    )}
                  >
                    <Avatar
                      name={draft.nickname.trim() || agent.name}
                      avatarPreset={draft.avatar_preset}
                      backgroundColor={draft.avatar_color}
                      avatarUrl={draft.avatar_url}
                      status={s}
                      size="sm"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">{STATUS_META[s].label}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {STATUS_META[s].description}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </Section>

          {error && (
            <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
              {error}
            </div>
          )}
        </div>

        <footer className="sticky bottom-0 flex items-center justify-end gap-2 border-t bg-card px-6 py-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border bg-background px-4 py-2 text-sm font-medium hover:bg-muted"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!dirty || submitting}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? "Saving…" : "Save changes"}
          </button>
        </footer>
      </aside>
    </>
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
      <div className="mb-2">
        <h3 className="text-sm font-semibold">{title}</h3>
        {subtitle && (
          <p className="text-[11px] text-muted-foreground">{subtitle}</p>
        )}
      </div>
      {children}
    </section>
  );
}
