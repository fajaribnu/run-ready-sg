import { useState, useEffect } from "react";
import { findShelter, getCurrentPosition } from "../services/api";

export default function ShelterMap() {
  const [shelters, setShelters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [position, setPosition] = useState(null);

  useEffect(() => {
    async function load() {
      try {
        const pos = await getCurrentPosition();
        setPosition(pos);
        const data = await findShelter(pos.lat, pos.lng, 5);
        setShelters(data.shelters || []);
      } catch (err) {
        setError(err.message || "Failed to find shelters");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="container">
        <div className="card" style={{ textAlign: "center" }}>
          Finding nearest shelters...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container">
        <div className="card" style={{ textAlign: "center", color: "#dc3545" }}>
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="card">
        <h2 style={{ fontSize: 20, marginBottom: 16 }}>Nearest Shelters</h2>

        {/* TODO: Replace this list with a React-Leaflet MapContainer
            showing user position + shelter markers with walking routes.
            See: https://react-leaflet.js.org/docs/start-setup/ */}

        {shelters.map((s, i) => (
          <div
            key={i}
            style={{
              padding: "12px 0",
              borderBottom: i < shelters.length - 1 ? "1px solid #eee" : "none",
            }}
          >
            <div style={{ fontWeight: 600 }}>{s.name}</div>
            <div style={{ fontSize: 13, color: "#666" }}>
              {s.type} &middot; {s.distance_m}m &middot; ~{s.walk_time_min} min walk
            </div>
          </div>
        ))}

        {shelters.length === 0 && (
          <p style={{ color: "#666" }}>No shelters found nearby.</p>
        )}
      </div>
    </div>
  );
}
