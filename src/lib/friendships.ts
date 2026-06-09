import { supabase } from './supabase'
import type { Profile, Friendship, FriendWithProfile } from '../types'

export async function searchProfiles(query: string): Promise<Profile[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .ilike('username', `%${query}%`)
    .limit(10)

  if (error) {
    console.error('Failed to search profiles:', error.message)
    return []
  }
  return data as Profile[]
}

export async function sendFriendRequest(friendId: string): Promise<Friendship | null> {
  const { data, error } = await supabase
    .from('friendships')
    .insert({ user_id: (await supabase.auth.getUser()).data.user!.id, friend_id: friendId })
    .select()
    .single()

  if (error) {
    console.error('Failed to send friend request:', error.message)
    return null
  }
  return data as Friendship
}

export async function acceptFriendRequest(friendshipId: string): Promise<boolean> {
  const { error } = await supabase
    .from('friendships')
    .update({ status: 'accepted', updated_at: new Date().toISOString() })
    .eq('id', friendshipId)

  if (error) {
    console.error('Failed to accept request:', error.message)
    return false
  }
  return true
}

export async function rejectFriendRequest(friendshipId: string): Promise<boolean> {
  const { error } = await supabase
    .from('friendships')
    .update({ status: 'rejected', updated_at: new Date().toISOString() })
    .eq('id', friendshipId)

  if (error) {
    console.error('Failed to reject request:', error.message)
    return false
  }
  return true
}

export async function removeFriend(friendshipId: string): Promise<boolean> {
  const { error } = await supabase
    .from('friendships')
    .delete()
    .eq('id', friendshipId)

  if (error) {
    console.error('Failed to remove friend:', error.message)
    return false
  }
  return true
}

export async function loadFriendships(): Promise<FriendWithProfile[]> {
  const userId = (await supabase.auth.getUser()).data.user?.id
  if (!userId) return []

  const { data, error } = await supabase
    .from('friendships')
    .select('*, profile:profiles!friendships_friend_id_fkey(*)')
    .eq('user_id', userId)
    .in('status', ['pending', 'accepted'])

  if (error) {
    console.error('Failed to load sent friendships:', error.message)
  }

  const { data: data2, error: error2 } = await supabase
    .from('friendships')
    .select('*, profile:profiles!friendships_user_id_fkey(*)')
    .eq('friend_id', userId)
    .in('status', ['pending', 'accepted'])

  if (error2) {
    console.error('Failed to load received friendships:', error2.message)
  }

  const sent = (data || []).map((f: any) => ({
    ...f,
    profile: f.profile,
  })) as FriendWithProfile[]

  const received = (data2 || []).map((f: any) => ({
    ...f,
    profile: f.profile,
  })) as FriendWithProfile[]

  return [...sent, ...received]
}

export async function loadFriendTrips(friendId: string) {
  const { data, error } = await supabase
    .from('trips')
    .select('*')
    .eq('user_id', friendId)
    .order('completed_at', { ascending: false })

  if (error) {
    console.error('Failed to load friend trips:', error.message)
    return []
  }
  return data
}
