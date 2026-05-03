"use client";

import { Avatar, type AvatarFrame, type AvatarStatus } from "./Avatar";

/**
 * Live preview that renders an Avatar with a draft set of customizations.
 * Drives off plain values (not the Agent record) so unsaved form state is
 * reflected immediately as the user picks options.
 */
export type AvatarPreviewProps = {
  name: string;
  avatarUrl?: string | null;
  avatarPreset?: string | null;
  avatarColor?: string | null;
  avatarFrame?: AvatarFrame | null;
  statusEffect?: AvatarStatus | null;
  /** Caption beneath the avatar, e.g. "Live preview". Optional. */
  caption?: string;
};

export function AvatarPreview({
  name,
  avatarUrl,
  avatarPreset,
  avatarColor,
  avatarFrame,
  statusEffect,
  caption = "Live preview",
}: AvatarPreviewProps) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="flex items-center justify-center rounded-2xl border bg-muted/30 p-6">
        <Avatar
          name={name}
          avatarUrl={avatarUrl}
          avatarPreset={avatarPreset}
          backgroundColor={avatarColor}
          frame={avatarFrame}
          status={statusEffect}
          size="xl"
        />
      </div>
      {caption && (
        <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
          {caption}
        </p>
      )}
    </div>
  );
}
