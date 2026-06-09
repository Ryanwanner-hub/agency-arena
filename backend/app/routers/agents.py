from datetime import datetime, timedelta
from pathlib import Path
from typing import List, Optional
from uuid import uuid4

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from sqlalchemy import desc, func
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Activity, Agent, AgentBadge, Badge, DailyScore
from app.schemas.activity import ActivityRead
from app.schemas.agent import AgentCreate, AgentRead, AgentUpdate
from app.schemas.profile import (
    AgentProfile,
    DailyHistoryPoint,
    EarnedBadge,
    LifetimeStats,
)
from app.scoring import close_rate
from app.settings_store import get_or_create_settings
from app.time_utils import business_today

router = APIRouter(prefix="/agents", tags=["agents"])

# Whitelist of preset keys the client may select. Mirrors the frontend list;
# kept here so the API itself enforces it (rejects unknown keys).
ALLOWED_PRESETS = {
    "trophy",
    "bolt",
    "star",
    "rocket",
    "diamond",
    "flame",
    "leaf",
    "wave",
}

ALLOWED_UPLOAD_TYPES = {"image/png", "image/jpeg", "image/jpg", "image/webp"}
EXTENSION_BY_MIME = {
    "image/png": "png",
    "image/jpeg": "jpg",
    "image/jpg": "jpg",
    "image/webp": "webp",
}
MAX_AVATAR_BYTES = 2 * 1024 * 1024  # 2 MB

UPLOAD_DIR = Path("uploads") / "avatars"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


def _delete_local_avatar(avatar_url: Optional[str]) -> None:
    if not avatar_url or not avatar_url.startswith("/uploads/avatars/"):
        return
    path = UPLOAD_DIR / avatar_url.rsplit("/", 1)[-1]
    try:
        path.unlink()
    except FileNotFoundError:
        pass


@router.get("", response_model=List[AgentRead])
def list_agents(
    active_only: bool = False,
    db: Session = Depends(get_db),
):
    query = db.query(Agent)
    if active_only:
        query = query.filter(Agent.active.is_(True))
    return query.order_by(Agent.name.asc()).all()


@router.post("", response_model=AgentRead, status_code=status.HTTP_201_CREATED)
def create_agent(payload: AgentCreate, db: Session = Depends(get_db)):
    if payload.avatar_preset and payload.avatar_preset not in ALLOWED_PRESETS:
        raise HTTPException(
            status_code=422,
            detail=f"avatar_preset must be one of {sorted(ALLOWED_PRESETS)}",
        )
    agent = Agent(**payload.model_dump(exclude_none=True))
    db.add(agent)
    db.commit()
    db.refresh(agent)
    return agent


@router.get("/{agent_id}", response_model=AgentRead)
def get_agent(agent_id: int, db: Session = Depends(get_db)):
    agent = db.query(Agent).filter(Agent.id == agent_id).first()
    if not agent:
        raise HTTPException(status_code=404, detail=f"Agent {agent_id} not found")
    return agent


@router.patch("/{agent_id}", response_model=AgentRead)
def update_agent(
    agent_id: int,
    payload: AgentUpdate,
    db: Session = Depends(get_db),
):
    agent = db.query(Agent).filter(Agent.id == agent_id).first()
    if not agent:
        raise HTTPException(status_code=404, detail=f"Agent {agent_id} not found")

    data = payload.model_dump(exclude_unset=True)

    if "avatar_preset" in data and data["avatar_preset"] is not None:
        if data["avatar_preset"] not in ALLOWED_PRESETS:
            raise HTTPException(
                status_code=422,
                detail=f"avatar_preset must be one of {sorted(ALLOWED_PRESETS)}",
            )
        # Choosing a preset clears any uploaded avatar so they don't conflict.
        _delete_local_avatar(agent.avatar_url)
        data["avatar_url"] = None

    if "avatar_url" in data and data["avatar_url"] is None:
        _delete_local_avatar(agent.avatar_url)

    for key, value in data.items():
        setattr(agent, key, value)

    db.commit()
    db.refresh(agent)
    return agent


