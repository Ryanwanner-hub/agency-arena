"use client";

import { DollarSign, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { api, displayName, type Activity, type Agent } from "@/lib/api";
import { ACTIVITY_LABEL, ACTIVITY_TYPES } from "@/lib/manager-settings";
import { cn } from "@/lib/utils";

/** Activity types that represent real $ closing — the modal surfaces a
 * premium field for these. The backend accepts ``premium`` on any
 * activity, but only these are *worth* tagging with a dollar amount. */
const PREMIUM_TYPES = new Set<string>([
  "policy_bound",
  "multi_policy_bonus",
  "cross_sell_sold",
  "referral_converted",
]);

/** Activity types exposed in the manual log UI. Quotes, follow-ups,
 * speed-to-contact, and cross-sell attempts are intentionally hidden —
 * those flow in via CRM integrations rather than being hand-logged. The
 * backend still accepts all activity types; this list only gates the
 * picker. */
const TYPE_GROUPS: { label: string; types: string[] }[] = [
  {
    label: "Sales",
    types: ["policy_bound", "multi_policy_bonus", "cross_sell_sold"],
  },
  {
    label: "Referrals",
    types: ["referral_converted", "referral_received"],
  },
  {
    label: "Reviews",
    types: ["review_received", "review_requested"],
  },
];

const SOURCE_PRESETS = ["phone", "walk_in", "online", "referral", "email"];

export function LogActivityModal({
  agents,
  defaultAgentId,
  onClose,
  onLogged,
}: {
  agents: Agent[];
  /** Optional preselected agent — useful if the modal is opened from an
   * agent tile in the future. */
  defaultAgentId?: number | null;
  onClose: () => void;
  onLogged: (activity: Activity) => void;
}) {
  const initialAgent = useMemo(() => {
    if (defaultAgentId !== undefined && defaultAgentId !== null) {
      return defaultAgentId;
    }
    return agents[0]?.id ?? null;
  }, [agents, defaultAgentId]);

  const [agentId, setAgentId] = useState<number | null>(initialAgent);
  const [activityType, setActivityType] = useState<string>("policy_bound");
  const [premium, setPremium] = useState<string>("");
  const [source, setSource] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const showsPremium = PREMIUM_TYPES.has(activityType);

  useEffect(() => {
    if (!showsPremium) setPremium("");
  }, [showsPremium]);

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
    if (agentId === null) {
      setError("Pick an agent first.");
      return;
    }
    setSubmitting(true);
    setError(null);
    const body: Record<string, unknown> = {
      agent_id: agentId,
      activity_type: activityType,
    };
    if (showsPremium && premium.trim()) {
      const n = Number(premium);
      if (Number.isFinite(n) && n >= 0) body.premium = n;
    }
    if (source.trim()) body.source = source.trim();
    try {
      const created = await api<Activity>("/activity", {
        method: "POST",
        body: JSON.stringify(body),
      });
      onLogged(created);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to log activity");
      setSubmitting(false);
    }
  }

  const canSubmit = agentId !== null && !submitting;

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/40"
        onClick={onClose}
        aria-hidden
      />
      <div
        className="fixed left-1/2 top-1/2 z-50 max-h-[90vh] w-full max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-xl border bg-card shadow-2xl"
        role="dialog"
        aria-label="Log activity"
      >
        <header className="flex items-start justify-between border-b px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold">Log activity</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Logging an event awards points instantly and ripples to the
              leaderboard, contests, and recent wins.
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

        <form onSubmit={submit} className="space-y-5 px-6 py-5">
          <Field label="Agent" required>
            {agents.length === 0 ? (
              <p className="rounded-md border border-dashed bg-muted/20 px-3 py-3 text-xs text-muted-foreground">
                No agents in the office yet — add one from the Agents page
                first.
              </p>
            ) : (
              <select
                value={agentId ?? ""}
                onChange={(e) =>
                  setAgentId(e.target.value ? Number(e.target.value) : null)
                }
                className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              >
                {agents.map((a) => (
                  <option key={a.id} value={a.id}>
                    {displayName(a)}
                  </option>
                ))}
              </select>
            )}
          </Field>

          <Field label="What happened?" required>
            <div className="space-y-3">
              {TYPE_GROUPS.map((g) => (
                <div key={g.label}>
                  <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {g.label}
                  </p>
                  <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                    {g.types.map((t) => {
                      const active = activityType === t;
                      return (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setActivityType(t)}
                          className={cn(
                            "rounded-md border px-3 py-2 text-left text-sm transition-colors",
                            active
                              ? "border-primary bg-primary/5 text-primary"
                              : "hover:bg-muted",
                          )}
                        >
                          {ACTIVITY_LABEL[t as keyof typeof ACTIVITY_LABEL] ??
                            t}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </Field>

          {showsPremium && (
            <Field label="Premium ($) — optional">
              <div className="relative">
                <DollarSign className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="number"
                  min={0}
                  step={1}
                  value={premium}
                  onChange={(e) => setPremium(e.target.value)}
                  placeholder="2500"
                  className="w-full rounded-md border bg-background py-2 pl-8 pr-3 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </Field>
          )}

          <Field label="Source — optional">
            <div className="space-y-2">
              <input
                value={source}
                onChange={(e) => setSource(e.target.value)}
                placeholder="phone, walk-in, web form…"
                className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <div className="flex flex-wrap gap-1.5">
                {SOURCE_PRESETS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSource(s)}
                    className={cn(
                      "rounded-full border px-2.5 py-0.5 text-[11px] transition-colors",
                      source === s
                        ? "border-primary bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-muted",
                    )}
                  >
                    {s.replace(/_/g, " ")}
                  </button>
                ))}
              </div>
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
            disabled={submitting}
            className="rounded-md border bg-card px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted"
          >
            Cancel
          </button>
          <button
            type="submit"
            onClick={submit}
            disabled={!canSubmit || agents.length === 0}
            className="rounded-md bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {submitting ? "Logging…" : "Log activity"}
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
      <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
        {label}
        {required && <span className="ml-0.5 text-destructive">*</span>}
      </label>
      {children}
    </div>
  );
}

// Re-export so the modal stays self-contained for typed imports.
export { ACTIVITY_TYPES };
