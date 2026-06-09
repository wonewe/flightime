import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Plane } from 'lucide-react'
import { DURATION_PRESETS } from '../constants'
import type { FlightConfig } from '../types'

interface Props {
  config: FlightConfig
  onBoard: (durationMinutes: number) => void
}

function Barcode() {
  const bars = useMemo(() => {
    const pattern = [2,1,3,1,2,1,1,3,2,1,1,2,3,1,2,1,1,2,1,3,1,2,1,1,3,2,1,2,1,1,2,3,1,1,2,1,3,1,2,2,1,1,3,1,2,1,2,1,3,1,1,2]
    return pattern.map((w, i) => ({ width: w, opacity: i % 3 === 0 ? 0.45 : i % 2 === 0 ? 0.3 : 0.18 }))
  }, [])
  return (
    <div className="flex items-stretch gap-px h-9">
      {bars.map((bar, i) => (
        <div key={i} className="bg-white rounded-[0.5px]" style={{ width: `${bar.width}px`, opacity: bar.opacity }} />
      ))}
    </div>
  )
}

export function BoardingPass({ config, onBoard }: Props) {
  const [selectedMinutes, setSelectedMinutes] = useState(50)
  const [customMinutes, setCustomMinutes] = useState('')
  const [isCustom, setIsCustom] = useState(false)
  const { from, to, aircraft, seat, distanceKm, flightNumber } = config

  const boardingTime = new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
  const date = new Date().toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase()

  const handleBoard = () => {
    const minutes = isCustom ? parseInt(customMinutes) || 50 : selectedMinutes
    if (minutes > 0 && minutes <= 480) onBoard(minutes)
  }

  const activeDuration = isCustom ? parseInt(customMinutes) || 0 : selectedMinutes

  return (
    <div className="h-full flex items-center justify-center relative overflow-hidden">
      <div className="absolute inset-0 bg-night-950" />
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-sky-500/[0.03] rounded-full blur-[100px]" />

      <motion.div
        initial={{ opacity: 0, y: 25, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 w-full max-w-[340px] mx-4"
      >
        <div className="bg-[#0f1420] rounded-2xl border border-white/[0.06] overflow-hidden">
          {/* Header */}
          <div className="px-5 pt-5 pb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Plane className="w-3.5 h-3.5 text-sky-400/70" />
              <span className="text-[10px] font-mono text-sky-400/60 tracking-[0.25em]">{flightNumber}</span>
            </div>
            <span className="text-[9px] font-mono text-white/15 tracking-[0.2em]">BOARDING PASS</span>
          </div>

          {/* Route */}
          <div className="px-5 pt-4 pb-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[38px] font-bold tracking-[0.12em] text-white font-mono leading-none">{from.code}</p>
                <p className="text-[11px] text-white/20 mt-1.5">{from.cityKo}</p>
              </div>
              <div className="flex flex-col items-center pt-3 px-2">
                <div className="flex items-center gap-1.5">
                  <div className="w-5 h-px bg-white/10" />
                  <Plane className="w-3 h-3 text-white/15" />
                  <div className="w-5 h-px bg-white/10" />
                </div>
                <span className="text-[8px] font-mono text-white/10 mt-1.5">{distanceKm.toLocaleString()} KM</span>
              </div>
              <div className="text-right">
                <p className="text-[38px] font-bold tracking-[0.12em] text-white font-mono leading-none">{to.code}</p>
                <p className="text-[11px] text-white/20 mt-1.5">{to.cityKo}</p>
              </div>
            </div>
          </div>

          {/* Info grid */}
          <div className="px-5 pb-5 grid grid-cols-4 gap-x-3">
            <div>
              <p className="text-[8px] font-mono text-white/15 tracking-wider">DATE</p>
              <p className="text-[11px] font-mono text-white/50 mt-1">{date}</p>
            </div>
            <div>
              <p className="text-[8px] font-mono text-white/15 tracking-wider">TIME</p>
              <p className="text-[11px] font-mono text-white/50 mt-1">{boardingTime}</p>
            </div>
            <div>
              <p className="text-[8px] font-mono text-white/15 tracking-wider">SEAT</p>
              <p className="text-[11px] font-mono text-white/50 mt-1">{seat}</p>
            </div>
            <div>
              <p className="text-[8px] font-mono text-white/15 tracking-wider">AIRCRAFT</p>
              <p className="text-[11px] font-mono text-white/50 mt-1">{aircraft.name.split(' ')[1]}</p>
            </div>
          </div>

          {/* Tear */}
          <div className="relative my-1">
            <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-night-950" />
            <div className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-night-950" />
            <div className="mx-5 border-t border-dashed border-white/[0.06]" />
          </div>

          {/* Duration */}
          <div className="px-5 pt-4 pb-5">
            <p className="text-[8px] font-mono text-white/15 tracking-[0.2em] mb-3">FOCUS DURATION</p>
            <div className="flex gap-1.5 mb-2.5">
              {DURATION_PRESETS.map(preset => (
                <button
                  key={preset.minutes}
                  onClick={() => { setSelectedMinutes(preset.minutes); setIsCustom(false) }}
                  className={`flex-1 py-2 rounded-md text-[12px] font-mono transition-all duration-200 ${
                    !isCustom && selectedMinutes === preset.minutes
                      ? 'bg-white/[0.08] text-white/70' : 'text-white/20 hover:text-white/40 hover:bg-white/[0.03]'
                  }`}
                >{preset.label}</button>
              ))}
            </div>
            <div
              className={`flex items-center rounded-md px-3 py-2 transition-all duration-200 cursor-text ${isCustom ? 'bg-white/[0.06]' : 'bg-white/[0.02]'}`}
              onClick={() => setIsCustom(true)}
            >
              <input type="number" placeholder="직접 입력" value={customMinutes}
                onChange={e => { setCustomMinutes(e.target.value); setIsCustom(true) }}
                onFocus={() => setIsCustom(true)}
                className="flex-1 bg-transparent text-[12px] font-mono text-white/50 placeholder:text-white/12 outline-none" min={1} max={480} />
              <span className="text-[10px] text-white/12 font-mono">min</span>
            </div>
          </div>

          {/* Barcode + Board */}
          <div className="px-5 pb-5">
            <div className="flex flex-col items-center mb-5">
              <Barcode />
              <span className="text-[8px] font-mono text-white/10 tracking-wider mt-2">FLT{flightNumber.replace('-', '')}</span>
            </div>
            <motion.button whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }} onClick={handleBoard}
              disabled={activeDuration <= 0}
              className="w-full py-3 rounded-lg bg-white/[0.06] text-white/60 font-medium text-[13px] tracking-wide hover:bg-white/[0.1] hover:text-white/80 transition-all duration-300 disabled:opacity-20 disabled:cursor-not-allowed"
            >탑승하기</motion.button>
          </div>
        </div>

        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.9 }}
          className="text-center mt-6 text-[9px] text-white/8 tracking-[0.4em] uppercase font-mono">Flightime</motion.p>
      </motion.div>
    </div>
  )
}
