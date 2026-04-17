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

    def test_plan_route_returns_routes(self):
        """Response is {routes: [...]} — not GeoJSON FeatureCollection."""
        resp = requests.get(
            f"{LIVE_API_BASE}/api/plan-route",
            params={"lat": 1.35, "lng": 103.82, "distance_km": 3},
            timeout=30,
        )
        data = resp.json()
        assert resp.status_code == 200
        assert "routes" in data
        assert len(data["routes"]) > 0

    def test_plan_route_response_schema(self):
        """Each route has all required fields with correct types."""
        resp = requests.get(
            f"{LIVE_API_BASE}/api/plan-route",
            params={"lat": 1.35, "lng": 103.82, "distance_km": 3},
            timeout=30,
        )
        route = resp.json()["routes"][0]
        assert isinstance(route["id"], int)
        assert isinstance(route["distance_km"], float)
        assert isinstance(route["coverage_pct"], float)
        assert isinstance(route["polyline"], str) and len(route["polyline"]) > 0
        assert isinstance(route["shelters_along_route"], int)

    def test_plan_route_coverage_pct_in_range(self):
        """coverage_pct must be between 0 and 100."""
        resp = requests.get(
            f"{LIVE_API_BASE}/api/plan-route",
            params={"lat": 1.35, "lng": 103.82, "distance_km": 3},
            timeout=30,
        )
        for route in resp.json()["routes"]:
            assert 0.0 <= route["coverage_pct"] <= 100.0

    def test_plan_route_loop(self):
        """Loop=true returns routes with realistic distance."""
        resp = requests.get(
            f"{LIVE_API_BASE}/api/plan-route",
            params={"lat": 1.35, "lng": 103.82, "distance_km": 5, "loop": True},
            timeout=30,
        )
        data = resp.json()
        assert resp.status_code == 200
        assert len(data["routes"]) > 0
        # Loop route distance should be > 0
        assert data["routes"][0]["distance_km"] > 0

    def test_plan_route_destination(self):
        """Destination mode returns exactly 1 point-to-point route."""
        resp = requests.get(
            f"{LIVE_API_BASE}/api/plan-route",
            params={
                "lat": 1.3138, "lng": 103.8420,
                "dest_lat": 1.3200, "dest_lng": 103.8500,
            },
            timeout=30,
        )
        data = resp.json()
        assert resp.status_code == 200
        assert len(data["routes"]) == 1
        assert data["routes"][0]["id"] == 1

    def test_plan_route_destination_schema(self):
        """Destination route also has coverage_pct and shelters_along_route."""
        resp = requests.get(
            f"{LIVE_API_BASE}/api/plan-route",
            params={
                "lat": 1.3138, "lng": 103.8420,
                "dest_lat": 1.3200, "dest_lng": 103.8500,
            },
            timeout=30,
        )
        route = resp.json()["routes"][0]
        assert "coverage_pct" in route
        assert "shelters_along_route" in route
        assert isinstance(route["shelters_along_route"], int)


@pytest.mark.e2e
class TestLinkwaysE2E:
    """Spatial: /api/linkways bounding box endpoint."""

    def test_linkways_returns_feature_collection(self):
        """Response is a valid GeoJSON FeatureCollection."""
        resp = requests.get(
            f"{LIVE_API_BASE}/api/linkways",
            params={"min_lat": 1.30, "min_lng": 103.80, "max_lat": 1.40, "max_lng": 103.90},
            timeout=15,
        )
        data = resp.json()
        assert resp.status_code == 200
        assert data["type"] == "FeatureCollection"
        assert "features" in data

    def test_linkways_features_have_geometry(self):
        """Each feature has a geometry and properties."""
        resp = requests.get(
            f"{LIVE_API_BASE}/api/linkways",
            params={"min_lat": 1.30, "min_lng": 103.80, "max_lat": 1.40, "max_lng": 103.90},
            timeout=15,
        )
        features = resp.json()["features"]
        assert len(features) > 0
        for f in features[:5]:  # check first 5
            assert f["type"] == "Feature"
            assert "geometry" in f
            assert "properties" in f
            assert "id" in f["properties"]

    def test_linkways_empty_bbox_returns_empty(self):
        """Bounding box with no linkways returns empty features list."""
        resp = requests.get(
            f"{LIVE_API_BASE}/api/linkways",
            params={"min_lat": 1.0, "min_lng": 103.0, "max_lat": 1.01, "max_lng": 103.01},
            timeout=15,
        )
        data = resp.json()
        assert resp.status_code == 200
        assert data["features"] == []


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
