import { supabase } from '../lib/supabase'
import type { FlightConfig, TripRecord, TripRow } from '../types'

function rowToRecord(row: TripRow): TripRecord {
  return {
    id: row.id,
    config: row.config,
    durationMinutes: row.duration_minutes,
    completedAt: row.completed_at,
  }
}

export async function loadTripsSupabase(): Promise<TripRecord[]> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data, error } = await supabase
    .from('trips')
    .select('*')
    .eq('user_id', user.id)
    .order('completed_at', { ascending: false })

  if (error) {
    console.error('Failed to load trips:', error.message)
    return []
  }
  return (data as TripRow[]).map(rowToRecord)
}

export async function saveTripSupabase(
  userId: string,
  config: FlightConfig,
  durationMinutes: number,
): Promise<TripRecord | null> {
  const { data, error } = await supabase
    .from('trips')
    .insert({
      user_id: userId,
      config,
      duration_minutes: durationMinutes,
      completed_at: new Date().toISOString(),
    })
    .select()
    .single()

  if (error) {
    console.error('Failed to save trip:', error.message)
    return null
  }
  return rowToRecord(data as TripRow)
}

export async function deleteTripsSupabase(): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  const { error } = await supabase
    .from('trips')
    .delete()
    .eq('user_id', user.id)

  if (error) console.error('Failed to clear trips:', error.message)
}

export async function deleteTripsByIds(ids: string[]): Promise<void> {
  if (ids.length === 0) return
  const { error } = await supabase
    .from('trips')
    .delete()
    .in('id', ids)

  if (error) console.error('Failed to delete trips:', error.message)
}

export async function migrateLocalTrips(userId: string): Promise<void> {
  const STORAGE_KEY = 'flightime_trips'
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return
    const records: TripRecord[] = JSON.parse(raw)
    if (records.length === 0) return

    const rows = records.map(r => ({
      id: r.id,
      user_id: userId,
      config: r.config,
      duration_minutes: r.durationMinutes,
      completed_at: r.completedAt,
    }))

    const { error } = await supabase
      .from('trips')
      .upsert(rows, { onConflict: 'id' })

    if (error) {
      console.error('Migration failed:', error.message)
      return
    }

    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // localStorage parse error — ignore
  }
}
