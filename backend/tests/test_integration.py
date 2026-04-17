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
