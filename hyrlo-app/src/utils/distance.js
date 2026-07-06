const R = 6371;

function toRad(deg) {
  return (deg * Math.PI) / 180;
}

export function calculateDistance(lat1, lng1, lat2, lng2) {
  if (!lat1 || !lng1 || !lat2 || !lng2) return 99;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function formatDistance(km) {
  if (km < 0.1) return '< 0.1 km';
  if (km < 1) return `${km.toFixed(1)} km`;
  return `${km.toFixed(1)} km`;
}

export function isWithinRange(km, maxKm = 12) {
  return km <= maxKm;
}

export function jitterCoords(lat, lng, kmOffset = 2) {
  const latOffset = (kmOffset / 111) * (Math.random() - 0.5) * 2;
  const lngOffset = (kmOffset / (111 * Math.cos(toRad(lat)))) * (Math.random() - 0.5) * 2;
  return { lat: lat + latOffset, lng: lng + lngOffset };
}
