"""
Unit tests for F5: Smart Time-Slot Finder (timeslots.py)
Tests scoring logic and label mapping.
"""

import pytest
from app.routers.timeslots import score_window, get_label


@pytest.mark.unit
class TestScoreWindow:
    """Scoring function for time windows."""

    def test_fair_cool_bonus(self):
        """Fair weather + cool WBGT (<28) gets bonus → 110."""
        assert score_window("Fair", 27.0) == 110

    def test_thundery_extreme_heat(self):
        """Thundery + WBGT>33 → clamped to 0."""
        score = score_window("Thundery Showers", 33.5)
        assert score == 0

    def test_cloudy_normal_wbgt(self):
        """Cloudy (-5 penalty) + normal WBGT (28-30) → 95."""
        assert score_window("Cloudy", 29.0) == 95

    def test_light_rain_moderate_heat(self):
        """Light Rain (-30) + WBGT 31 (-10) → 60."""
        assert score_window("Light Rain", 31.0) == 60

    def test_fair_dangerous_wbgt(self):
        """Fair weather but WBGT>33 → 50."""
        assert score_window("Fair", 33.5) == 50


@pytest.mark.unit
class TestGetLabel:
    """Label mapping based on score."""

    def test_label_best(self):
        assert get_label(85) == "Best"
        assert get_label(100) == "Best"

    def test_label_good(self):
        assert get_label(60) == "Good"
        assert get_label(79) == "Good"

    def test_label_okay(self):
        assert get_label(40) == "Okay"
        assert get_label(59) == "Okay"

    def test_label_poor(self):
        assert get_label(0) == "Poor"
        assert get_label(39) == "Poor"
