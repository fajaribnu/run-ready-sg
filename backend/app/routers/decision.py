"""
F1: PE Decision Engine
Go/No-Go safety check for a GPS location using live weather + WBGT data.
"""

from fastapi import APIRouter, Query, HTTPException, Request
from app.services.weather import get_localized_weather

router = APIRouter()

WBGT_DANGER_THRESHOLD = 32.0
RAIN_KEYWORDS = ["Rain", "Showers", "Thundery", "Lightning"]

SG_LAT_MIN = 1.15
SG_LAT_MAX = 1.47
SG_LNG_MIN = 103.6
SG_LNG_MAX = 104.1


def _handle_wbgt_value(wbgt_raw):
    if wbgt_raw in (None, "NA", "N/A", ""):
        return None, "Unavailable"

    try:
        wbgt_numeric = float(wbgt_raw)
        return wbgt_numeric, f"{wbgt_numeric:.1f}°C"
    except (ValueError, TypeError):
        return None, "Unavailable"


@router.get("/check-run")
def check_run(
    lat: float = Query(..., description="User latitude"),
    lng: float = Query(..., description="User longitude"),
):
    if not (SG_LAT_MIN <= lat <= SG_LAT_MAX and SG_LNG_MIN <= lng <= SG_LNG_MAX):
        raise HTTPException(
            status_code=400,
            detail="lat/lng must be within Singapore bounds (1.15-1.47, 103.6-104.1)"
        )

    try:
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

    except HTTPException:
        raise

    except Exception as e:
        return {
            "status": "ERROR",
            "data": {
                "location": f"Lat: {lat:.3f}, Lng: {lng:.3f}",
                "temperature": "Unavailable",
                "forecast": "Unavailable",
                "wbgt": "Unavailable",
                "projection": "Weather services temporarily unavailable.",
                "reasons": [],
            },
            "warnings": [f"Upstream service fallback triggered: {str(e)}"],
        }
