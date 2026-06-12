import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plane, History, Users, X, Trash2, Search, ArrowLeft, ChevronRight, LogOut, Settings, MapPin, Lock, Unlock } from 'lucide-react'
import createGlobe from 'cobe'
import type { Airport, Aircraft, FlightConfig, FlightInvite, TripRecord } from '../types'
import { AIRPORTS, AIRCRAFT } from '../constants'
import { SeatMap } from './SeatMap'
import { haversineDistance } from '../utils/geo'
import { loadTripsSupabase, deleteTripsSupabase, deleteTripsByIds } from '../utils/tripHistorySupabase'
import { useAuth } from '../contexts/AuthContext'
import { HistoryMap } from './HistoryMap'
import { FriendsPanel } from './FriendsPanel'
import { SettingsPanel, getHubAirport } from './SettingsPanel'
import { AirportCatalog } from './AirportCatalog'
import { useFriends } from '../hooks/useFriends'
import { searchProfiles } from '../lib/friendships'
import { AIRPORT_UNLOCK_COST, AIRCRAFT_UNLOCK_COST } from '../constants/unlockCosts'
import { useTheme } from '../contexts/ThemeContext'
import type { PresenceState, Profile } from '../types'

type Phase = 'idle' | 'selectFrom' | 'selectTo' | 'selectAircraft' | 'selectSeat'

interface Props {
  onFlightConfigured: (config: FlightConfig) => void
  presenceMap: Map<string, PresenceState>
  mileageBalance: number
  unlockedAirports: Set<string>
  unlockedAircraft: Set<string>
  onUnlock: (type: 'airport' | 'aircraft', itemId: string) => Promise<void>
  sendFlightInvite: (toUserId: string, invite: FlightInvite) => Promise<void>
  pendingFlightInvites: FlightInvite[]
  onAcceptFlightInvite: (invite: FlightInvite) => void
  onDismissFlightInvite: (fromUserId: string) => void
}

const ease = [0.16, 1, 0.3, 1] as const

const slideVariants = {
  enter: (dir: number) => ({ opacity: 0, x: dir > 0 ? 60 : -60 }),
  center: { opacity: 1, x: 0 },
  exit: (dir: number) => ({ opacity: 0, x: dir > 0 ? -60 : 60 }),
}

function generateFlightNumber(): string {
  const num = Math.floor(Math.random() * 9000) + 1000
  return `FT-${num}`
}