@router.delete("/{agent_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_agent(agent_id: int, db: Session = Depends(get_db)):
    """Permanently remove an agent. The ORM cascade ("all, delete-orphan"
    on Agent.activities / daily_scores / badges) clears their activity,
    day scores, and badge links along with the row, so the leaderboard,
    contests, and TV panels drop them on their next read."""
    agent = db.query(Agent).filter(Agent.id == agent_id).first()
    if not agent:
        raise HTTPException(status_code=404, detail=f"Agent {agent_id} not found")

    # Drop any uploaded avatar file from disk before the row disappears.
    _delete_local_avatar(agent.avatar_url)

    # current_agent_id isn't a foreign key, so a delete would leave it
    # dangling. If Settings points at the agent we're removing, repoint it to
    # another agent (0 when none remain — the frontend falls back to a guest).
    settings = get_or_create_settings(db)
    if settings.current_agent_id == agent_id:
        replacement = (
            db.query(Agent.id)
            .filter(Agent.id != agent_id)
            .order_by(Agent.id.asc())
            .scalar()
        )
        settings.current_agent_id = replacement or 0

    db.delete(agent)
    db.commit()
    return None


@router.post("/{agent_id}/avatar", response_model=AgentRead)
async def upload_avatar(
    agent_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    agent = db.query(Agent).filter(Agent.id == agent_id).first()
    if not agent:
        raise HTTPException(status_code=404, detail=f"Agent {agent_id} not found")

    if file.content_type not in ALLOWED_UPLOAD_TYPES:
        raise HTTPException(
            status_code=415,
            detail=f"Unsupported media type {file.content_type!r}; "
            f"expected one of {sorted(ALLOWED_UPLOAD_TYPES)}",
        )

    contents = await file.read()
    if len(contents) > MAX_AVATAR_BYTES:
        raise HTTPException(
            status_code=413,
            detail=f"File too large ({len(contents)} bytes); max {MAX_AVATAR_BYTES}",
        )

    ext = EXTENSION_BY_MIME[file.content_type]
    filename = f"agent_{agent_id}_{uuid4().hex[:12]}.{ext}"
    path = UPLOAD_DIR / filename
    path.write_bytes(contents)

    old_avatar_url = agent.avatar_url
    agent.avatar_url = f"/uploads/avatars/{filename}"
    agent.avatar_preset = None  # uploaded image takes precedence
    db.commit()
    db.refresh(agent)
    _delete_local_avatar(old_avatar_url)
    return agent


@router.get("/{agent_id}/activity", response_model=List[ActivityRead])
def list_agent_activity(
    agent_id: int,
    limit: int = Query(50, ge=1, le=500),
    db: Session = Depends(get_db),
):
    if not db.query(Agent.id).filter(Agent.id == agent_id).first():
        raise HTTPException(status_code=404, detail=f"Agent {agent_id} not found")

    return (
        db.query(Activity)
        .filter(Activity.agent_id == agent_id)
        .order_by(desc(Activity.created_at))
        .limit(limit)
        .all()
    )


@router.get("/{agent_id}/profile", response_model=AgentProfile)
def get_agent_profile(
    agent_id: int,
    history_days: int = Query(14, ge=1, le=90),
    recent_count: int = Query(10, ge=1, le=100),
    db: Session = Depends(get_db),
):
    agent = db.query(Agent).filter(Agent.id == agent_id).first()
    if not agent:
        raise HTTPException(status_code=404, detail=f"Agent {agent_id} not found")

    totals = (
        db.query(
            func.coalesce(func.sum(DailyScore.total_points), 0),
            func.coalesce(func.sum(DailyScore.quotes), 0),
            func.coalesce(func.sum(DailyScore.policies), 0),
            func.coalesce(func.sum(DailyScore.referrals), 0),
            func.coalesce(func.sum(DailyScore.followups), 0),
        )
        .filter(DailyScore.agent_id == agent_id)
        .one()
    )
    total_points, quotes, policies, referrals, followups = totals
    lifetime = LifetimeStats(
        total_points=total_points,
        quotes=quotes,
        policies=policies,
        referrals=referrals,
        followups=followups,
        close_rate=close_rate(policies, quotes),
    )

    recent = (
        db.query(Activity)
        .filter(Activity.agent_id == agent_id)
        .order_by(desc(Activity.created_at))
        .limit(recent_count)
        .all()
    )

    badge_rows = (
        db.query(Badge, AgentBadge.earned_at)
        .join(AgentBadge, AgentBadge.badge_id == Badge.id)
        .filter(AgentBadge.agent_id == agent_id)
        .order_by(desc(AgentBadge.earned_at))
        .all()
    )
    badges = [
        EarnedBadge(
            id=b.id,
            name=b.name,
            description=b.description,
            icon=b.icon,
            earned_at=earned_at,
        )
        for b, earned_at in badge_rows
    ]

    cutoff = business_today() - timedelta(days=history_days - 1)
    history = (
        db.query(DailyScore)
        .filter(DailyScore.agent_id == agent_id, DailyScore.date >= cutoff)
        .order_by(DailyScore.date.asc())
        .all()
    )

    return AgentProfile(
        agent=AgentRead.model_validate(agent),
        lifetime=lifetime,
        recent_activity=[ActivityRead.model_validate(a) for a in recent],
        badges=badges,
        daily_history=[DailyHistoryPoint.model_validate(h) for h in history],
    )
