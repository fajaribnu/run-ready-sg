# RunReady SG — API Contract

This document defines the interface between frontend and backend.
**Frontend team**: mock against these endpoints. **Backend team**: keep this updated.

---

## `GET /health`
Health check.

**Response:**
```json
{ "status": "ok", "service": "runready-sg" }
```

---

## `GET /api/check-run` — F1: Decision Engine

**Params:**
| Param | Type  | Required | Example |
|-------|-------|----------|---------|
| lat   | float | yes      | 1.350   |
| lng   | float | yes      | 103.830 |

**Response (200):**
```json
{
  "status": "SAFE",
  "data": {
    "location": "Lat: 1.350, Lng: 103.830 (Near Bishan)",
    "temperature": "31.2°C",
    "forecast": "Partly Cloudy (Day)",
    "wbgt": "29.4°C",
    "projection": "Conditions holding steady.",
    "reasons": []
  }
}
```

`status` is either `"SAFE"` or `"WARNING"`.
`reasons` is an array of strings explaining why it's unsafe (empty when safe).

---

## `GET /api/find-shelter` — F2: Shelter Finder

**Params:**
| Param | Type  | Required | Default | Example |
|-------|-------|----------|---------|---------|
| lat   | float | yes      |         | 1.350   |
| lng   | float | yes      |         | 103.830 |
| limit | int   | no       | 3       | 5       |

**Response (200):**
```json
{
  "user_location": { "lat": 1.350, "lng": 103.830 },
  "shelters": [
    {
      "name": "Blk 123 Bishan St 11",
      "type": "hdb",
      "lat": 1.351,
      "lng": 103.832,
      "distance_m": 245,
      "walk_time_min": 3,
      "route_polyline": null
    }
  ]
}
```

`route_polyline` will contain an encoded polyline string once OneMap integration is done. `null` until then — frontend should handle this gracefully.

---

## `GET /api/plan-route` — F4: Route Coverage Scorer

**Priority:** Last priority. Only build if Track A linkway data is ready.

**Params:**
| Param       | Type  | Required | Default | Example |
|-------------|-------|----------|---------|---------|
| lat         | float | yes      |         | 1.350   |
| lng         | float | yes      |         | 103.830 |
| distance_km | float | no       | 5.0     | 3.0     |
| loop        | bool  | no       | true    | false   |

**Response (200) — when implemented:**
```json
{
  "routes": [
    {
      "id": 1,
      "distance_km": 5.1,
      "coverage_pct": 62.3,
      "polyline": "encoded_string_here",
      "shelters_along_route": 4
    }
  ]
}
```

Note: team decided to generate 1 route (not 2–3) to reduce complexity.

**Response (200) — before implementation:**
```json
{
  "status": "not_implemented",
  "message": "Route generation requires OneMap integration + PostGIS linkway data. Target: Sprint 2-3."
}
```

---

## `GET /api/best-times` — F5: Smart Time-Slot Finder

**Params:**
| Param        | Type  | Required | Default | Example |
|--------------|-------|----------|---------|---------|
| lat          | float | yes      |         | 1.350   |
| lng          | float | yes      |         | 103.830 |
| duration_min | int   | no       | 45      | 60      |

**Response (200):**
```json
{
  "location": "Near Bishan",
  "requested_duration_min": 45,
  "windows": [
    {
      "rank": 1,
      "start_time": "06:30",
      "end_time": "07:15",
      "forecast": "Partly Cloudy",
      "wbgt": 28.5,
      "score": 92,
      "label": "Best"
    },
    {
      "rank": 2,
      "start_time": "17:00",
      "end_time": "17:45",
      "forecast": "Fair (Day)",
      "wbgt": 30.1,
      "score": 74,
      "label": "Good"
    },
    {
      "rank": 3,
      "start_time": "08:00",
      "end_time": "08:45",
      "forecast": "Partly Cloudy",
      "wbgt": 31.2,
      "score": 58,
      "label": "Okay"
    }
  ]
}
```

Returns up to 3 windows, ranked by score (higher = safer). If no safe windows exist, `windows` is an empty array.

---

## `POST /api/alerts/subscribe` — F3: Alert Subscription

**Body (JSON):**
```json
{
  "email": "user@example.com",
  "lat": 1.350,
  "lng": 103.830,
  "label": "Bishan Park"
}
```

**Response (200):**
```json
{
  "status": "subscribed",
  "subscription": { "email": "user@example.com", "lat": 1.350, "lng": 103.830, "label": "Bishan Park" }
}
```

---

## Error Responses

All endpoints may return:
```json
{
  "error": "Error type description",
  "details": "Specific error message"
}
```

Frontend should check for the `error` key and display `details` to the user.
