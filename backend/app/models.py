from datetime import date, datetime

from sqlalchemy import (
    Boolean,
    Column,
    Date,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    Text,
    String,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import expression

from app.database import Base


class Agent(Base):
    __tablename__ = "agents"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(120), nullable=False, index=True)
    role = Column(String(60), nullable=False, default="agent")
    avatar_url = Column(String(500), nullable=True)
    avatar_preset = Column(String(40), nullable=True)
    avatar_color = Column(String(32), nullable=True)
    avatar_frame = Column(String(32), nullable=True)
    status_effect = Column(String(32), nullable=True)
    nickname = Column(String(60), nullable=True)
    title = Column(String(80), nullable=True)
    active = Column(
        Boolean,
        nullable=False,
        default=True,
        server_default=expression.true(),
    )
    # Per-agent weekly premium target shown on the /tv "Weekly premium"
    # panel. Stored in dollars. Default mirrors the office's standard
    # rep target; managers tune individual reps via the Agent form.
    weekly_premium_goal = Column(
        Integer,
        nullable=False,
        default=10000,
        server_default="10000",
    )
    start_date = Column(Date, nullable=False, default=date.today)
    created_at = Column(
        DateTime,
        nullable=False,
        default=datetime.utcnow,
        server_default=func.now(),
    )
    updated_at = Column(
        DateTime,
        nullable=False,
        default=datetime.utcnow,
        server_default=func.now(),
        onupdate=datetime.utcnow,
    )

    activities = relationship(
        "Activity",
        back_populates="agent",
        cascade="all, delete-orphan",
    )
    daily_scores = relationship(
        "DailyScore",
        back_populates="agent",
        cascade="all, delete-orphan",
    )
    badges = relationship(
        "AgentBadge",
        back_populates="agent",
        cascade="all, delete-orphan",
    )


class Activity(Base):
    __tablename__ = "activities"

    id = Column(Integer, primary_key=True, index=True)
    agent_id = Column(
        Integer,
        ForeignKey("agents.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    activity_type = Column(String(40), nullable=False, index=True)
    premium = Column(Float, nullable=True)
    source = Column(String(120), nullable=True)
    points = Column(Integer, nullable=False, default=0)
    created_at = Column(
        DateTime,
        nullable=False,
        default=datetime.utcnow,
        server_default=func.now(),
        index=True,
    )

    agent = relationship("Agent", back_populates="activities")


class DailyScore(Base):
    __tablename__ = "daily_scores"
    __table_args__ = (
        UniqueConstraint("agent_id", "date", name="uq_daily_scores_agent_date"),
    )

    id = Column(Integer, primary_key=True, index=True)
    agent_id = Column(
        Integer,
        ForeignKey("agents.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    date = Column(Date, nullable=False, index=True)
    total_points = Column(Integer, nullable=False, default=0)
    quotes = Column(Integer, nullable=False, default=0)
    policies = Column(Integer, nullable=False, default=0)
    referrals = Column(Integer, nullable=False, default=0)
    followups = Column(Integer, nullable=False, default=0)
    bundles = Column(Integer, nullable=False, default=0, server_default="0")
    reviews = Column(Integer, nullable=False, default=0, server_default="0")
    close_rate = Column(Float, nullable=False, default=0.0)
    created_at = Column(
        DateTime,
        nullable=False,
        default=datetime.utcnow,
        server_default=func.now(),
    )
    updated_at = Column(
        DateTime,
        nullable=False,
        default=datetime.utcnow,
        server_default=func.now(),
        onupdate=datetime.utcnow,
    )

    agent = relationship("Agent", back_populates="daily_scores")


class Badge(Base):
    __tablename__ = "badges"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(80), nullable=False, unique=True)
    description = Column(String(500), nullable=True)
    icon = Column(String(120), nullable=True)
    created_at = Column(
        DateTime,
        nullable=False,
        default=datetime.utcnow,
        server_default=func.now(),
    )

    awarded_to = relationship(
        "AgentBadge",
        back_populates="badge",
        cascade="all, delete-orphan",
    )


class AgentBadge(Base):
    __tablename__ = "agent_badges"
    __table_args__ = (
        UniqueConstraint("agent_id", "badge_id", name="uq_agent_badges_agent_badge"),
    )

    id = Column(Integer, primary_key=True, index=True)
    agent_id = Column(
        Integer,
        ForeignKey("agents.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    badge_id = Column(
        Integer,
        ForeignKey("badges.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    earned_at = Column(
        DateTime,
        nullable=False,
        default=datetime.utcnow,
        server_default=func.now(),
    )

    agent = relationship("Agent", back_populates="badges")
    badge = relationship("Badge", back_populates="awarded_to")


class Contest(Base):
    __tablename__ = "contests"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(120), nullable=False)
    type = Column(String(20), nullable=False, default="weekly")
    metric = Column(String(40), nullable=False)
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    auto_renew = Column(
        Boolean,
        nullable=False,
        default=False,
        server_default=expression.false(),
    )
    created_at = Column(
        DateTime,
        nullable=False,
        default=datetime.utcnow,
        server_default=func.now(),
    )


class ReferralPartner(Base):
    __tablename__ = "referral_partners"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(120), nullable=False, unique=True)
    category = Column(String(60), nullable=True, index=True)
    total_referrals = Column(Integer, nullable=False, default=0)
    converted_referrals = Column(Integer, nullable=False, default=0)
    created_at = Column(
        DateTime,
        nullable=False,
        default=datetime.utcnow,
        server_default=func.now(),
    )
    updated_at = Column(
        DateTime,
        nullable=False,
        default=datetime.utcnow,
        server_default=func.now(),
        onupdate=datetime.utcnow,
    )


class Settings(Base):
    """Single-row org-wide settings (theme, future preferences)."""

    __tablename__ = "settings"

    id = Column(Integer, primary_key=True)
    theme = Column(String(40), nullable=False, default="corporate")
    current_agent_id = Column(Integer, nullable=False, default=1)
    point_overrides = Column(
        Text,
        nullable=False,
        default="{}",
        server_default="{}",
    )
    # The daily team goal shown on /tv (office-goal bar + team-goal panel).
    # 6 is a reasonable default for a 5-person office; managers tune it
    # from the Settings page.
    daily_policy_goal = Column(
        Integer,
        nullable=False,
        default=6,
        server_default="6",
    )
    updated_at = Column(
        DateTime,
        nullable=False,
        default=datetime.utcnow,
        server_default=func.now(),
        onupdate=datetime.utcnow,
    )


__all__ = [
    "Agent",
    "Activity",
    "DailyScore",
    "Badge",
    "AgentBadge",
    "Contest",
    "ReferralPartner",
    "Settings",
]
