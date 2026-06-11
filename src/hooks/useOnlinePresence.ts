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
  const onSyncRef = useRef(onSync)
  onSyncRef.current = onSync
  const statusRef = useRef(status)
  statusRef.current = status

  const buildMap = useCallback((channel: RealtimeChannel) => {
    const state = channel.presenceState<PresenceEntry>()
    const map = new Map<string, PresenceEntry>()
    for (const [key, entries] of Object.entries(state)) {
      if (entries && entries.length > 0) {
        map.set(key, entries[0] as PresenceEntry)
      }
    }
    onSyncRef.current?.(map)
  }, [])

  const updateStatus = useCallback((newStatus: 'online' | 'flying') => {
    if (!channelRef.current || !userId || !username) return
    channelRef.current.track({
      status: newStatus,
      userId,
      username,
    })
  }, [userId, username])

  // Channel lifecycle — only depends on identity, NOT status
  useEffect(() => {
    if (!userId || !username) return

    const channel = supabase.channel('presence:online', {
      config: { presence: { key: userId } },
    })

    channel
      .on('presence', { event: 'sync' }, () => {
        buildMap(channel)
      })
      .on('presence', { event: 'join' }, () => {
        buildMap(channel)
      })
      .on('presence', { event: 'leave' }, () => {
        buildMap(channel)
      })
      .subscribe(async (subscribeStatus, err) => {
        if (subscribeStatus === 'SUBSCRIBED') {
          await channel.track({
            status: statusRef.current,
            userId,
            username,
          } satisfies PresenceEntry)
        } else if (err) {
          console.error('Presence subscribe error:', subscribeStatus, err.message)
        }
      })

    channelRef.current = channel

    return () => {
      channel.untrack()
      supabase.removeChannel(channel)
      channelRef.current = null
    }
  }, [userId, username, buildMap])

  // Update tracked status when it changes (e.g. online -> flying)
  useEffect(() => {
    updateStatus(status)
  }, [status, updateStatus])

  return { updateStatus }
}
