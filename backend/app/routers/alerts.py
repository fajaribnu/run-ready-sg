"""
F3: Weather Alerts (SES)
Email notifications when safety thresholds are breached for saved locations.
"""

from fastapi import APIRouter, Query
from pydantic import BaseModel

from http.client import HTTPException

import os
import boto3
from botocore.exceptions import ClientError
import json
from app.database import get_db
from app.services.weather import get_nearest
from app.routers.decision import _handle_wbgt_value, RAIN_KEYWORDS, WBGT_DANGER_THRESHOLD, SG_LAT_MIN, SG_LAT_MAX, SG_LNG_MIN, SG_LNG_MAX

AWS_REGION = "ap-southeast-1" 
SES_SENDER = os.getenv("SES_SENDER_EMAIL", "alerts@runready.xyz")

router = APIRouter()


class AlertSubscription(BaseModel):
    email: str
    lat: float
    lng: float
    label: str = ""  # e.g. "Bishan Park", "NUS Field"


def get_localized_weather(lat: float, lng: float, temp_data: json, forecast_data: json, wbgt_data: json) -> dict:
    """
    Fetch all weather data and resolve to the nearest station for a given location.
    Returns a unified dict regardless of V1/V2 API differences.
    """
    # temp_data = fetch_temperature()
    # forecast_data = fetch_forecast()
    # wbgt_data = fetch_wbgt()

    # V1: nearest area and temperature station
    nearest_area = get_nearest(lat, lng, forecast_data["area_metadata"])
    nearest_temp_station = get_nearest(lat, lng, temp_data["metadata"]["stations"])

    my_temp = next(
        r["value"]
        for r in temp_data["items"][0]["readings"]
        if r["station_id"] == nearest_temp_station["id"]
    )
    my_forecast = next(
        f["forecast"]
        for f in forecast_data["items"][0]["forecasts"]
        if f["area"] == nearest_area["name"]
    )

    # V2: WBGT (different JSON structure)
    wbgt_readings = wbgt_data["data"]["records"][0]["item"]["readings"]
    nearest_wbgt = get_nearest(lat, lng, wbgt_readings)
    my_wbgt = nearest_wbgt.get("wbgt", "29.0")
    if my_wbgt == "NA":
        my_wbgt = "29.0"

    return {
        "area_name": nearest_area["name"],
        "temperature": float(my_temp),
        "forecast": my_forecast,
        "wbgt": float(my_wbgt),
    }


def check_run(
    lat,
    lng,
    temp_data, forecast_data, wbgt_data
):
    weather = get_localized_weather(lat, lng, temp_data, forecast_data, wbgt_data)

    is_safe = True
    projection = "Conditions holding steady."
    reasons = []
    warnings = weather.get("warnings", [])

    area_name = weather.get("area_name", "Unknown Area")
    forecast = weather.get("forecast", "Unavailable")
    temperature = weather.get("temperature", "Unavailable")
    wbgt_raw = weather.get("wbgt")

    wbgt_numeric, wbgt_display = _handle_wbgt_value(wbgt_raw)

    if isinstance(forecast, str) and any(word.lower() in forecast.lower() for word in RAIN_KEYWORDS):
        is_safe = False
        projection = "Rain expected shortly. Seek shelter."
        reasons.append(f"Forecast: {forecast}")

    if wbgt_numeric is not None and wbgt_numeric > WBGT_DANGER_THRESHOLD:
        is_safe = False
        projection = "Heat stress rising. Hydrate immediately."
        reasons.append(f"WBGT: {wbgt_numeric:.1f}°C (threshold: {WBGT_DANGER_THRESHOLD}°C)")

    if wbgt_numeric is None:
        warnings.append("WBGT unavailable or NA")

    return {
        "status": "SAFE" if is_safe else "WARNING",
        "data": {
            "location": f"Lat: {lat:.3f}, Lng: {lng:.3f} (Near {area_name})",
            "temperature": f"{temperature}°C" if temperature != "Unavailable" else "Unavailable",
            "forecast": forecast,
            "wbgt": wbgt_display,
            "projection": projection,
            "reasons": reasons,
        },
        "warnings": warnings,
    }


class EmailService:
    def __init__(self):
        self.ses = boto3.client(
            'ses',
            region_name=AWS_REGION,
            # AWS_ACCESS_KEY_ID and SECRET are pulled automatically from .env
        )

    def send_lightning_alert(self, to_email: str, subject: str, body: str) -> bool:
        try:
            self.ses.send_email(
                Source=SES_SENDER,
                Destination={'ToAddresses': [to_email]},
                Message={
                    'Subject': {'Data': subject},
                    'Body': {
                        'Text': {
                            'Data': body
                        }
                    }
                }
            )
            return True
        except ClientError as e:
            print(f"SES Error: {e.response['Error']['Message']}")
            return False

mailer = EmailService()


def email_loop(alert_list: dict):
    for sub_id, alert in alert_list.items():
        email = alert.get("email")
        subject = f"RunReady Alert: {alert['status']} conditions at your location"
        body = f"""
        Hello,

        This is a weather alert for your subscribed location ({alert['data']['location']}).

        Current conditions:
        - Temperature: {alert['data']['temperature']}
        - Forecast: {alert['data']['forecast']}
        - WBGT: {alert['data']['wbgt']}

        Projection: {alert['data']['projection']}
        Reasons:
        {"; ".join(alert['data']['reasons']) if alert['data']['reasons'] else "No specific reasons identified."}

        Please take necessary precautions.

        Best regards,
        RunReady Team
        """
        success = mailer.send_lightning_alert(email, subject, body)
        if success:
            return {"status": "success", "info": f"Alert sent to {email}"}
        else:
            raise HTTPException(status_code=500, detail="SES failed. Check AWS Region/Identity.")

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


# @router.get("/alerts/check")
def check_alerts():
    """
    Called by cron/EventBridge to evaluate all active subscriptions
    against current weather data. Sends SES emails for breached thresholds.
    """
    # TODO Sprint 3:
    # 1. Load all active subscriptions from DB
    # 2. For each, call get_localized_weather()
    # 3. If WARNING, send email via SES (with cooldown to prevent spam)

    get_user_query = """
    SELECT id, email, lat, lng, label FROM alert_subscriptions
    WHERE is_active = TRUE
    """
    
    get_weather_snapshot_query = """
    SELECT raw_temperature, raw_forecast, raw_wbgt FROM weather_snapshots
    WHERE fetched_at  = (SELECT MAX(fetched_at) FROM weather_snapshots)
    """
    subscriptions = None
    latest_weather = None
    alert_list = dict()
    with get_db() as conn:
    # import psycopg2
    # from app.config import settings
    # with psycopg2.connect(settings.DATABASE_URL) as conn:
        with conn.cursor() as cur:
            cur.execute(get_user_query)
            subscriptions = cur.fetchall()
            cur.execute(get_weather_snapshot_query)
            latest_weather = cur.fetchone()
            conn.commit()

    temp_data, forecast_data, wbgt_data = latest_weather

    for sub in subscriptions:
        sub_id, email, lat, lng, label = sub
        result = check_run(lat, lng, temp_data, forecast_data, wbgt_data)
        result["email"] = email

        # print(result)
        # if result["status"] == "WARNING":
        if True:
            alert_list[sub_id] = result
    
    email_loop(alert_list)
    
    # return {
    #     "status": "successful",
    #     "alert_list": alert_list
    # }
