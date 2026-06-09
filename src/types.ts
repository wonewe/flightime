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

// Friends feature types

export interface Profile {
  id: string
  username: string
  created_at: string
}

export type FriendshipStatus = 'pending' | 'accepted' | 'rejected'

export interface Friendship {
  id: string
  user_id: string
  friend_id: string
  status: FriendshipStatus
  created_at: string
  updated_at: string
}

export interface FriendWithProfile extends Friendship {
  profile: Profile
}

export interface ActiveFlight {
  user_id: string
  from_code: string
  to_code: string
  from_city_ko: string
  to_city_ko: string
  from_lat: number
  from_lng: number
  to_lat: number
  to_lng: number
  flight_number: string
  aircraft_name: string
  duration_minutes: number
  progress: number
  phase: string
  started_at: string
  updated_at: string
}

export interface PresenceState {
  status: 'online' | 'flying'
  userId: string
  username: string
}
