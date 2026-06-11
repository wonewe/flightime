import { useState, useEffect, useCallback } from 'react'
import {
  INITIALLY_UNLOCKED_AIRPORTS,
  INITIALLY_UNLOCKED_AIRCRAFT,
  AIRPORT_UNLOCK_COST,
  AIRCRAFT_UNLOCK_COST,
} from '../constants/unlockCosts'
import {
  loadMileage,
  earnMileage,
  loadUnlocks,
  unlockItem,
  initMileageRow,
  claimDailyCheckin,
} from '../utils/mileageSupabase'

export function useMileage(userId?: string) {
  const [balance, setBalance] = useState(0)
  const [totalEarned, setTotalEarned] = useState(0)
  const [unlockedAirports, setUnlockedAirports] = useState<Set<string>>(new Set(INITIALLY_UNLOCKED_AIRPORTS))
  const [unlockedAircraft, setUnlockedAircraft] = useState<Set<string>>(new Set(INITIALLY_UNLOCKED_AIRCRAFT))
  const [loading, setLoading] = useState(true)
  const [dailyEarned, setDailyEarned] = useState(0)

  useEffect(() => {
    if (!userId) { setLoading(false); return }
    let cancelled = false

    async function load() {
      await initMileageRow(userId!)
      const checkinAmount = await claimDailyCheckin(userId!)
      const [mileage, unlocks] = await Promise.all([loadMileage(userId!), loadUnlocks(userId!)])
      if (cancelled) return

      setBalance(mileage.balance)
      setTotalEarned(mileage.totalEarned)
      setDailyEarned(checkinAmount)

      const airports = new Set(INITIALLY_UNLOCKED_AIRPORTS)
      const aircraft = new Set(INITIALLY_UNLOCKED_AIRCRAFT)
      for (const key of unlocks) {
        const [type, id] = key.split(':')
        if (type === 'airport') airports.add(id)
        else if (type === 'aircraft') aircraft.add(id)
      }
      setUnlockedAirports(airports)
      setUnlockedAircraft(aircraft)
      setLoading(false)
    }

    load()
    return () => { cancelled = true }
  }, [userId])

  const earn = useCallback(async (amount: number) => {
    if (!userId) return
    const newBalance = await earnMileage(userId, amount)
    setBalance(newBalance)
    setTotalEarned(prev => prev + amount)
  }, [userId])

  const unlock = useCallback(async (type: 'airport' | 'aircraft', itemId: string) => {
    if (!userId) return
    const cost = type === 'airport' ? AIRPORT_UNLOCK_COST[itemId] : AIRCRAFT_UNLOCK_COST[itemId]
    if (!cost) return
    if (balance < cost) return

    const newBalance = await unlockItem(userId, type, itemId, cost)
    setBalance(newBalance)
    if (type === 'airport') {
      setUnlockedAirports(prev => new Set([...prev, itemId]))
    } else {
      setUnlockedAircraft(prev => new Set([...prev, itemId]))
    }
  }, [userId, balance])

  return { balance, totalEarned, unlockedAirports, unlockedAircraft, loading, earn, unlock, dailyEarned }
}
