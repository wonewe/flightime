import { supabase } from './supabase'
import type { ActiveFlight, FlightConfig } from '../types'

export async function upsertActiveFlight(
  userId: string,
  config: FlightConfig,
  durationMinutes: number,
  progress: number,
  phase: string,
): Promise<void> {
  const { error } = await supabase
    .from('active_flights')
    .upsert({
      user_id: userId,
      from_code: config.from.code,
      to_code: config.to.code,
      from_city_ko: config.from.cityKo,
      to_city_ko: config.to.cityKo,
      from_lat: config.from.lat,
      from_lng: config.from.lng,
      to_lat: config.to.lat,
      to_lng: config.to.lng,
      flight_number: config.flightNumber,
      aircraft_name: config.aircraft.name,
      duration_minutes: durationMinutes,
      progress,
      phase,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' })

  if (error) console.error('Failed to upsert active flight:', error.message)
}

export async function removeActiveFlight(userId: string): Promise<void> {
  const { error } = await supabase
    .from('active_flights')
    .delete()
    .eq('user_id', userId)

  if (error) console.error('Failed to remove active flight:', error.message)
}

export async function loadFriendActiveFlights(friendIds: string[]): Promise<ActiveFlight[]> {
  if (friendIds.length === 0) return []

  const { data, error } = await supabase
    .from('active_flights')
    .select('*')
    .in('user_id', friendIds)

  if (error) {
    console.error('Failed to load friend flights:', error.message)
    return []
  }
  return data as ActiveFlight[]
}