export function HomeScreen({ onFlightConfigured, presenceMap, mileageBalance, unlockedAirports, unlockedAircraft, onUnlock, sendFlightInvite, pendingFlightInvites, onAcceptFlightInvite, onDismissFlightInvite }: Props) {
  const { signOut, user } = useAuth()
  const { theme } = useTheme()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [showHistory, setShowHistory] = useState(false)
  const [showFriends, setShowFriends] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showAirportCatalog, setShowAirportCatalog] = useState(false)
  const { pendingReceived, pendingSent, acceptedFriends, send, accept } = useFriends(user?.id)
  const [trips, setTrips] = useState<TripRecord[]>([])
  const [expandedRoute, setExpandedRoute] = useState<string | null>(null)
  const [phase, setPhase] = useState<Phase>('idle')
  const [slideDir, setSlideDir] = useState(1)
  const [fromAirport, setFromAirport] = useState<Airport | null>(null)
  const [toAirport, setToAirport] = useState<Airport | null>(null)
  const [aircraft, setAircraft] = useState<Aircraft | null>(null)
  const [focusedIdx, setFocusedIdx] = useState(0)
  const [search, setSearch] = useState('')
  const [unlockConfirm, setUnlockConfirm] = useState<{ type: 'airport' | 'aircraft'; id: string; name: string; cost: number } | null>(null)
  const [showFriendInvite, setShowFriendInvite] = useState(false)
  const [inviteSearch, setInviteSearch] = useState('')
  const [inviteResults, setInviteResults] = useState<Profile[]>([])
  const [inviteSearching, setInviteSearching] = useState(false)
  const [invitedIds, setInvitedIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    loadTripsSupabase().then(setTrips)
  }, [])

  // Globe
  useEffect(() => {
    if (!canvasRef.current) return

    const canvas = canvasRef.current
    const container = canvas.parentElement!
    let phi = 3.5
    let rafId: number
    let globe: ReturnType<typeof createGlobe>

    // Show both departure and destination markers
    const seen = new Set<string>()
    const markers: { location: [number, number]; size: number }[] = []
    for (const t of trips) {
      const fk = `${t.config.from.lat},${t.config.from.lng}`
      const tk = `${t.config.to.lat},${t.config.to.lng}`
      if (!seen.has(fk)) { seen.add(fk); markers.push({ location: [t.config.from.lat, t.config.from.lng], size: 0.02 }) }
      if (!seen.has(tk)) { seen.add(tk); markers.push({ location: [t.config.to.lat, t.config.to.lng], size: 0.025 }) }
    }

    function initGlobe() {
      const size = Math.min(container.clientWidth, container.clientHeight, 600)
      canvas.width = size * 2
      canvas.height = size * 2
      canvas.style.width = `${size}px`
      canvas.style.height = `${size}px`

      const isLight = theme === 'light'
      globe = createGlobe(canvas, {
        devicePixelRatio: 2,
        width: size * 2,
        height: size * 2,
        phi,
        theta: 0.15,
        dark: isLight ? 0 : 1,
        diffuse: isLight ? 2.5 : 1.2,
        mapSamples: 16000,
        mapBrightness: isLight ? 8 : 2.5,
        baseColor: isLight ? [0.92, 0.94, 0.97] : [0.08, 0.12, 0.22],
        markerColor: [0.376, 0.647, 0.98],
        glowColor: isLight ? [0.88, 0.90, 0.95] : [0.06, 0.09, 0.18],
        markers,
      })
    }

    initGlobe()

    function animate() {
      phi += 0.003
      globe.update({ phi })
      rafId = requestAnimationFrame(animate)
    }
    rafId = requestAnimationFrame(animate)

    const ro = new ResizeObserver(() => {
      cancelAnimationFrame(rafId)
      globe.destroy()
      initGlobe()
      rafId = requestAnimationFrame(animate)
    })
    ro.observe(container)

    return () => {
      ro.disconnect()
      cancelAnimationFrame(rafId)
      globe.destroy()
    }
  }, [trips, theme])

  const filteredAirports = useMemo(() => {
    const exclude = phase === 'selectTo' ? fromAirport?.code : toAirport?.code
    const list = exclude ? AIRPORTS.filter(a => a.code !== exclude) : AIRPORTS
    if (!search.trim()) return list
    const q = search.toLowerCase()
    return list.filter(a =>
      a.code.toLowerCase().includes(q) ||
      a.city.toLowerCase().includes(q) ||
      a.cityKo.includes(q) ||
      a.country.toLowerCase().includes(q)
    )
  }, [search, phase, fromAirport, toAirport])

  const handleStartTrip = useCallback(() => {
    setSlideDir(1)
    setPhase('selectFrom')
    setFromAirport(null)
    setToAirport(null)
    setAircraft(null)
    setSearch('')
  }, [])

  const handleSelectAirport = useCallback((airport: Airport) => {
    // Check if airport is locked
    if (!unlockedAirports.has(airport.code) && AIRPORT_UNLOCK_COST[airport.code]) {
      setUnlockConfirm({ type: 'airport', id: airport.code, name: airport.cityKo, cost: AIRPORT_UNLOCK_COST[airport.code] })
      return
    }
    if (phase === 'selectFrom') {
      setFromAirport(airport)
      setSlideDir(1)
      setPhase('selectTo')
      setSearch('')
    } else if (phase === 'selectTo') {
      setToAirport(airport)
      setSlideDir(1)
      setPhase('selectAircraft')
      setSearch('')
    }
  }, [phase, unlockedAirports])

  const handleSelectAircraft = useCallback((ac: Aircraft) => {
    if (!unlockedAircraft.has(ac.id) && AIRCRAFT_UNLOCK_COST[ac.id]) {
      setUnlockConfirm({ type: 'aircraft', id: ac.id, name: ac.nameKo, cost: AIRCRAFT_UNLOCK_COST[ac.id] })
      return
    }
    setAircraft(ac)
    setSlideDir(1)
    setPhase('selectSeat')
  }, [unlockedAircraft])

  const handleSelectSeat = useCallback((seatCode: string) => {
    if (!fromAirport || !toAirport || !aircraft) return
    const config: FlightConfig = {
      from: fromAirport,
      to: toAirport,
      aircraft,
      seat: seatCode,
      distanceKm: Math.round(haversineDistance(fromAirport, toAirport)),
      flightNumber: generateFlightNumber(),
    }
    onFlightConfigured(config)
  }, [fromAirport, toAirport, aircraft, onFlightConfigured])

  const handleBack = useCallback(() => {
    setSlideDir(-1)
    if (phase === 'selectTo') {
      setPhase('selectFrom')
      setFromAirport(null)
      setSearch('')
    } else if (phase === 'selectAircraft') {
      setPhase('selectTo')
      setToAirport(null)
      setSearch('')
    } else if (phase === 'selectSeat') {
      setPhase('selectAircraft')
      setAircraft(null)
    } else {
      setPhase('idle')
      setSearch('')
    }
  }, [phase])

  const handleClearTrips = useCallback(async () => {
    await deleteTripsSupabase()
    setTrips([])
  }, [])

  const handleDeleteRoute = useCallback(async (routeKey: string, recordIds: string[]) => {
    await deleteTripsByIds(recordIds)
    setTrips(prev => prev.filter(t => `${t.config.from.code}→${t.config.to.code}` !== routeKey))
    if (expandedRoute === routeKey) setExpandedRoute(null)
  }, [expandedRoute])

  const handleToggleHistory = useCallback(() => {
    if (!showHistory) { loadTripsSupabase().then(setTrips); setExpandedRoute(null) }
    setShowHistory(v => !v)
  }, [showHistory])

  // Group trips by route key "FROM→TO"
  const routeGroups = useMemo(() => {
    const map = new Map<string, TripRecord[]>()
    for (const t of trips) {
      const key = `${t.config.from.code}→${t.config.to.code}`
      const arr = map.get(key) || []
      arr.push(t)
      map.set(key, arr)
    }
    return Array.from(map.entries()).map(([key, records]) => ({ key, records, from: records[0].config.from, to: records[0].config.to }))
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

  const handleInviteSearch = useCallback(async (q: string) => {
    setInviteSearch(q)
    if (q.trim().length < 2) {
      setInviteResults([])
      return
    }
    setInviteSearching(true)
    const results = await searchProfiles(q.trim())
    setInviteResults(user?.id ? results.filter(p => p.id !== user.id) : results)
    setInviteSearching(false)
  }, [user?.id])

  const getInviteStatus = useCallback((profileId: string): 'none' | 'sent' | 'received' | 'friend' => {
    if (acceptedFriends.some(f => f.user_id === profileId || f.friend_id === profileId)) return 'friend'
    if (pendingSent.some(f => f.friend_id === profileId)) return 'sent'
    const received = pendingReceived.find(f => f.user_id === profileId)
    if (received) return 'received'
    return 'none'
  }, [acceptedFriends, pendingSent, pendingReceived])

  const getReceivedFriendshipId = useCallback((profileId: string): string | undefined => {
    return pendingReceived.find(f => f.user_id === profileId)?.id
  }, [pendingReceived])

  // Route summary shown in aircraft/seat phases
  const routeSummary = fromAirport && toAirport && (
    <div className="mb-5 flex items-center gap-2">
      <span className="text-[13px] font-mono font-bold tracking-[0.2em] text-sky-400/80">
        {fromAirport.code}
      </span>
      <Plane className="w-3 h-3 text-white/30 mx-1" />
      <span className="text-[13px] font-mono font-bold tracking-[0.2em] text-sky-400/80">
        {toAirport.code}
      </span>
      {aircraft && (
        <>
          <span className="text-white/20 mx-1">·</span>
          <span className="text-[10px] font-mono text-white/45">{aircraft.name}</span>
        </>
      )}
    </div>
  )

  return (
    <div className="h-full flex flex-col items-center justify-center relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-night-950" />

      {/* Globe */}
      <div className={`absolute inset-0 flex items-center justify-center pointer-events-none transition-opacity duration-500 ${phase === 'selectSeat' ? 'opacity-0' : 'opacity-100'}`}>
        <canvas ref={canvasRef} className="globe-canvas absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
      </div>

      {/* Vignette */}
      <div className={`absolute inset-0 pointer-events-none transition-opacity duration-500 ${phase === 'selectSeat' ? 'opacity-0' : 'opacity-100'}`}
        style={{ background: 'radial-gradient(ellipse at center, transparent 30%, rgb(var(--bg-base) / 0.85) 75%)' }} />
      <div className={`absolute top-0 inset-x-0 h-32 pointer-events-none transition-opacity duration-500 ${phase === 'selectSeat' ? 'opacity-0' : 'opacity-100'}`}
        style={{ background: 'linear-gradient(to bottom, rgb(var(--bg-base) / 0.9) 0%, transparent 100%)' }} />
      <div className={`absolute bottom-0 inset-x-0 h-40 pointer-events-none transition-opacity duration-500 ${phase === 'selectSeat' ? 'opacity-0' : 'opacity-100'}`}
        style={{ background: 'linear-gradient(to top, rgb(var(--bg-base) / 0.95) 0%, transparent 100%)' }} />

      {/* Sliding content */}
      <div className="relative z-10 flex flex-col items-center w-full h-full overflow-hidden">
        <AnimatePresence mode="wait" custom={slideDir}>

          {/* === IDLE === */}
          {phase === 'idle' && (
            <motion.div
              key="idle"
              custom={slideDir}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.35, ease }}
              className="absolute inset-0 flex flex-col items-center justify-center px-6"
            >
              {/* User info + mileage + settings + logout */}
              <div className="absolute top-4 right-4 flex items-center gap-2">
                <span className="text-[10px] font-mono text-sky-400/70 tracking-wider mr-1">
                  ✈ {mileageBalance.toLocaleString()} M
                </span>
                {user && (
                  <span className="text-[10px] font-mono text-white/45 tracking-wider">
                    {user.user_metadata?.username ?? ''}
                  </span>
                )}
                <button
                  onClick={() => setShowSettings(true)}
                  className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-surface/10 transition-colors"
                  title="설정"
                >
                  <Settings className="w-3.5 h-3.5 text-white/40" />
                </button>
                <button
                  onClick={signOut}
                  className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-surface/10 transition-colors"
                  title="로그아웃"
                >
                  <LogOut className="w-3.5 h-3.5 text-white/40" />
                </button>
              </div>

              <div className="mb-2 mt-8">
                <h1 className={`text-[32px] font-mono font-bold tracking-[0.4em] text-center ${theme === 'light' ? 'text-white/90' : 'text-white/55'}`}>
                  FLIGHTIME
                </h1>
              </div>

              <div className="h-[80px]" />

              <div className="flex flex-col gap-3 w-full max-w-[280px]">
                <motion.button
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleStartTrip}
                  className="w-full py-3.5 rounded-xl bg-surface/[0.08] border border-surface/[0.10] text-white/80 font-medium text-[13px] tracking-wide hover:bg-surface/[0.14] hover:text-white/95 transition-all duration-300 flex items-center justify-center gap-2.5"
                >
                  <Plane className="w-3.5 h-3.5" />
                  새 여행 떠나기
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setShowFriends(true)}
                  className="w-full py-3 rounded-xl bg-transparent border border-surface/[0.08] text-white/50 text-[12px] tracking-wide hover:bg-surface/[0.06] hover:text-white/70 transition-all duration-300 flex items-center justify-center gap-2"
                >
                  <Users className="w-3.5 h-3.5" />
                  친구
                  {(pendingReceived.length + pendingFlightInvites.length) > 0 && (
                    <span className="text-[9px] font-mono text-sky-400 bg-sky-400/15 rounded-full px-1.5 py-0.5 ml-1">{pendingReceived.length + pendingFlightInvites.length}</span>
                  )}
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleToggleHistory}
                  className="w-full py-3 rounded-xl bg-transparent border border-surface/[0.08] text-white/50 text-[12px] tracking-wide hover:bg-surface/[0.06] hover:text-white/70 transition-all duration-300 flex items-center justify-center gap-2"
                >
                  <History className="w-3.5 h-3.5" />
                  기존 여행 보기
                  {trips.length > 0 && (
                    <span className="text-[9px] font-mono text-sky-400/60 ml-1">{trips.length}</span>
                  )}
                </motion.button>

              </div>
            </motion.div>
          )}

          {/* === SELECT FROM / TO === */}
          {(phase === 'selectFrom' || phase === 'selectTo') && (
            <motion.div
              key={phase}
              custom={slideDir}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.35, ease }}
              className="absolute inset-0 flex flex-col items-center justify-center px-6"
            >
              <button onClick={handleBack} className="absolute top-5 left-5 w-7 h-7 flex items-center justify-center rounded-full hover:bg-surface/10 transition-colors">
                <ArrowLeft className="w-4 h-4 text-white/50" />
              </button>

              {phase === 'selectFrom' && (
                <button
                  onClick={() => setShowAirportCatalog(true)}
                  className="absolute top-5 right-5 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface/[0.06] border border-surface/[0.08] hover:bg-surface/[0.10] transition-colors"
                >
                  <MapPin className="w-3 h-3 text-white/40" />
                  <span className="text-[10px] font-mono text-white/45">공항 목록</span>
                </button>
              )}

              {phase === 'selectTo' && fromAirport && (
                <div className="mb-5 flex items-center gap-2">
                  <span className="text-[13px] font-mono font-bold tracking-[0.2em] text-sky-400/80">
                    {fromAirport.code}
                  </span>
                  <span className="text-[10px] text-white/40">{fromAirport.cityKo}</span>
                  <Plane className="w-3 h-3 text-white/30 mx-1" />
                  <span className="text-[13px] font-mono text-white/35 tracking-wider">???</span>
                </div>
              )}

              <h2 className="text-[18px] font-mono font-semibold text-white/70 tracking-[0.1em] mb-5">
                {phase === 'selectFrom' ? '어디에서 출발할까요?' : '어디로 떠날까요?'}
              </h2>

              <div className="w-full max-w-[300px] mb-3">
                <div className="flex items-center gap-2 bg-surface/[0.06] border border-surface/[0.10] rounded-xl px-4 py-3">
                  <Search className="w-4 h-4 text-white/35" />
                  <input
                    type="text"
                    placeholder="도시 또는 공항코드"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="flex-1 bg-transparent text-[14px] font-mono text-white/80 placeholder:text-white/35 outline-none"
                    autoFocus
                  />
                </div>

                {phase === 'selectFrom' && (() => {
                  const hub = getHubAirport()
                  return hub ? (
                    <button
                      onClick={() => handleSelectAirport(hub)}
                      className="w-full mt-2.5 flex items-center justify-between px-4 py-3 rounded-xl bg-sky-400/[0.08] border border-sky-400/[0.18] hover:bg-sky-400/[0.14] transition-all duration-300 group"
                    >
                      <div className="flex items-center gap-3">
                        <MapPin className="w-3.5 h-3.5 text-sky-400/70" />
                        <span className="text-[13px] font-mono font-bold tracking-wider text-sky-400/90">{hub.code}</span>
                        <span className="text-[11px] text-white/50">{hub.cityKo}</span>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-sky-400/40 group-hover:text-sky-400/70 transition-colors" />
                    </button>
                  ) : null
                })()}
              </div>

              <AnimatePresence>
                {search.trim() && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 8 }}
                    transition={{ duration: 0.2 }}
                    className="w-full max-w-[300px] max-h-[200px] overflow-y-auto rounded-xl bg-night-950/90 backdrop-blur-md border border-surface/[0.10]"
                  >
                    {filteredAirports.length === 0 ? (
                      <div className="px-4 py-4 text-center text-[11px] text-white/40">검색 결과 없음</div>
                    ) : (
                      [...filteredAirports].sort((a, b) => {
                        const aLocked = !unlockedAirports.has(a.code) && !!AIRPORT_UNLOCK_COST[a.code]
                        const bLocked = !unlockedAirports.has(b.code) && !!AIRPORT_UNLOCK_COST[b.code]
                        if (aLocked !== bLocked) return aLocked ? 1 : -1
                        return 0
                      }).map(airport => {
                        const isLocked = !unlockedAirports.has(airport.code) && !!AIRPORT_UNLOCK_COST[airport.code]
                        return (
                          <button
                            key={airport.code}
                            onClick={() => handleSelectAirport(airport)}
                            className={`w-full flex items-center justify-between px-4 py-2.5 hover:bg-surface/[0.07] transition-colors group ${isLocked ? 'opacity-50' : ''}`}
                          >
                            <div className="flex items-center gap-3">
                              {isLocked && <Lock className="w-3 h-3 text-white/40 -mr-1" />}
                              <span className={`text-[14px] font-mono font-semibold tracking-[0.15em] w-10 ${isLocked ? 'text-white/40' : 'text-white/75'}`}>
                                {airport.code}
                              </span>
                              <div className="text-left">
                                <p className={`text-[12px] ${isLocked ? 'text-white/30' : 'text-white/50'}`}>{airport.cityKo}</p>
                              </div>
                            </div>
                            {isLocked ? (
                              <span className="text-[9px] font-mono text-amber-400/60">{AIRPORT_UNLOCK_COST[airport.code].toLocaleString()}M</span>
                            ) : (
                              <ChevronRight className="w-3 h-3 text-white/0 group-hover:text-white/30 transition-colors" />
                            )}
                          </button>
                        )
                      })
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}

          {/* === SELECT AIRCRAFT (pill tabs + image) === */}
          {phase === 'selectAircraft' && (
            <motion.div
              key="selectAircraft"
              custom={slideDir}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.35, ease }}
              className="absolute inset-0 flex flex-col items-center px-6 pt-14"
            >
              <button onClick={handleBack} className="absolute top-5 left-5 w-7 h-7 flex items-center justify-center rounded-full hover:bg-surface/10 transition-colors">
                <ArrowLeft className="w-4 h-4 text-white/50" />
              </button>

              {routeSummary}

              <h2 className="text-[18px] font-mono font-semibold text-white/70 tracking-[0.1em] mb-5">
                기체를 선택하세요
              </h2>

              {/* Aircraft side-view image */}
              <div className="relative w-full max-w-[360px] h-[120px] mb-5 flex items-center justify-center overflow-hidden">
                <div
                  className="absolute inset-0"
                  style={{
                    maskImage: 'linear-gradient(to bottom, black 40%, transparent 100%)',
                    WebkitMaskImage: 'linear-gradient(to bottom, black 40%, transparent 100%)',
                  }}
                >
                  <img
                    src="/models/Boeing-737-800.webp"
                    alt="Aircraft"
                    className="w-full h-full object-contain opacity-30"
                  />
                </div>
              </div>

              {/* Aircraft name/type */}
              {(() => {
                const ac = AIRCRAFT[focusedIdx]
                const isLocked = !unlockedAircraft.has(ac.id) && !!AIRCRAFT_UNLOCK_COST[ac.id]
                return (
                  <div className={`text-center mb-5 ${isLocked ? 'opacity-50' : ''}`}>
                    {isLocked && <Lock className="w-4 h-4 text-white/40 mx-auto mb-2" />}
                    <p className="text-[22px] font-mono font-bold text-white/75 tracking-wider">
                      {ac.name}
                    </p>
                    <p className="text-[11px] text-white/45 mt-2">
                      {ac.nameKo} · {ac.type}
                    </p>
                  </div>
                )
              })()}

              {/* Pill-style tabs */}
              <div className="flex flex-wrap items-center justify-center gap-2 mb-6">
                {AIRCRAFT.map((ac, i) => {
                  const isLocked = !unlockedAircraft.has(ac.id) && !!AIRCRAFT_UNLOCK_COST[ac.id]
                  const isActive = i === focusedIdx
                  const shortName = ac.id === 'b737' ? 'B737'
                    : ac.id === 'a320' ? 'A320'
                    : ac.id === 'b777' ? 'B777'
                    : ac.id === 'a350' ? 'A350'
                    : ac.id === 'b787' ? 'B787'
                    : ac.id === 'a380' ? 'A380'
                    : ac.name.split(' ')[1] || ac.id.toUpperCase()
                  return (
                    <button
                      key={ac.id}
                      onClick={() => setFocusedIdx(i)}
                      className={`px-3.5 py-1.5 rounded-full text-[11px] font-mono tracking-wider transition-all duration-200 ${
                        isActive
                          ? 'bg-white/90 text-night-950 font-semibold shadow-[0_0_12px_rgba(255,255,255,0.15)]'
                          : isLocked
                          ? 'bg-surface/[0.04] text-white/25 hover:bg-surface/[0.08]'
                          : 'bg-surface/[0.06] text-white/45 hover:bg-surface/[0.12] hover:text-white/65'
                      }`}
                    >
                      {isLocked && !isActive && <Lock className="w-2.5 h-2.5 inline mr-1 -mt-0.5" />}
                      {shortName}
                    </button>
                  )
                })}
              </div>

              {/* Select / Unlock button */}
              <div className="w-full max-w-[280px]">
                {(() => {
                  const ac = AIRCRAFT[focusedIdx]
                  const isLocked = !unlockedAircraft.has(ac.id) && !!AIRCRAFT_UNLOCK_COST[ac.id]
                  return (
                    <motion.button
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleSelectAircraft(ac)}
                      className={`w-full py-3 rounded-xl border font-medium text-[13px] tracking-wide transition-all duration-300 flex items-center justify-center gap-2 ${
                        isLocked
                          ? 'bg-amber-400/[0.08] border-amber-400/[0.15] text-amber-400/70 hover:bg-amber-400/[0.14]'
                          : 'bg-surface/[0.08] border-surface/[0.10] text-white/75 hover:bg-surface/[0.14] hover:text-white/90'
                      }`}
                    >
                      {isLocked ? (
                        <>
                          <Unlock className="w-3.5 h-3.5" />
                          {AIRCRAFT_UNLOCK_COST[ac.id].toLocaleString()}M 해제
                        </>
                      ) : '선택'}
                    </motion.button>
                  )
                })()}
              </div>
            </motion.div>
          )}

          {/* === SELECT SEAT (seat map) === */}
          {phase === 'selectSeat' && aircraft && (
            <motion.div
              key="selectSeat"
              custom={slideDir}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.35, ease }}
              className="absolute inset-0 flex flex-col items-center px-4 pt-5 pb-2"
            >
              <button onClick={handleBack} className="absolute top-5 left-5 w-7 h-7 flex items-center justify-center rounded-full hover:bg-surface/10 transition-colors z-20">
                <ArrowLeft className="w-4 h-4 text-white/50" />
              </button>

              <div className="mb-3">{routeSummary}</div>

              <SeatMap aircraft={aircraft} onSelectSeat={handleSelectSeat} onInviteFriend={() => setShowFriendInvite(true)} />
            </motion.div>
          )}

        </AnimatePresence>
      </div>

      {/* Trip History Panel */}
      <AnimatePresence>
        {showHistory && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="absolute inset-0 z-20"
          >
            {/* Full-screen map */}
            <div className="absolute inset-0">
              {routeGroups.length > 0 ? (
                <HistoryMap routeGroups={routeGroups} selectedRoute={expandedRoute} />
              ) : (
                <div className="w-full h-full bg-night-950" />
              )}
              <div className="absolute inset-0 pointer-events-none z-[999]"
                style={{ background: 'radial-gradient(ellipse at center, transparent 50%, rgb(var(--bg-base) / 0.6) 100%)' }} />
            </div>

            {/* Close button */}
            <button onClick={handleToggleHistory}
              className="absolute top-4 right-4 z-[1001] w-8 h-8 flex items-center justify-center rounded-full backdrop-blur-md bg-surface/[0.06] border border-surface/[0.10] hover:bg-surface/15 transition-colors">
              <X className="w-4 h-4 text-white/60" />
            </button>

            {/* Side card panel */}
            <div className="absolute left-5 top-5 bottom-5 z-[1001] w-[260px] flex flex-col pointer-events-none">
              {/* Stats summary */}
              {trips.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, ease }}
                  className="backdrop-blur-xl bg-surface/[0.05] border border-surface/[0.08] rounded-2xl p-5 mb-3 pointer-events-auto"
                >
                  <div className="flex items-center gap-2 mb-4">
                    <History className="w-4 h-4 text-white/50" />
                    <span className="text-[12px] font-mono text-white/60 tracking-[0.15em]">비행 기록</span>
                  </div>
                  <div className="grid grid-cols-2 gap-x-5 gap-y-3">
                    <div>
                      <p className="text-[8px] font-mono text-white/45 tracking-[0.2em]">FLIGHTS</p>
                      <p className="text-[20px] font-mono font-bold text-white/85 mt-0.5">{trips.length}<span className="text-[10px] text-white/45 ml-1">회</span></p>
                    </div>
                    <div>
                      <p className="text-[8px] font-mono text-white/45 tracking-[0.2em]">CITIES</p>
                      <p className="text-[20px] font-mono font-bold text-white/85 mt-0.5">{totalStats.cityCount}<span className="text-[10px] text-white/45 ml-1">곳</span></p>
                    </div>
                    <div>
                      <p className="text-[8px] font-mono text-white/45 tracking-[0.2em]">DISTANCE</p>
                      <p className="text-[20px] font-mono font-bold text-white/85 mt-0.5">{fmtDist(totalStats.totalKm)}<span className="text-[10px] text-white/45 ml-1">km</span></p>
                    </div>
                    <div>
                      <p className="text-[8px] font-mono text-white/45 tracking-[0.2em]">FOCUS TIME</p>
                      <p className="text-[16px] font-mono font-bold text-white/85 mt-1">{fmtTotal(totalStats.totalMin)}</p>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Route cards */}
              <div className="flex-1 overflow-y-auto space-y-3 pointer-events-auto pr-1">
                {routeGroups.length === 0 ? (
                  <div className="backdrop-blur-xl bg-surface/[0.04] border border-surface/[0.06] rounded-2xl p-6 text-center">
                    <Plane className="w-6 h-6 text-white/20 mx-auto mb-2" />
                    <p className="text-[11px] text-white/40">비행 기록 없음</p>
                  </div>
                ) : (
                  routeGroups.map((rg, i) => {
                    const routeKm = rg.records.reduce((s, t) => s + t.config.distanceKm, 0)
                    return (
                    <motion.div
                      key={rg.key}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.15 + i * 0.06, duration: 0.4, ease }}
                    >
                      <button
                        onClick={() => setExpandedRoute(prev => prev === rg.key ? null : rg.key)}
                        className={`w-full text-left backdrop-blur-xl rounded-2xl p-5 border transition-all duration-300 ${
                          expandedRoute === rg.key
                            ? 'bg-surface/[0.08] border-sky-400/25 shadow-[0_0_24px_rgba(96,165,250,0.1)]'
                            : 'bg-surface/[0.04] border-surface/[0.06] hover:bg-surface/[0.06] hover:border-surface/[0.1]'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <span className="text-[18px] font-mono font-bold text-white/85 tracking-wider">{rg.from.code}</span>
                            <Plane className="w-3 h-3 text-white/40" />
                            <span className="text-[18px] font-mono font-bold text-white/85 tracking-wider">{rg.to.code}</span>
                          </div>
                          <span className="text-[10px] font-mono text-sky-400/70">{rg.records.length}회</span>
                        </div>
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-[11px] text-white/50">{rg.from.cityKo} → {rg.to.cityKo}</span>
                          <span className="text-[10px] font-mono text-white/35">{rg.records[0].config.distanceKm.toLocaleString()}km</span>
                        </div>
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
                            <div className="mt-2 backdrop-blur-xl bg-surface/[0.03] border border-surface/[0.05] rounded-xl p-3.5 space-y-2">
                              {rg.records.map(trip => (
                                <div key={trip.id} className="flex items-center justify-between text-[10px] font-mono text-white/55 py-0.5">
                                  <div className="flex items-center gap-3">
                                    <span>{fmtDate(trip.completedAt)}</span>
                                    <span className="text-white/40">{fmt(trip.durationMinutes)}</span>
                                  </div>
                                  <span className="text-[9px] text-white/35">{trip.config.aircraft.name.split(' ').slice(0,2).join(' ')}</span>
                                </div>
                              ))}
                              <div className="pt-2 mt-1 border-t border-surface/[0.08] flex items-center justify-between text-[9px] font-mono text-white/40">
                                <span>총 {rg.records.length}회 · {routeKm.toLocaleString()} km</span>
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleDeleteRoute(rg.key, rg.records.map(r => r.id)) }}
                                  className="flex items-center gap-1 text-white/30 hover:text-red-400/70 transition-colors"
                                >
                                  <Trash2 className="w-2.5 h-2.5" />
                                  삭제
                                </button>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  )})
                )}
              </div>

              {trips.length > 0 && (
                <div className="mt-3 pointer-events-auto">
                  <button
                    onClick={handleClearTrips}
                    className="flex items-center gap-1.5 text-[11px] text-white/30 hover:text-red-400/60 transition-colors"
                  >
                    <Trash2 className="w-3 h-3" />
                    기록 삭제
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Friends Panel */}
      {showFriends && (
        <FriendsPanel
          onClose={() => setShowFriends(false)}
          presenceMap={presenceMap}
          pendingFlightInvites={pendingFlightInvites}
          onAcceptFlightInvite={(invite) => { setShowFriends(false); onAcceptFlightInvite(invite) }}
          onDismissFlightInvite={onDismissFlightInvite}
        />
      )}

      {/* Settings Panel */}
      {showSettings && (
        <SettingsPanel onClose={() => setShowSettings(false)} />
      )}

      {/* Airport Catalog */}
      {showAirportCatalog && (
        <AirportCatalog
          onClose={() => setShowAirportCatalog(false)}
          unlockedAirports={unlockedAirports}
          mileageBalance={mileageBalance}
          onUnlock={onUnlock}
        />
      )}

      {/* Friend Invite Modal */}
      <AnimatePresence>
        {showFriendInvite && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
            onClick={() => { setShowFriendInvite(false); setInviteSearch(''); setInviteResults([]) }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="w-[300px] bg-night-900 border border-surface/[0.08] rounded-2xl p-5"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-sky-400/70" />
                  <span className="text-[13px] font-mono font-semibold text-white/70 tracking-wider">친구 초대</span>
                </div>
                <button
                  onClick={() => { setShowFriendInvite(false); setInviteSearch(''); setInviteResults([]) }}
                  className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-surface/10 transition-colors"
                >
                  <X className="w-3.5 h-3.5 text-white/40" />
                </button>
              </div>

              <div className="flex items-center gap-2 bg-surface/[0.06] border border-surface/[0.10] rounded-xl px-3 py-2.5 mb-3">
                <Search className="w-3.5 h-3.5 text-white/30 flex-shrink-0" />
                <input
                  type="text"
                  placeholder="유저 검색"
                  value={inviteSearch}
                  onChange={e => handleInviteSearch(e.target.value)}
                  className="flex-1 bg-transparent text-[13px] font-mono text-white/80 placeholder:text-white/30 outline-none"
                  autoFocus
                />
              </div>

              <div className="max-h-[200px] overflow-y-auto rounded-xl">
                {inviteSearch.trim().length < 2 ? (
                  <div className="py-6 text-center text-[11px] text-white/30">2글자 이상 입력하세요</div>
                ) : inviteSearching ? (
                  <div className="py-6 text-center text-[11px] text-white/40">검색 중...</div>
                ) : inviteResults.length === 0 ? (
                  <div className="py-6 text-center text-[11px] text-white/40">결과 없음</div>
                ) : (
                  inviteResults.map(profile => {
                    const status = getInviteStatus(profile.id)
                    return (
                      <div key={profile.id} className="flex items-center justify-between px-3 py-2.5 hover:bg-surface/[0.06] rounded-lg transition-colors">
                        <span className="text-[12px] font-mono text-white/70">{profile.username}</span>
                        {status === 'friend' ? (
                          invitedIds.has(profile.id) ? (
                            <span className="text-[10px] text-emerald-400/60">초대됨</span>
                          ) : (
                            <button
                              onClick={() => {
                                if (!fromAirport || !toAirport || !user) return
                                sendFlightInvite(profile.id, {
                                  fromUserId: user.id,
                                  fromUsername: user.user_metadata?.username ?? '',
                                  fromCode: fromAirport.code,
                                  toCode: toAirport.code,
                                  aircraftId: aircraft?.id ?? 'b737',
                                  flightNumber: generateFlightNumber(),
                                })
                                setInvitedIds(prev => new Set(prev).add(profile.id))
                              }}
                              disabled={!fromAirport || !toAirport}
                              className="px-3 py-1 rounded-lg bg-sky-400/[0.10] border border-sky-400/[0.15] text-[10px] text-sky-400/80 hover:bg-sky-400/[0.20] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                              초대
                            </button>
                          )
                        ) : status === 'sent' ? (
                          <span className="text-[10px] text-white/30">요청됨</span>
                        ) : status === 'received' ? (
                          <button
                            onClick={() => { const fid = getReceivedFriendshipId(profile.id); if (fid) accept(fid) }}
                            className="px-3 py-1 rounded-lg bg-emerald-400/[0.10] border border-emerald-400/[0.15] text-[10px] text-emerald-400/80 hover:bg-emerald-400/[0.20] transition-colors"
                          >
                            수락
                          </button>
                        ) : (
                          <button
                            onClick={() => send(profile.id)}
                            className="px-3 py-1 rounded-lg bg-sky-400/[0.10] border border-sky-400/[0.15] text-[10px] text-sky-400/80 hover:bg-sky-400/[0.20] transition-colors"
                          >
                            요청
                          </button>
                        )}
                      </div>
                    )
                  })
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Unlock Confirmation Dialog */}
      <AnimatePresence>
        {unlockConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
            onClick={() => setUnlockConfirm(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="w-[280px] bg-night-900 border border-surface/[0.08] rounded-2xl p-6"
            >
              <div className="flex items-center justify-center mb-4">
                <div className="w-10 h-10 rounded-full bg-amber-400/[0.08] flex items-center justify-center">
                  <Unlock className="w-5 h-5 text-amber-400/70" />
                </div>
              </div>
              <p className="text-center text-[13px] text-white/70 mb-1">
                {unlockConfirm.cost.toLocaleString()} 마일을 사용하여
              </p>
              <p className="text-center text-[14px] text-white/85 font-semibold mb-4">
                {unlockConfirm.name} ({unlockConfirm.id}) 을 해제할까요?
              </p>
              <p className="text-center text-[10px] font-mono text-white/40 mb-5">
                잔액: {mileageBalance.toLocaleString()}M → {(mileageBalance - unlockConfirm.cost).toLocaleString()}M
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setUnlockConfirm(null)}
                  className="flex-1 py-2.5 rounded-xl bg-surface/[0.06] text-white/50 text-[12px] hover:bg-surface/[0.1] transition-colors"
                >
                  취소
                </button>
                <button
                  onClick={async () => {
                    await onUnlock(unlockConfirm.type, unlockConfirm.id)
                    setUnlockConfirm(null)
                  }}
                  disabled={mileageBalance < unlockConfirm.cost}
                  className={`flex-1 py-2.5 rounded-xl text-[12px] font-medium transition-colors ${
                    mileageBalance >= unlockConfirm.cost
                      ? 'bg-amber-400/[0.15] text-amber-400/90 hover:bg-amber-400/[0.25]'
                      : 'bg-surface/[0.04] text-white/20 cursor-not-allowed'
                  }`}
                >
                  {mileageBalance >= unlockConfirm.cost ? '해제' : '마일 부족'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

