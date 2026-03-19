"""
F1: PE Decision Engine
Go/No-Go safety check for a GPS location using live weather + WBGT data.
"""

from fastapi import APIRouter, Query
from app.services.weather import get_localized_weather

router = APIRouter()

# Safety thresholds (easy to adjust)
WBGT_DANGER_THRESHOLD = 32.0
RAIN_KEYWORDS = ["Rain", "Showers", "Thundery", "Lightning"]


@router.get("/check-run")
def check_run(
    lat: float = Query(..., description="User latitude"),
    lng: float = Query(..., description="User longitude"),
):
    """
    Returns a SAFE/WARNING decision based on localized weather data.
    This is the core decision engine — all other features build on top of it.
    """
    try:
        weather = get_localized_weather(lat, lng)

        is_safe = True
        projection = "Conditions holding steady."
        reasons = []

        # Rule 1: Rain/storm check
        if any(word in weather["forecast"] for word in RAIN_KEYWORDS):
            is_safe = False
            projection = "Rain expected shortly. Seek shelter."
            reasons.append(f"Forecast: {weather['forecast']}")

        # Rule 2: Heat stress check
        if weather["wbgt"] > WBGT_DANGER_THRESHOLD:
            is_safe = False
            projection = "Heat stress rising. Hydrate immediately."
            reasons.append(f"WBGT: {weather['wbgt']}°C (threshold: {WBGT_DANGER_THRESHOLD}°C)")

        return {
            "status": "SAFE" if is_safe else "WARNING",
            "data": {
                "location": f"Lat: {lat:.3f}, Lng: {lng:.3f} (Near {weather['area_name']})",
                "temperature": f"{weather['temperature']}°C",
                "forecast": weather["forecast"],
                "wbgt": f"{weather['wbgt']}°C",
                "projection": projection,
                "reasons": reasons,
            },
        }

    except Exception as e:
        return {"error": "Internal Engine Error", "details": str(e)}
