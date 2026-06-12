import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, ChevronRight, ChevronLeft, ArrowLeft } from 'lucide-react'
import { AIRPORTS, AIRCRAFT, SEAT_OPTIONS } from '../constants'
import { haversineDistance } from '../utils/geo'
import { AircraftPreview } from './AircraftModel'
import type { Airport, Aircraft, FlightConfig } from '../types'

interface Props {
  onComplete: (config: FlightConfig) => void
  onBack?: () => void
  initialFrom?: Airport
  initialTo?: Airport
}

type Step = 'from' | 'to' | 'aircraft' | 'seat'

const STEPS: Step[] = ['from', 'to', 'aircraft', 'seat']
const STEP_TITLES: Record<Step, string> = {
  from: '출발지',
  to: '도착지',
  aircraft: '기체',
  seat: '좌석',
}

function generateFlightNumber(): string {
  const num = Math.floor(Math.random() * 9000) + 1000
  return `FT-${num}`
}

export function Onboarding({ onComplete, onBack, initialFrom, initialTo }: Props) {
  const hasRoute = !!(initialFrom && initialTo)
  const [step, setStep] = useState<Step>(hasRoute ? 'aircraft' : 'from')
  const [fromAirport, setFromAirport] = useState<Airport | null>(initialFrom ?? null)
  const [toAirport, setToAirport] = useState<Airport | null>(initialTo ?? null)
  const [aircraft, setAircraft] = useState<Aircraft | null>(null)
  const [focusedIdx, setFocusedIdx] = useState(0)
  const [seatPref, setSeatPref] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  const stepIndex = STEPS.indexOf(step)

  const filteredAirports = useMemo(() => {
    const exclude = step === 'to' ? fromAirport?.code : toAirport?.code
    const list = AIRPORTS.filter(a => a.code !== exclude)
    if (!search.trim()) return list
    const q = search.toLowerCase()
    return list.filter(a =>
      a.code.toLowerCase().includes(q) ||
      a.city.toLowerCase().includes(q) ||
      a.cityKo.includes(q) ||
      a.country.toLowerCase().includes(q)
    )
  }, [search, step, fromAirport, toAirport])

  const goBack = () => {
    if (hasRoute && step === 'aircraft') {
      onBack?.()
      return
    }
    const prev = STEPS[stepIndex - 1]
    if (prev) {
      setStep(prev)
      setSearch('')
    }
  }

  const selectAirport = (airport: Airport) => {
    if (step === 'from') {
      setFromAirport(airport)
      setStep('to')
    } else {
      setToAirport(airport)
      setStep('aircraft')
    }
    setSearch('')
  }

  const selectAircraft = (ac: Aircraft) => {
    setAircraft(ac)
    setStep('seat')
  }

  const selectSeat = (pref: typeof SEAT_OPTIONS[number]) => {
    setSeatPref(pref.id)
    if (!fromAirport || !toAirport || !aircraft) return
    const row = Math.floor(Math.random() * 30) + 1
    const config: FlightConfig = {
      from: fromAirport,
      to: toAirport,
      aircraft,
      seat: `${row}${pref.seat}`,
      distanceKm: Math.round(haversineDistance(fromAirport, toAirport)),
      flightNumber: generateFlightNumber(),
    }
    onComplete(config)
  }

  const slideVariants = {
    enter: { opacity: 0, x: 30 },
    center: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -30 },
  }

  return (
    <div className="h-full flex flex-col relative overflow-hidden">
      <div className="absolute inset-0 bg-night-950" />

      <div className="relative z-10 flex flex-col h-full">
        {/* Header */}
        <div className="px-5 pt-5 pb-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {(stepIndex > 0 || onBack || hasRoute) && (
              <button onClick={goBack} className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-surface/5 transition-colors">
                <ArrowLeft className="w-4 h-4 text-white/30" />
              </button>
            )}
            <span className="text-[13px] text-white/50">{STEP_TITLES[step]}</span>
          </div>

          {/* Step dots */}
          <div className="flex items-center gap-1.5">
            {STEPS.map((s, i) => (
              <div
                key={s}
                className={`w-1.5 h-1.5 rounded-full transition-colors ${
                  i <= stepIndex ? 'bg-sky-400/60' : 'bg-surface/10'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Selected route preview */}
        {fromAirport && (
          <div className="px-5 pb-3 flex items-center gap-2">
            <span className="text-[11px] font-mono font-semibold tracking-[0.2em] text-white/50">
              {fromAirport.code}
            </span>
            {toAirport && (
              <>
                <ChevronRight className="w-3 h-3 text-white/15" />
                <span className="text-[11px] font-mono font-semibold tracking-[0.2em] text-white/50">
                  {toAirport.code}
                </span>
              </>
            )}
            {aircraft && (
              <>
                <span className="text-white/10 mx-1">·</span>
                <span className="text-[10px] font-mono text-white/25">{aircraft.name}</span>
              </>
            )}
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          <AnimatePresence mode="wait">
            {/* Airport selection */}
            {(step === 'from' || step === 'to') && (
              <motion.div
                key={step}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.25 }}
                className="h-full flex flex-col"
              >
                {/* Search */}
                <div className="px-5 pb-3">
                  <div className="flex items-center gap-2 bg-surface/[0.03] rounded-lg px-3 py-2.5">
                    <Search className="w-3.5 h-3.5 text-white/15" />
                    <input
                      type="text"
                      placeholder="공항 검색"
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                      className="flex-1 bg-transparent text-[13px] font-mono text-white/60 placeholder:text-white/15 outline-none"
                      autoFocus
                    />
                  </div>
                </div>

                {/* Airport list */}
                <div className="flex-1 overflow-y-auto px-3 pb-5">
                  {filteredAirports.map(airport => (
                    <button
                      key={airport.code}
                      onClick={() => selectAirport(airport)}
                      className="w-full flex items-center justify-between px-3 py-3 rounded-lg hover:bg-surface/[0.03] transition-colors group"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-[15px] font-mono font-semibold tracking-[0.15em] text-white/70 w-10">
                          {airport.code}
                        </span>
                        <div className="text-left">
                          <p className="text-[12px] text-white/40">{airport.cityKo}</p>
                          <p className="text-[10px] text-white/15">{airport.city}</p>
                        </div>
                      </div>
                      <span className="text-[10px] font-mono text-white/10 group-hover:text-white/25 transition-colors">
                        {airport.country}
                      </span>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Aircraft selection — 3D carousel */}
            {step === 'aircraft' && (
              <motion.div
                key="aircraft"
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.25 }}
                className="h-full flex flex-col"
              >
                {/* 3D Preview */}
                <div className="flex-1 min-h-0">
                  <AircraftPreview aircraftId={AIRCRAFT[focusedIdx].id} />
                </div>

                {/* Info */}
                <div className="text-center pb-2">
                  <p className="text-[16px] font-mono text-white/70">{AIRCRAFT[focusedIdx].name}</p>
                  <p className="text-[10px] text-white/25 mt-1">{AIRCRAFT[focusedIdx].nameKo} · {AIRCRAFT[focusedIdx].type}</p>
                </div>

                {/* Carousel nav */}
                <div className="flex items-center justify-center gap-5 pb-3">
                  <button
                    onClick={() => setFocusedIdx(i => (i - 1 + AIRCRAFT.length) % AIRCRAFT.length)}
                    className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-surface/5 transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4 text-white/25" />
                  </button>
                  <div className="flex gap-1.5">
                    {AIRCRAFT.map((_, i) => (
                      <button key={i} onClick={() => setFocusedIdx(i)}
                        className={`w-1.5 h-1.5 rounded-full transition-colors ${i === focusedIdx ? 'bg-sky-400/60' : 'bg-surface/10'}`} />
                    ))}
                  </div>
                  <button
                    onClick={() => setFocusedIdx(i => (i + 1) % AIRCRAFT.length)}
                    className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-surface/5 transition-colors"
                  >
                    <ChevronRight className="w-4 h-4 text-white/25" />
                  </button>
                </div>

                {/* Select button */}
                <div className="px-5 pb-5">
                  <motion.button
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => selectAircraft(AIRCRAFT[focusedIdx])}
                    className="w-full py-3 rounded-lg bg-surface/[0.06] text-white/60 font-medium text-[13px] tracking-wide hover:bg-surface/[0.1] hover:text-white/80 transition-all duration-300"
                  >
                    선택
                  </motion.button>
                </div>
              </motion.div>
            )}

            {/* Seat selection */}
            {step === 'seat' && (
              <motion.div
                key="seat"
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.25 }}
                className="h-full flex flex-col items-center justify-center px-5 pb-10"
              >
                <div className="grid grid-cols-3 gap-3 w-full max-w-[300px]">
                  {SEAT_OPTIONS.map(opt => (
                    <button
                      key={opt.id}
                      onClick={() => selectSeat(opt)}
                      className={`flex flex-col items-center py-6 rounded-xl border transition-all ${
                        seatPref === opt.id
                          ? 'bg-surface/[0.06] border-surface/[0.1]'
                          : 'bg-surface/[0.02] border-surface/[0.04] hover:bg-surface/[0.05] hover:border-surface/[0.08]'
                      }`}
                    >
                      {/* Seat icon */}
                      <div className="mb-3">
                        {opt.id === 'window' && <WindowIcon />}
                        {opt.id === 'middle' && <MiddleIcon />}
                        {opt.id === 'aisle' && <AisleIcon />}
                      </div>
                      <p className="text-[13px] text-white/60">{opt.label}</p>
                      <p className="text-[9px] font-mono text-white/15 mt-1 tracking-wider">{opt.labelEn}</p>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}

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
