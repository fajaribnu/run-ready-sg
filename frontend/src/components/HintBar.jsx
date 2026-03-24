export default function HintBar({ hint, loading, hintType }) {
  return (
    <>
      <div className="loader" style={{ display: loading ? "block" : "none", textAlign: "center" }}>
        📍 Getting location...
      </div>
      <div className={`hint-bar ${hintType}`} style={{ textAlign: "center" }}>{hint}</div>
    </>
  );
}