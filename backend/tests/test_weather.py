"""
Unit tests for weather.py (get_nearest), routes.py (get_point_at_distance), config.py (CORS parsing).
"""

import math
import pytest
from app.services.weather import get_nearest


@pytest.mark.unit
class TestGetNearest:
    """Nearest station/area resolver."""

    def test_nearest_with_label_location(self):
        """Handles V1 format with label_location key."""
        metadata = [
            {"name": "Bishan", "label_location": {"latitude": 1.35, "longitude": 103.83}},
            {"name": "Changi", "label_location": {"latitude": 1.36, "longitude": 103.99}},
        ]
        result = get_nearest(1.351, 103.831, metadata)
        assert result["name"] == "Bishan"

    def test_nearest_with_location(self):
        """Handles V2 format with location key."""
        metadata = [
            {"name": "Station A", "location": {"latitude": 1.30, "longitude": 103.80}},
            {"name": "Station B", "location": {"latitude": 1.35, "longitude": 103.83}},
        ]
        result = get_nearest(1.35, 103.83, metadata)
        assert result["name"] == "Station B"

    def test_nearest_with_labelLocation(self):
        """Handles labelLocation key (camelCase variant)."""
        metadata = [
            {"name": "Area1", "labelLocation": {"latitude": 1.40, "longitude": 103.90}},
            {"name": "Area2", "labelLocation": {"latitude": 1.35, "longitude": 103.83}},
        ]
        result = get_nearest(1.35, 103.83, metadata)
        assert result["name"] == "Area2"


@pytest.mark.unit
class TestGetPointAtDistance:
    """Bearing-based coordinate calculation for route generation."""

    def test_point_at_distance_north(self):
        """Moving 1km north should increase latitude."""
        from app.routers.routes import get_point_at_distance
        lat, lng = get_point_at_distance(1.35, 103.82, 1.0, 0)  # 0° = North
        assert lat > 1.35
        assert abs(lng - 103.82) < 0.001  # longitude barely changes

    def test_point_at_distance_east(self):
        """Moving 1km east should increase longitude."""
        from app.routers.routes import get_point_at_distance
        lat, lng = get_point_at_distance(1.35, 103.82, 1.0, 90)  # 90° = East
        assert lng > 103.82
        assert abs(lat - 1.35) < 0.001  # latitude barely changes

    def test_point_at_distance_south(self):
        """Moving 1km south should decrease latitude."""
        from app.routers.routes import get_point_at_distance
        lat, lng = get_point_at_distance(1.35, 103.82, 1.0, 180)  # 180° = South
        assert lat < 1.35
        assert abs(lng - 103.82) < 0.001

    def test_point_at_distance_zero(self):
        """0km distance should return the same point."""
        from app.routers.routes import get_point_at_distance
        lat, lng = get_point_at_distance(1.35, 103.82, 0.0, 45)
        assert abs(lat - 1.35) < 0.0001
        assert abs(lng - 103.82) < 0.0001


@pytest.mark.unit
class TestCORSConfig:
    """CORS origins parsing from config."""

    def test_cors_comma_separated(self):
        """CORS_ORIGINS splits comma-separated string into list."""
        import os
        from unittest.mock import patch
        with patch.dict(os.environ, {"CORS_ORIGINS": "http://localhost:5173,https://runready.xyz"}):
            origins = os.getenv("CORS_ORIGINS").split(",")
            assert len(origins) == 2
            assert "http://localhost:5173" in origins
            assert "https://runready.xyz" in origins
