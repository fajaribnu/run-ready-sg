"""
Integration tests — hit real RDS database.
Run with: pytest -m integration
Requires: backend .env with valid RDS credentials.
"""

import pytest
from unittest.mock import patch


@pytest.mark.integration
class TestShelterEndpoint:
    """F2: /api/find-shelter against real PostGIS data."""

    def test_returns_shelters(self, live_client):
        """Should return shelters from the database."""
        resp = live_client.get("/api/find-shelter?lat=1.35&lng=103.82&limit=3")
        data = resp.json()
        assert resp.status_code == 200
        assert "shelters" in data
        assert len(data["shelters"]) > 0

    def test_shelters_ordered_by_distance(self, live_client):
        """Closest shelter should be first."""
        resp = live_client.get("/api/find-shelter?lat=1.35&lng=103.82&limit=5")
        shelters = resp.json()["shelters"]
        distances = [s["distance_m"] for s in shelters]
        assert distances == sorted(distances)

    def test_shelter_limit_respected(self, live_client):
        """limit=2 should return exactly 2 shelters."""
        resp = live_client.get("/api/find-shelter?lat=1.35&lng=103.82&limit=2")
        shelters = resp.json()["shelters"]
        assert len(shelters) == 2

    def test_shelter_response_schema(self, live_client):
        """Each shelter must have required fields."""
        resp = live_client.get("/api/find-shelter?lat=1.35&lng=103.82&limit=1")
        shelter = resp.json()["shelters"][0]
        required_fields = ["name", "type", "lat", "lng", "distance_m", "walk_time_min"]
        for field in required_fields:
            assert field in shelter, f"Missing field: {field}"

    def test_shelter_types_valid(self, live_client):
        """Shelter types should be one of the known categories."""
        resp = live_client.get("/api/find-shelter?lat=1.35&lng=103.82&limit=10")
        valid_types = {"HDB", "MRT", "CC", "PUBLIC"}
        for shelter in resp.json()["shelters"]:
            assert shelter["type"] in valid_types, f"Unknown type: {shelter['type']}"


@pytest.mark.integration
class TestSpatialQueries:
    """PostGIS spatial query verification."""

    def test_shelters_within_reasonable_distance(self, live_client):
        """Nearest shelters should be within 5km for any SG location."""
        resp = live_client.get("/api/find-shelter?lat=1.35&lng=103.82&limit=1")
        shelter = resp.json()["shelters"][0]
        assert shelter["distance_m"] < 5000

    def test_different_locations_different_results(self, live_client):
        """Querying different locations should return different nearest shelters."""
        resp1 = live_client.get("/api/find-shelter?lat=1.30&lng=103.80&limit=1")
        resp2 = live_client.get("/api/find-shelter?lat=1.40&lng=103.90&limit=1")
        s1 = resp1.json()["shelters"][0]
        s2 = resp2.json()["shelters"][0]
        # Different locations should have different nearest shelter coords
        assert (s1["lat"], s1["lng"]) != (s2["lat"], s2["lng"])


@pytest.mark.integration
class TestDBConnection:
    """Database connectivity checks."""

    def test_db_connection_works(self, live_client):
        """Health check passes when DB is reachable."""
        resp = live_client.get("/health")
        assert resp.status_code == 200
        assert resp.json()["status"] == "ok"


@pytest.mark.integration
class TestLinkwaysEndpoint:
    """Spatial: /api/linkways against real covered_linkways table."""

    def test_linkways_returns_feature_collection(self, live_client):
        """Wide bounding box returns a GeoJSON FeatureCollection."""
        resp = live_client.get("/api/linkways", params={
            "min_lat": 1.29, "min_lng": 103.79,
            "max_lat": 1.46, "max_lng": 103.99,
        })
        data = resp.json()
        assert resp.status_code == 200
        assert data["type"] == "FeatureCollection"
        assert "features" in data
        assert len(data["features"]) > 0

    def test_linkways_features_schema(self, live_client):
        """Each feature has id, name in properties and a valid geometry."""
        resp = live_client.get("/api/linkways", params={
            "min_lat": 1.29, "min_lng": 103.79,
            "max_lat": 1.46, "max_lng": 103.99,
        })
        feature = resp.json()["features"][0]
        assert feature["type"] == "Feature"
        assert "id" in feature["properties"]
        assert "name" in feature["properties"]
        assert feature["geometry"]["type"] in ("LineString", "MultiLineString")

    def test_linkways_empty_bbox_returns_empty(self, live_client):
        """Tiny bounding box outside Singapore returns empty features."""
        resp = live_client.get("/api/linkways", params={
            "min_lat": 1.0, "min_lng": 103.0,
            "max_lat": 1.01, "max_lng": 103.01,
        })
        data = resp.json()
        assert resp.status_code == 200
        assert data["features"] == []


@pytest.mark.integration
class TestRouteCoverage:
    """PostGIS coverage_pct and shelters_along_route calculations."""

    def test_calculate_route_coverage_returns_float(self, live_client):
        """coverage_pct is a float between 0 and 100."""
        from app.services.spatial import calculate_route_coverage
        geojson = {
            "type": "LineString",
            "coordinates": [
                [103.8420, 1.3138],
                [103.8450, 1.3160],
                [103.8500, 1.3200],
            ],
        }
        result = calculate_route_coverage(geojson)
        assert isinstance(result, float)
        assert 0.0 <= result <= 100.0

    def test_count_shelters_along_route_returns_int(self, live_client):
        """shelters_along_route is a non-negative integer."""
        from app.services.spatial import count_shelters_along_route
        geojson = {
            "type": "LineString",
            "coordinates": [
                [103.8420, 1.3138],
                [103.8450, 1.3160],
                [103.8500, 1.3200],
            ],
        }
        result = count_shelters_along_route(geojson)
        assert isinstance(result, int)
        assert result >= 0

    def test_shelters_along_dense_area_nonzero(self, live_client):
        """A route through central Singapore should pass by at least 1 shelter."""
        from app.services.spatial import count_shelters_along_route
        # Bishan area — dense HDB blocks
        geojson = {
            "type": "LineString",
            "coordinates": [
                [103.8352, 1.3500],
                [103.8380, 1.3520],
                [103.8410, 1.3540],
            ],
        }
        result = count_shelters_along_route(geojson)
        assert result > 0
