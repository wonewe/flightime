import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { loadFriendActiveFlights } from '../lib/activeFlights'
import type { ActiveFlight } from '../types'

export function useFriendFlights(friendUserIds: string[]) {
  const [flights, setFlights] = useState<Map<string, ActiveFlight>>(new Map())
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)
  const idsKey = friendUserIds.join(',')

  const refresh = useCallback(async () => {
    if (friendUserIds.length === 0) {
      setFlights(new Map())
      return
    }
    const data = await loadFriendActiveFlights(friendUserIds)
    const map = new Map<string, ActiveFlight>()
    data.forEach(f => map.set(f.user_id, f))
    setFlights(map)
  }, [idsKey]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    refresh()
  }, [refresh])

  // Realtime subscription for active_flights changes
  useEffect(() => {
    if (friendUserIds.length === 0) return

    if (channelRef.current) {
      supabase.removeChannel(channelRef.current)
      channelRef.current = null
    }

    const channelName = `friend-flights-${Date.now()}`
    const channel = supabase.channel(channelName)

    channel.on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'active_flights' },
      (payload) => {
        if (payload.eventType === 'DELETE') {
          const old = payload.old as { user_id?: string }
          if (old.user_id) {
            setFlights(prev => {
              const next = new Map(prev)
              next.delete(old.user_id!)
              return next
            })
          }
        } else {
          const row = payload.new as ActiveFlight
          if (friendUserIds.includes(row.user_id)) {
            setFlights(prev => {
              const next = new Map(prev)
              next.set(row.user_id, row)
              return next
            })
          }
        }
      }
    )

    channel.subscribe()
    channelRef.current = channel

    return () => {
      supabase.removeChannel(channel)
      channelRef.current = null
    }
  }, [idsKey]) // eslint-disable-line react-hooks/exhaustive-deps

  return { flights, refresh }
}
