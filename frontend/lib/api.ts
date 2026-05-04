export const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8001";

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`API ${res.status}: ${body || res.statusText}`);
  }
  // 204 No Content (e.g. DELETE) has an empty body — don't try to parse.
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
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

export type ContestType = "daily" | "weekly" | "monthly" | "custom";
export type ContestMetric =
  | "quotes"
  | "policies"
  | "referrals"
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
  point_overrides: Record<string, number>;
  updated_at: string;
};
