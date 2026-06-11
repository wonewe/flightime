import { useEffect, useRef, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { FlightInvite } from '../types'

export function useFlightInvites(
  userId: string | undefined,
  onInvite: (invite: FlightInvite) => void,
) {
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)
  const onInviteRef = useRef(onInvite)
  onInviteRef.current = onInvite

  useEffect(() => {
    if (!userId) return

    const channel = supabase.channel('flight-invites', {
      config: { broadcast: { self: false } },
    })

    channel
      .on('broadcast', { event: 'invite' }, ({ payload }) => {
        const invite = payload as FlightInvite & { toUserId: string }
        if (invite.toUserId === userId) {
          onInviteRef.current(invite)
        }
      })
      .subscribe()

    channelRef.current = channel

    return () => {
      supabase.removeChannel(channel)
      channelRef.current = null
    }
  }, [userId])

  const sendInvite = useCallback(
    async (toUserId: string, invite: FlightInvite) => {
      const channel = channelRef.current
      if (!channel) return
      await channel.send({
        type: 'broadcast',
        event: 'invite',
        payload: { ...invite, toUserId },
      })
    },
    [],
  )

  return { sendInvite }
}
