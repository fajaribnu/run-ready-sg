"""
E2E tests — hit the live deployed server (https://api.runready.xyz).
Run with: pytest -m e2e
Requires: live server running on EC2.
"""

import time
import pytest
import requests
from tests.conftest import LIVE_API_BASE


@pytest.mark.e2e
class TestHealthE2E:
    """Server availability."""

    def test_health_returns_ok(self):
        resp = requests.get(f"{LIVE_API_BASE}/health", timeout=10)
        assert resp.status_code == 200
        assert resp.json()["status"] == "ok"


@pytest.mark.e2e
class TestDecisionE2E:
    """F1: Decision engine end-to-end with live NEA data."""

    def test_check_run_returns_decision(self):
        resp = requests.get(
            f"{LIVE_API_BASE}/api/check-run",
            params={"lat": 1.35, "lng": 103.82},
            timeout=15,
        )
        data = resp.json()
        assert resp.status_code == 200
        assert data["status"] in ("SAFE", "WARNING", "ERROR")
        assert "temperature" in data["data"]
        assert "forecast" in data["data"]
        assert "wbgt" in data["data"]

    def test_check_run_rejects_invalid_bounds(self):
        resp = requests.get(
            f"{LIVE_API_BASE}/api/check-run",
            params={"lat": 0, "lng": 0},
            timeout=15,
        )
        assert resp.status_code == 400


@pytest.mark.e2e
class TestShelterE2E:
    """F2: Shelter finder end-to-end with real PostGIS."""

    def test_find_shelter_returns_results(self):
        resp = requests.get(
            f"{LIVE_API_BASE}/api/find-shelter",
            params={"lat": 1.35, "lng": 103.82, "limit": 3},
            timeout=15,
        )
        data = resp.json()
        assert resp.status_code == 200
        assert len(data["shelters"]) == 3
        assert all("distance_m" in s for s in data["shelters"])


@pytest.mark.e2e
class TestBestTimesE2E:
    """F5: Time-slot finder end-to-end."""

    def test_best_times_returns_windows(self):
        resp = requests.get(
            f"{LIVE_API_BASE}/api/best-times",
            params={"lat": 1.35, "lng": 103.82},
            timeout=15,
        )
        data = resp.json()
        assert resp.status_code == 200
        assert "windows" in data
        assert len(data["windows"]) > 0
        window = data["windows"][0]
        assert "start_time" in window
        assert "score" in window
        assert "label" in window


@pytest.mark.e2e
class TestRouteE2E:
    """F4: Route planner end-to-end with OneMap."""

    def test_plan_route_returns_geojson(self):
        resp = requests.get(
            f"{LIVE_API_BASE}/api/plan-route",
            params={"lat": 1.35, "lng": 103.82, "distance_km": 3},
            timeout=30,
        )
        data = resp.json()
        assert resp.status_code == 200
        assert data["type"] == "FeatureCollection"
        assert len(data["features"]) > 0
        feature = data["features"][0]
        assert feature["geometry"]["type"] == "LineString"
        assert "distance_km" in feature["properties"]


@pytest.mark.e2e
class TestAlertsE2E:
    """F3: Alerts endpoint contract."""

    def test_alerts_subscribe_accepts_body(self):
        resp = requests.post(
            f"{LIVE_API_BASE}/api/alerts/subscribe",
            json={"email": "test@example.com", "lat": 1.35, "lng": 103.82, "label": "Test"},
            timeout=10,
        )
        data = resp.json()
        assert resp.status_code == 200
        assert "subscription" in data or "status" in data


@pytest.mark.e2e
class TestLatencyE2E:
    """All endpoints should respond within 15 seconds."""

    def test_all_endpoints_under_15s(self):
        endpoints = [
            ("GET", f"{LIVE_API_BASE}/health", {}),
            ("GET", f"{LIVE_API_BASE}/api/check-run", {"lat": 1.35, "lng": 103.82}),
            ("GET", f"{LIVE_API_BASE}/api/find-shelter", {"lat": 1.35, "lng": 103.82, "limit": 3}),
            ("GET", f"{LIVE_API_BASE}/api/best-times", {"lat": 1.35, "lng": 103.82}),
        ]
        for method, url, params in endpoints:
            start = time.time()
            resp = requests.get(url, params=params, timeout=15)
            elapsed = time.time() - start
            assert resp.status_code == 200, f"{url} returned {resp.status_code}"
            assert elapsed < 15, f"{url} took {elapsed:.1f}s (>15s)"
