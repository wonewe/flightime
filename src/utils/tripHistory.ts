import type { FlightConfig, TripRecord } from '../types'

const STORAGE_KEY = 'flightime_trips'

export function loadTrips(): TripRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    return JSON.parse(raw) as TripRecord[]
  } catch {
    return []
  }
}

export function saveTrip(config: FlightConfig, durationMinutes: number): TripRecord {
  const trips = loadTrips()
  const record: TripRecord = {
    id: crypto.randomUUID(),
    config,
    durationMinutes,
    completedAt: new Date().toISOString(),
  }
  trips.unshift(record)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(trips))
  return record
}

export function deleteTrip(id: string): void {
  const trips = loadTrips().filter(t => t.id !== id)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(trips))
}

export function clearTrips(): void {
  localStorage.removeItem(STORAGE_KEY)
}
