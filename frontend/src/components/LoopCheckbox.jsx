export default function LoopCheckbox({ loop, setLoop }) {
  return (
    <>
      <label
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 20,
          cursor: "pointer",
        }}
      >
        <input
          type="checkbox"
          checked={loop}
          onChange={(e) => setLoop(e.target.checked)}
        />
        <span>
          Make it a loop
          <span style={{ fontSize: 12, color: "#6b7280", marginLeft: 6 }}>
            (start & end same place)
          </span>
        </span>
      </label>
    </>
  );
}