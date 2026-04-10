"""
F3: Weather Alerts (SES)
Email notifications when safety thresholds are breached for saved locations.
"""

from fastapi import APIRouter, Query
from pydantic import BaseModel

import json
from app.database import get_db
from app.services.weather import get_nearest, _handle_wbgt_value, WBGT_DANGER_THRESHOLD, RAIN_KEYWORDS

router = APIRouter()


class AlertSubscription(BaseModel):
    email: str
    lat: float
    lng: float
    label: str = ""  # e.g. "Bishan Park", "NUS Field"


def get_localized_weather(lat: float, lng: float) -> dict:
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
    lat: float = Query(..., description="User latitude"),
    lng: float = Query(..., description="User longitude"),
):

    weather = get_localized_weather(lat, lng)

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

    get_user_query = """
    SELECT id, email, lat, lng, label FROM alert_subscriptions
    WHERE active = TRUE
    """
    
    get_weather_snapshot_query = """
    SELECT raw_temperature, raw_forecast, raw_wbgt FROM weather_snapshots
    WHERE fetched_at  = (SELECT MAX(fetched_at) FROM weather_snapshots)
    """

    alert_list = dict()
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute(get_user_query)
            subscriptions = cur.fetchall()
            cur.execute(get_weather_snapshot_query)
            latest_weather = cur.fetchone()
            temp_data, forecast_data, wbgt_data = latest_weather

            for sub in subscriptions:
                sub_id, email, lat, lng, label = sub
                result = check_run(lat, lng)
                result["email"] = email

                if result["status"] == "WARNING":
                    alert_list[sub_id] = result
    
    with open("alerts_to_send.json", "a") as f:
        json.dump(alert_list, f, indent=2)


    # return {
    #     "status": "not_implemented",
    #     "message": "Alert checking requires DB subscriptions + SES. Target: Sprint 3.",
    # }
