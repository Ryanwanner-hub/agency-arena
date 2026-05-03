from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import ReferralPartner
from app.schemas.referral_partner import ReferralPartnerCreate, ReferralPartnerRead

router = APIRouter(prefix="/referral-partners", tags=["referral-partners"])


@router.get("", response_model=List[ReferralPartnerRead])
def list_referral_partners(db: Session = Depends(get_db)):
    return (
        db.query(ReferralPartner)
        .order_by(ReferralPartner.total_referrals.desc(), ReferralPartner.name.asc())
        .all()
    )


@router.post("", response_model=ReferralPartnerRead, status_code=status.HTTP_201_CREATED)
def create_referral_partner(
    payload: ReferralPartnerCreate,
    db: Session = Depends(get_db),
):
    partner = ReferralPartner(**payload.model_dump())
    db.add(partner)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail=f"Referral partner '{payload.name}' already exists",
        )
    db.refresh(partner)
    return partner
