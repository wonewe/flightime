import { useMemo, useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Plane, Check } from 'lucide-react'
import type { FlightConfig } from '../types'

interface Props {
  config: FlightConfig
  durationMinutes: number
  onReset: () => void
  earnedMiles: number
}

function Barcode() {
  const bars = useMemo(() => {
    const p = [2,1,3,1,2,1,1,3,2,1,1,2,3,1,2,1,1,2,1,3,1,2,1,1,3,2,1,2,1,1,2,3,1,1,2,1,3,1,2,2,1,1,3,1,2,1,2,1,3,1,1,2]
    return p.map((w, i) => ({ width: w, opacity: i % 3 === 0 ? 0.45 : i % 2 === 0 ? 0.3 : 0.18 }))
  }, [])
  return (
    <div className="flex items-stretch gap-px h-9">
      {bars.map((b, i) => <div key={i} className="bg-white rounded-[0.5px]" style={{ width: `${b.width}px`, opacity: b.opacity }} />)}
    </div>
  )
}

function MilesCountUp({ target }: { target: number }) {
  const [count, setCount] = useState(0)
  useEffect(() => {
    const duration = 1200
    const start = performance.now()
    let raf: number
    function tick(now: number) {
      const elapsed = now - start
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setCount(Math.round(eased * target))
      if (progress < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target])
  return <span>+{count.toLocaleString()}</span>
}

export function LandingComplete({ config, durationMinutes, onReset, earnedMiles }: Props) {
  const { from, to, distanceKm, flightNumber } = config
  const fmt = (m: number) => { const h = Math.floor(m/60), r = m%60; return h > 0 ? (r > 0 ? `${h}h ${r}m` : `${h}h`) : `${m}m` }
  const landed = new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
  const date = new Date().toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase()

  return (
    <div className="h-full flex items-center justify-center relative overflow-hidden">
      <div className="absolute inset-0 bg-night-950" />
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-emerald-500/[0.03] rounded-full blur-[100px]" />

      <motion.div initial={{ opacity: 0, y: 25, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }} className="relative z-10 w-full max-w-[340px] mx-4">
        <div className="bg-night-900 rounded-2xl border border-surface/[0.06] overflow-hidden">
          <div className="px-5 pt-5 pb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Plane className="w-3.5 h-3.5 text-emerald-400/70" />
              <span className="text-[10px] font-mono text-emerald-400/60 tracking-[0.25em]">{flightNumber}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Check className="w-3 h-3 text-emerald-400/50" />
              <span className="text-[9px] font-mono text-emerald-400/40 tracking-[0.2em]">LANDED</span>
            </div>
          </div>

          <div className="px-5 pt-4 pb-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[38px] font-bold tracking-[0.12em] text-white/40 font-mono leading-none">{from.code}</p>
                <p className="text-[11px] text-white/15 mt-1.5">{from.cityKo}</p>
              </div>
              <div className="flex flex-col items-center pt-3 px-2">
                <div className="flex items-center gap-1.5">
                  <div className="w-5 h-px bg-emerald-400/15" />
                  <Plane className="w-3 h-3 text-emerald-400/30" />
                  <div className="w-5 h-px bg-emerald-400/15" />
                </div>
                <span className="text-[8px] font-mono text-white/10 mt-1.5">{distanceKm.toLocaleString()} KM</span>
              </div>
              <div className="text-right">
                <p className="text-[38px] font-bold tracking-[0.12em] text-white font-mono leading-none">{to.code}</p>
                <p className="text-[11px] text-white/20 mt-1.5">{to.cityKo}</p>
              </div>
            </div>
          </div>

          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}
            className="px-5 pb-5 text-center text-[13px] text-white/30">{to.cityKo}에 안전하게 도착했습니다</motion.p>

          <div className="relative my-1">
            <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-night-950" />
            <div className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-night-950" />
            <div className="mx-5 border-t border-dashed border-surface/[0.06]" />
          </div>

          <div className="px-5 pt-4 pb-5">
            <p className="text-[8px] font-mono text-white/15 tracking-[0.2em] mb-3">FLIGHT SUMMARY</p>
            <div className="grid grid-cols-4 gap-x-3 mb-5">
              <div><p className="text-[8px] font-mono text-white/15 tracking-wider">DURATION</p><p className="text-[11px] font-mono text-white/50 mt-1">{fmt(durationMinutes)}</p></div>
              <div><p className="text-[8px] font-mono text-white/15 tracking-wider">DIST</p><p className="text-[11px] font-mono text-white/50 mt-1">{distanceKm.toLocaleString()}</p></div>
              <div><p className="text-[8px] font-mono text-white/15 tracking-wider">ARRIVED</p><p className="text-[11px] font-mono text-white/50 mt-1">{landed}</p></div>
              <div><p className="text-[8px] font-mono text-white/15 tracking-wider">DATE</p><p className="text-[11px] font-mono text-white/50 mt-1">{date}</p></div>
            </div>
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className="flex items-center justify-center gap-1.5 mb-5 py-2 rounded-lg bg-sky-400/[0.06] border border-sky-400/[0.10]"
            >
              <span className="text-[14px] font-mono font-bold text-sky-400/80 tracking-wider">
                <MilesCountUp target={earnedMiles} />
              </span>
              <span className="text-[10px] font-mono text-sky-400/50 tracking-[0.2em]">MILES EARNED</span>
            </motion.div>
            <div className="flex flex-col items-center mb-5">
              <Barcode />
              <span className="text-[8px] font-mono text-white/10 tracking-wider mt-2">FLT{flightNumber.replace('-','')}</span>
            </div>
            <motion.button initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}
              whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }} onClick={onReset}
              className="w-full py-3 rounded-lg bg-surface/[0.06] text-white/60 font-medium text-[13px] tracking-wide hover:bg-surface/[0.1] hover:text-white/80 transition-all duration-300">
              다시 탑승하기
            </motion.button>
          </div>
        </div>
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.9 }}
          className="text-center mt-6 text-[9px] text-white/8 tracking-[0.4em] uppercase font-mono">Flightime</motion.p>
      </motion.div>
    </div>
  )
}
