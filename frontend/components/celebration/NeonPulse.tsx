"use client";

/** Neon flourish: radial pulse expanding from center using the active
 * theme's ``--primary`` color. Sits *behind* the tier popup so the
 * message stays readable. */
export function NeonPulse({ keyId }: { keyId: string }) {
  return (
    <div
      key={keyId}
      className="celebration-neon-pulse pointer-events-none fixed inset-0 z-[1005]"
      aria-hidden
    />
  );
}
