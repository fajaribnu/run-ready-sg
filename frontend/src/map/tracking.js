import { getHeadingDegrees, getRouteHeading } from "./geometry";

// ==============================
// 🧪 MOCK TRACKING (REMOVE LATER)
// ==============================

let mockTimer = null;

export function startMockTracking({
  routeLatLngs,
  setCurrentUserPos,
  intervalMs = 400,
}) {
  if (!routeLatLngs?.length) return;

  stopMockTracking();

  let i = 0;

  mockTimer = setInterval(() => {
    const curr = routeLatLngs[i];
    const next = routeLatLngs[Math.min(i + 1, routeLatLngs.length - 1)];

    const heading = getHeadingDegrees(curr, next);

    setCurrentUserPos({
      lat: curr[0],
      lng: curr[1],
      heading,
    });

    i += 1;

    if (i >= routeLatLngs.length) {
      clearInterval(mockTimer);
      mockTimer = null;
    }
  }, intervalMs);
}

export function stopMockTracking() {
  if (mockTimer) {
    clearInterval(mockTimer);
    mockTimer = null;
  }
}

// ==============================
// 🧪 END MOCK TRACKING (REMOVE LATER)
// ==============================

export function stopGeoTracking(geoWatchIdRef) {
  if (geoWatchIdRef.current != null) {
    navigator.geolocation.clearWatch(geoWatchIdRef.current);
    geoWatchIdRef.current = null;
  }
}

export function startGeoTracking({
  geoWatchIdRef,
  latestStateRef,
  setCurrentUserPos,
}) {
  stopGeoTracking(geoWatchIdRef);

  if (!navigator.geolocation) return;

  geoWatchIdRef.current = navigator.geolocation.watchPosition(
    (pos) => {
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
    (err) => {
      console.error("Tracking error:", err);
    },
    {
      enableHighAccuracy: true,
      maximumAge: 5000,
      timeout: 10000,
    }
  );
}

export async function ensureCompassStarted({
  compassStartedRef,
  setCompassHeading,
}) {
  if (compassStartedRef.current) return true;

  const isProbablyMobile =
    /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) ||
    navigator.maxTouchPoints > 1;

  if (!isProbablyMobile) return false;
  if (!window.DeviceOrientationEvent) return false;

  function handleOrientation(event) {
    let heading = null;

    if (event.webkitCompassHeading != null) {
      heading = event.webkitCompassHeading;
    } else if (event.alpha != null) {
      heading = 360 - event.alpha;
    }

    if (heading != null && !Number.isNaN(heading)) {
      setCompassHeading((heading + 360) % 360);
    }
  }

  try {
    if (typeof DeviceOrientationEvent.requestPermission === "function") {
      const permission = await DeviceOrientationEvent.requestPermission();
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