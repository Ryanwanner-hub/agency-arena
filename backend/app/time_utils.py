import os
from datetime import date, datetime, time, timedelta, timezone
from zoneinfo import ZoneInfo


BUSINESS_TIMEZONE = os.environ.get("BUSINESS_TIMEZONE", "America/New_York")
BUSINESS_TZ = ZoneInfo(BUSINESS_TIMEZONE)


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def business_now() -> datetime:
    return utc_now().astimezone(BUSINESS_TZ)


def business_today() -> date:
    return business_now().date()


def business_day_from_utc_naive(dt: datetime) -> date:
    """Interpret a naive UTC timestamp inside the configured business TZ."""
    aware_utc = dt.replace(tzinfo=timezone.utc)
    return aware_utc.astimezone(BUSINESS_TZ).date()


def business_day_bounds(day: date) -> tuple[datetime, datetime]:
    """Return naive UTC bounds for one business-local day."""
    start_local = datetime.combine(day, time.min, tzinfo=BUSINESS_TZ)
    end_local = start_local + timedelta(days=1)
    return (
        start_local.astimezone(timezone.utc).replace(tzinfo=None),
        end_local.astimezone(timezone.utc).replace(tzinfo=None),
    )


def business_window_bounds(start_day: date, end_day: date) -> tuple[datetime, datetime]:
    """Return naive UTC bounds for an inclusive business-local date range."""
    start, _ = business_day_bounds(start_day)
    _, end = business_day_bounds(end_day)
    return start, end
