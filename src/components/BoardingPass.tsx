import { useState, useMemo, useCallback } from 'react'
import { motion, useAnimation } from 'framer-motion'
import { Plane } from 'lucide-react'
import { DURATION_PRESETS } from '../constants'
import type { FlightConfig } from '../types'

interface Props {
  config: FlightConfig
  onBoard: (durationMinutes: number) => void
}

// ─── Barcode (fixed height) ────────────────────────────────────────
function Barcode() {
  const bars = useMemo(() => {
    const pattern = [2,1,3,1,2,1,1,3,2,1,1,2,3,1,2,1,1,2,1,3,1,2,1,1,3,2,1,2,1,1,2,3,1,1,2,1,3,1,2,2,1,1,3,1,2,1,2,1,3,1,1,2]
    return pattern.map((w, i) => ({ width: w, opacity: i % 3 === 0 ? 0.5 : i % 2 === 0 ? 0.3 : 0.15 }))
  }, [])
  return (
    <div className="flex items-stretch gap-[0.5px] h-6">
      {bars.map((bar, i) => (
        <div
          key={i}
          className="h-full rounded-[0.5px]"
          style={{
            width: `${bar.width}px`,
            backgroundColor: `rgba(148, 197, 253, ${bar.opacity})`,
          }}
        />
      ))}
    </div>
  )
}

// ─── Flight path (compact) ─────────────────────────────────────────
function FlightPath({ km }: { km: number }) {
  return (
    <div className="flex items-center gap-1.5 mt-2">
      <div className="w-1 h-1 rounded-full bg-sky-400/40 shrink-0" />
      <div className="flex-1 h-px" style={{
        backgroundImage: 'repeating-linear-gradient(to right, rgba(96,165,250,0.18) 0px, rgba(96,165,250,0.18) 3px, transparent 3px, transparent 8px)',
      }} />
      <Plane className="w-2.5 h-2.5 text-sky-400/25 shrink-0" />
      <div className="flex-1 h-px" style={{
        backgroundImage: 'repeating-linear-gradient(to right, rgba(96,165,250,0.12) 0px, rgba(96,165,250,0.12) 3px, transparent 3px, transparent 8px)',
      }} />
      <div className="w-1 h-1 rounded-full border border-sky-400/25 shrink-0" />
      <span className="text-[6px] font-mono text-white/10 ml-0.5 shrink-0">{km.toLocaleString()}km</span>
    </div>
  )
}

const ease = [0.22, 1, 0.36, 1]

