from datetime import date, datetime, timedelta

from sqlalchemy.orm import Session

from app.models import Activity, DailyScore


POINTS_BY_ACTIVITY: dict[str, int] = {
    "quote_started": 5,
    "quote_completed": 10,
    "policy_bound": 30,
    "multi_policy_bonus": 20,
    "referral_received": 10,
    "referral_converted": 40,
    "followup_completed": 8,
    "speed_to_contact": 10,
    "review_requested": 5,
    "review_received": 25,
    "cross_sell_attempt": 5,
    "cross_sell_sold": 25,
}

# Activity types that increment each DailyScore counter. Some scoring events
# (e.g. multi_policy_bonus, speed_to_contact) only contribute points and don't
# map to a counter on DailyScore.
QUOTE_TYPES = frozenset({"quote_completed"})
POLICY_TYPES = frozenset({"policy_bound"})
REFERRAL_TYPES = frozenset({"referral_received"})
FOLLOWUP_TYPES = frozenset({"followup_completed"})


def calculate_points(activity_type: str) -> int:
    """Return the points awarded for ``activity_type``.

    Unknown types yield 0 so introducing a new activity in the data layer
    never breaks scoring before the rule is added here.
    """
    return POINTS_BY_ACTIVITY.get(activity_type, 0)


def close_rate(policies: int, quotes: int) -> float:
    """Bounded ``policies / quotes`` ratio, clamped to ``[0, 1]``.

    Some policies bypass the quote pipeline (e.g. referral conversions),
    so raw ``policies / quotes`` can exceed 1 — a display bug for a metric
    that conceptually represents a percentage. Centralised so every caller
    agrees on the same definition.
    """
    if quotes <= 0:
        return 0.0
    return round(min(policies / quotes, 1.0), 4)


def recalculate_daily_score(
    db: Session,
    agent_id: int,
    day: date,
) -> DailyScore:
    """Rebuild the DailyScore for one agent on one day from Activity rows.

    Idempotent — creates the row if missing, updates in place if present.
    Caller is responsible for committing the session.
    """
    start = datetime.combine(day, datetime.min.time())
    end = datetime.combine(day + timedelta(days=1), datetime.min.time())

    activities = (
        db.query(Activity)
        .filter(
            Activity.agent_id == agent_id,
            Activity.created_at >= start,
            Activity.created_at < end,
        )
        .all()
    )

    total_points = sum(a.points for a in activities)
    quotes = sum(1 for a in activities if a.activity_type in QUOTE_TYPES)
    policies = sum(1 for a in activities if a.activity_type in POLICY_TYPES)
    referrals = sum(1 for a in activities if a.activity_type in REFERRAL_TYPES)
    followups = sum(1 for a in activities if a.activity_type in FOLLOWUP_TYPES)
    rate = close_rate(policies, quotes)

    score = (
        db.query(DailyScore)
        .filter(DailyScore.agent_id == agent_id, DailyScore.date == day)
        .first()
    )
    if score is None:
        score = DailyScore(agent_id=agent_id, date=day)
        db.add(score)

    score.total_points = total_points
    score.quotes = quotes
    score.policies = policies
    score.referrals = referrals
    score.followups = followups
    score.close_rate = rate

    db.flush()
    return score


__all__ = [
    "POINTS_BY_ACTIVITY",
    "calculate_points",
    "close_rate",
    "recalculate_daily_score",
]
