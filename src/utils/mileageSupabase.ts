import { supabase } from '../lib/supabase'

export async function initMileageRow(userId: string) {
  const { data } = await supabase
    .from('user_mileage')
    .select('user_id')
    .eq('user_id', userId)
    .maybeSingle()

  if (!data) {
    await supabase
      .from('user_mileage')
      .insert({ user_id: userId, balance: 0, total_earned: 0 })
  }
}

export async function loadMileage(userId: string): Promise<{ balance: number; totalEarned: number }> {
  const { data } = await supabase
    .from('user_mileage')
    .select('balance, total_earned')
    .eq('user_id', userId)
    .single()
  if (!data) return { balance: 0, totalEarned: 0 }
  return { balance: data.balance, totalEarned: data.total_earned }
}

export async function earnMileage(userId: string, amount: number): Promise<number> {
  // First try to get existing row
  const { data: existing } = await supabase
    .from('user_mileage')
    .select('balance, total_earned')
    .eq('user_id', userId)
    .single()

  if (existing) {
    const newBalance = existing.balance + amount
    const newTotal = existing.total_earned + amount
    await supabase
      .from('user_mileage')
      .update({ balance: newBalance, total_earned: newTotal })
      .eq('user_id', userId)
    return newBalance
  } else {
    await supabase
      .from('user_mileage')
      .insert({ user_id: userId, balance: amount, total_earned: amount })
    return amount
  }
}

export async function spendMileage(userId: string, amount: number): Promise<number> {
  const { data } = await supabase
    .from('user_mileage')
    .select('balance')
    .eq('user_id', userId)
    .single()

  if (!data || data.balance < amount) throw new Error('Insufficient mileage')

  const newBalance = data.balance - amount
  await supabase
    .from('user_mileage')
    .update({ balance: newBalance })
    .eq('user_id', userId)
  return newBalance
}

export async function loadUnlocks(userId: string): Promise<Set<string>> {
  const { data } = await supabase
    .from('user_unlocks')
    .select('item_type, item_id')
    .eq('user_id', userId)
  if (!data) return new Set()
  return new Set(data.map(r => `${r.item_type}:${r.item_id}`))
}

export async function unlockItem(userId: string, type: 'airport' | 'aircraft', itemId: string, cost: number): Promise<number> {
  const newBalance = await spendMileage(userId, cost)
  await supabase
    .from('user_unlocks')
    .insert({ user_id: userId, item_type: type, item_id: itemId })
  return newBalance
}

export async function loadFriendMileages(userIds: string[]): Promise<Map<string, { balance: number; totalEarned: number }>> {
  const result = new Map<string, { balance: number; totalEarned: number }>()
  if (userIds.length === 0) return result

  const { data } = await supabase
    .from('user_mileage')
    .select('user_id, balance, total_earned')
    .in('user_id', userIds)

  if (data) {
    for (const row of data) {
      result.set(row.user_id, { balance: row.balance, totalEarned: row.total_earned })
    }
  }
  return result
}
