import type { GeoPoint } from '../types'

const toRad = (deg: number) => (deg * Math.PI) / 180
const toDeg = (rad: number) => (rad * 180) / Math.PI

/**
 * Calculate the great circle distance between two points (Haversine formula)
 */
export function haversineDistance(p1: GeoPoint, p2: GeoPoint): number {
  const R = 6371 // Earth radius in km
  const dLat = toRad(p2.lat - p1.lat)
  const dLng = toRad(p2.lng - p1.lng)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(p1.lat)) * Math.cos(toRad(p2.lat)) * Math.sin(dLng / 2) ** 2
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

/**
 * Compute intermediate points along a great circle arc
 */
export function greatCirclePoints(
  from: GeoPoint,
  to: GeoPoint,
  numPoints: number = 100
): GeoPoint[] {
  const lat1 = toRad(from.lat)
  const lng1 = toRad(from.lng)
  const lat2 = toRad(to.lat)
  const lng2 = toRad(to.lng)

  const d = 2 * Math.asin(
    Math.sqrt(
      Math.sin((lat1 - lat2) / 2) ** 2 +
      Math.cos(lat1) * Math.cos(lat2) * Math.sin((lng1 - lng2) / 2) ** 2
    )
  )

  const points: GeoPoint[] = []

  for (let i = 0; i <= numPoints; i++) {
    const f = i / numPoints

    const A = Math.sin((1 - f) * d) / Math.sin(d)
    const B = Math.sin(f * d) / Math.sin(d)

    const x = A * Math.cos(lat1) * Math.cos(lng1) + B * Math.cos(lat2) * Math.cos(lng2)
    const y = A * Math.cos(lat1) * Math.sin(lng1) + B * Math.cos(lat2) * Math.sin(lng2)
    const z = A * Math.sin(lat1) + B * Math.sin(lat2)

    const lat = toDeg(Math.atan2(z, Math.sqrt(x ** 2 + y ** 2)))
    const lng = toDeg(Math.atan2(y, x))

    points.push({ lat, lng })
  }

  return points
}

/**
 * Get a point at a specific fraction along the great circle
 */
export function interpolateGreatCircle(
  from: GeoPoint,
  to: GeoPoint,
  fraction: number
): GeoPoint {
  const f = Math.max(0, Math.min(1, fraction))
  const lat1 = toRad(from.lat)
  const lng1 = toRad(from.lng)
  const lat2 = toRad(to.lat)
  const lng2 = toRad(to.lng)

  const d = 2 * Math.asin(
    Math.sqrt(
      Math.sin((lat1 - lat2) / 2) ** 2 +
      Math.cos(lat1) * Math.cos(lat2) * Math.sin((lng1 - lng2) / 2) ** 2
    )
  )

  const A = Math.sin((1 - f) * d) / Math.sin(d)
  const B = Math.sin(f * d) / Math.sin(d)

  const x = A * Math.cos(lat1) * Math.cos(lng1) + B * Math.cos(lat2) * Math.cos(lng2)
  const y = A * Math.cos(lat1) * Math.sin(lng1) + B * Math.cos(lat2) * Math.sin(lng2)
  const z = A * Math.sin(lat1) + B * Math.sin(lat2)

  return {
    lat: toDeg(Math.atan2(z, Math.sqrt(x ** 2 + y ** 2))),
    lng: toDeg(Math.atan2(y, x)),
  }
}

/**
 * Calculate bearing from one point to another (for plane rotation)
 */
export function bearing(from: GeoPoint, to: GeoPoint): number {
  const lat1 = toRad(from.lat)
  const lat2 = toRad(to.lat)
  const dLng = toRad(to.lng - from.lng)

  const y = Math.sin(dLng) * Math.cos(lat2)
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng)

  return (toDeg(Math.atan2(y, x)) + 360) % 360
}
