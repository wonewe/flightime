import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plane } from 'lucide-react'
import { HistoryMap } from './HistoryMap'
import type { RouteGroup } from './HistoryMap'
import { loadFriendTrips } from '../lib/friendships'
import type { TripRecord, TripRow } from '../types'

interface Props {
  friendId: string
  username: string
  mileage?: { balance: number; totalEarned: number }
}

function rowToRecord(row: TripRow): TripRecord {
  return {
    id: row.id,
    config: row.config,
    durationMinutes: row.duration_minutes,
    completedAt: row.completed_at,
  }
}

const ease = [0.16, 1, 0.3, 1] as const

export function FriendTripHistory({ friendId, username, mileage }: Props) {
  const [trips, setTrips] = useState<TripRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedRoute, setExpandedRoute] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    loadFriendTrips(friendId).then(rows => {
      setTrips((rows as TripRow[]).map(rowToRecord))
      setLoading(false)
    })
  }, [friendId])

  const routeGroups: RouteGroup[] = useMemo(() => {
    const map = new Map<string, TripRecord[]>()
    for (const t of trips) {
      const key = `${t.config.from.code}\u2192${t.config.to.code}`
      const arr = map.get(key) || []
      arr.push(t)
      map.set(key, arr)
    }
    return Array.from(map.entries()).map(([key, records]) => ({
      key,
      records,
      from: records[0].config.from,
      to: records[0].config.to,
    }))
  }, [trips])

  const totalStats = useMemo(() => {
    const totalKm = trips.reduce((sum, t) => sum + t.config.distanceKm, 0)
    const totalMin = trips.reduce((sum, t) => sum + t.durationMinutes, 0)
    const cities = new Set<string>()
    for (const t of trips) { cities.add(t.config.from.code); cities.add(t.config.to.code) }
    return { totalKm, totalMin, cityCount: cities.size }
  }, [trips])

  const fmtDist = (km: number) => km >= 10000 ? `${(km / 1000).toFixed(1)}k` : km.toLocaleString()
  const fmtTotal = (m: number) => {
    const h = Math.floor(m / 60), r = m % 60
    return h > 0 ? (r > 0 ? `${h}시간 ${r}분` : `${h}시간`) : `${m}분`
  }
  const fmt = (m: number) => {
    const h = Math.floor(m / 60), r = m % 60
    return h > 0 ? (r > 0 ? `${h}h ${r}m` : `${h}h`) : `${m}m`
  }
  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-US', { day: '2-digit', month: 'short' }).toUpperCase()

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <span className="text-[11px] font-mono text-white/30">불러오는 중...</span>
      </div>
    )
  }

  if (trips.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center">
        <Plane className="w-8 h-8 text-white/10 mb-3" />
        <p className="text-[12px] text-white/30">{username}의 비행 기록이 없습니다</p>
      </div>
    )
  }

  return (
    <div className="h-full relative">
      {/* Map background */}
      <div className="absolute inset-0">
        <HistoryMap routeGroups={routeGroups} selectedRoute={expandedRoute} />
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse at center, transparent 30%, rgb(var(--bg-base) / 0.7) 100%)' }} />
      </div>

      {/* Overlay cards */}
      <div className="absolute inset-y-0 left-0 w-[20%] z-[1000] flex flex-col p-4 pointer-events-none">
        {/* Stats card */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease }}
          className="backdrop-blur-xl bg-night-900/80 border border-surface/10 rounded-xl p-3 mb-2 pointer-events-auto"
        >
          <p className="text-[10px] font-mono text-white/50 tracking-wider mb-3">{username}의 기록</p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
            <div>
              <p className="text-[8px] font-mono text-white/30 tracking-[0.15em]">FLIGHTS</p>
              <p className="text-[14px] font-mono font-bold text-white/80">{trips.length}</p>
            </div>
            <div>
              <p className="text-[8px] font-mono text-white/30 tracking-[0.15em]">CITIES</p>
              <p className="text-[14px] font-mono font-bold text-white/80">{totalStats.cityCount}</p>
            </div>
            <div>
              <p className="text-[8px] font-mono text-white/30 tracking-[0.15em]">KM</p>
              <p className="text-[14px] font-mono font-bold text-white/80">{fmtDist(totalStats.totalKm)}</p>
            </div>
            <div>
              <p className="text-[8px] font-mono text-white/30 tracking-[0.15em]">FOCUS</p>
              <p className="text-[14px] font-mono font-bold text-white/80">{fmtTotal(totalStats.totalMin)}</p>
            </div>
          </div>
          {mileage && (
            <div className="mt-3 pt-2.5 border-t border-surface/[0.06]">
              <p className="text-[8px] font-mono text-white/30 tracking-[0.15em]">MILEAGE</p>
              <p className="text-[14px] font-mono font-bold text-sky-400/80 mt-0.5">
                {mileage.balance.toLocaleString()}<span className="text-[9px] text-sky-400/50 ml-1">M</span>
              </p>
              <p className="text-[8px] font-mono text-white/25 mt-0.5">
                총 {mileage.totalEarned.toLocaleString()}M 획득
              </p>
            </div>
          )}
        </motion.div>

        {/* Route cards - scrollable */}
        <div className="flex-1 overflow-y-auto space-y-2 pointer-events-auto">
          {routeGroups.map((rg, i) => (
            <motion.div
              key={rg.key}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.05, duration: 0.4, ease }}
            >
              <button
                onClick={() => setExpandedRoute(prev => prev === rg.key ? null : rg.key)}
                className={`w-full text-left backdrop-blur-xl rounded-lg p-2.5 border transition-all duration-300 ${
                  expandedRoute === rg.key
                    ? 'bg-night-900/80 border-sky-400/30'
                    : 'bg-night-900/60 border-surface/10 hover:bg-night-900/70'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[12px] font-mono font-bold text-white/80 tracking-wider">{rg.from.code}</span>
                    <Plane className="w-2 h-2 text-white/25" />
                    <span className="text-[12px] font-mono font-bold text-white/80 tracking-wider">{rg.to.code}</span>
                  </div>
                  <span className="text-[9px] font-mono text-sky-400/70">{rg.records.length}회</span>
                </div>
                <span className="text-[9px] text-white/35 mt-0.5 block">{rg.from.cityKo} → {rg.to.cityKo}</span>
              </button>

              <AnimatePresence>
                {expandedRoute === rg.key && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25, ease }}
                    className="overflow-hidden"
                  >
                    <div className="mt-1.5 backdrop-blur-xl bg-night-900/70 border border-surface/10 rounded-lg p-3 space-y-1.5">
                      {rg.records.map(trip => (
                        <div key={trip.id} className="flex items-center justify-between text-[10px] font-mono text-white/50">
                          <div className="flex items-center gap-2.5">
                            <span>{fmtDate(trip.completedAt)}</span>
                            <span className="text-white/30">{fmt(trip.durationMinutes)}</span>
                          </div>
                          <span className="text-[9px] text-white/25">{trip.config.aircraft.name.split(' ').slice(0, 2).join(' ')}</span>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  )
}
