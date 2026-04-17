"""
Unit tests for F1: PE Decision Engine (decision.py)
Tests the Go/No-Go safety logic with mocked weather data.
"""

import pytest
from unittest.mock import patch


# Helper to mock get_localized_weather with custom values
def _mock_weather(forecast="Fair", temperature=28.0, wbgt=28.0, area_name="Bishan"):
    return {
        "area_name": area_name,
        "temperature": temperature,
        "forecast": forecast,
        "wbgt": wbgt,
    }


@pytest.mark.unit
class TestDecisionEngine:
    """F1: check-run endpoint logic."""

    @patch("app.routers.decision.get_localized_weather")
    def test_safe_fair_weather(self, mock_weather, client):
        """SAFE when forecast is Fair and WBGT is normal."""
        mock_weather.return_value = _mock_weather(forecast="Fair", wbgt=28.0)
        resp = client.get("/api/check-run?lat=1.35&lng=103.82")
        data = resp.json()
        assert resp.status_code == 200
        assert data["status"] == "SAFE"
        assert len(data["data"]["reasons"]) == 0

    @patch("app.routers.decision.get_localized_weather")
    def test_warning_rain_forecast(self, mock_weather, client):
        """WARNING when forecast contains rain keywords."""
        mock_weather.return_value = _mock_weather(forecast="Thundery Showers", wbgt=28.0)
        resp = client.get("/api/check-run?lat=1.35&lng=103.82")
        data = resp.json()
        assert data["status"] == "WARNING"
        assert any("Forecast" in r for r in data["data"]["reasons"])

    @patch("app.routers.decision.get_localized_weather")
    def test_warning_high_wbgt(self, mock_weather, client):
        """WARNING when WBGT exceeds danger threshold (32°C)."""
        mock_weather.return_value = _mock_weather(forecast="Fair", wbgt=33.0)
        resp = client.get("/api/check-run?lat=1.35&lng=103.82")
        data = resp.json()
        assert data["status"] == "WARNING"
        assert any("WBGT" in r for r in data["data"]["reasons"])

    @patch("app.routers.decision.get_localized_weather")
    def test_warning_rain_and_high_wbgt(self, mock_weather, client):
        """WARNING with both rain and high WBGT — both reasons listed."""
        mock_weather.return_value = _mock_weather(forecast="Heavy Rain", wbgt=33.5)
        resp = client.get("/api/check-run?lat=1.35&lng=103.82")
        data = resp.json()
        assert data["status"] == "WARNING"
        assert len(data["data"]["reasons"]) == 2

    @patch("app.routers.decision.get_localized_weather")
    def test_wbgt_na_handled(self, mock_weather, client):
        """WBGT='NA' should not crash — returns SAFE with warning."""
        mock_weather.return_value = {
            "area_name": "Bishan",
            "temperature": 28.0,
            "forecast": "Fair",
            "wbgt": "NA",
        }
        resp = client.get("/api/check-run?lat=1.35&lng=103.82")
        data = resp.json()
        assert resp.status_code == 200
        # Should not crash — either SAFE or has a warning about WBGT
        assert data["status"] in ("SAFE", "WARNING", "ERROR")

    @patch("app.routers.decision.get_localized_weather")
    def test_wbgt_none_handled(self, mock_weather, client):
        """WBGT=None should not crash."""
        mock_weather.return_value = {
            "area_name": "Bishan",
            "temperature": 28.0,
            "forecast": "Fair",
            "wbgt": None,
        }
        resp = client.get("/api/check-run?lat=1.35&lng=103.82")
        data = resp.json()
        assert resp.status_code == 200
        assert data["status"] in ("SAFE", "WARNING", "ERROR")

    def test_lat_out_of_bounds(self, client):
        """lat=0 (outside Singapore) should return 400."""
        resp = client.get("/api/check-run?lat=0&lng=103.82")
        assert resp.status_code == 400

    def test_lng_out_of_bounds(self, client):
        """lng=0 (outside Singapore) should return 400."""
        resp = client.get("/api/check-run?lat=1.35&lng=0")
        assert resp.status_code == 400

    def test_lat_exactly_at_min_boundary_is_valid(self, client):
        """lat=1.15 is exactly on the boundary — should be accepted (200, not 400)."""
        with patch("app.routers.decision.get_localized_weather") as mock_weather:
            mock_weather.return_value = _mock_weather()
            resp = client.get("/api/check-run?lat=1.15&lng=103.82")
            assert resp.status_code == 200

    def test_lat_just_below_min_boundary_is_rejected(self, client):
        """lat=1.149 is just outside the boundary — should return 400."""
        resp = client.get("/api/check-run?lat=1.149&lng=103.82")
        assert resp.status_code == 400

    @patch("app.routers.decision.get_localized_weather")
    def test_wbgt_exactly_at_threshold_is_safe(self, mock_weather, client):
        """WBGT exactly 32.0 should be SAFE — threshold is strictly > 32.0."""
        mock_weather.return_value = _mock_weather(forecast="Fair", wbgt=32.0)
        resp = client.get("/api/check-run?lat=1.35&lng=103.82")
        data = resp.json()
        assert data["status"] == "SAFE"
        assert not any("WBGT" in r for r in data["data"]["reasons"])

    @patch("app.routers.decision.get_localized_weather")
    def test_warning_showers_forecast(self, mock_weather, client):
        """'Showers' keyword alone triggers WARNING."""
        mock_weather.return_value = _mock_weather(forecast="Showers")
        resp = client.get("/api/check-run?lat=1.35&lng=103.82")
        assert resp.json()["status"] == "WARNING"

    @patch("app.routers.decision.get_localized_weather")
    def test_warning_lightning_forecast(self, mock_weather, client):
        """'Lightning' keyword triggers WARNING."""
        mock_weather.return_value = _mock_weather(forecast="Lightning")
        resp = client.get("/api/check-run?lat=1.35&lng=103.82")
        assert resp.json()["status"] == "WARNING"

    @patch("app.routers.decision.get_localized_weather")
    def test_safe_non_rain_forecast(self, mock_weather, client):
        """'Windy' forecast does not contain any rain keyword — should be SAFE."""
        mock_weather.return_value = _mock_weather(forecast="Windy")
        resp = client.get("/api/check-run?lat=1.35&lng=103.82")
        assert resp.json()["status"] == "SAFE"

    @patch("app.routers.decision.get_localized_weather")
    def test_response_has_all_required_fields(self, mock_weather, client):
        """Response must include all contract fields."""
        mock_weather.return_value = _mock_weather()
        resp = client.get("/api/check-run?lat=1.35&lng=103.82")
        data = resp.json()
        assert "status" in data
        assert "warnings" in data
        for field in ["location", "temperature", "forecast", "wbgt", "projection", "reasons"]:
            assert field in data["data"], f"Missing field: {field}"

    @patch("app.routers.decision.get_localized_weather")
    def test_weather_exception_returns_error_status(self, mock_weather, client):
        """If weather service raises, response status should be ERROR (not 500)."""
        mock_weather.side_effect = Exception("NEA API timeout")
        resp = client.get("/api/check-run?lat=1.35&lng=103.82")
        assert resp.status_code == 200
        assert resp.json()["status"] == "ERROR"
