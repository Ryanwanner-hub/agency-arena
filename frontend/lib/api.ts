export const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8001";

// Render free web services sleep after ~15 min idle and briefly 502 during
// redeploys. Those gateway statuses (and outright network failures) are
// transient, so we retry with backoff instead of surfacing the raw error —
// which, for a sleeping backend, is a full HTML "Bad Gateway" page.
const TRANSIENT_STATUS = new Set([502, 503, 504]);
const MAX_ATTEMPTS = 3;
const BACKOFF_MS = [500, 1500];

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Build a short, human-readable message from a failed response — never the
 * raw body, which for a gateway error is an entire HTML document. */
async function describeError(res: Response): Promise<string> {
  if (TRANSIENT_STATUS.has(res.status)) {
    return `The server is starting up (${res.status}). Give it a moment and try again.`;
  }
  let detail = "";
  try {
    const contentType = res.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
      const data = (await res.json()) as { detail?: unknown };
      detail =
        typeof data?.detail === "string"
          ? data.detail
          : data?.detail
            ? JSON.stringify(data.detail)
            : "";
    } else {
      const text = (await res.text()).trim();
      // Only surface short plain-text bodies; skip HTML error pages.
      if (text && !text.startsWith("<")) detail = text.slice(0, 200);
    }
  } catch {
    // fall through to the status line
  }
  return `API ${res.status}: ${detail || res.statusText || "request failed"}`;
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const method = (init?.method ?? "GET").toUpperCase();
  // POSTs aren't idempotent (e.g. logging an activity double-counts), so we
  // never replay them. Reads and idempotent writes (PATCH/DELETE) are safe.
  const retrySafe = method !== "POST";

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const lastAttempt = attempt === MAX_ATTEMPTS - 1;
    let res: Response;
    try {
      res = await fetch(`${API_BASE}${path}`, {
        ...init,
        headers: {
          "Content-Type": "application/json",
          ...(init?.headers ?? {}),
        },
        cache: "no-store",
      });
    } catch {
      // Network error — backend unreachable, often a cold start mid-wake.
      if (retrySafe && !lastAttempt) {
        await sleep(BACKOFF_MS[attempt] ?? 1500);
        continue;
      }
      throw new Error(
        "Can't reach the server — it may be waking up. Please try again in a moment.",
      );
    }

    if (res.ok) {
      // 204 No Content (e.g. DELETE) has an empty body — don't try to parse.
      if (res.status === 204) return undefined as T;
      return (await res.json()) as T;
    }

    // Retry transient gateway statuses; fail fast on real 4xx/5xx.
    if (TRANSIENT_STATUS.has(res.status) && retrySafe && !lastAttempt) {
      await sleep(BACKOFF_MS[attempt] ?? 1500);
      continue;
    }
    throw new Error(await describeError(res));
  }
  // The loop always returns or throws above; this satisfies the type checker.
  throw new Error("Request failed");
}

export type Agent = {
  id: number;
  name: string;
  role: string;
  avatar_url: string | null;
  avatar_preset: string | null;
  avatar_color: string | null;
  avatar_frame: string | null;
  status_effect: string | null;
  nickname: string | null;
  title: string | null;
  active: boolean;
  weekly_premium_goal: number;
  start_date: string;
  created_at: string;
  updated_at: string;
};

/** Display name with nickname taking precedence over the legal name. */
export function displayName(agent: {
  name: string;
  nickname?: string | null;
}): string {
  return (agent.nickname && agent.nickname.trim()) || agent.name;
}

export type Activity = {
  id: number;
  agent_id: number;
  activity_type: string;
  premium: number | null;
  source: string | null;
  points: number;
  created_at: string;
};

export type ActivityFeedItem = Activity & {
  agent: Agent;
};

export type SummaryAgentRow = {
  agent_id: number;
  name: string;
  nickname: string | null;
  role: string;
  total_points: number;
  policies: number;
  bundles: number;
  referrals: number;
  reviews: number;
  premium_total: number;
  close_rate: number;
};

export type SummaryReport = {
  start_date: string;
  end_date: string;
  team: SummaryAgentRow;
  agents: SummaryAgentRow[];
  activity_by_type: Record<string, number>;
};

export type ContestType = "daily" | "weekly" | "monthly" | "custom";
export type ContestMetric =
  | "quotes"
  | "policies"
  | "referrals"
  | "bundles"
  | "reviews"
  | "points"
  | "improved";
export type ContestStatus = "pending" | "active" | "ended";

export type Contest = {
  id: number;
  name: string;
  type: ContestType | string;
  metric: ContestMetric | string;
  start_date: string;
  end_date: string;
  auto_renew: boolean;
  created_at: string;
};

export type ContestListItem = Contest & {
  status: ContestStatus;
  leader_name: string | null;
  leader_value: number | null;
};

export type StandingsEntry = {
  rank: number;
  agent_id: number;
  name: string;
  role: string;
  avatar_url: string | null;
  value: number;
  current_value: number | null;
  previous_value: number | null;
};

export type ContestStandings = {
  contest: Contest;
  status: ContestStatus;
  entries: StandingsEntry[];
};

export type Period = "daily" | "weekly" | "monthly";

export type LeaderboardEntry = {
  rank: number;
  agent_id: number;
  name: string;
  nickname: string | null;
  role: string;
  avatar_url: string | null;
  avatar_preset: string | null;
  total_points: number;
  quotes: number;
  policies: number;
  referrals: number;
  followups: number;
  bundles: number;
  reviews: number;
  close_rate: number;
  /** Signed change in points vs the prior equal-length window. */
  trend_delta: number;
  /** Percent change vs prior; null when prior window had zero points. */
  trend_pct: number | null;
};

export type LeaderboardResponse = {
  period: Period;
  start_date: string;
  end_date: string;
  entries: LeaderboardEntry[];
};

export type LifetimeStats = {
  total_points: number;
  quotes: number;
  policies: number;
  referrals: number;
  followups: number;
  close_rate: number;
};

export type EarnedBadge = {
  id: number;
  name: string;
  description: string | null;
  icon: string | null;
  earned_at: string;
};

export type DailyHistoryPoint = {
  date: string;
  total_points: number;
  quotes: number;
  policies: number;
  referrals: number;
  followups: number;
  close_rate: number;
};

export type AgentProfile = {
  agent: Agent;
  lifetime: LifetimeStats;
  recent_activity: Activity[];
  badges: EarnedBadge[];
  daily_history: DailyHistoryPoint[];
};

export type ReferralPartner = {
  id: number;
  name: string;
  category: string | null;
  total_referrals: number;
  converted_referrals: number;
  conversion_rate: number;
  created_at: string;
};

export type Theme = "corporate" | "neon" | "sports" | "casino";

export type Settings = {
  theme: Theme;
  current_agent_id: number;
  daily_policy_goal: number;
  point_overrides: Record<string, number>;
  updated_at: string;
};
