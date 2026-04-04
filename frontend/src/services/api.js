/**
 * API client — single source of truth for all backend calls.
 *
 * ┌─────────────────────────────────────────────────────────────┐
 * │  HOW THE MOCK SYSTEM WORKS                                  │
 * │                                                             │
 * │  1. Backend team updates docs/api-contract.md first         │
 * │  2. Then updates frontend/src/services/mock.js to match     │
 * │  3. Frontend team builds UI against mock data               │
 * │  4. When real endpoint is deployed, flip the flag below     │
 * │                                                             │
 * │  This means frontend NEVER waits for backend.               │
 * │  And when you connect them, the UI just works.              │
 * └─────────────────────────────────────────────────────────────┘
 *
 * FEATURE FLAGS — flip each to false when the real endpoint is ready:
 */
const MOCK = {
  checkRun: false, // F1: ✅ live on EC2
  findShelter: false, // F2: ✅ live on EC2
  bestTimes: false, // F5: ✅ live on EC2
  planRoute: true, // F4: keep mocked (cut)
  alerts: true, // F3: keep mocked until SES ready
};

import axios from "axios";
import {
  mockCheckRun,
  mockFindShelter,
  mockBestTimes,
  mockPlanRoute,
  mockSubscribeAlert,
} from "./mock.js";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE || "/api",
  timeout: 15000,
});

// =============================================
// F1: Decision Engine
// GET /api/check-run?lat=1.35&lng=103.83
// Contract: docs/api-contract.md#f1
// =============================================
export async function checkRun(lat, lng) {
  if (MOCK.checkRun) return mockCheckRun(lat, lng);
  const res = await api.get("/check-run", { params: { lat, lng } });
  return res.data;
}

// =============================================
// F2: Find Shelter
// GET /api/find-shelter?lat=1.35&lng=103.83&limit=5
// Contract: docs/api-contract.md#f2
// =============================================
export async function findShelter(lat, lng, limit = 5) {
  if (MOCK.findShelter) return mockFindShelter(lat, lng, limit);
  const res = await api.get("/find-shelter", { params: { lat, lng, limit } });
  return res.data;
}

// =============================================
// F5: Best Time Slots
// GET /api/best-times?lat=1.35&lng=103.83&duration_min=45
// Contract: docs/api-contract.md#f5
// =============================================
export async function bestTimes(lat, lng, durationMin = 45) {
  if (MOCK.bestTimes) return mockBestTimes(lat, lng, durationMin);
  const res = await api.get("/best-times", {
    params: { lat, lng, duration_min: durationMin },
  });
  return res.data;
}

// =============================================
// F4: Route Coverage Scorer
// GET /api/plan-route?lat=1.35&lng=103.83&distance_km=5&loop=true
// Contract: docs/api-contract.md#f4
// =============================================
export async function planRoute(lat, lng, distanceKm = 5, loop = true) {
  if (MOCK.planRoute) return mockPlanRoute(lat, lng, distanceKm, loop);
  const res = await api.get("/plan-route", {
    params: { lat, lng, distance_km: distanceKm, loop },
  });
  return res.data;
}

// =============================================
// F3: Alert Subscription
// POST /api/alerts/subscribe
// Contract: docs/api-contract.md#f3
// =============================================
export async function subscribeAlert(email, lat, lng, label = "") {
  if (MOCK.alerts) return mockSubscribeAlert(email, lat, lng, label);
  const res = await api.post("/alerts/subscribe", { email, lat, lng, label });
  return res.data;
}

// =============================================
// Helper: GPS position
// =============================================
export function getCurrentPosition() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation not supported"));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => reject(err),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  });
}
