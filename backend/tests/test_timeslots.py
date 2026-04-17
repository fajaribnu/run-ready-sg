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

    def test_label_boundaries(self):
        """Exact boundary values map to the correct label."""
        assert get_label(80) == "Best"   # exactly 80 — threshold is >=80
        assert get_label(79) == "Good"   # just below Best
        assert get_label(60) == "Good"   # exactly 60
        assert get_label(59) == "Okay"   # just below Good
        assert get_label(40) == "Okay"   # exactly 40
        assert get_label(39) == "Poor"   # just below Okay


@pytest.mark.unit
class TestScoreWindowBoundaries:
    """WBGT boundary values in score_window — tests the exact thresholds."""

    def test_wbgt_exactly_33_not_worst_tier(self):
        """WBGT=33.0 is NOT >33, so only -30 penalty (not -50)."""
        assert score_window("Fair", 33.0) == 70  # 100 - 30

    def test_wbgt_just_above_33_worst_tier(self):
        """WBGT=33.1 is >33, so -50 penalty."""
        assert score_window("Fair", 33.1) == 50  # 100 - 50

    def test_wbgt_exactly_32_middle_tier(self):
        """WBGT=32.0 is NOT >32, so only -10 penalty (>30 tier)."""
        assert score_window("Fair", 32.0) == 90  # 100 - 10

    def test_wbgt_exactly_28_no_penalty_no_bonus(self):
        """WBGT=28.0 is NOT <28, so no bonus and no penalty."""
        assert score_window("Fair", 28.0) == 100

    def test_wbgt_just_below_28_gets_bonus(self):
        """WBGT=27.9 is <28 — bonus of +10."""
        assert score_window("Fair", 27.9) == 110


@pytest.mark.unit
class TestScoreWindowForecasts:
    """Rain keyword penalties in score_window."""

    def test_lightning_penalty(self):
        """'Lightning' forecast → -80 penalty."""
        assert score_window("Lightning", 29.0) == 20  # 100 - 80

    def test_heavy_rain_penalty(self):
        """'Heavy Rain' → -60 penalty."""
        assert score_window("Heavy Rain", 29.0) == 40  # 100 - 60

    def test_showers_penalty(self):
        """'Showers' alone → -60 penalty."""
        assert score_window("Showers", 29.0) == 40  # 100 - 60

    def test_partly_cloudy_penalty(self):
        """'Partly Cloudy' contains 'Cloudy' → -5 penalty."""
        assert score_window("Partly Cloudy", 29.0) == 95  # 100 - 5

    def test_fair_no_penalty(self):
        """'Fair' has no keyword match → 0 penalty (WBGT 29 also no penalty)."""
        assert score_window("Fair", 29.0) == 100

    def test_score_clamped_at_zero(self):
        """Score never goes below 0 even with stacked penalties."""
        assert score_window("Thundery Showers", 34.0) == 0  # 100-80-50=-30 → 0
