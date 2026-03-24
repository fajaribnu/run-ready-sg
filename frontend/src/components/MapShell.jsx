import RecenterButton from "./RecenterButton";
import RouteMapControls from "./RouteMapControls";
import HintBar from "../components/HintBar";

export default function MapShell({
  mapContainerRef,
  showRecenter,
  onRecenter,
  navigationMode,
  hasRoute,
  onStartNavigation,
  onExitNavigation,
  hint,
  loading,
  hintType
}) {
  return (
    <>
      <div className="map-wrapper">
        <div className="map-hint-wrap">
          <HintBar hint={hint} loading={loading} hintType={hintType}/>
        </div>
        <div ref={mapContainerRef} className="map-host" />
        <RouteMapControls
          navigationMode={navigationMode}
          hasRoute={hasRoute}
          onStartNavigation={onStartNavigation}
          onExitNavigation={onExitNavigation}
        />
        <RecenterButton show={showRecenter} onClick={onRecenter} />
      </div>
    </>
  );
}