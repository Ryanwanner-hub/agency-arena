"use client";

/** Sports-style flourish: trophy emoji drops from above, bounces, and
 * fades. Pure CSS — no canvas, no library. Mounted by the celebration
 * overlay only when the active theme calls for ``trophy_drop``. */
export function TrophyDrop({ keyId }: { keyId: string }) {
  return (
    <div
      key={keyId}
      className="celebration-trophy-drop pointer-events-none fixed left-1/2 top-0 z-[1015] -translate-x-1/2"
      aria-hidden
    >
      <span className="block text-7xl drop-shadow-[0_8px_24px_rgba(0,0,0,0.4)]">
        🏆
      </span>
    </div>
  );
}
