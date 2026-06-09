export interface Airport {
  code: string
  city: string
  cityKo: string
  country: string
  lat: number
  lng: number
}

export interface Aircraft {
  id: string
  name: string
  nameKo: string
  type: string
}

export interface FlightRoute {
  from: Airport
  to: Airport
  distanceKm: number
}

export interface FlightConfig {
  from: Airport
  to: Airport
  aircraft: Aircraft
  seat: string
  distanceKm: number
  flightNumber: string
}

export type FlightPhase = 'boarding' | 'taxiing' | 'cruising' | 'descending' | 'landed'

export interface GeoPoint {
  lat: number
  lng: number
}

export interface TripRecord {
  id: string
  config: FlightConfig
  durationMinutes: number
  completedAt: string
}

export interface TripRow {
  id: string
  user_id: string
  config: FlightConfig
  duration_minutes: number
  completed_at: string
  created_at: string
}
