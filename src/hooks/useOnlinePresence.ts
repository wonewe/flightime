import { useEffect, useRef, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { RealtimeChannel } from '@supabase/supabase-js'

interface PresenceEntry {
  status: 'online' | 'flying'
  userId: string
  username: string
}

export function useOnlinePresence(
  userId: string | undefined,
  username: string | undefined,
  status: 'online' | 'flying' = 'online',
  onSync?: (presences: Map<string, PresenceEntry>) => void,
) {
  const channelRef = useRef<RealtimeChannel | null>(null)

  const updateStatus = useCallback((newStatus: 'online' | 'flying') => {
    if (!channelRef.current || !userId || !username) return
    channelRef.current.track({
      status: newStatus,
      userId,
      username,
    })
  }, [userId, username])

  useEffect(() => {
    if (!userId || !username) return

    const channel = supabase.channel('presence:online', {
      config: { presence: { key: userId } },
    })

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState<PresenceEntry>()
        const map = new Map<string, PresenceEntry>()
        for (const [key, entries] of Object.entries(state)) {
          if (entries && entries.length > 0) {
            map.set(key, entries[0] as PresenceEntry)
          }
        }
        onSync?.(map)
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            status: 'online',
            userId,
            username,
          } satisfies PresenceEntry)
        }
      })

    channelRef.current = channel

    return () => {
      channel.untrack()
      supabase.removeChannel(channel)
      channelRef.current = null
    }
  }, [userId, username]) // eslint-disable-line react-hooks/exhaustive-deps

  // Update status when it changes (e.g. online -> flying)
  useEffect(() => {
    updateStatus(status)
  }, [status, updateStatus])

  return { updateStatus }
}
