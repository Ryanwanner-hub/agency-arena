"use client";

import { X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { cn } from "@/lib/utils";
import {
  api,
  type Contest,
  type ContestListItem,
  type ContestMetric,
  type ContestType,
} from "@/lib/api";
import { localDateKey } from "@/lib/dates";

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
  return localDateKey();
}

function thisWeekDates(): { start: string; end: string } {
  const now = new Date();
  const dayOfWeek = (now.getDay() + 6) % 7; // Mon=0..Sun=6
  const monday = new Date(now);
  monday.setDate(now.getDate() - dayOfWeek);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return {
    start: localDateKey(monday),
    end: localDateKey(sunday),
  };
}

function thisMonthDates(): { start: string; end: string } {
  const now = new Date();
  const first = new Date(now.getFullYear(), now.getMonth(), 1);
  const last = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return {
    start: localDateKey(first),
    end: localDateKey(last),
  };
}

function rangeForType(t: ContestType): { start: string; end: string } {
  if (t === "daily") {
    const today = todayUtcISO();
    return { start: today, end: today };
  }
  if (t === "monthly") return thisMonthDates();
  return thisWeekDates();
}

export function CreateContestModal({
  editing,
  onCreated,
  onClose,
}: {
  /** When set, the modal switches to edit mode: prefilled fields, button
   * says "Save changes", PATCH instead of POST. Falsy = create. */
  editing?: ContestListItem | null;
  onCreated: (contest: Contest) => void;
  onClose: () => void;
}) {
  const isEdit = !!editing;
  const [name, setName] = useState(editing?.name ?? "");
  const [type, setType] = useState<ContestType>(
    (editing?.type as ContestType) ?? "weekly",
  );
  const [metric, setMetric] = useState<ContestMetric>(
    (editing?.metric as ContestMetric) ?? "policies",
  );
  const [autoRenew, setAutoRenew] = useState(editing?.auto_renew ?? false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Track whether the user has manually changed the dates so we don't
  // overwrite them when toggling cadence. In edit mode we always start
  // with the saved dates.
  const [touchedDates, setTouchedDates] = useState(isEdit);

  const initialRange = useMemo(
    () =>
      isEdit
        ? { start: editing.start_date, end: editing.end_date }
        : rangeForType(type),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const [startDate, setStartDate] = useState(initialRange.start);
  const [endDate, setEndDate] = useState(initialRange.end);

  // Snap dates to the cadence default when the user picks a different
  // type — but only if they haven't manually edited the inputs yet.
  useEffect(() => {
    if (touchedDates) return;
    const r = rangeForType(type);
    setStartDate(r.start);
    setEndDate(r.end);
  }, [type, touchedDates]);

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
    const body = {
      name: name.trim(),
      type,
      metric,
      start_date: startDate,
      end_date: endDate,
      auto_renew: autoRenew,
    };
    try {
      const result = isEdit
        ? await api<Contest>(`/contests/${editing!.id}`, {
            method: "PATCH",
            body: JSON.stringify(body),
          })
        : await api<Contest>("/contests", {
            method: "POST",
            body: JSON.stringify(body),
          });
      onCreated(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save");
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
            <h2 className="text-lg font-semibold">
              {isEdit ? "Edit contest" : "New contest"}
            </h2>
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
              {(["daily", "weekly", "monthly"] as const).map((t) => (
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
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setTouchedDates(true);
                }}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </Field>
            <Field label="End date">
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setTouchedDates(true);
                }}
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
                next{" "}
                {type === "daily"
                  ? "day"
                  : type === "monthly"
                    ? "month"
                    : type === "custom"
                      ? "window"
                      : "week"}
                .
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
              {submitting
                ? isEdit
                  ? "Saving…"
                  : "Creating…"
                : isEdit
                  ? "Save changes"
                  : "Create contest"}
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
