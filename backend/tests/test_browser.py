"""
Browser E2E tests using Playwright.
Tests the full user experience on the live deployed frontend.

Run with:
    pip install pytest-playwright
    playwright install chromium
    pytest -m browser --headed    (to see the browser)
    pytest -m browser             (headless)
"""

import pytest
from playwright.sync_api import Page, expect

SITE_URL = "https://runready.xyz"


@pytest.mark.browser
class TestDashboardPage:
    """Home page loads and shows the check-run UI."""

    def test_page_loads_with_title(self, page: Page):
        """App loads and shows the hero text."""
        page.goto(SITE_URL, wait_until="networkidle")
        expect(page.locator("text=Ready for your")).to_be_visible(timeout=10000)
        expect(page.locator("text=daily run")).to_be_visible()

    def test_check_run_button_visible(self, page: Page):
        """The 'Should I run now?' button is visible."""
        page.goto(SITE_URL, wait_until="networkidle")
        button = page.locator("button", has_text="Should I run now?")
        expect(button).to_be_visible(timeout=10000)

    def test_check_run_flow(self, page: Page):
        """Clicking the button triggers a check and shows SAFE or WARNING."""
        # Grant geolocation so the app doesn't fall back
        page.context.grant_permissions(["geolocation"])
        page.context.set_geolocation({"latitude": 1.3521, "longitude": 103.8198})
        page.goto(SITE_URL, wait_until="networkidle")

        # Click the check button
        button = page.locator("button", has_text="Should I run now?")
        button.click()

        # Should show "Checking conditions..." while loading
        expect(page.locator("text=Checking conditions")).to_be_visible(timeout=5000)

        # Wait for result — either SAFE or WARNING text appears
        result = page.locator("text=/SAFE|WARNING/i")
        expect(result).to_be_visible(timeout=20000)

    def test_check_run_shows_weather_data(self, page: Page):
        """After checking, weather details (temperature, forecast) are shown."""
        page.context.grant_permissions(["geolocation"])
        page.context.set_geolocation({"latitude": 1.3521, "longitude": 103.8198})
        page.goto(SITE_URL, wait_until="networkidle")

        page.locator("button", has_text="Should I run now?").click()

        # Wait for result card to appear
        page.locator("text=/SAFE|WARNING/i").wait_for(timeout=20000)

        # Should show temperature with °C
        expect(page.locator("text=/\\d+.*°C/")).to_be_visible(timeout=5000)


@pytest.mark.browser
class TestNavigation:
    """Bottom navigation bar works correctly."""

    def test_nav_bar_visible(self, page: Page):
        """Bottom nav shows all 4 tabs."""
        page.goto(SITE_URL, wait_until="networkidle")
        nav = page.locator("nav")
        expect(nav).to_be_visible(timeout=10000)

        for label in ["Home", "Shelter", "Route", "Time"]:
            expect(nav.locator(f"text={label}")).to_be_visible()

    def test_navigate_to_shelter(self, page: Page):
        """Tapping Shelter tab loads the shelter map view."""
        page.context.grant_permissions(["geolocation"])
        page.context.set_geolocation({"latitude": 1.3521, "longitude": 103.8198})
        page.goto(SITE_URL, wait_until="networkidle")

        page.locator("nav button", has_text="Shelter").click()
        # Shelter view has a map container
        expect(page.locator(".leaflet-container")).to_be_visible(timeout=15000)

    def test_navigate_to_route(self, page: Page):
        """Tapping Route tab loads the route planner view."""
        page.context.grant_permissions(["geolocation"])
        page.context.set_geolocation({"latitude": 1.3521, "longitude": 103.8198})
        page.goto(SITE_URL, wait_until="networkidle")

        page.locator("nav button", has_text="Route").click()
        # Route view has a map and a planning panel
        expect(page.locator(".leaflet-container")).to_be_visible(timeout=15000)

    def test_navigate_to_time(self, page: Page):
        """Tapping Time tab loads the optimal window view."""
        page.goto(SITE_URL, wait_until="networkidle")

        page.locator("nav button", has_text="Time").click()
        expect(page.locator("text=Optimal Window")).to_be_visible(timeout=10000)


@pytest.mark.browser
class TestShelterPage:
    """Shelter map page shows shelters from the live API."""

    def test_shelter_markers_load(self, page: Page):
        """After GPS, shelter markers should appear on the map."""
        page.context.grant_permissions(["geolocation"])
        page.context.set_geolocation({"latitude": 1.3521, "longitude": 103.8198})
        page.goto(SITE_URL, wait_until="networkidle")

        page.locator("nav button", has_text="Shelter").click()

        # Wait for map to load
        expect(page.locator(".leaflet-container")).to_be_visible(timeout=15000)

        # Wait for shelter bottom sheet to show a shelter name or loading text
        # The bottom sheet shows "Finding nearby shelters..." then a shelter name
        sheet_text = page.locator("text=/Finding nearby shelters|HDB Block|MRT|shelter/i")
        expect(sheet_text).to_be_visible(timeout=20000)


@pytest.mark.browser
class TestTimePage:
    """Time planner page UI elements."""

    def test_duration_slider_works(self, page: Page):
        """Duration slider is visible and adjustable."""
        page.goto(SITE_URL, wait_until="networkidle")
        page.locator("nav button", has_text="Time").click()

        # Slider should be visible
        slider = page.locator("input[type='range']")
        expect(slider).to_be_visible(timeout=10000)

    def test_find_best_time_button(self, page: Page):
        """Find best time button is present."""
        page.goto(SITE_URL, wait_until="networkidle")
        page.locator("nav button", has_text="Time").click()

        expect(page.locator("text=Find best time")).to_be_visible(timeout=10000)

    def test_suggested_windows_shown(self, page: Page):
        """Suggested time windows are displayed."""
        page.goto(SITE_URL, wait_until="networkidle")
        page.locator("nav button", has_text="Time").click()

        expect(page.locator("text=Suggested Windows")).to_be_visible(timeout=10000)
