from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.contest_engine import compute_standings, contest_status
from app.database import get_db
from app.models import Contest
from app.schemas.contest import (
    ContestCreate,
    ContestListItem,
    ContestRead,
    ContestUpdate,
)
from app.schemas.contest_standings import ContestStandings, StandingsEntry
from app.time_utils import business_today

router = APIRouter(prefix="/contests", tags=["contests"])

@router.get("", response_model=List[ContestListItem])
def list_contests(db: Session = Depends(get_db)):
    today = business_today()

    contests = db.query(Contest).order_by(Contest.start_date.desc()).all()
    out: List[ContestListItem] = []
    for c in contests:
        st = contest_status(c, today)
        leader_name = None
        leader_value = None
        if st in ("active", "ended"):
            standings = compute_standings(db, c)
            if standings:
                top = standings[0]
                # Only surface a "leader" if their value is meaningful
                if top.value > 0 or c.metric == "improved":
                    leader_name = top.name
                    leader_value = top.value
        out.append(
            ContestListItem(
                id=c.id,
                name=c.name,
                type=c.type,
                metric=c.metric,
                start_date=c.start_date,
                end_date=c.end_date,
                auto_renew=c.auto_renew,
                created_at=c.created_at,
                status=st,
                leader_name=leader_name,
                leader_value=leader_value,
            )
        )
    return out


@router.post("", response_model=ContestRead, status_code=status.HTTP_201_CREATED)
def create_contest(payload: ContestCreate, db: Session = Depends(get_db)):
    if payload.end_date < payload.start_date:
        raise HTTPException(
            status_code=422,
            detail="end_date must be on or after start_date",
        )

    contest = Contest(**payload.model_dump())
    db.add(contest)
    db.commit()
    db.refresh(contest)
    return contest


@router.patch("/{contest_id}", response_model=ContestRead)
def update_contest(
    contest_id: int,
    payload: ContestUpdate,
    db: Session = Depends(get_db),
):
    contest = db.query(Contest).filter(Contest.id == contest_id).first()
    if not contest:
        raise HTTPException(
            status_code=404,
            detail=f"Contest {contest_id} not found",
        )

    data = payload.model_dump(exclude_unset=True)
    new_start = data.get("start_date", contest.start_date)
    new_end = data.get("end_date", contest.end_date)
    if new_end < new_start:
        raise HTTPException(
            status_code=422,
            detail="end_date must be on or after start_date",
        )

    for field, value in data.items():
        setattr(contest, field, value)
    db.commit()
    db.refresh(contest)
    return contest


@router.delete("/{contest_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_contest(contest_id: int, db: Session = Depends(get_db)):
    contest = db.query(Contest).filter(Contest.id == contest_id).first()
    if not contest:
        raise HTTPException(
            status_code=404,
            detail=f"Contest {contest_id} not found",
        )
    db.delete(contest)
    db.commit()
    return None


@router.get("/{contest_id}/standings", response_model=ContestStandings)
def get_standings(contest_id: int, db: Session = Depends(get_db)):
    contest = db.query(Contest).filter(Contest.id == contest_id).first()
    if not contest:
        raise HTTPException(
            status_code=404,
            detail=f"Contest {contest_id} not found",
        )

    today = business_today()
    standings = compute_standings(db, contest)
    return ContestStandings(
        contest=contest,
        status=contest_status(contest, today),
        entries=[
            StandingsEntry(
                rank=s.rank,
                agent_id=s.agent_id,
                name=s.name,
                role=s.role,
                avatar_url=s.avatar_url,
                value=s.value,
                current_value=s.current_value,
                previous_value=s.previous_value,
            )
            for s in standings
        ],
    )
