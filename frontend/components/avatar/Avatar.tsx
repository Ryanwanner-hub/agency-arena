import { cn } from "@/lib/utils";
import { API_BASE } from "@/lib/api";

export type AvatarSize = "xs" | "sm" | "md" | "lg" | "xl";

export type AvatarStatus =
  | "on_fire"
  | "hot_streak"
  | "closer_mode"
  | "referral_beast"
  | "needs_spark";

export type AvatarFrame =
  | "gold"
  | "silver"
  | "bronze"
  | "default"
  | "badge"
  | "streak";

export type AvatarPreset =
  | "trophy"
  | "bolt"
  | "star"
  | "rocket"
  | "diamond"
  | "flame"
  | "leaf"
  | "wave";

export const AVATAR_PRESETS: {
  key: AvatarPreset;
  emoji: string;
  gradient: string;
  label: string;
}[] = [
  { key: "trophy", emoji: "🏆", gradient: "from-amber-400 to-orange-500", label: "Trophy" },
  { key: "bolt", emoji: "⚡", gradient: "from-blue-400 to-indigo-500", label: "Bolt" },
  { key: "star", emoji: "⭐", gradient: "from-yellow-300 to-amber-500", label: "Star" },
  { key: "rocket", emoji: "🚀", gradient: "from-violet-400 to-purple-600", label: "Rocket" },
  { key: "diamond", emoji: "💎", gradient: "from-cyan-300 to-sky-500", label: "Diamond" },
  { key: "flame", emoji: "🔥", gradient: "from-orange-400 to-rose-500", label: "Flame" },
  { key: "leaf", emoji: "🌿", gradient: "from-emerald-400 to-teal-500", label: "Leaf" },
  { key: "wave", emoji: "🌊", gradient: "from-sky-400 to-blue-600", label: "Wave" },
];

const PRESET_BY_KEY = new Map(AVATAR_PRESETS.map((p) => [p.key, p]));

const SIZE_CLASSES: Record<AvatarSize, { box: string; text: string; emoji: string }> = {
  xs: { box: "h-7 w-7", text: "text-[10px]", emoji: "text-sm" },
  sm: { box: "h-9 w-9", text: "text-xs", emoji: "text-base" },
  md: { box: "h-12 w-12", text: "text-sm", emoji: "text-xl" },
  lg: { box: "h-16 w-16", text: "text-lg", emoji: "text-2xl" },
  xl: { box: "h-24 w-24", text: "text-2xl", emoji: "text-4xl" },
};

const RANK_FRAMES: Record<number, AvatarFrame> = {
  1: "gold",
  2: "silver",
  3: "bronze",
};

const FRAME_CLASSES: Record<AvatarFrame, string> = {
  gold: "ring-2 ring-amber-400 ring-offset-2 ring-offset-card",
  silver: "ring-2 ring-zinc-400 ring-offset-2 ring-offset-card",
  bronze: "ring-2 ring-orange-500 ring-offset-2 ring-offset-card",
  default: "",
  badge: "ring-2 ring-violet-400 ring-offset-2 ring-offset-card",
  streak: "ring-2 ring-rose-500 ring-offset-2 ring-offset-card avatar-frame-streak",
};

const STATUS_CLASSES: Record<AvatarStatus, string> = {
  on_fire: "avatar-on-fire",
  hot_streak: "avatar-hot-streak",
  closer_mode: "avatar-closer-mode",
  referral_beast: "avatar-referral-beast",
  needs_spark: "avatar-dimmed",
};

export const FRAME_META: Record<
  AvatarFrame,
  { label: string; description: string }
> = {
  gold: { label: "Gold", description: "Champion's frame — rank #1." },
  silver: { label: "Silver", description: "Runner-up — rank #2." },
  bronze: { label: "Bronze", description: "Podium — rank #3." },
  default: { label: "None", description: "No frame." },
  badge: { label: "Badge", description: "Earned through achievements." },
  streak: { label: "Streak", description: "Hot streak holder." },
};

export const STATUS_META: Record<
  AvatarStatus,
  { label: string; description: string }
> = {
  on_fire: { label: "On Fire", description: "Animated flame glow." },
  hot_streak: { label: "Hot Streak", description: "Pulsing ring." },
  closer_mode: { label: "Closer Mode", description: "Sharp blue highlight." },
  referral_beast: { label: "Referral Beast", description: "Animated green glow." },
  needs_spark: { label: "Needs Spark", description: "Dimmed and desaturated." },
};

function initials(name: string): string {
  return name
    .split(/\s+/)
    .map((s) => s[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function resolveUrl(url: string): string {
  if (url.startsWith("http") || url.startsWith("data:") || url.startsWith("blob:")) {
    return url;
  }
  return `${API_BASE}${url}`;
}

export type AvatarProps = {
  name: string;
  avatarUrl?: string | null;
  avatarPreset?: string | null;
  /** Hex (or any CSS color). Overrides preset gradient and the
   * primary-colored initials background. */
  backgroundColor?: string | null;
  size?: AvatarSize;
  /** Explicit frame override. When unset, falls back to ``rank``. */
  frame?: AvatarFrame | null;
  /** Rank-based frame fallback (1=gold, 2=silver, 3=bronze). */
  rank?: number;
  status?: AvatarStatus | null;
  className?: string;
};

export function Avatar({
  name,
  avatarUrl,
  avatarPreset,
  backgroundColor,
  size = "md",
  frame,
  rank,
  status,
  className,
}: AvatarProps) {
  const sz = SIZE_CLASSES[size];

  // Frame priority: explicit > rank fallback. ``frame: "default"`` is a
  // deliberate "no frame" choice and overrides the rank fallback.
  const resolvedFrame: AvatarFrame | null =
    frame !== null && frame !== undefined
      ? frame
      : rank !== undefined && RANK_FRAMES[rank]
        ? RANK_FRAMES[rank]
        : null;
  const frameClass = resolvedFrame ? FRAME_CLASSES[resolvedFrame] : undefined;
  const statusClass = status ? STATUS_CLASSES[status] : undefined;

  const wrapper = cn(
    "relative inline-flex items-center justify-center rounded-full overflow-hidden font-semibold select-none",
    sz.box,
    frameClass,
    statusClass,
    className,
  );

  if (avatarUrl) {
    return (
      <span className={wrapper} aria-label={name}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={resolveUrl(avatarUrl)}
          alt={name}
          className="h-full w-full object-cover"
          draggable={false}
        />
      </span>
    );
  }

  if (avatarPreset && PRESET_BY_KEY.has(avatarPreset as AvatarPreset)) {
    const preset = PRESET_BY_KEY.get(avatarPreset as AvatarPreset)!;
    const useSolid = !!backgroundColor;
    return (
      <span
        className={cn(
          wrapper,
          "text-white",
          useSolid ? null : "bg-gradient-to-br",
          useSolid ? null : preset.gradient,
        )}
        style={useSolid ? { backgroundColor: backgroundColor! } : undefined}
        aria-label={`${name} avatar`}
      >
        <span className={sz.emoji} aria-hidden>
          {preset.emoji}
        </span>
      </span>
    );
  }

  // No image, no preset — solid color or fallback to primary.
  return (
    <span
      className={cn(
        wrapper,
        "text-white",
        backgroundColor ? null : "bg-primary text-primary-foreground",
        sz.text,
      )}
      style={backgroundColor ? { backgroundColor } : undefined}
      aria-label={name}
    >
      {initials(name) || "?"}
    </span>
  );
}
