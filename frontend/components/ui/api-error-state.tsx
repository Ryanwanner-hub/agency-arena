"use client";

import { AlertTriangle, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const MAX_AUTO_RETRIES = 5;
const RETRY_INTERVAL_MS = 6000;

/** Friendly fallback for a server-rendered page that couldn't reach the API —
 * usually a Render free-tier cold start or a redeploy restart window.
 *
 * It auto-retries on an interval: router.refresh() re-runs the page's server
 * fetch, and on success this component unmounts (clearing the timer). After a
 * handful of tries it backs off and waits for a manual retry. The raw error is
 * tucked into a <details> so the page never shows a wall of gateway HTML. */
export function ApiErrorState({
  message,
  title = "Can't reach the server",
}: {
  message: string;
  title?: string;
}) {
  const router = useRouter();
  const [autoRetries, setAutoRetries] = useState(0);
  const exhausted = autoRetries >= MAX_AUTO_RETRIES;

  useEffect(() => {
    if (exhausted) return;
    const id = setTimeout(() => {
      router.refresh();
      setAutoRetries((n) => n + 1);
    }, RETRY_INTERVAL_MS);
    return () => clearTimeout(id);
  }, [autoRetries, exhausted, router]);

  return (
    <div className="mx-auto mt-8 max-w-md rounded-xl border bg-card p-6 text-center shadow-sm">
      <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 text-amber-600">
        <AlertTriangle className="h-5 w-5" />
      </div>
      <p className="text-base font-semibold">{title}</p>
      {exhausted ? (
        <p className="mt-1 text-sm text-muted-foreground">
          Still no response. The backend may be waking from sleep — give it a
          moment, then retry.
        </p>
      ) : (
        <p className="mt-1 flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <RefreshCw className="h-3.5 w-3.5 animate-spin" />
          It may be waking up — retrying automatically…
        </p>
      )}
      <button
        type="button"
        onClick={() => {
          setAutoRetries(0);
          router.refresh();
        }}
        className="mt-4 inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
      >
        <RefreshCw className="h-4 w-4" />
        Retry now
      </button>
      <details className="mt-4 text-left">
        <summary className="cursor-pointer text-xs text-muted-foreground">
          Technical details
        </summary>
        <p className="mt-1 break-words font-mono text-xs text-muted-foreground">
          {message}
        </p>
      </details>
    </div>
  );
}
