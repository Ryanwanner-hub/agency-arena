from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field, computed_field, model_validator


class ReferralPartnerBase(BaseModel):
    name: str
    category: Optional[str] = None

    @model_validator(mode="after")
    def validate_base(self):
        self.name = self.name.strip()
        if not self.name:
            raise ValueError("name must not be blank")
        if self.category is not None:
            self.category = self.category.strip() or None
        return self


class ReferralPartnerCreate(ReferralPartnerBase):
    total_referrals: int = Field(default=0, ge=0)
    converted_referrals: int = Field(default=0, ge=0)

    @model_validator(mode="after")
    def validate_counts(self):
        if self.converted_referrals > self.total_referrals:
            raise ValueError("converted_referrals must be <= total_referrals")
        return self


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
