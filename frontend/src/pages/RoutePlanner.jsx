import { useState } from "react";

export default function RoutePlanner() {
  const [distance, setDistance] = useState(5);
  const [loop, setLoop] = useState(true);

  return (
    <div className="container">
      <div className="card">
        <h2 style={{ fontSize: 20, marginBottom: 16 }}>Route Planner</h2>
        <p style={{ color: "#666", marginBottom: 16 }}>
          Find running routes with maximum covered linkway protection.
        </p>

        <label style={{ display: "block", marginBottom: 12 }}>
          <span style={{ fontSize: 13, color: "#666" }}>Distance (km)</span>
          <input
            type="range"
            min={2}
            max={15}
            step={0.5}
            value={distance}
            onChange={(e) => setDistance(Number(e.target.value))}
            style={{ width: "100%", marginTop: 4 }}
          />
          <span style={{ fontWeight: 600 }}>{distance} km</span>
        </label>

        <label style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
          <input
            type="checkbox"
            checked={loop}
            onChange={(e) => setLoop(e.target.checked)}
          />
          <span>Return to start (loop)</span>
        </label>

        <button className="btn-primary" disabled>
          Generate Routes (Coming Sprint 2)
        </button>

        {/* TODO Sprint 2-3:
            1. Get user GPS position
            2. Call planRoute(lat, lng, distance, loop)
            3. Display 2-3 routes on a Leaflet map
            4. Show coverage % badge on each route
            5. Let user select preferred route */}
      </div>
    </div>
  );
}
