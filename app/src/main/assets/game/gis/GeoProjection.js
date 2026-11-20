// Authoritative WGS84 (EPSG:4326) <-> Local Tangent Plane 3D Coordinate System for Visakhapatnam
// Origin (0, 0) = RK Beach, Visakhapatnam (17.7142° N, 83.3236° E)
// Axes: +X = East (Bay of Bengal), -X = West (Inland), -Z = North, +Z = South
// Scale: WORLD_SCALE = 0.080 (1 local unit = 12.5 real-world meters; zero angular/shape distortion)

export const ORIGIN_LAT = 17.7142;
export const ORIGIN_LNG = 83.3236;
export const WORLD_SCALE = 0.080;

export const METERS_PER_DEG_LAT = 110676.0;
export const METERS_PER_DEG_LNG = 111319.5 * Math.cos((ORIGIN_LAT * Math.PI) / 180);

export const WORLD_BOUNDS = {
  minX: -1580,
  maxX: 1320,
  minZ: -1760,
  maxZ: 920
};

export function latLngToWorld(lat, lng) {
  const x = (Number(lng) - ORIGIN_LNG) * METERS_PER_DEG_LNG * WORLD_SCALE;
  const z = -(Number(lat) - ORIGIN_LAT) * METERS_PER_DEG_LAT * WORLD_SCALE;
  return { x, z };
}

export function worldToLatLng(x, z) {
  const lat = ORIGIN_LAT - Number(z) / (METERS_PER_DEG_LAT * WORLD_SCALE);
  const lng = ORIGIN_LNG + Number(x) / (METERS_PER_DEG_LNG * WORLD_SCALE);
  return { lat, lng };
}

export function distanceMetersBetweenWorldPts(x1, z1, x2, z2) {
  return Math.hypot(x2 - x1, z2 - z1) / WORLD_SCALE;
}
