export function getHeadingDegrees(from, to) {
  const lat1 = (from[0] * Math.PI) / 180;
  const lon1 = (from[1] * Math.PI) / 180;
  const lat2 = (to[0] * Math.PI) / 180;
  const lon2 = (to[1] * Math.PI) / 180;

  const dLon = lon2 - lon1;

  const y = Math.sin(dLon) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);

  let bearing = (Math.atan2(y, x) * 180) / Math.PI;
  return (bearing + 360) % 360;
}

export function getFeatureCoords(feature) {
  if (!feature?.geometry) return [];

  const geom = feature.geometry;

  if (geom.type === "LineString") {
    return geom.coordinates.map((c) => [c[1], c[0]]);
  }

  if (geom.type === "MultiLineString") {
    return geom.coordinates.flat().map((c) => [c[1], c[0]]);
  }

  return [];
}

export function squaredDistance(a, b) {
  const dx = a[0] - b[0];
  const dy = a[1] - b[1];
  return dx * dx + dy * dy;
}

export function findNearestRoutePoint(latlng, feature) {
  const coords = getFeatureCoords(feature);
  if (!coords.length) return null;

  let nearest = coords[0];
  let best = squaredDistance(latlng, coords[0]);

  for (let i = 1; i < coords.length; i++) {
    const dist = squaredDistance(latlng, coords[i]);
    if (dist < best) {
      best = dist;
      nearest = coords[i];
    }
  }

  return nearest;
}

export function getRouteHeading(lat, lng, feature, fallback = 0) {
  const coords = getFeatureCoords(feature);
  if (!coords.length || coords.length < 2) return fallback;

  let nearestIdx = 0;
  let best = Infinity;

  for (let i = 0; i < coords.length; i++) {
    const dx = lat - coords[i][0];
    const dy = lng - coords[i][1];
    const dist = dx * dx + dy * dy;

    if (dist < best) {
      best = dist;
      nearestIdx = i;
    }
  }

  const nextIdx = Math.min(nearestIdx + 1, coords.length - 1);
  if (nextIdx === nearestIdx) return fallback;

  return getHeadingDegrees([lat, lng], coords[nextIdx]);
}