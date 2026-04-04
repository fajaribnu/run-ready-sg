import { getHeadingDegrees, getRouteHeading } from "./geometry";

type RefObject<T> = {
  current: T;
};

type UserPosition = {
  lat: number;
  lng: number;
  heading: number;
};

type GeoWatchIdRef = RefObject<number | null>;

export function stopGeoTracking(geoWatchIdRef: GeoWatchIdRef): void {
  if (geoWatchIdRef.current != null) {
    navigator.geolocation.clearWatch(geoWatchIdRef.current);
    geoWatchIdRef.current = null;
  }
}

type LatestState = {
  currentUserPos: UserPosition | null;
  compassHeading: number | null;
  navigationMode: boolean;
  selectedRouteFeature: unknown;
};

type StartGeoTrackingParams = {
  geoWatchIdRef: GeoWatchIdRef;
  latestStateRef: RefObject<LatestState>;
  setCurrentUserPos: (pos: UserPosition) => void;
};

export function startGeoTracking({
  geoWatchIdRef,
  latestStateRef,
  setCurrentUserPos,
}: StartGeoTrackingParams): void {
  stopGeoTracking(geoWatchIdRef);

  if (!navigator.geolocation) return;

  geoWatchIdRef.current = navigator.geolocation.watchPosition(
    (pos: GeolocationPosition) => {
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;

      const {
        currentUserPos,
        compassHeading,
        navigationMode,
        selectedRouteFeature,
      } = latestStateRef.current;

      let heading = currentUserPos?.heading ?? 0;

      if (compassHeading != null) {
        heading = compassHeading;
      } else if (navigationMode && selectedRouteFeature) {
        heading = getRouteHeading(
          lat,
          lng,
          selectedRouteFeature,
          currentUserPos?.heading ?? 0
        );
      } else if (currentUserPos) {
        const movedEnough =
          Math.abs(lat - currentUserPos.lat) > 0.00001 ||
          Math.abs(lng - currentUserPos.lng) > 0.00001;

        if (movedEnough) {
          heading = getHeadingDegrees(
            [currentUserPos.lat, currentUserPos.lng],
            [lat, lng]
          );
        }
      } else {
        heading = pos.coords.heading ?? 0;
      }

      setCurrentUserPos({ lat, lng, heading });
    },
    (err: GeolocationPositionError) => {
      console.error("Tracking error:", err);
    },
    {
      enableHighAccuracy: true,
      maximumAge: 5000,
      timeout: 10000,
    }
  );
}

type CompassStartedRef = RefObject<boolean>;

type EnsureCompassStartedParams = {
  compassStartedRef: CompassStartedRef;
  setCompassHeading: (heading: number) => void;
};

type DeviceOrientationEventWithWebkit = DeviceOrientationEvent & {
  webkitCompassHeading?: number;
};

type DeviceOrientationEventConstructorWithPermission =
  typeof DeviceOrientationEvent & {
    requestPermission?: () => Promise<"granted" | "denied">;
  };

export async function ensureCompassStarted({
  compassStartedRef,
  setCompassHeading,
}: EnsureCompassStartedParams): Promise<boolean> {
  if (compassStartedRef.current) return true;

  const isProbablyMobile =
    /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) ||
    navigator.maxTouchPoints > 1;

  if (!isProbablyMobile) return false;
  if (!window.DeviceOrientationEvent) return false;

  function handleOrientation(event: Event): void {
    const e = event as DeviceOrientationEventWithWebkit;
    let heading: number | null = null;

    if (e.webkitCompassHeading != null) {
      heading = e.webkitCompassHeading;
    } else if (e.alpha != null) {
      heading = 360 - e.alpha;
    }

    if (heading != null && !Number.isNaN(heading)) {
      setCompassHeading((heading + 360) % 360);
    }
  }

  try {
    const DOE =
      DeviceOrientationEvent as DeviceOrientationEventConstructorWithPermission;

    if (typeof DOE.requestPermission === "function") {
      const permission = await DOE.requestPermission();
      if (permission !== "granted") return false;
    }

    window.addEventListener("deviceorientationabsolute", handleOrientation, true);
    window.addEventListener("deviceorientation", handleOrientation, true);

    compassStartedRef.current = true;
    return true;
  } catch (err) {
    console.error("Compass start failed:", err);
    return false;
  }
}