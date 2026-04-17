"""
Shared fixtures for RunReady SG tests.
"""

import pytest
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient


# --------------- App client (mocked DB) ---------------

@pytest.fixture
def client():
    """FastAPI TestClient with DB pool mocked out (for unit tests)."""
    with patch("app.database.init_db"), patch("app.database.close_db"):
        from app.main import app
        with TestClient(app) as c:
            yield c


# --------------- App client (real RDS) ---------------

@pytest.fixture
def live_client():
    """FastAPI TestClient connected to real RDS (for integration tests)."""
    from app.main import app
    with TestClient(app) as c:
        yield c


# --------------- Mock weather data ---------------

MOCK_FORECAST_DATA = {
    "area_metadata": [
        {"name": "Bishan", "label_location": {"latitude": 1.3526, "longitude": 103.8352}},
        {"name": "Changi", "label_location": {"latitude": 1.3586, "longitude": 103.9899}},
    ],
    "items": [
        {
            "forecasts": [
                {"area": "Bishan", "forecast": "Fair"},
                {"area": "Changi", "forecast": "Thundery Showers"},
            ]
        }
    ],
}

MOCK_TEMP_DATA = {
    "metadata": {
        "stations": [
            {"id": "S50", "name": "Clementi", "location": {"latitude": 1.3337, "longitude": 103.7768}},
        ]
    },
    "items": [{"readings": [{"station_id": "S50", "value": 28.5}]}],
}

MOCK_WBGT_DATA = {
    "data": {
        "records": [
            {
                "item": {
                    "readings": [
                        {
                            "name": "Bishan",
                            "location": {"latitude": 1.3526, "longitude": 103.8352},
                            "wbgt": "29.5",
                        }
                    ]
                }
            }
        ]
    }
}

MOCK_WBGT_NA_DATA = {
    "data": {
        "records": [
            {
                "item": {
                    "readings": [
                        {
                            "name": "Bishan",
                            "location": {"latitude": 1.3526, "longitude": 103.8352},
                            "wbgt": "NA",
                        }
                    ]
                }
            }
        ]
    }
}


# --------------- Live server URL ---------------

LIVE_API_BASE = "https://api.runready.xyz"
