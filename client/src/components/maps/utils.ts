// src/components/maps/utils.ts
export function getJitteredPosition(
  alumni: { id: number | string; latitude: number | string; longitude: number | string },
  duplicateCount: number
): [number, number] {
  const lat = parseFloat(String(alumni.latitude));
  const lng = parseFloat(String(alumni.longitude));

  // If only one alum at this location, no jitter needed
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || duplicateCount <= 1) {
    return [lat, lng];
  }

  // Deterministic offset based on alumni ID
  const seed = parseInt(String(alumni.id).slice(-3)) || 1;
  const angle = (seed * 137.508) % 360; // golden-angle spread
  const radius = 0.002 + (seed % 3) * 0.001; // ~200–500m

  const offsetLat = radius * Math.cos((angle * Math.PI) / 180);
  const offsetLng = radius * Math.sin((angle * Math.PI) / 180);

  return [lat + offsetLat, lng + offsetLng];
}