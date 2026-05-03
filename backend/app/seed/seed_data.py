"""Demo seed data for Agency Arena.

Five agents, each with a deliberate strength so the leaderboard tells a
story instead of looking uniform. Activities span the last 14 days (two
weeks of history so the "most improved" contest has a meaningful prior
period), points are computed via the scoring engine, and DailyScore rows
are derived from the activities that were just inserted (same code path
the live API uses).

Run standalone:
    python -m app.seed.seed_data           # idempotent — skip if seeded
    python -m app.seed.seed_data --force   # wipe and re-seed
"""

import argparse
import random
from datetime import datetime, timedelta
from typing import Dict, Iterable, List

from app.database import Base, SessionLocal, engine
from app.models import (
    Activity,
    Agent,
    AgentBadge,
    Badge,
    Contest,
    DailyScore,
    ReferralPartner,
)
from app.scoring import calculate_points, recalculate_daily_score


SEED_DAYS = 14
RNG_SEED = 42


# Each persona defines an agent's identity, daily activity volume,
# weighted distribution across the 12 scoring activity types, and
# which badges they've earned (assigned by name; resolved at insert
# time once Badge rows exist).
PERSONAS: List[Dict] = [
    {
        "name": "Sarah Chen",
        "role": "senior_agent",
        "tenure_days": 3 * 365,
        "preset": "trophy",
        "volume": (22, 30),
        "weights": {
            "quote_started": 4,
            "quote_completed": 6,
            "policy_bound": 5,
            "multi_policy_bonus": 2,
            "cross_sell_sold": 2,
            "cross_sell_attempt": 1,
            "review_received": 2,
            "review_requested": 1,
            "referral_converted": 1,
            "speed_to_contact": 2,
            "followup_completed": 2,
        },
        "badges": ["Top Closer", "First Sale"],
    },
    {
        "name": "Marcus Johnson",
        "role": "agent",
        "tenure_days": 18 * 30,
        "preset": "bolt",
        "volume": (45, 60),
        "weights": {
            "quote_started": 12,
            "quote_completed": 6,
            "policy_bound": 2,
            "speed_to_contact": 8,
            "followup_completed": 10,
            "referral_received": 1,
            "cross_sell_attempt": 3,
            "cross_sell_sold": 1,
            "review_requested": 2,
            "review_received": 1,
        },
        "badges": ["Quote Machine", "Streak Starter"],
    },
    {
        "name": "Priya Patel",
        "role": "senior_agent",
        "tenure_days": 30 * 30,
        "preset": "star",
        "volume": (28, 38),
        "weights": {
            "referral_received": 10,
            "referral_converted": 5,
            "quote_started": 3,
            "quote_completed": 4,
            "policy_bound": 4,
            "multi_policy_bonus": 3,
            "followup_completed": 4,
            "speed_to_contact": 2,
            "cross_sell_sold": 1,
            "cross_sell_attempt": 1,
            "review_received": 1,
        },
        "badges": ["Referral Champ", "First Sale"],
    },
    {
        "name": "Diego Rivera",
        "role": "agent",
        "tenure_days": 9 * 30,
        "preset": "rocket",
        "volume": (28, 38),
        "weights": {
            "cross_sell_attempt": 7,
            "cross_sell_sold": 4,
            "review_requested": 5,
            "review_received": 4,
            "quote_completed": 3,
            "policy_bound": 2,
            "multi_policy_bonus": 1,
            "followup_completed": 3,
            "quote_started": 2,
            "speed_to_contact": 1,
            "referral_received": 1,
        },
        "badges": ["Streak Starter"],
    },
    {
        "name": "Emma Thompson",
        "role": "junior_agent",
        "tenure_days": 3 * 30,
        "preset": "diamond",
        "volume": (25, 35),
        "weights": {
            "quote_started": 4,
            "quote_completed": 3,
            "policy_bound": 2,
            "followup_completed": 4,
            "speed_to_contact": 3,
            "referral_received": 2,
            "cross_sell_attempt": 2,
            "review_requested": 2,
            "review_received": 1,
            "multi_policy_bonus": 1,
            "cross_sell_sold": 1,
            "referral_converted": 1,
        },
        "badges": ["First Sale"],
    },
]

ACTIVITY_SOURCES = ["inbound", "cold_call", "referral", "website", "walk_in"]
PREMIUM_TYPES = {"quote_started", "quote_completed", "policy_bound", "cross_sell_sold"}

BADGE_DEFS = [
    ("First Sale", "Closed your first policy.", "trophy"),
    ("Quote Machine", "50+ quotes in a week.", "zap"),
    ("Streak Starter", "5-day activity streak.", "flame"),
    ("Top Closer", "Highest close rate of the month.", "target"),
    ("Referral Champ", "10+ referrals brought in.", "users"),
]

REFERRAL_PARTNERS = [
    ("Local Realty Group", "realtor", 42, 18),
    ("Maple Auto", "auto_dealer", 28, 11),
    ("Hometown Mortgage", "mortgage", 35, 20),
    ("Westside Body Shop", "auto_repair", 14, 4),
    ("River CPA", "accountant", 9, 6),
]


