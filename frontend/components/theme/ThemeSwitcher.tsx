"use client";

import { Check, Palette } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import type { ThemeConfig } from "@/lib/themes";
import { cn } from "@/lib/utils";

import { useTheme } from "./ThemeProvider";

export function ThemeSwitcher() {
  const { theme, available, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onMouseDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onMouseDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Theme"
        aria-expanded={open}
        className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <Palette className="h-5 w-5" />
      </button>
      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-72 rounded-lg border bg-card p-2 shadow-xl">
          <p className="px-2 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Theme
          </p>
          <div className="space-y-0.5">
            {available.map((t) => {
              const active = theme === t.key;
              return (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => {
                    setTheme(t.key);
                    setOpen(false);
                  }}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-md px-2 py-2 text-left transition-colors",
                    active ? "bg-muted" : "hover:bg-muted/60",
                  )}
                >
                  <ThemePreview swatches={t.swatches} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{t.label}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {t.description}
                    </p>
                  </div>
                  {active && <Check className="h-4 w-4 text-primary" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function ThemePreview({ swatches }: { swatches: ThemeConfig["swatches"] }) {
  const [bg, primary, accent] = swatches;
  return (
    <span
      className="flex h-9 w-12 shrink-0 overflow-hidden rounded-md ring-1 ring-border"
      aria-hidden
    >
      <span className="h-full flex-1" style={{ background: bg }} />
      <span className="h-full flex-1" style={{ background: primary }} />
      <span className="h-full flex-1" style={{ background: accent }} />
    </span>
  );
}
