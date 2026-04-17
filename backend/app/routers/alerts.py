"""
F3: Weather Alerts (SES)
Email notifications when safety thresholds are breached for saved locations.
"""

from fastapi import APIRouter, Query
from pydantic import BaseModel

from http.client import HTTPException

from app.database import get_db
from app.routers.decision import SG_LAT_MIN, SG_LAT_MAX, SG_LNG_MIN, SG_LNG_MAX


router = APIRouter()


@router.post("/alerts/subscribe")
def subscribe_alert(sub: AlertSubscription):
    """
    Register an email to receive weather alerts for a specific location.
    """
    # TODO Sprint 3: Save subscription to DB, integrate with SES
    if sub.email is None or sub.lat is None or sub.lng is None:
        raise HTTPException(
            status_code=400,
            detail="email, lat, and lng are required fields."
        )
    if not (SG_LAT_MIN <= sub.lat <= SG_LAT_MAX and SG_LNG_MIN <= sub.lng <= SG_LNG_MAX):
        raise HTTPException(
            status_code=400,
            detail="lat/lng must be within Singapore bounds (1.15-1.47, 103.6-104.1)"
        )
    
    if sub.label is None:
        sub.label = ""

    with get_db() as conn:
        with conn.cursor() as cur:
            insert_query = """
            INSERT INTO alert_subscriptions (email, lat, lng, label, is_active)
            VALUES (%s, %s, %s, %s, TRUE)
            RETURNING id
            """
            cur.execute(insert_query, (sub.email, sub.lat, sub.lng, sub.label))
            new_id = cur.fetchone()[0]
            conn.commit()

    return {
        "status": "successful",
        "new_subscription_id": new_id,
        "subscription": sub.model_dump(),
    }