def _wipe(db) -> None:
    """Delete all seedable rows in FK-safe order."""
    for model in (AgentBadge, DailyScore, Activity, Badge, Contest, ReferralPartner, Agent):
        db.query(model).delete()
    db.commit()


def _seed_agents(db, rng: random.Random, today) -> List[Agent]:
    agents = []
    for p in PERSONAS:
        agents.append(
            Agent(
                name=p["name"],
                role=p["role"],
                avatar_preset=p.get("preset"),
                start_date=today - timedelta(days=p["tenure_days"]),
            )
        )
    db.add_all(agents)
    db.commit()
    return agents


def _seed_activities(db, rng: random.Random, agents: List[Agent], now: datetime) -> None:
    for agent, persona in zip(agents, PERSONAS):
        types = list(persona["weights"].keys())
        weights = list(persona["weights"].values())
        n = rng.randint(*persona["volume"])
        for _ in range(n):
            a_type = rng.choices(types, weights=weights, k=1)[0]
            created = now - timedelta(
                days=rng.randint(0, SEED_DAYS - 1),
                hours=rng.randint(0, 23),
                minutes=rng.randint(0, 59),
            )
            premium = round(rng.uniform(400, 4000), 2) if a_type in PREMIUM_TYPES else None
            db.add(
                Activity(
                    agent_id=agent.id,
                    activity_type=a_type,
                    premium=premium,
                    source=rng.choice(ACTIVITY_SOURCES),
                    points=calculate_points(a_type),
                    created_at=created,
                )
            )
    db.commit()


def _derive_daily_scores(db, agents: Iterable[Agent], today) -> None:
    for agent in agents:
        for offset in range(SEED_DAYS):
            recalculate_daily_score(db, agent.id, today - timedelta(days=offset))
    db.commit()


def _seed_badges(db, rng: random.Random, agents: List[Agent], now: datetime) -> None:
    badges = [Badge(name=n, description=d, icon=i) for n, d, i in BADGE_DEFS]
    db.add_all(badges)
    db.commit()

    by_name = {b.name: b for b in badges}
    for agent, persona in zip(agents, PERSONAS):
        for badge_name in persona["badges"]:
            db.add(
                AgentBadge(
                    agent_id=agent.id,
                    badge_id=by_name[badge_name].id,
                    earned_at=now - timedelta(days=rng.randint(1, 30)),
                )
            )
    db.commit()


def _seed_contests(db, today) -> None:
    week_start = today - timedelta(days=today.weekday())
    db.add_all(
        [
            # Auto-renew template — seeded as ended yesterday so the lazy
            # auto-renew kicks in on the first /contests fetch and creates a
            # new instance for today. Demonstrates the auto-reset feature.
            Contest(
                name="Daily Quote Dash",
                type="daily",
                metric="quotes",
                start_date=today - timedelta(days=1),
                end_date=today - timedelta(days=1),
                auto_renew=True,
            ),
            # Active weekly contests — one per non-improved metric.
            Contest(
                name="Weekly Policy Push",
                type="weekly",
                metric="policies",
                start_date=week_start,
                end_date=week_start + timedelta(days=6),
                auto_renew=True,
            ),
            Contest(
                name="Referral Race",
                type="weekly",
                metric="referrals",
                start_date=week_start,
                end_date=week_start + timedelta(days=6),
            ),
            Contest(
                name="Most Improved Sprint",
                type="weekly",
                metric="improved",
                start_date=week_start,
                end_date=week_start + timedelta(days=6),
            ),
            # Past contest for history view.
            Contest(
                name="Closer of Last Week",
                type="weekly",
                metric="policies",
                start_date=week_start - timedelta(days=7),
                end_date=week_start - timedelta(days=1),
            ),
        ]
    )
    db.commit()


def _seed_referral_partners(db) -> None:
    db.add_all(
        [
            ReferralPartner(name=n, category=c, total_referrals=t, converted_referrals=cv)
            for n, c, t, cv in REFERRAL_PARTNERS
        ]
    )
    db.commit()


def seed_database(force: bool = False) -> bool:
    """Populate the database with demo data.

    Idempotent by default — exits without writing if any agents already
    exist, returning ``False``. Pass ``force=True`` to wipe seedable
    rows first and re-seed. Returns ``True`` when data was written.
    """
    db = SessionLocal()
    try:
        if force:
            _wipe(db)
        elif db.query(Agent).count() > 0:
            return False

        rng = random.Random(RNG_SEED)
        now = datetime.utcnow()
        today = now.date()

        agents = _seed_agents(db, rng, today)
        _seed_activities(db, rng, agents, now)
        _derive_daily_scores(db, agents, today)
        _seed_badges(db, rng, agents, now)
        _seed_contests(db, today)
        _seed_referral_partners(db)
        return True
    finally:
        db.close()


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument(
        "--force",
        action="store_true",
        help="Wipe seedable tables before seeding (drops agents, activities, badges, etc.)",
    )
    args = parser.parse_args()

    Base.metadata.create_all(bind=engine)
    wrote = seed_database(force=args.force)
    print("seeded." if wrote else "skipped — agents already exist (use --force to wipe and re-seed).")


if __name__ == "__main__":
    main()
