import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plane, History, X, Trash2, Search, ArrowLeft, ChevronRight, ChevronLeft, LogOut } from 'lucide-react'
import createGlobe from 'cobe'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import type { Airport, Aircraft, FlightConfig, TripRecord } from '../types'
import { AIRPORTS, AIRCRAFT, SEAT_OPTIONS } from '../constants'
import { haversineDistance, greatCirclePoints } from '../utils/geo'
import { loadTripsSupabase, deleteTripsSupabase } from '../utils/tripHistorySupabase'
import { useAuth } from '../contexts/AuthContext'

type Phase = 'idle' | 'selectFrom' | 'selectTo' | 'selectAircraft' | 'selectSeat'

interface Props {
  onFlightConfigured: (config: FlightConfig) => void
}

const ease = [0.16, 1, 0.3, 1] as const

const slideVariants = {
  enter: (dir: number) => ({ opacity: 0, x: dir > 0 ? 60 : -60 }),
  center: { opacity: 1, x: 0 },
  exit: (dir: number) => ({ opacity: 0, x: dir > 0 ? -60 : 60 }),
}

const TILE_URL = 'https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png'

function HistoryMap({ routeGroups, selectedRoute }: {
  routeGroups: { key: string; from: Airport; to: Airport; records: TripRecord[] }[]
  selectedRoute: string | null
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const linesRef = useRef<Map<string, L.Polyline>>(new Map())

  useEffect(() => {
    if (!containerRef.current) return
    if (mapRef.current) { mapRef.current.remove(); mapRef.current = null }

    const map = L.map(containerRef.current, {
      center: [35, 130],
      zoom: 3,
      zoomControl: false,
      attributionControl: false,
      dragging: true,
      scrollWheelZoom: true,
      doubleClickZoom: true,
      touchZoom: true,
      minZoom: 2,
      maxZoom: 8,
    })

    L.tileLayer(TILE_URL, { subdomains: 'abcd', maxZoom: 19 }).addTo(map)

    const allBounds: L.LatLngTuple[] = []
    const seen = new Set<string>()
    const lines = new Map<string, L.Polyline>()

    routeGroups.forEach(rg => {
      const pts = greatCirclePoints(rg.from, rg.to, 60)
      const ll = pts.map(p => [p.lat, p.lng] as L.LatLngTuple)
      allBounds.push([rg.from.lat, rg.from.lng], [rg.to.lat, rg.to.lng])

      const line = L.polyline(ll, {
        color: '#60a5fa',
        weight: 1.5,
        opacity: 0.3,
        dashArray: '4,8',
      }).addTo(map)
      lines.set(rg.key, line)

      for (const apt of [rg.from, rg.to]) {
        if (!seen.has(apt.code)) {
          seen.add(apt.code)
          L.marker([apt.lat, apt.lng], {
            icon: L.divIcon({
              className: '',
              iconSize: [60, 32],
              iconAnchor: [30, 8],
              html: `<div style="display:flex;flex-direction:column;align-items:center">
                <div style="width:8px;height:8px;background:#60a5fa;border-radius:50%;box-shadow:0 0 12px rgba(96,165,250,0.5);border:1.5px solid rgba(255,255,255,0.15)"></div>
                <div style="margin-top:4px;font-family:'JetBrains Mono',monospace;font-size:9px;font-weight:600;letter-spacing:.12em;color:rgba(255,255,255,0.45);text-shadow:0 0 8px rgba(0,0,0,0.9);white-space:nowrap">${apt.code}</div>
              </div>`,
            }),
            interactive: false,
          }).addTo(map)
        }
      }
    })

    linesRef.current = lines

    if (allBounds.length > 0) {
      map.fitBounds(allBounds as L.LatLngBoundsExpression, { padding: [40, 40], maxZoom: 5 })
    }

    mapRef.current = map
    return () => { map.remove(); mapRef.current = null }
  }, [routeGroups])

  useEffect(() => {
    linesRef.current.forEach((line, key) => {
      if (key === selectedRoute) {
        line.setStyle({ opacity: 0.8, weight: 3, dashArray: '' })
        line.bringToFront()
      } else {
        line.setStyle({
          opacity: selectedRoute ? 0.1 : 0.3,
          weight: 1.5,
          dashArray: '4,8',
        })
      }
    })

    if (selectedRoute && mapRef.current) {
      const rg = routeGroups.find(r => r.key === selectedRoute)
      if (rg) {
        const pts = greatCirclePoints(rg.from, rg.to, 60)
        const ll = pts.map(p => [p.lat, p.lng] as L.LatLngTuple)
        mapRef.current.flyToBounds(ll as L.LatLngBoundsExpression, {
          padding: [60, 60],
          duration: 0.8,
          maxZoom: 6,
        })
      }
    } else if (!selectedRoute && mapRef.current && routeGroups.length > 0) {
      const allBounds: L.LatLngTuple[] = []
      routeGroups.forEach(rg => {
        allBounds.push([rg.from.lat, rg.from.lng], [rg.to.lat, rg.to.lng])
      })
      mapRef.current.flyToBounds(allBounds as L.LatLngBoundsExpression, {
        padding: [40, 40],
        maxZoom: 5,
        duration: 0.8,
      })
    }
  }, [selectedRoute, routeGroups])

  return <div ref={containerRef} className="w-full h-full" />
}

function generateFlightNumber(): string {
  const num = Math.floor(Math.random() * 9000) + 1000
  return `FT-${num}`
}

export function HomeScreen({ onFlightConfigured }: Props) {
  const { signOut, user } = useAuth()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [showHistory, setShowHistory] = useState(false)
  const [trips, setTrips] = useState<TripRecord[]>([])
  const [expandedRoute, setExpandedRoute] = useState<string | null>(null)
  const [phase, setPhase] = useState<Phase>('idle')
  const [slideDir, setSlideDir] = useState(1)
  const [fromAirport, setFromAirport] = useState<Airport | null>(null)
  const [toAirport, setToAirport] = useState<Airport | null>(null)
  const [aircraft, setAircraft] = useState<Aircraft | null>(null)
  const [focusedIdx, setFocusedIdx] = useState(0)
  const [search, setSearch] = useState('')

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

      globe = createGlobe(canvas, {
        devicePixelRatio: 2,
        width: size * 2,
        height: size * 2,
        phi,
        theta: 0.15,
        dark: 1,
        diffuse: 1.2,
        mapSamples: 16000,
        mapBrightness: 2.5,
        baseColor: [0.08, 0.12, 0.22],
        markerColor: [0.376, 0.647, 0.98],
        glowColor: [0.06, 0.09, 0.18],
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
  }, [trips])

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
  }, [phase])

  const handleSelectAircraft = useCallback((ac: Aircraft) => {
    setAircraft(ac)
    setSlideDir(1)
    setPhase('selectSeat')
  }, [])

  const handleSelectSeat = useCallback((seatOpt: typeof SEAT_OPTIONS[number]) => {
    if (!fromAirport || !toAirport || !aircraft) return
    const row = Math.floor(Math.random() * 30) + 1
    const config: FlightConfig = {
      from: fromAirport,
      to: toAirport,
      aircraft,
      seat: `${row}${seatOpt.seat}`,
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

  // Route summary shown in aircraft/seat phases
  const routeSummary = fromAirport && toAirport && (
    <div className="mb-5 flex items-center gap-2">
      <span className="text-[13px] font-mono font-bold tracking-[0.2em] text-sky-400/60">
        {fromAirport.code}
      </span>
      <Plane className="w-3 h-3 text-white/15 mx-1" />
      <span className="text-[13px] font-mono font-bold tracking-[0.2em] text-sky-400/60">
        {toAirport.code}
      </span>
      {aircraft && (
        <>
          <span className="text-white/10 mx-1">·</span>
          <span className="text-[10px] font-mono text-white/25">{aircraft.name}</span>
        </>
      )}
    </div>
  )

  return (
    <div className="h-full flex flex-col items-center justify-center relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-night-950" />

      {/* Globe */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <canvas ref={canvasRef} className="globe-canvas absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
      </div>

      {/* Vignette */}
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse at center, transparent 30%, rgba(6,10,20,0.85) 75%)' }} />
      <div className="absolute top-0 inset-x-0 h-32 pointer-events-none"
        style={{ background: 'linear-gradient(to bottom, rgba(6,10,20,0.9) 0%, transparent 100%)' }} />
      <div className="absolute bottom-0 inset-x-0 h-40 pointer-events-none"
        style={{ background: 'linear-gradient(to top, rgba(6,10,20,0.95) 0%, transparent 100%)' }} />

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
              {/* User info + logout */}
              <div className="absolute top-4 right-4 flex items-center gap-2">
                {user && (
                  <span className="text-[10px] font-mono text-white/25 tracking-wider">
                    {user.user_metadata?.username ?? ''}
                  </span>
                )}
                <button
                  onClick={signOut}
                  className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-white/5 transition-colors"
                  title="로그아웃"
                >
                  <LogOut className="w-3.5 h-3.5 text-white/25" />
                </button>
              </div>

              <div className="mb-2 mt-8">
                <h1 className="text-[32px] font-mono font-bold text-white/40 tracking-[0.4em] text-center">
                  FLIGHTIME
                </h1>
              </div>

              <div className="h-[80px]" />

              <div className="flex flex-col gap-3 w-full max-w-[280px]">
                <motion.button
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleStartTrip}
                  className="w-full py-3.5 rounded-xl bg-white/[0.07] border border-white/[0.06] text-white/70 font-medium text-[13px] tracking-wide hover:bg-white/[0.12] hover:text-white/90 transition-all duration-300 flex items-center justify-center gap-2.5"
                >
                  <Plane className="w-3.5 h-3.5" />
                  새 여행 떠나기
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleToggleHistory}
                  className="w-full py-3 rounded-xl bg-transparent border border-white/[0.04] text-white/30 text-[12px] tracking-wide hover:bg-white/[0.04] hover:text-white/50 transition-all duration-300 flex items-center justify-center gap-2"
                >
                  <History className="w-3.5 h-3.5" />
                  기존 여행 보기
                  {trips.length > 0 && (
                    <span className="text-[9px] font-mono text-sky-400/50 ml-1">{trips.length}</span>
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
              <button onClick={handleBack} className="absolute top-5 left-5 w-7 h-7 flex items-center justify-center rounded-full hover:bg-white/5 transition-colors">
                <ArrowLeft className="w-4 h-4 text-white/30" />
              </button>

              {phase === 'selectTo' && fromAirport && (
                <div className="mb-5 flex items-center gap-2">
                  <span className="text-[13px] font-mono font-bold tracking-[0.2em] text-sky-400/60">
                    {fromAirport.code}
                  </span>
                  <span className="text-[10px] text-white/20">{fromAirport.cityKo}</span>
                  <Plane className="w-3 h-3 text-white/15 mx-1" />
                  <span className="text-[13px] font-mono text-white/20 tracking-wider">???</span>
                </div>
              )}

              <h2 className="text-[18px] font-mono font-semibold text-white/50 tracking-[0.1em] mb-5">
                {phase === 'selectFrom' ? '어디에서 출발할까요?' : '어디로 떠날까요?'}
              </h2>

              <div className="w-full max-w-[300px] mb-3">
                <div className="flex items-center gap-2 bg-white/[0.05] border border-white/[0.06] rounded-xl px-4 py-3">
                  <Search className="w-4 h-4 text-white/20" />
                  <input
                    type="text"
                    placeholder="도시 또는 공항코드"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="flex-1 bg-transparent text-[14px] font-mono text-white/70 placeholder:text-white/20 outline-none"
                    autoFocus
                  />
                </div>
              </div>

              <AnimatePresence>
                {search.trim() && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 8 }}
                    transition={{ duration: 0.2 }}
                    className="w-full max-w-[300px] max-h-[200px] overflow-y-auto rounded-xl bg-night-950/80 backdrop-blur-md border border-white/[0.06]"
                  >
                    {filteredAirports.length === 0 ? (
                      <div className="px-4 py-4 text-center text-[11px] text-white/20">검색 결과 없음</div>
                    ) : (
                      filteredAirports.map(airport => (
                        <button
                          key={airport.code}
                          onClick={() => handleSelectAirport(airport)}
                          className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-white/[0.05] transition-colors group"
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-[14px] font-mono font-semibold tracking-[0.15em] text-white/60 w-10">
                              {airport.code}
                            </span>
                            <div className="text-left">
                              <p className="text-[12px] text-white/35">{airport.cityKo}</p>
                            </div>
                          </div>
                          <ChevronRight className="w-3 h-3 text-white/0 group-hover:text-white/20 transition-colors" />
                        </button>
                      ))
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}

          {/* === SELECT AIRCRAFT (carousel) === */}
          {phase === 'selectAircraft' && (
            <motion.div
              key="selectAircraft"
              custom={slideDir}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.35, ease }}
              className="absolute inset-0 flex flex-col items-center justify-center px-6"
            >
              <button onClick={handleBack} className="absolute top-5 left-5 w-7 h-7 flex items-center justify-center rounded-full hover:bg-white/5 transition-colors">
                <ArrowLeft className="w-4 h-4 text-white/30" />
              </button>

              {routeSummary}

              <h2 className="text-[18px] font-mono font-semibold text-white/50 tracking-[0.1em] mb-8">
                기체를 선택하세요
              </h2>

              {/* Aircraft info */}
              <div className="text-center mb-2">
                <p className="text-[22px] font-mono font-bold text-white/60 tracking-wider">
                  {AIRCRAFT[focusedIdx].name}
                </p>
                <p className="text-[11px] text-white/25 mt-2">
                  {AIRCRAFT[focusedIdx].nameKo} · {AIRCRAFT[focusedIdx].type}
                </p>
              </div>

              {/* Carousel nav */}
              <div className="flex items-center justify-center gap-6 my-6">
                <button
                  onClick={() => setFocusedIdx(i => (i - 1 + AIRCRAFT.length) % AIRCRAFT.length)}
                  className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-white/5 transition-colors"
                >
                  <ChevronLeft className="w-5 h-5 text-white/25" />
                </button>
                <div className="flex gap-2">
                  {AIRCRAFT.map((_, i) => (
                    <button key={i} onClick={() => setFocusedIdx(i)}
                      className={`w-2 h-2 rounded-full transition-all duration-300 ${
                        i === focusedIdx ? 'bg-sky-400/60 scale-125' : 'bg-white/10'
                      }`} />
                  ))}
                </div>
                <button
                  onClick={() => setFocusedIdx(i => (i + 1) % AIRCRAFT.length)}
                  className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-white/5 transition-colors"
                >
                  <ChevronRight className="w-5 h-5 text-white/25" />
                </button>
              </div>

              {/* Select button */}
              <div className="w-full max-w-[280px]">
                <motion.button
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleSelectAircraft(AIRCRAFT[focusedIdx])}
                  className="w-full py-3 rounded-xl bg-white/[0.07] border border-white/[0.06] text-white/60 font-medium text-[13px] tracking-wide hover:bg-white/[0.12] hover:text-white/80 transition-all duration-300"
                >
                  선택
                </motion.button>
              </div>
            </motion.div>
          )}

          {/* === SELECT SEAT === */}
          {phase === 'selectSeat' && (
            <motion.div
              key="selectSeat"
              custom={slideDir}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.35, ease }}
              className="absolute inset-0 flex flex-col items-center justify-center px-6"
            >
              <button onClick={handleBack} className="absolute top-5 left-5 w-7 h-7 flex items-center justify-center rounded-full hover:bg-white/5 transition-colors">
                <ArrowLeft className="w-4 h-4 text-white/30" />
              </button>

              {routeSummary}

              <h2 className="text-[18px] font-mono font-semibold text-white/50 tracking-[0.1em] mb-8">
                좌석을 선택하세요
              </h2>

              <div className="grid grid-cols-3 gap-3 w-full max-w-[300px]">
                {SEAT_OPTIONS.map(opt => (
                  <motion.button
                    key={opt.id}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => handleSelectSeat(opt)}
                    className="flex flex-col items-center py-6 rounded-xl bg-white/[0.03] border border-white/[0.04] hover:bg-white/[0.07] hover:border-white/[0.1] transition-all duration-300"
                  >
                    <div className="mb-3">
                      {opt.id === 'window' && <WindowIcon />}
                      {opt.id === 'middle' && <MiddleIcon />}
                      {opt.id === 'aisle' && <AisleIcon />}
                    </div>
                    <p className="text-[13px] text-white/60">{opt.label}</p>
                    <p className="text-[9px] font-mono text-white/15 mt-1 tracking-wider">{opt.labelEn}</p>
                  </motion.button>
                ))}
              </div>
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
                style={{ background: 'radial-gradient(ellipse at center, transparent 50%, rgba(6,10,20,0.6) 100%)' }} />
            </div>

            {/* Close button */}
            <button onClick={handleToggleHistory}
              className="absolute top-4 right-4 z-[1001] w-8 h-8 flex items-center justify-center rounded-full backdrop-blur-md bg-white/[0.04] border border-white/[0.06] hover:bg-white/10 transition-colors">
              <X className="w-4 h-4 text-white/40" />
            </button>

            {/* Side card panel */}
            <div className="absolute left-5 top-5 bottom-5 z-[1001] w-[260px] flex flex-col pointer-events-none">
              {/* Stats summary */}
              {trips.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, ease }}
                  className="backdrop-blur-xl bg-white/[0.05] border border-white/[0.08] rounded-2xl p-5 mb-3 pointer-events-auto"
                >
                  <div className="flex items-center gap-2 mb-4">
                    <History className="w-4 h-4 text-white/35" />
                    <span className="text-[12px] font-mono text-white/50 tracking-[0.15em]">비행 기록</span>
                  </div>
                  <div className="grid grid-cols-2 gap-x-5 gap-y-3">
                    <div>
                      <p className="text-[8px] font-mono text-white/30 tracking-[0.2em]">FLIGHTS</p>
                      <p className="text-[20px] font-mono font-bold text-white/75 mt-0.5">{trips.length}<span className="text-[10px] text-white/30 ml-1">회</span></p>
                    </div>
                    <div>
                      <p className="text-[8px] font-mono text-white/30 tracking-[0.2em]">CITIES</p>
                      <p className="text-[20px] font-mono font-bold text-white/75 mt-0.5">{totalStats.cityCount}<span className="text-[10px] text-white/30 ml-1">곳</span></p>
                    </div>
                    <div>
                      <p className="text-[8px] font-mono text-white/30 tracking-[0.2em]">DISTANCE</p>
                      <p className="text-[20px] font-mono font-bold text-white/75 mt-0.5">{fmtDist(totalStats.totalKm)}<span className="text-[10px] text-white/30 ml-1">km</span></p>
                    </div>
                    <div>
                      <p className="text-[8px] font-mono text-white/30 tracking-[0.2em]">FOCUS TIME</p>
                      <p className="text-[16px] font-mono font-bold text-white/75 mt-1">{fmtTotal(totalStats.totalMin)}</p>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Route cards */}
              <div className="flex-1 overflow-y-auto space-y-3 pointer-events-auto pr-1">
                {routeGroups.length === 0 ? (
                  <div className="backdrop-blur-xl bg-white/[0.04] border border-white/[0.06] rounded-2xl p-6 text-center">
                    <Plane className="w-6 h-6 text-white/10 mx-auto mb-2" />
                    <p className="text-[11px] text-white/25">비행 기록 없음</p>
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
                            ? 'bg-white/[0.08] border-sky-400/25 shadow-[0_0_24px_rgba(96,165,250,0.1)]'
                            : 'bg-white/[0.04] border-white/[0.06] hover:bg-white/[0.06] hover:border-white/[0.1]'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <span className="text-[18px] font-mono font-bold text-white/80 tracking-wider">{rg.from.code}</span>
                            <Plane className="w-3 h-3 text-white/25" />
                            <span className="text-[18px] font-mono font-bold text-white/80 tracking-wider">{rg.to.code}</span>
                          </div>
                          <span className="text-[10px] font-mono text-sky-400/50">{rg.records.length}회</span>
                        </div>
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-[11px] text-white/35">{rg.from.cityKo} → {rg.to.cityKo}</span>
                          <span className="text-[10px] font-mono text-white/20">{rg.records[0].config.distanceKm.toLocaleString()}km</span>
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
                            <div className="mt-2 backdrop-blur-xl bg-white/[0.03] border border-white/[0.05] rounded-xl p-3.5 space-y-2">
                              {rg.records.map(trip => (
                                <div key={trip.id} className="flex items-center justify-between text-[10px] font-mono text-white/40 py-0.5">
                                  <div className="flex items-center gap-3">
                                    <span>{fmtDate(trip.completedAt)}</span>
                                    <span className="text-white/25">{fmt(trip.durationMinutes)}</span>
                                  </div>
                                  <span className="text-[9px] text-white/20">{trip.config.aircraft.name.split(' ').slice(0,2).join(' ')}</span>
                                </div>
                              ))}
                              <div className="pt-2 mt-1 border-t border-white/[0.06] flex items-center justify-between text-[9px] font-mono text-white/25">
                                <span>총 {rg.records.length}회</span>
                                <span>{routeKm.toLocaleString()} km</span>
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
                    className="flex items-center gap-1.5 text-[11px] text-white/15 hover:text-red-400/50 transition-colors"
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
    </div>
  )
}

// ─── Seat icons ────────────────────────────────────────────────────
function WindowIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" className="text-white/20">
      <rect x="3" y="6" width="18" height="12" rx="6" stroke="currentColor" strokeWidth="1.5" />
      <path d="M7 10C7 10 9 8 12 8C15 8 17 10 17 10" stroke="currentColor" strokeWidth="1" opacity="0.5" />
    </svg>
  )
}

function MiddleIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" className="text-white/20">
      <rect x="5" y="7" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <line x1="9" y1="7" x2="9" y2="17" stroke="currentColor" strokeWidth="0.5" opacity="0.3" />
      <line x1="15" y1="7" x2="15" y2="17" stroke="currentColor" strokeWidth="0.5" opacity="0.3" />
    </svg>
  )
}

function AisleIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" className="text-white/20">
      <rect x="4" y="7" width="7" height="10" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <rect x="13" y="7" width="7" height="10" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <line x1="12" y1="9" x2="12" y2="15" stroke="currentColor" strokeWidth="0.5" opacity="0.3" strokeDasharray="2 2" />
    </svg>
  )
}
