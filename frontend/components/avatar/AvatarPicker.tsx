"use client";

import { Upload, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { emitAgentUpdated } from "@/lib/agent-events";
import { cn } from "@/lib/utils";
import { API_BASE, type Agent } from "@/lib/api";

import { AVATAR_PRESETS, Avatar, type AvatarPreset } from "./Avatar";

type Tab = "presets" | "upload";

const MAX_BYTES = 2 * 1024 * 1024;
const ALLOWED_MIME = ["image/png", "image/jpeg", "image/webp"];

export function AvatarPicker({
  agent,
  onClose,
  onSaved,
}: {
  agent: Agent;
  onClose: () => void;
  onSaved: (updated: Agent) => void;
}) {
  const [tab, setTab] = useState<Tab>(agent.avatar_url ? "upload" : "presets");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Local preview state — applied optimistically inside the picker before save.
  const [pendingPreset, setPendingPreset] = useState<AvatarPreset | null>(
    (agent.avatar_preset as AvatarPreset | null) ?? null,
  );

  // Close on Esc
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function savePreset(key: AvatarPreset) {
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/agents/${agent.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ avatar_preset: key }),
      });
      if (!res.ok) throw new Error(`API ${res.status}: ${await res.text()}`);
      const updated: Agent = await res.json();
      emitAgentUpdated(updated);
      onSaved(updated);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save preset");
      setSubmitting(false);
    }
  }

  return (
    <>
      <div
        className="fixed inset-0 z-[60] bg-black/40"
        onClick={onClose}
        aria-hidden
      />
      <div
        className="fixed left-1/2 top-1/2 z-[70] w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl border bg-card shadow-2xl"
        role="dialog"
        aria-label="Choose avatar"
      >
        <header className="flex items-start justify-between border-b px-6 py-4">
          <div className="flex items-center gap-3">
            <Avatar
              name={agent.name}
              avatarUrl={agent.avatar_url}
              avatarPreset={pendingPreset ?? agent.avatar_preset}
              size="md"
            />
            <div>
              <h2 className="text-base font-semibold">Customize avatar</h2>
              <p className="text-xs text-muted-foreground">{agent.name}</p>
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

        <div className="border-b px-3 pt-3">
          <div className="flex gap-1 rounded-md bg-muted p-1">
            {(["presets", "upload"] as Tab[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={cn(
                  "flex-1 rounded-sm px-3 py-1.5 text-xs font-medium capitalize transition-colors",
                  tab === t
                    ? "bg-card shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <div className="px-6 py-5">
          {tab === "presets" && (
            <PresetsTab
              currentPreset={pendingPreset ?? (agent.avatar_preset as AvatarPreset | null)}
              currentName={agent.name}
              disabled={submitting}
              onPick={(key) => {
                setPendingPreset(key);
                savePreset(key);
              }}
            />
          )}
          {tab === "upload" && (
            <UploadTab
              agent={agent}
              onUploaded={onSaved}
              setError={setError}
            />
          )}

          {error && (
            <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
              {error}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function PresetsTab({
  currentPreset,
  currentName,
  disabled,
  onPick,
}: {
  currentPreset: AvatarPreset | null;
  currentName: string;
  disabled: boolean;
  onPick: (key: AvatarPreset) => void;
}) {
  return (
    <div className="grid grid-cols-4 gap-3">
      {AVATAR_PRESETS.map((p) => {
        const selected = currentPreset === p.key;
        return (
          <button
            key={p.key}
            type="button"
            disabled={disabled}
            onClick={() => onPick(p.key)}
            className={cn(
              "flex flex-col items-center gap-1.5 rounded-lg border p-3 transition-all hover:bg-muted disabled:opacity-50",
              selected && "border-primary bg-primary/5 ring-1 ring-primary",
            )}
          >
            <Avatar name={currentName} avatarPreset={p.key} size="md" />
            <span className="text-[11px] font-medium">{p.label}</span>
          </button>
        );
      })}
    </div>
  );
}

function UploadTab({
  agent,
  onUploaded,
  setError,
}: {
  agent: Agent;
  onUploaded: (updated: Agent) => void;
  setError: (msg: string | null) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function handleFile(file: File) {
    setError(null);
    if (!ALLOWED_MIME.includes(file.type)) {
      setError(`Unsupported type ${file.type}; use PNG, JPEG, or WebP.`);
      return;
    }
    if (file.size > MAX_BYTES) {
      setError(`File too large (${(file.size / 1024 / 1024).toFixed(1)} MB); max 2 MB.`);
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
      const updated: Agent = await res.json();
      emitAgentUpdated(updated);
      onUploaded(updated);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
      setUploading(false);
    }
  }

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
        className="flex w-full flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed bg-muted/30 px-6 py-10 text-center transition-colors hover:bg-muted disabled:opacity-50"
      >
        <Upload className="h-6 w-6 text-muted-foreground" />
        <p className="text-sm font-medium">
          {uploading ? "Uploading…" : "Choose an image"}
        </p>
        <p className="text-xs text-muted-foreground">
          PNG, JPEG, or WebP · up to 2 MB
        </p>
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
      />
      {agent.avatar_url && (
        <p className="text-center text-xs text-muted-foreground">
          A new upload replaces your current image.
        </p>
      )}
    </div>
  );
}
