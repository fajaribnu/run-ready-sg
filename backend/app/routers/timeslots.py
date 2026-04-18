"""
F5: Smart Time-Slot Finder
Suggests the safest time windows for outdoor activity based on forecast trends.
"""

from datetime import datetime, timezone, timedelta

from fastapi import APIRouter, Depends, Query
from app.auth import AuthenticatedUser, require_authenticated_user
from app.services.weather import fetch_forecast, fetch_wbgt, get_nearest

SGT = timezone(timedelta(hours=8))

router = APIRouter()

RAIN_KEYWORDS = ["Rain", "Showers", "Thundery", "Lightning"]

# Scoring weights (easy to tune)
RAIN_PENALTY = {
    "Thundery": -80,
    "Lightning": -80,
    "Heavy Rain": -60,
    "Showers": -60,
    "Light Rain": -30,
    "Cloudy": -5,
}


def score_window(forecast: str, wbgt: float) -> int:
    """Score a time window from 0-100. Higher = safer."""
    score = 100

    # Rain penalty
    for keyword, penalty in RAIN_PENALTY.items():
        if keyword in forecast:
            score += penalty
            break

    # WBGT penalty
    if wbgt > 33:
        score -= 50
    elif wbgt > 32:
        score -= 30
    elif wbgt > 30:
        score -= 10
    elif wbgt < 28:
        score += 10  # Bonus for cool conditions

    return max(0, score)


def get_label(score: int) -> str:
    if score >= 80:
        return "Best"
    elif score >= 60:
        return "Good"
    elif score >= 40:
        return "Okay"
    else:
        return "Poor"


@router.get("/best-times")
def best_times(
    lat: float = Query(..., description="User latitude"),
    lng: float = Query(..., description="User longitude"),
    duration_min: int = Query(45, description="Desired activity duration in minutes"),
    user: AuthenticatedUser | None = Depends(require_authenticated_user),
):
    """
    Scans today's forecast periods and returns the safest time windows
    for outdoor activity at the given location.
    """
    try:
        forecast_data = fetch_forecast()
        wbgt_data = fetch_wbgt()

        # Find nearest area to user
        nearest_area = get_nearest(lat, lng, forecast_data["area_metadata"])
        area_name = nearest_area["name"]

        # Get forecast for user's area
        my_forecast = next(
            f["forecast"]
            for f in forecast_data["items"][0]["forecasts"]
            if f["area"] == area_name
        )

        # Get nearest WBGT
        wbgt_readings = wbgt_data["data"]["records"][0]["item"]["readings"]
        nearest_wbgt = get_nearest(lat, lng, wbgt_readings)
        current_wbgt = float(nearest_wbgt.get("wbgt", "29.0"))
        if nearest_wbgt.get("wbgt") == "NA":
            current_wbgt = 29.0

        # Generate candidate windows throughout the day
        # In a full implementation, this would use the 24-hour or 4-day forecast
        # For MVP, we extrapolate from current 2-hour data with time-of-day adjustments
        windows = []
        time_slots = [
            ("06:00", 27.0, -2.0),   # Early morning: cooler
            ("06:30", 27.5, -1.5),
            ("07:00", 28.0, -1.0),
            ("07:30", 28.5, -0.5),
            ("08:00", 29.0, 0.0),
            ("08:30", 30.0, 0.5),
            ("09:00", 31.0, 1.0),
            ("16:00", 31.0, 0.5),
            ("16:30", 30.5, 0.0),
            ("17:00", 30.0, -0.5),
            ("17:30", 29.5, -1.0),
            ("18:00", 29.0, -1.5),
            ("18:30", 28.5, -2.0),
        ]

        now_sgt = datetime.now(SGT).strftime("%H:%M")

        for start_time, base_wbgt, wbgt_offset in time_slots:
            # Skip slots that have already started today
            if start_time <= now_sgt:
                continue

            estimated_wbgt = current_wbgt + wbgt_offset
            # Use current forecast as proxy (MVP simplification)
            score = score_window(my_forecast, estimated_wbgt)

            hours = int(start_time.split(":")[0])
            mins = int(start_time.split(":")[1])
            end_mins = hours * 60 + mins + duration_min
            end_time = f"{end_mins // 60:02d}:{end_mins % 60:02d}"

            windows.append({
                "start_time": start_time,
                "end_time": end_time,
                "forecast": my_forecast,
                "wbgt": round(estimated_wbgt, 1),
                "score": score,
                "label": get_label(score),
            })

        # Sort by score descending, take top 3
        windows.sort(key=lambda w: w["score"], reverse=True)
        top_windows = windows[:3]

        # If no slots remain today (e.g. user checks at 10pm), return empty with a message
        if not top_windows:
            return {
                "location": f"Near {area_name}",
                "requested_duration_min": duration_min,
                "windows": [],
                "message": "No more recommended slots for today. Check back tomorrow morning!",
            }

        for i, w in enumerate(top_windows):
            w["rank"] = i + 1

        return {
            "location": f"Near {area_name}",
            "requested_duration_min": duration_min,
            "windows": top_windows,
        }

    except Exception as e:
        return {"error": "Time slot calculation failed", "details": str(e)}