export function BoardingPass({ config, onBoard }: Props) {
  const [selectedMinutes, setSelectedMinutes] = useState(50)
  const [customMinutes, setCustomMinutes] = useState('')
  const [isCustom, setIsCustom] = useState(false)
  const [tearing, setTearing] = useState(false)
  const { from, to, aircraft, seat, distanceKm, flightNumber } = config

  const stubCtrl = useAnimation()
  const mainCtrl = useAnimation()
  const tearLineCtrl = useAnimation()

  const boardingTime = new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
  const date = new Date().toLocaleDateString('en-US', { day: '2-digit', month: 'short' }).toUpperCase()

  const activeDuration = isCustom ? parseInt(customMinutes) || 0 : selectedMinutes
  const gate = useMemo(() => `B${Math.floor(Math.random() * 30 + 1)}`, [])
  const group = useMemo(() => Math.floor(Math.random() * 5 + 1), [])

  const handleBoard = useCallback(async () => {
    const minutes = isCustom ? parseInt(customMinutes) || 50 : selectedMinutes
    if (minutes <= 0 || minutes > 480 || tearing) return
    setTearing(true)

    // Tension pull
    await stubCtrl.start({
      x: -3,
      transition: { duration: 0.15, ease: 'easeOut' },
    })

    // Tear apart
    await Promise.all([
      tearLineCtrl.start({
        opacity: 0,
        transition: { duration: 0.2 },
      }),
      stubCtrl.start({
        x: 320,
        rotate: 15,
        opacity: 0,
        transition: { duration: 1.0, ease },
      }),
      mainCtrl.start({
        x: -60,
        opacity: 0,
        transition: { duration: 0.85, ease, delay: 0.12 },
      }),
    ])

    onBoard(minutes)
  }, [isCustom, customMinutes, selectedMinutes, tearing, stubCtrl, mainCtrl, tearLineCtrl, onBoard])

  return (
    <div className="h-full flex flex-col items-center justify-center relative overflow-hidden">
      <div className="absolute inset-0 bg-night-950" />
      <div className="absolute top-[35%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-sky-500/[0.025] rounded-full blur-[120px]" />
      <div className="absolute top-[45%] left-[30%] w-[300px] h-[300px] bg-indigo-500/[0.015] rounded-full blur-[100px]" />

      <div className="relative z-10 w-full max-w-[540px] px-4">

        {/* ── Boarding Pass Card (wide) ── */}
        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.9, ease }}
          className="flex relative"
          style={{ filter: 'drop-shadow(0 8px 32px rgba(6,10,20,0.6))' }}
        >
          {/* === Left: Main Section === */}
          <motion.div
            animate={mainCtrl}
            className="flex-1 min-w-0 rounded-l-[18px] overflow-hidden border border-r-0 border-white/[0.07]"
            style={{ background: 'linear-gradient(145deg, rgba(15,22,35,1) 0%, rgba(12,17,28,1) 100%)' }}
          >
            {/* Header */}
            <div className="px-4 pt-3.5 pb-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-sky-400/[0.08] flex items-center justify-center">
                  <Plane className="w-2.5 h-2.5 text-sky-400/70" />
                </div>
                <span className="text-[9px] font-mono text-sky-400/55 tracking-[0.25em]">{flightNumber}</span>
              </div>
              <span className="text-[6px] font-mono text-white/10 tracking-[0.25em]">BOARDING PASS</span>
            </div>
            <div className="mx-4 h-px bg-gradient-to-r from-sky-400/10 via-white/[0.03] to-transparent" />

            {/* Route + Flight path */}
            <div className="px-4 pt-3 pb-1">
              <div className="flex items-baseline justify-between">
                <div>
                  <p className="text-[28px] font-bold tracking-[0.08em] text-white/90 font-mono leading-none">{from.code}</p>
                  <p className="text-[9px] text-white/20 mt-1">{from.cityKo}</p>
                </div>
                <div className="text-right">
                  <p className="text-[28px] font-bold tracking-[0.08em] text-white/90 font-mono leading-none">{to.code}</p>
                  <p className="text-[9px] text-white/20 mt-1">{to.cityKo}</p>
                </div>
              </div>
              <FlightPath km={distanceKm} />
            </div>

            {/* Info row + Barcode — side by side */}
            <div className="px-4 pt-2.5 pb-3.5 flex items-end gap-4">
              {/* Info columns */}
              <div className="flex gap-4 flex-1 min-w-0">
                <div>
                  <p className="text-[6px] font-mono text-white/15 tracking-[0.15em]">DATE</p>
                  <p className="text-[10px] font-mono text-white/45 mt-0.5 font-medium">{date}</p>
                </div>
                <div>
                  <p className="text-[6px] font-mono text-white/15 tracking-[0.15em]">TIME</p>
                  <p className="text-[10px] font-mono text-white/45 mt-0.5 font-medium">{boardingTime}</p>
                </div>
                <div>
                  <p className="text-[6px] font-mono text-white/15 tracking-[0.15em]">AIRCRAFT</p>
                  <p className="text-[10px] font-mono text-white/45 mt-0.5 font-medium truncate">{aircraft.name.split(' ').slice(0,2).join(' ')}</p>
                </div>
              </div>
              {/* Barcode */}
              <div className="flex flex-col items-center shrink-0">
                <Barcode />
                <span className="text-[6px] font-mono text-white/6 tracking-[0.15em] mt-1">FLT{flightNumber.replace('-','')}</span>
              </div>
            </div>
          </motion.div>

          {/* === Tear line === */}
          <motion.div animate={tearLineCtrl} className="relative w-0 z-10 shrink-0">
            <div className="absolute -top-[1px] left-1/2 -translate-x-1/2 w-5 h-2.5 rounded-b-full bg-night-950 z-10" />
            <div className="absolute -bottom-[1px] left-1/2 -translate-x-1/2 w-5 h-2.5 rounded-t-full bg-night-950 z-10" />
            <div
              className="absolute top-3.5 bottom-3.5 left-1/2 -translate-x-1/2 w-px"
              style={{
                backgroundImage: 'repeating-linear-gradient(to bottom, rgba(255,255,255,0.06) 0px, rgba(255,255,255,0.06) 4px, transparent 4px, transparent 10px)',
              }}
            />
          </motion.div>

          {/* === Right: Stub === */}
          <motion.div
            animate={stubCtrl}
            className="w-[110px] shrink-0 rounded-r-[18px] border border-l-0 border-white/[0.07] flex flex-col items-center justify-between py-3.5 px-2.5"
            style={{ transformOrigin: '0% 30%', background: 'linear-gradient(160deg, rgba(14,20,32,1) 0%, rgba(11,15,25,1) 100%)' }}
          >
            {/* Seat */}
            <div className="text-center">
              <p className="text-[6px] font-mono text-white/12 tracking-[0.25em] mb-1.5">SEAT</p>
              <div className="w-12 h-12 rounded-lg bg-white/[0.04] border border-white/[0.06] flex items-center justify-center">
                <p className="text-[18px] font-mono font-bold text-white/70 tracking-wider">{seat}</p>
              </div>
            </div>

            {/* Gate + Group */}
            <div className="text-center space-y-2.5 w-full">
              <div>
                <p className="text-[6px] font-mono text-white/12 tracking-[0.15em]">GATE</p>
                <p className="text-[12px] font-mono text-white/40 mt-0.5 font-semibold">{gate}</p>
              </div>
              <div>
                <p className="text-[6px] font-mono text-white/12 tracking-[0.15em]">GROUP</p>
                <p className="text-[12px] font-mono text-white/40 mt-0.5 font-semibold">{group}</p>
              </div>
            </div>

            <p className="text-[6px] font-mono text-sky-400/20 tracking-[0.15em]">{flightNumber}</p>
          </motion.div>
        </motion.div>

        {/* ── Duration selector ── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: tearing ? 0 : 1, y: tearing ? -15 : 0 }}
          transition={{ duration: tearing ? 0.4 : 0.7, delay: tearing ? 0 : 0.5, ease }}
          className="mt-10"
        >
          <p className="text-[7px] font-mono text-white/15 tracking-[0.25em] mb-3 text-center">FOCUS DURATION</p>
          <div className="flex gap-2 mb-3">
            {DURATION_PRESETS.map(preset => (
              <button
                key={preset.minutes}
                onClick={() => { setSelectedMinutes(preset.minutes); setIsCustom(false) }}
                className={`flex-1 py-2.5 rounded-xl text-[12px] font-mono transition-all duration-300 ${
                  !isCustom && selectedMinutes === preset.minutes
                    ? 'bg-white/[0.08] text-white/70 border border-white/[0.08]'
                    : 'text-white/20 hover:text-white/40 hover:bg-white/[0.03] border border-transparent'
                }`}
              >{preset.label}</button>
            ))}
          </div>
          <div
            className={`flex items-center rounded-xl px-4 py-2.5 transition-all duration-300 cursor-text border ${
              isCustom ? 'bg-white/[0.05] border-white/[0.08]' : 'bg-white/[0.02] border-white/[0.03]'
            }`}
            onClick={() => setIsCustom(true)}
          >
            <input type="number" placeholder="직접 입력 (분)" value={customMinutes}
              onChange={e => { setCustomMinutes(e.target.value); setIsCustom(true) }}
              onFocus={() => setIsCustom(true)}
              className="flex-1 bg-transparent text-[12px] font-mono text-white/50 placeholder:text-white/12 outline-none"
              min={1} max={480} />
            <span className="text-[10px] text-white/12 font-mono ml-2">min</span>
          </div>

          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.97 }}
            onClick={handleBoard}
            disabled={activeDuration <= 0 || tearing}
            className="w-full mt-4 py-3.5 rounded-2xl bg-gradient-to-r from-white/[0.07] to-white/[0.04] border border-white/[0.08] text-white/65 font-medium text-[14px] tracking-[0.08em] hover:from-white/[0.1] hover:to-white/[0.06] hover:text-white/85 transition-all duration-400 disabled:opacity-20 disabled:cursor-not-allowed"
          >
            탑승하기
          </motion.button>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: tearing ? 0 : 1 }}
          transition={{ delay: tearing ? 0 : 1.0, duration: 0.6 }}
          className="text-center mt-6 text-[8px] text-white/5 tracking-[0.5em] uppercase font-mono"
        >
          Flightime
        </motion.p>
      </div>
    </div>
  )
}
