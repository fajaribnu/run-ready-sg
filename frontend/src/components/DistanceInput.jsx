import runnerImg from "../assets/running.png";

export default function DistanceInput({ distanceKm, onDistanceChange }) {
  const min = 0;
  const max = 15;

  const handleChange = (e) => {
    const val = e.target.value;
    onDistanceChange (val);
  };

  return (
    <div style={{ marginBottom: 16 }}>
      {/* Top row */}
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 6
      }}>
        <span className="distance-label">
          Distance (km)
        </span>

        <div className="distance-input-wrap">
          <input
            className="distance-number"
            type="number"
            value={distanceKm}
            onChange={handleChange}
            onBlur={() => {
              const num = Number(distanceKm);
              if (!isNaN(num)) {
                const clamped = Math.max(0, Math.min(15, num));
                onDistanceChange(String(clamped));
              }
            }}
            min={min}
            max={max}
            step={0.5}
          />
          <span className="distance-unit">km</span>
        </div>
      </div>

      <div
        className="road-slider-wrap"
        style={{
          "--fill-percent": `${((distanceKm - min) / (max - min)) * 100}%`,
        }}
      >
        <input
          className="road-slider"
          type="range"
          min={min}
          max={max}
          step={0.5}
          value={distanceKm}
          onChange={handleChange}
        />

        <div
          className="runner"
          style={{ backgroundImage: `url(${runnerImg})` }}
        />
      </div>
    </div>
  );
}