"use client";

import { X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { cn } from "@/lib/utils";
import {
  api,
  type Contest,
  type ContestMetric,
  type ContestType,
} from "@/lib/api";

const METRICS: { value: ContestMetric; label: string; description: string }[] =
  [
    {
      value: "quotes",
      label: "Most quotes",
      description: "Count of completed quotes in the window.",
    },
    {
      value: "policies",
      label: "Most policies",
      description: "Policies bound during the window.",
    },
    {
      value: "referrals",
      label: "Most referrals",
      description: "Referrals received in the window.",
    },
    {
      value: "improved",
      label: "Most improved",
      description: "Biggest point gain vs the prior equal-length window.",
    },
  ];

function todayUtcISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function thisWeekDates(): { start: string; end: string } {
  const now = new Date();
  // UTC Monday
  const dayOfWeek = (now.getUTCDay() + 6) % 7; // Mon=0..Sun=6
  const monday = new Date(now);
  monday.setUTCDate(now.getUTCDate() - dayOfWeek);
  const sunday = new Date(monday);
  sunday.setUTCDate(monday.getUTCDate() + 6);
  return {
    start: monday.toISOString().slice(0, 10),
    end: sunday.toISOString().slice(0, 10),
  };
}

export function CreateContestModal({
  onCreated,
  onClose,
}: {
  onCreated: (contest: Contest) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState("");
  const [type, setType] = useState<ContestType>("weekly");
  const [metric, setMetric] = useState<ContestMetric>("policies");
  const [autoRenew, setAutoRenew] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dates = useMemo(() => {
    if (type === "daily") {
      const today = todayUtcISO();
      return { start: today, end: today };
    }
    return thisWeekDates();
  }, [type]);

  const [startDate, setStartDate] = useState(dates.start);
  const [endDate, setEndDate] = useState(dates.end);

  // Reset dates when type changes
  useEffect(() => {
    setStartDate(dates.start);
    setEndDate(dates.end);
  }, [dates.start, dates.end]);

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
      const created = await api<Contest>("/contests", {
        method: "POST",
        body: JSON.stringify({
          name: name.trim(),
          type,
          metric,
          start_date: startDate,
          end_date: endDate,
          auto_renew: autoRenew,
        }),
      });
      onCreated(created);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create");
      setSubmitting(false);
    }
  }

  const canSubmit =
    name.trim().length > 0 && startDate <= endDate && !submitting;

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/40"
        onClick={onClose}
        aria-hidden
      />
      <div
        className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl border bg-card shadow-2xl"
        role="dialog"
        aria-label="Create contest"
      >
        <header className="flex items-start justify-between border-b px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold">New contest</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Pick a metric and a window — standings update automatically.
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
          <Field label="Name">
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. April Sales Sprint"
              className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              required
            />
          </Field>

          <Field label="Cadence">
            <div className="flex gap-2">
              {(["daily", "weekly"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t)}
                  className={cn(
                    "flex-1 rounded-md border px-3 py-2 text-sm font-medium capitalize",
                    type === t
                      ? "border-primary bg-primary/5 text-primary"
                      : "text-muted-foreground hover:bg-muted",
                  )}
                >
                  {t}
                </button>
              ))}
            </div>
          </Field>

          <Field label="Metric">
            <div className="grid grid-cols-2 gap-2">
              {METRICS.map((m) => (
                <button
                  key={m.value}
                  type="button"
                  onClick={() => setMetric(m.value)}
                  className={cn(
                    "rounded-md border px-3 py-2 text-left",
                    metric === m.value
                      ? "border-primary bg-primary/5"
                      : "hover:bg-muted",
                  )}
                >
                  <p className="text-sm font-medium">{m.label}</p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    {m.description}
                  </p>
                </button>
              ))}
            </div>
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Start date">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </Field>
            <Field label="End date">
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </Field>
          </div>

          <label className="flex items-start gap-2 rounded-md border bg-muted/30 p-3">
            <input
              type="checkbox"
              checked={autoRenew}
              onChange={(e) => setAutoRenew(e.target.checked)}
              className="mt-0.5 h-4 w-4 cursor-pointer accent-primary"
            />
            <div className="text-sm">
              <p className="font-medium">Auto-renew</p>
              <p className="text-xs text-muted-foreground">
                When this contest ends, automatically start a new one for the
                next {type === "daily" ? "day" : "week"}.
              </p>
            </div>
          </label>

          {error && (
            <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
              {error}
            </div>
          )}

          <div className="flex items-center justify-end gap-2 border-t pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border bg-background px-4 py-2 text-sm font-medium hover:bg-muted"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!canSubmit}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? "Creating…" : "Create contest"}
            </button>
          </div>
        </form>
      </div>
    </>
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
      <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      {children}
    </label>
  );
}
