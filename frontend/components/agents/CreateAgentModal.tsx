"use client";

import { X } from "lucide-react";
import { useEffect, useState } from "react";

import { api, type Agent } from "@/lib/api";
import { cn } from "@/lib/utils";

const ROLES = [
  { value: "agent", label: "Agent" },
  { value: "senior_agent", label: "Senior agent" },
  { value: "junior_agent", label: "Junior agent" },
  { value: "manager", label: "Manager" },
];

const PRESETS = [
  { value: "trophy", label: "🏆", title: "Trophy" },
  { value: "bolt", label: "⚡", title: "Bolt" },
  { value: "star", label: "⭐", title: "Star" },
  { value: "rocket", label: "🚀", title: "Rocket" },
  { value: "diamond", label: "💎", title: "Diamond" },
  { value: "flame", label: "🔥", title: "Flame" },
  { value: "leaf", label: "🌿", title: "Leaf" },
  { value: "wave", label: "🌊", title: "Wave" },
];

const COLORS = [
  "#fafafa",
  "#ef4444",
  "#f97316",
  "#f59e0b",
  "#eab308",
  "#84cc16",
  "#10b981",
  "#06b6d4",
  "#3b82f6",
  "#6366f1",
  "#8b5cf6",
  "#ec4899",
];

export function CreateAgentModal({
  onCreated,
  onClose,
}: {
  onCreated: (agent: Agent) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState("");
  const [nickname, setNickname] = useState("");
  const [role, setRole] = useState("agent");
  const [title, setTitle] = useState("");
  const [preset, setPreset] = useState<string | null>("trophy");
  const [color, setColor] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Close on Esc
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const created = await api<Agent>("/agents", {
        method: "POST",
        body: JSON.stringify({
          name: name.trim(),
          role,
          nickname: nickname.trim() || null,
          title: title.trim() || null,
          avatar_preset: preset,
          avatar_color: color,
          active: true,
        }),
      });
      onCreated(created);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create");
      setSubmitting(false);
    }
  }

  const canSubmit = name.trim().length > 0 && !submitting;

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/40"
        onClick={onClose}
        aria-hidden
      />
      <div
        className="fixed left-1/2 top-1/2 z-50 max-h-[90vh] w-full max-w-md -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-xl border bg-card shadow-2xl"
        role="dialog"
        aria-label="Add agent"
      >
        <header className="flex items-start justify-between border-b px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold">Add agent</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              They can refine their avatar later from the personalize page.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-muted"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <form onSubmit={submit} className="space-y-4 px-6 py-5">
          <Field label="Name" required>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Alex Morgan"
              className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              required
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Nickname (optional)">
              <input
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="Alex"
                className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </Field>
            <Field label="Title (optional)">
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Top Closer"
                className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </Field>
          </div>

          <Field label="Role">
            <div className="flex flex-wrap gap-2">
              {ROLES.map((r) => (
                <button
                  key={r.value}
                  type="button"
                  onClick={() => setRole(r.value)}
                  className={cn(
                    "rounded-md border px-3 py-1.5 text-xs font-medium",
                    role === r.value
                      ? "border-primary bg-primary/5 text-primary"
                      : "text-muted-foreground hover:bg-muted",
                  )}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </Field>

          <Field label="Avatar preset">
            <div className="flex flex-wrap gap-2">
              {PRESETS.map((p) => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => setPreset(p.value)}
                  title={p.title}
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-full border text-lg",
                    preset === p.value
                      ? "border-primary bg-primary/5 ring-2 ring-primary/30"
                      : "border-border hover:bg-muted",
                  )}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </Field>

          <Field label="Background color (optional)">
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setColor(null)}
                className={cn(
                  "h-7 rounded-md border px-2 text-xs",
                  color === null
                    ? "border-primary bg-primary/5 text-primary"
                    : "text-muted-foreground hover:bg-muted",
                )}
              >
                Auto
              </button>
              {COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={cn(
                    "h-7 w-7 rounded-full ring-1 ring-border transition-transform",
                    color === c &&
                      "scale-110 ring-2 ring-primary ring-offset-2 ring-offset-card",
                  )}
                  style={{ backgroundColor: c }}
                  aria-label={`color ${c}`}
                />
              ))}
            </div>
          </Field>

          {error && (
            <div className="rounded-md border border-destructive/30 bg-destructive/5 p-2 text-xs text-destructive">
              {error}
            </div>
          )}
        </form>

        <footer className="flex items-center justify-end gap-2 border-t bg-muted/20 px-6 py-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted"
            disabled={submitting}
          >
            Cancel
          </button>
          <button
            type="submit"
            onClick={submit}
            disabled={!canSubmit}
            className="rounded-md bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {submitting ? "Adding…" : "Add agent"}
          </button>
        </footer>
      </div>
    </>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-muted-foreground">
        {label}
        {required && <span className="ml-0.5 text-destructive">*</span>}
      </label>
      {children}
    </div>
  );
}
