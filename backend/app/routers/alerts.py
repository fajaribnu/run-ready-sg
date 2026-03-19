"""
F3: Weather Alerts (SES)
Email notifications when safety thresholds are breached for saved locations.
"""

from fastapi import APIRouter, Query
from pydantic import BaseModel

router = APIRouter()


class AlertSubscription(BaseModel):
    email: str
    lat: float
    lng: float
    label: str = ""  # e.g. "Bishan Park", "NUS Field"


@router.post("/alerts/subscribe")
def subscribe_alert(sub: AlertSubscription):
    """
    Register an email to receive weather alerts for a specific location.
    """
    # TODO Sprint 3: Save subscription to DB, integrate with SES
    return {
        "status": "not_implemented",
        "message": "Alert subscriptions require DB + SES integration. Target: Sprint 3.",
        "subscription": sub.model_dump(),
    }


@router.get("/alerts/check")
def check_alerts():
    """
    Called by cron/EventBridge to evaluate all active subscriptions
    against current weather data. Sends SES emails for breached thresholds.
    """
    # TODO Sprint 3:
    # 1. Load all active subscriptions from DB
    # 2. For each, call get_localized_weather()
    # 3. If WARNING, send email via SES (with cooldown to prevent spam)
    return {
        "status": "not_implemented",
        "message": "Alert checking requires DB subscriptions + SES. Target: Sprint 3.",
    }
