import React, { createContext, useContext, useEffect, useRef, useState } from "react";

type UserPosition = {
  lat: number;
  lng: number;
  heading: number;
};

type LocationContextType = {
  currentUserPos: UserPosition | null;
  locationReady: boolean;
  permissionState: "prompt" | "granted" | "denied" | "unknown";
};

const LocationContext = createContext<LocationContextType | null>(null);

export function LocationProvider({ children }: { children: React.ReactNode }) {
  const [currentUserPos, setCurrentUserPos] = useState<UserPosition | null>(null);
  const [locationReady, setLocationReady] = useState(false);
  const [permissionState, setPermissionState] = useState<
    "prompt" | "granted" | "denied" | "unknown"
  >("unknown");

  const watchIdRef = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function initLocation() {
      if (!("geolocation" in navigator)) {
        setLocationReady(true);
        return;
      }

      try {
        if ("permissions" in navigator && navigator.permissions?.query) {
          const status = await navigator.permissions.query({
            name: "geolocation" as PermissionName,
          });

          if (cancelled) return;

          setPermissionState(
            status.state as "prompt" | "granted" | "denied"
          );

          status.onchange = () => {
            setPermissionState(
              status.state as "prompt" | "granted" | "denied"
            );
          };
        }
      } catch {
        // some browsers do not fully support permissions query
      }

      watchIdRef.current = navigator.geolocation.watchPosition(
        (pos) => {
          if (cancelled) return;

          setCurrentUserPos({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            heading: pos.coords.heading ?? 0,
          });
          setPermissionState("granted");
          setLocationReady(true);
        },
        () => {
          if (cancelled) return;
          setLocationReady(true);
        },
        {
          enableHighAccuracy: true,
          maximumAge: 5000,
          timeout: 10000,
        }
      );
    }

    initLocation();

    return () => {
      cancelled = true;

      if (watchIdRef.current != null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, []);

  return (
    <LocationContext.Provider
      value={{ currentUserPos, locationReady, permissionState }}
    >
      {children}
    </LocationContext.Provider>
  );
}

export function useLocation() {
  const ctx = useContext(LocationContext);
  if (!ctx) throw new Error("useLocation must be used inside LocationProvider");
  return ctx;
}