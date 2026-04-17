"""
Weather service — single source of truth for all NEA API interactions.
Handles both V1 (temperature, forecast) and V2 (WBGT) endpoints.
"""

import math
import requests
from app.config import settings


def get_nearest(lat: float, lng: float, metadata_list: list) -> dict:
    """Find the nearest station/area to a given lat/lng using Euclidean distance."""
    nearest = None
    shortest_dist = float("inf")

    for item in metadata_list:
        if "labelLocation" in item:
            item_lat = float(item["labelLocation"]["latitude"])
            item_lng = float(item["labelLocation"]["longitude"])
        elif "label_location" in item:
            item_lat = float(item["label_location"]["latitude"])
            item_lng = float(item["label_location"]["longitude"])
        else:
            item_lat = float(item["location"]["latitude"])
            item_lng = float(item["location"]["longitude"])

        dist = math.sqrt((lat - item_lat) ** 2 + (lng - item_lng) ** 2)
        if dist < shortest_dist:
            shortest_dist = dist
            nearest = item

    return nearest


def fetch_temperature() -> dict:
    """Fetch real-time air temperature from NEA V1 API."""
    url = f"{settings.NEA_V1_BASE}/air-temperature"
    res = requests.get(url, headers=settings.nea_headers, timeout=10)
    res.raise_for_status()
    return res.json()


def fetch_forecast() -> dict:
    """Fetch 2-hour weather forecast from NEA V1 API."""
    url = f"{settings.NEA_V1_BASE}/2-hour-weather-forecast"
    res = requests.get(url, headers=settings.nea_headers, timeout=10)
    res.raise_for_status()
    return res.json()


def fetch_wbgt() -> dict:
    """Fetch WBGT heat stress data from NEA V2 API."""
    url = f"{settings.NEA_V2_BASE}/weather?api=wbgt"
    res = requests.get(url, headers=settings.nea_headers, timeout=10)
    res.raise_for_status()
    return res.json()


def get_localized_weather(lat: float, lng: float) -> dict:
    """
    Fetch all weather data and resolve to the nearest station for a given location.
    Returns a unified dict regardless of V1/V2 API differences.
    """
    temp_data = fetch_temperature()
    forecast_data = fetch_forecast()
    wbgt_data = fetch_wbgt()

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

    # --- ADDED ALERT LOGIC ---
    # Detects lightning risk keywords in the forecast string
    danger_keywords = ["thundery showers", "heavy thundery showers"]
    is_danger = any(k in my_forecast.lower() for k in danger_keywords)

    return {
        "area_name": nearest_area["name"],
        "temperature": float(my_temp),
        "forecast": my_forecast,
        "wbgt": float(my_wbgt),
        "warning_active": is_danger  # True if thundery showers detected
    }
