export default function RouteMapControls({
  navigationMode,
  hasRoute,
  onStartNavigation,
  onExitNavigation,
}) {
  return (
    <div className="map-controls">
      {!navigationMode && hasRoute && (
        <button onClick={onStartNavigation}>
          ▶ Start Navigation
        </button>
      )}

      {navigationMode && (
        <button onClick={onExitNavigation}>
          ✕ Exit Navigation
        </button>
      )}
    </div>
  );
}