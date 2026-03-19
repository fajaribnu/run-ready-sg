"""
Weather data ingestion pipeline.
Fetches latest NEA data and stores snapshots in PostgreSQL.

Usage:
  - Cron:   python -m ingestion.ingest_weather
  - Lambda: import and call run_ingestion()
"""

import sys
import os
import json
import requests
from datetime import datetime, timezone

# Allow imports from parent when run as script
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.config import settings
from app.database import init_db, close_db, get_db


def fetch_all_weather_data() -> dict:
    """Fetch temperature, forecast, and WBGT from NEA APIs."""
    endpoints = {
        "temperature": f"{settings.NEA_V1_BASE}/air-temperature",
        "forecast": f"{settings.NEA_V1_BASE}/2-hour-weather-forecast",
        "wbgt": f"{settings.NEA_V2_BASE}/weather?api=wbgt",
    }
    results = {}
    for key, url in endpoints.items():
        res = requests.get(url, headers=settings.nea_headers, timeout=15)
        res.raise_for_status()
        results[key] = res.json()
    return results


def store_snapshot(data: dict):
    """Store a weather snapshot into the weather_snapshots table."""
    query = """
        INSERT INTO weather_snapshots (fetched_at, raw_temperature, raw_forecast, raw_wbgt)
        VALUES (%s, %s, %s, %s)
        ON CONFLICT (fetched_at) DO NOTHING;
    """
    now = datetime.now(timezone.utc)
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute(
                query,
                (
                    now,
                    json.dumps(data.get("temperature", {})),
                    json.dumps(data.get("forecast", {})),
                    json.dumps(data.get("wbgt", {})),
                ),
            )


def run_ingestion():
    """
    Main entry point — call this from cron or Lambda.
    Returns a status dict for logging.
    """
    try:
        data = fetch_all_weather_data()
        store_snapshot(data)
        return {"status": "ok", "timestamp": datetime.now(timezone.utc).isoformat()}
    except Exception as e:
        return {"status": "error", "details": str(e)}


# --- Lambda handler (thin wrapper) ---
def lambda_handler(event, context):
    """AWS Lambda entry point. EventBridge triggers this on schedule."""
    init_db()
    result = run_ingestion()
    close_db()
    return result


# --- CLI entry point (for cron) ---
if __name__ == "__main__":
    init_db()
    result = run_ingestion()
    close_db()
    print(json.dumps(result, indent=2))
