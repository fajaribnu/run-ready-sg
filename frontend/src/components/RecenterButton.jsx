export default function RecenterButton({ show, onClick }) {
  return (
    <button
      id="recenterBtn"
      onClick={onClick}
      style={{ display: show ? "flex" : "none" }}
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="4" stroke="#212529" strokeWidth="2" />
        <path
          d="M12 2V5M12 19V22M2 12H5M19 12H22"
          stroke="#212529"
          strokeWidth="2"
        />
      </svg>
    </button>
  );
}