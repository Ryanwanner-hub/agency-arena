from datetime import date
from typing import Optional

from sqlalchemy import Float, case, cast
from sqlalchemy.dialects.postgresql import insert as postgres_insert
from sqlalchemy.dialects.sqlite import insert as sqlite_insert
from sqlalchemy.orm import Session

from app.models import DailyScore
from app.time_utils import business_day_bounds, business_day_from_utc_naive


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
ACTIVITY_TYPES = tuple(POINTS_BY_ACTIVITY.keys())

# Activity types that increment each DailyScore counter. Some scoring events
# (e.g. multi_policy_bonus, speed_to_contact) only contribute points and don't
# map to a counter on DailyScore.
QUOTE_TYPES = frozenset({"quote_completed"})
POLICY_TYPES = frozenset({"policy_bound"})
REFERRAL_TYPES = frozenset({"referral_received"})
FOLLOWUP_TYPES = frozenset({"followup_completed"})


def calculate_points(
    activity_type: str,
    overrides: Optional[dict[str, int]] = None,
) -> int:
    """Return the points awarded for ``activity_type``.

    Unknown types yield 0 so introducing a new activity in the data layer
    never breaks scoring before the rule is added here.
    """
    if overrides and activity_type in overrides:
        return overrides[activity_type]
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
    from app.models import Activity

    start, end = business_day_bounds(day)

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


def record_activity_daily_score(
    db: Session,
    *,
    agent_id: int,
    activity_type: str,
    points: int,
    created_at,
) -> None:
    """Atomically apply one activity to DailyScore for its business-local day."""
    day = business_day_from_utc_naive(created_at)
    quotes = 1 if activity_type in QUOTE_TYPES else 0
    policies = 1 if activity_type in POLICY_TYPES else 0
    referrals = 1 if activity_type in REFERRAL_TYPES else 0
    followups = 1 if activity_type in FOLLOWUP_TYPES else 0

    insert_values = {
        "agent_id": agent_id,
        "date": day,
        "total_points": points,
        "quotes": quotes,
        "policies": policies,
        "referrals": referrals,
        "followups": followups,
        "close_rate": close_rate(policies, quotes),
    }

    dialect = db.bind.dialect.name if db.bind is not None else ""
    if dialect == "sqlite":
        insert_stmt = sqlite_insert(DailyScore).values(**insert_values)
    elif dialect == "postgresql":
        insert_stmt = postgres_insert(DailyScore).values(**insert_values)
    else:
        # Fallback: preserve correctness for less-common dialects.
        recalculate_daily_score(db, agent_id, day)
        return

    quotes_expr = DailyScore.quotes + insert_stmt.excluded.quotes
    policies_expr = DailyScore.policies + insert_stmt.excluded.policies
    close_rate_expr = case(
        (quotes_expr <= 0, 0.0),
        (policies_expr >= quotes_expr, 1.0),
        else_=cast(policies_expr, Float) / cast(quotes_expr, Float),
    )

    upsert_stmt = insert_stmt.on_conflict_do_update(
        index_elements=["agent_id", "date"],
        set_={
            "total_points": DailyScore.total_points + insert_stmt.excluded.total_points,
            "quotes": quotes_expr,
            "policies": policies_expr,
            "referrals": DailyScore.referrals + insert_stmt.excluded.referrals,
            "followups": DailyScore.followups + insert_stmt.excluded.followups,
            "close_rate": close_rate_expr,
        },
    )
    db.execute(upsert_stmt)


__all__ = [
    "ACTIVITY_TYPES",
    "POINTS_BY_ACTIVITY",
    "calculate_points",
    "close_rate",
    "record_activity_daily_score",
    "recalculate_daily_score",
]
