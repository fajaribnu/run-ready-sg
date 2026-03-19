/**
 * Mock data for frontend development.
 * These match the API contract in docs/api-contract.md EXACTLY.
 *
 * HOW TO USE:
 * - Frontend devs: build your UI against this data
 * - When the real endpoint is ready, you change nothing here
 *   — just flip USE_MOCK to false in api.js
 *
 * RULE: If backend changes the API contract, update this file too.
 */

// Simulates network delay so loading states are testable
const delay = (ms) => new Promise((r) => setTimeout(r, ms));

// =============================================
// F1: Decision Engine — GET /api/check-run
// =============================================
export async function mockCheckRun(lat, lng) {
  await delay(1500);

  // Randomly return SAFE or WARNING so frontend can test both states
  const isSafe = Math.random() > 0.4;

  if (isSafe) {
    return {
      status: "SAFE",
      data: {
        location: `Lat: ${lat.toFixed(3)}, Lng: ${lng.toFixed(3)} (Near Bishan)`,
        temperature: "29.8°C",
        forecast: "Partly Cloudy (Day)",
        wbgt: "28.5°C",
        projection: "Conditions holding steady.",
        reasons: [],
      },
    };
  }

  return {
    status: "WARNING",
    data: {
      location: `Lat: ${lat.toFixed(3)}, Lng: ${lng.toFixed(3)} (Near Tampines)`,
      temperature: "32.1°C",
      forecast: "Thundery Showers",
      wbgt: "33.2°C",
      projection: "Rain expected shortly. Seek shelter.",
      reasons: [
        "Forecast: Thundery Showers",
        "WBGT: 33.2°C (threshold: 32°C)",
      ],
    },
  };
}

// =============================================
// F2: Find Shelter — GET /api/find-shelter
// =============================================
export async function mockFindShelter(lat, lng, limit = 3) {
  await delay(1200);

  return {
    user_location: { lat, lng },
    shelters: [
      {
        name: "Blk 123 Bishan St 11",
        type: "hdb",
        lat: lat + 0.001,
        lng: lng + 0.002,
        distance_m: 180,
        walk_time_min: 2,
        route_polyline: null, // null until OneMap integration done
      },
      {
        name: "Bishan CC Shelter",
        type: "cd_shelter",
        lat: lat + 0.003,
        lng: lng - 0.001,
        distance_m: 420,
        walk_time_min: 5,
        route_polyline: null,
      },
      {
        name: "Bishan-Ang Mo Kio Park Pavilion",
        type: "nparks_pavilion",
        lat: lat - 0.002,
        lng: lng + 0.003,
        distance_m: 650,
        walk_time_min: 8,
        route_polyline: null,
      },
    ].slice(0, limit),
  };
}

// =============================================
// F5: Best Time Slots — GET /api/best-times
// =============================================
export async function mockBestTimes(lat, lng, durationMin = 45) {
  await delay(1800);

  return {
    location: `Near Bishan`,
    requested_duration_min: durationMin,
    windows: [
      {
        rank: 1,
        start_time: "06:30",
        end_time: "07:15",
        forecast: "Partly Cloudy",
        wbgt: 28.5,
        score: 92,
        label: "Best",
      },
      {
        rank: 2,
        start_time: "17:00",
        end_time: "17:45",
        forecast: "Fair (Day)",
        wbgt: 30.1,
        score: 74,
        label: "Good",
      },
      {
        rank: 3,
        start_time: "08:00",
        end_time: "08:45",
        forecast: "Partly Cloudy",
        wbgt: 31.2,
        score: 58,
        label: "Okay",
      },
    ],
  };
}

// =============================================
// F4: Route Coverage — GET /api/plan-route
// =============================================
export async function mockPlanRoute(lat, lng, distanceKm = 5, loop = true) {
  await delay(2500);

  return {
    routes: [
      {
        id: 1,
        distance_km: 5.1,
        coverage_pct: 62.3,
        polyline: null, // encoded polyline string when real
        shelters_along_route: 4,
      },
    ],
  };
}

// =============================================
// F3: Alert Subscribe — POST /api/alerts/subscribe
// =============================================
export async function mockSubscribeAlert(email, lat, lng, label = "") {
  await delay(800);

  return {
    status: "subscribed",
    subscription: { email, lat, lng, label },
  };
}
