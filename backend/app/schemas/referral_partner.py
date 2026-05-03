from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, computed_field


class ReferralPartnerBase(BaseModel):
    name: str
    category: Optional[str] = None


class ReferralPartnerCreate(ReferralPartnerBase):
    total_referrals: int = 0
    converted_referrals: int = 0


class ReferralPartnerRead(ReferralPartnerBase):
    id: int
    total_referrals: int
    converted_referrals: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

    @computed_field
    @property
    def conversion_rate(self) -> float:
        if not self.total_referrals:
            return 0.0
        return round(self.converted_referrals / self.total_referrals, 4)
