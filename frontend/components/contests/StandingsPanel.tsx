"use client";

import { Pencil, Trash2, Trophy, X } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { api, type ContestStandings } from "@/lib/api";

const METRIC_LABEL: Record<string, string> = {
  quotes: "quotes",
  policies: "policies",
  referrals: "referrals",
  bundles: "bundles",
  reviews: "5-star reviews",
  points: "points",
  improved: "point change",
};

const STATUS_PILL: Record<string, string> = {
  active: "bg-emerald-500/10 text-emerald-500 ring-1 ring-emerald-500/25",
  pending: "bg-blue-500/10 text-blue-500 ring-1 ring-blue-500/25",
  ended: "bg-muted text-muted-foreground ring-1 ring-border",
};

const RANK_BADGE: Record<number, string> = {
  1: "bg-gradient-to-br from-amber-300 to-amber-500 text-white",
  2: "bg-gradient-to-br from-slate-300 to-slate-400 text-white",
  3: "bg-gradient-to-br from-orange-300 to-orange-500 text-white",
};

function formatValue(value: number, metric: string): string {
  if (metric === "improved") {
    const sign = value > 0 ? "+" : value < 0 ? "" : "";
    return `${sign}${Math.round(value)}`;
  }
  return String(Math.round(value));
}

export function StandingsPanel({
  contestId,
  onClose,
  onEdit,
  onDeleted,
}: {
  contestId: number | null;
  onClose: () => void;
  /** Called when the manager clicks the Edit button. The parent opens a
   * dual-mode modal preloaded with the contest. */
  onEdit?: (contestId: number) => void;
  /** Called after a successful DELETE so the parent can drop it from the
   * list and close the panel. */
  onDeleted?: (contestId: number) => void;
}) {
  const [data, setData] = useState<ContestStandings | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Initial fetch + live poll while the panel is open. New activity
  // logged elsewhere (manually or via the API) shows up without
  // closing/reopening the panel.
  useEffect(() => {
    if (contestId === null) {
      setData(null);
      setError(null);
      return;
    }
    let cancelled = false;
    let inFlight = false;
    let firstLoad = true;
    setLoading(true);
    setError(null);

    const fetchOnce = async () => {
      if (inFlight) return;
      if (typeof document !== "undefined" && document.hidden) return;
      inFlight = true;
      try {
        const d = await api<ContestStandings>(
          `/contests/${contestId}/standings`,
        );
        if (cancelled) return;
        setData(d);
        if (firstLoad) {
          setLoading(false);
          firstLoad = false;
        }
      } catch (e) {
        if (cancelled) return;
        if (firstLoad) {
          setError(e instanceof Error ? e.message : "Failed to load");
          setLoading(false);
          firstLoad = false;
        }
        // Subsequent poll failures are silent — keep showing last
        // good data and let the next tick retry.
      } finally {
        inFlight = false;
      }
    };

    void fetchOnce();
    const id = setInterval(fetchOnce, 10_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [contestId]);

  useEffect(() => {
    if (contestId === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [contestId, onClose]);

  if (contestId === null) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />
      <aside
        className="fixed right-0 top-0 z-50 h-full w-full max-w-md overflow-y-auto border-l bg-card shadow-2xl"
        role="dialog"
        aria-label="Contest standings"
      >
        <header className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b bg-card px-6 py-4">
          <div className="min-w-0 flex-1">
            {data ? (
              <>
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  {data.contest.type} · {METRIC_LABEL[data.contest.metric] ?? data.contest.metric}
                </p>
                <h2 className="mt-0.5 truncate text-lg font-semibold">
                  {data.contest.name}
                </h2>
                <span
                  className={cn(
                    "mt-1 inline-block rounded-full px-2 py-0.5 text-[11px] font-medium",
                    STATUS_PILL[data.status],
                  )}
                >
                  {data.status}
                </span>
              </>
            ) : (
              <h2 className="text-lg font-semibold">Standings</h2>
            )}
          </div>
          <div className="flex items-center gap-1">
            {data && onEdit && (
              <button
                type="button"
                onClick={() => onEdit(data.contest.id)}
                className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                aria-label="Edit contest"
                title="Edit contest"
              >
                <Pencil className="h-4 w-4" />
              </button>
            )}
            {data && onDeleted && (
              <button
                type="button"
                onClick={() => setConfirmingDelete(true)}
                className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                aria-label="Delete contest"
                title="Delete contest"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
            <button
              onClick={onClose}
              className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </header>

        {confirmingDelete && data && (
          <div className="border-b bg-destructive/5 px-6 py-4">
            <p className="text-sm font-medium">
              Delete &ldquo;{data.contest.name}&rdquo;?
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              This removes the contest and its standings. Logged activities
              are unaffected.
            </p>
            <div className="mt-3 flex items-center gap-2">
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={async () => {
                  setDeleting(true);
                  try {
                    await api(`/contests/${data.contest.id}`, {
                      method: "DELETE",
                    });
                    onDeleted?.(data.contest.id);
                  } catch (e) {
                    setError(
                      e instanceof Error ? e.message : "Failed to delete",
                    );
                    setDeleting(false);
                    setConfirmingDelete(false);
                  }
                }}
                disabled={deleting}
              >
                {deleting ? "Deleting…" : "Yes, delete"}
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setConfirmingDelete(false)}
                disabled={deleting}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        <div className="px-6 py-5">
          {loading && (
            <ol className="space-y-2" aria-label="Loading standings">
              {Array.from({ length: 5 }).map((_, i) => (
                <li
                  key={i}
                  className="flex items-center gap-3 rounded-md border bg-background px-3 py-2.5"
                >
                  <div className="h-8 w-8 shrink-0 animate-pulse rounded-full bg-muted/70" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3.5 w-32 animate-pulse rounded bg-muted/70" />
                    <div className="h-2.5 w-20 animate-pulse rounded bg-muted/50" />
                  </div>
                  <div className="h-5 w-10 animate-pulse rounded bg-muted/70" />
                </li>
              ))}
            </ol>
          )}
          {error && (
            <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
              {error}
            </div>
          )}
          {data && data.entries.length === 0 && (
            <div className="rounded-lg border border-dashed bg-muted/20 px-6 py-10 text-center">
              <Trophy className="mx-auto mb-2 h-7 w-7 text-muted-foreground/40" />
              <p className="text-sm font-medium">No standings yet</p>
              <p className="mt-1 text-xs text-muted-foreground">
                The contest hasn't started or no qualifying activity has been
                logged.
              </p>
            </div>
          )}
          {data &&
            data.entries.length > 0 &&
            data.contest.metric !== "improved" &&
            data.entries.every((e) => e.value === 0) && (
              <div className="rounded-lg border border-dashed bg-muted/20 px-6 py-10 text-center">
                <Trophy className="mx-auto mb-2 h-7 w-7 text-muted-foreground/40" />
                <p className="text-sm font-medium">
                  No {METRIC_LABEL[data.contest.metric] ?? data.contest.metric}{" "}
                  logged yet
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  The race starts as soon as someone logs the first one.
                </p>
              </div>
            )}
          {data &&
            data.entries.length > 0 &&
            !(
              data.contest.metric !== "improved" &&
              data.entries.every((e) => e.value === 0)
            ) && (
            <ol className="space-y-2">
              {data.entries.map((e) => {
                const isImproved = data.contest.metric === "improved";
                return (
                  <li
                    key={e.agent_id}
                    className={cn(
                      "flex items-center gap-3 rounded-md border bg-background px-3 py-2.5",
                      e.rank === 1 && "ring-1 ring-amber-500/30",
                    )}
                  >
                    <span
                      className={cn(
                        "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full font-mono text-xs font-bold",
                        RANK_BADGE[e.rank] ??
                          "border bg-muted text-muted-foreground",
                      )}
                    >
                      {e.rank}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{e.name}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {e.role.replace(/_/g, " ")}
                        {isImproved &&
                          e.previous_value !== null &&
                          e.current_value !== null && (
                            <>
                              {" · "}
                              {Math.round(e.previous_value)} →{" "}
                              {Math.round(e.current_value)}
                            </>
                          )}
                      </p>
                    </div>
                    <p
                      className={cn(
                        "stat-number shrink-0 text-base font-bold",
                        isImproved && e.value > 0 && "text-emerald-500",
                        isImproved && e.value < 0 && "text-rose-500",
                      )}
                    >
                      {formatValue(e.value, data.contest.metric)}
                    </p>
                  </li>
                );
              })}
            </ol>
          )}
        </div>

        {data && data.contest.metric === "improved" && data.entries.length > 0 && (
          <p className="px-6 pb-6 text-xs text-muted-foreground">
            <Trophy className="mr-1 inline h-3 w-3 text-amber-500" />
            Comparing this period to the previous period of equal length.
          </p>
        )}
      </aside>
    </>
  );
}
