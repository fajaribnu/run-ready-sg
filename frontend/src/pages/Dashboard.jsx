import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { checkRun, getCurrentPosition } from "../services/api";

export default function Dashboard() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  async function handleCheck() {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const pos = await getCurrentPosition();
      const data = await checkRun(pos.lat, pos.lng);
      setResult(data);
    } catch (err) {
      setError(err.message || "Failed to check conditions. Is the backend running?");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container">
      <div className="card" style={{ textAlign: "center" }}>
        <h1 style={{ fontSize: 24, marginBottom: 8 }}>RunReady SG</h1>
        <p style={{ color: "#666", marginBottom: 24 }}>
          Weather-safe running & PE planner
        </p>

        {!result && (
          <button className="btn-primary" onClick={handleCheck} disabled={loading}>
            {loading ? "Checking conditions..." : "Can I run right now?"}
          </button>
        )}

        {error && (
          <p style={{ color: "#dc3545", marginTop: 16 }}>{error}</p>
        )}

        {result && (
          <>
            <div
              className={result.status === "SAFE" ? "status-safe" : "status-warning"}
              style={{ padding: 16, borderRadius: 10, fontSize: 20, fontWeight: 700, marginBottom: 16 }}
            >
              {result.status === "SAFE" ? "SAFE TO RUN" : "MODIFY OR MOVE INDOORS"}
            </div>

            <div style={{ textAlign: "left" }}>
              {Object.entries(result.data).map(([key, val]) => (
                <div key={key} style={{ padding: "8px 0", borderBottom: "1px solid #eee" }}>
                  <div style={{ fontSize: 11, color: "#888", textTransform: "uppercase" }}>{key.replace(/_/g, " ")}</div>
                  <div style={{ fontSize: 16, fontWeight: 500 }}>{val}</div>
                </div>
              ))}
            </div>

            {result.status !== "SAFE" && (
              <button
                className="btn-primary btn-danger"
                style={{ marginTop: 16 }}
                onClick={() => navigate("/shelter")}
              >
                Find Shelter Now
              </button>
            )}

            <button
              className="btn-primary"
              style={{ marginTop: 8, background: "#6c757d" }}
              onClick={() => setResult(null)}
            >
              Check Again
            </button>
          </>
        )}
      </div>
    </div>
  );
}
