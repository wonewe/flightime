import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { loadFriendships, sendFriendRequest, acceptFriendRequest, rejectFriendRequest, removeFriend } from '../lib/friendships'
import type { FriendWithProfile } from '../types'

export function useFriends(userId: string | undefined) {
  const [friendships, setFriendships] = useState<FriendWithProfile[]>([])
  const [loading, setLoading] = useState(true)
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)

  const refresh = useCallback(async () => {
    if (!userId) return
    setLoading(true)
    const data = await loadFriendships()
    setFriendships(data)
    setLoading(false)
  }, [userId])

  useEffect(() => {
    refresh()
  }, [refresh])

  // Realtime subscription for friendship changes
  useEffect(() => {
    if (!userId) return

    // Clean up previous channel if any
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current)
      channelRef.current = null
    }

    const channelName = `friendships-${userId}-${Date.now()}`
    const channel = supabase.channel(channelName)

    channel.on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'friendships' },
      () => { refresh() }
    )

    channel.subscribe()
    channelRef.current = channel

    return () => {
      supabase.removeChannel(channel)
      channelRef.current = null
    }
  }, [userId]) // eslint-disable-line react-hooks/exhaustive-deps

  const acceptedFriends = friendships.filter(f => f.status === 'accepted')
  const pendingReceived = friendships.filter(f => f.status === 'pending' && f.friend_id === userId)
  const pendingSent = friendships.filter(f => f.status === 'pending' && f.user_id === userId)

  const getFriendUserId = useCallback((f: FriendWithProfile) => {
    return f.user_id === userId ? f.friend_id : f.user_id
  }, [userId])

  const friendUserIds = acceptedFriends.map(f => getFriendUserId(f))

  const send = useCallback(async (friendId: string) => {
    await sendFriendRequest(friendId)
    refresh()
  }, [refresh])

  const accept = useCallback(async (friendshipId: string) => {
    await acceptFriendRequest(friendshipId)
    refresh()
  }, [refresh])

  const reject = useCallback(async (friendshipId: string) => {
    await rejectFriendRequest(friendshipId)
    refresh()
  }, [refresh])

  const remove = useCallback(async (friendshipId: string) => {
    await removeFriend(friendshipId)
    refresh()
  }, [refresh])

  return {
    friendships,
    acceptedFriends,
    pendingReceived,
    pendingSent,
    friendUserIds,
    getFriendUserId,
    loading,
    send,
    accept,
    reject,
    remove,
    refresh,
  }
}
