import { useState, useCallback, useMemo } from 'react'
import { motion, useAnimation } from 'framer-motion'
import { PlaneTakeoff, X } from 'lucide-react'
import { DURATION_PRESETS } from '../constants'
import type { FlightConfig } from '../types'

interface Props {
  config: FlightConfig
  onBoard: (durationMinutes: number, todos: string[]) => void
}

const ease = [0.22, 1, 0.36, 1]

// Destination glow themes: [primary, secondary, accent]
const GLOW_THEMES: Record<string, [string, string, string]> = {
  KR: ['#38bdf8', '#6366f1', '#22d3ee'],   // cool blue (default)
  JP: ['#f472b6', '#a855f7', '#fda4af'],   // cherry blossom
  TH: ['#fbbf24', '#f59e0b', '#fb923c'],   // golden temple
  SG: ['#f87171', '#fb923c', '#fbbf24'],   // modern red
  HK: ['#f43f5e', '#a855f7', '#ec4899'],   // neon city
  MY: ['#2dd4bf', '#3b82f6', '#34d399'],   // tropical teal
  PH: ['#38bdf8', '#2dd4bf', '#22d3ee'],   // ocean blue
  VN: ['#f59e0b', '#ef4444', '#fbbf24'],   // warm gold
  ID: ['#34d399', '#2dd4bf', '#22d3ee'],   // tropical emerald
  TW: ['#fb923c', '#f472b6', '#fbbf24'],   // warm modern
  CN: ['#ef4444', '#fbbf24', '#f97316'],   // imperial red
  IN: ['#f97316', '#fbbf24', '#ef4444'],   // saffron
  AE: ['#fbbf24', '#f97316', '#d97706'],   // desert gold
  QA: ['#be123c', '#fbbf24', '#f43f5e'],   // maroon
  TR: ['#ef4444', '#f97316', '#fbbf24'],   // byzantine
  FR: ['#a78bfa', '#fbbf24', '#c084fc'],   // lavender
  GB: ['#3b82f6', '#6366f1', '#818cf8'],   // royal blue
  DE: ['#60a5fa', '#38bdf8', '#818cf8'],   // precision blue
  IT: ['#fb923c', '#f472b6', '#fbbf24'],   // terracotta
  ES: ['#f97316', '#ef4444', '#fbbf24'],   // fiery
  NL: ['#f97316', '#fb923c', '#fbbf24'],   // dutch orange
  US: ['#3b82f6', '#6366f1', '#f97316'],   // stars & stripes
  CA: ['#ef4444', '#38bdf8', '#f87171'],   // northern cool
  BR: ['#22c55e', '#fbbf24', '#34d399'],   // tropical
  AU: ['#f59e0b', '#ef4444', '#fb923c'],   // outback
  NZ: ['#22d3ee', '#34d399', '#38bdf8'],   // natural
}
const DEFAULT_GLOW: [string, string, string] = ['#38bdf8', '#6366f1', '#22d3ee']

function hexToRgb(hex: string) {
  return `${parseInt(hex.slice(1, 3), 16)},${parseInt(hex.slice(3, 5), 16)},${parseInt(hex.slice(5, 7), 16)}`
}

export function BoardingPass({ config, onBoard }: Props) {
  const [selectedMinutes, setSelectedMinutes] = useState(50)
  const [customMinutes, setCustomMinutes] = useState('')
  const [isCustom, setIsCustom] = useState(false)
  const [tearing, setTearing] = useState(false)
  const [todoItems, setTodoItems] = useState<string[]>([])
  const [todoInput, setTodoInput] = useState('')
  const { from, to } = config

  const heroCtrl = useAnimation()
  const contentCtrl = useAnimation()

  const [primary, secondary, accent] = useMemo(
    () => GLOW_THEMES[to.country] ?? DEFAULT_GLOW,
    [to.country],
  )

  const activeDuration = isCustom ? parseInt(customMinutes) || 0 : selectedMinutes

  const handleBoard = useCallback(async () => {
    const minutes = isCustom ? parseInt(customMinutes) || 50 : selectedMinutes
    if (minutes <= 0 || minutes > 480 || tearing) return
    setTearing(true)

    await Promise.all([
      heroCtrl.start({
        y: -80,
        opacity: 0,
        transition: { duration: 0.8, ease },
      }),
      contentCtrl.start({
        y: 40,
        opacity: 0,
        transition: { duration: 0.7, ease, delay: 0.1 },
      }),
    ])

    onBoard(minutes, todoItems)
  }, [isCustom, customMinutes, selectedMinutes, tearing, heroCtrl, contentCtrl, onBoard, todoItems])

  return (
    <div className="h-full flex flex-col items-center justify-center relative overflow-hidden">
      <div className="absolute inset-0 bg-night-950" />
      <div className="absolute top-[30%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] rounded-full blur-[120px]"
        style={{ backgroundColor: `rgba(${hexToRgb(primary)},0.02)` }} />

      {/* Two-column layout */}
      <div className="relative z-10 w-full max-w-[820px] h-full flex items-center px-6 py-6 gap-8">

        {/* Left column: Hero */}
        <motion.div
          animate={heroCtrl}
          initial={{ opacity: 0, y: 60 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.0, ease }}
          className="flex-1 flex flex-col items-center justify-center min-w-0 pointer-events-none"
        >
          <div className="relative w-full h-[280px] flex items-center justify-center">
            <motion.div
              animate={{ scale: [1, 1.2, 1], opacity: [0.035, 0.07, 0.035] }}
              transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[40%] w-[420px] h-[420px] rounded-full blur-[130px]"
              style={{ backgroundColor: primary }}
            />
            <motion.div
              animate={{ scale: [1, 1.25, 1], x: [-15, 20, -15], opacity: [0.025, 0.055, 0.025] }}
              transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
              className="absolute top-[20%] left-[20%] w-[220px] h-[220px] rounded-full blur-[100px]"
              style={{ backgroundColor: secondary }}
            />
            <motion.div
              animate={{ scale: [1, 1.15, 1], x: [12, -15, 12], opacity: [0.02, 0.045, 0.02] }}
              transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
              className="absolute top-[30%] right-[15%] w-[200px] h-[200px] rounded-full blur-[110px]"
              style={{ backgroundColor: accent }}
            />
            <motion.div
              animate={{ scale: [0.85, 1.1, 0.85], opacity: [0, 0.05, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[40%] w-[240px] h-[240px] rounded-full"
              style={{ borderWidth: 1, borderColor: `rgba(${hexToRgb(primary)},0.5)` }}
            />
            <motion.div
              animate={{ scale: [0.9, 1.2, 0.9], opacity: [0, 0.03, 0] }}
              transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut', delay: 1.5 }}
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[40%] w-[320px] h-[320px] rounded-full"
              style={{ borderWidth: 1, borderColor: `rgba(${hexToRgb(primary)},0.3)` }}
            />

            <motion.div
              animate={{ y: [0, -10, 0], rotate: [0, 0.5, 0, -0.5, 0] }}
              transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
              className="relative z-10"
              style={{
                marginTop: '45%',
                maskImage: 'linear-gradient(to bottom, black 0%, black 25%, transparent 55%), linear-gradient(to right, transparent 0%, black 20%, black 80%, transparent 100%)',
                WebkitMaskImage: 'linear-gradient(to bottom, black 0%, black 25%, transparent 55%), linear-gradient(to right, transparent 0%, black 20%, black 80%, transparent 100%)',
                maskComposite: 'intersect',
                WebkitMaskComposite: 'source-in',
              }}
            >
              <img
                src="/airplane-top.webp"
                alt="Airplane"
                className="w-[420px] h-auto object-contain"
                style={{ filter: `brightness(0.7) contrast(1.2) drop-shadow(0 0 60px rgba(${hexToRgb(primary)},0.12))` }}
              />
            </motion.div>
          </div>

          <div className="flex flex-col items-center -mt-4 relative z-20">
            <motion.p
              initial={{ opacity: 0, y: 20, filter: 'blur(10px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              transition={{ duration: 1.0, delay: 0.3, ease }}
              className="text-[13px] font-bold text-amber-400 tracking-[0.3em] uppercase"
            >
              Boarding
            </motion.p>
            <motion.p
              initial={{ opacity: 0, y: 20, filter: 'blur(10px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              transition={{ duration: 1.0, delay: 0.5, ease }}
              className="text-[32px] font-bold text-white tracking-wide leading-none mt-1"
            >
              {from.code}
              <span className="text-amber-400 mx-3 text-[20px]">{'\u2192'}</span>
              {to.code}
            </motion.p>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.9, ease }}
              className="text-[11px] text-white/25 mt-2"
            >
              {from.cityKo} — {to.cityKo}
            </motion.p>
          </div>
        </motion.div>

        {/* Right column: Boarding Pass card */}
        <motion.div
          animate={contentCtrl}
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.4, ease }}
          className="relative z-20 w-[300px] shrink-0 flex flex-col justify-center"
        >
          <div className="rounded-[20px] overflow-hidden flex flex-col shadow-2xl shadow-black/40"
            style={{ background: 'linear-gradient(170deg, #1a1a20 0%, #111114 50%, #0d0d10 100%)' }}
          >
            {/* Route header */}
            <div className="px-5 pt-6 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[28px] font-bold text-white font-mono leading-none">{from.code}</p>
                  <p className="text-[10px] text-white/20 mt-1">{from.cityKo}</p>
                </div>
                <div className="flex flex-col items-center px-3">
                  <PlaneTakeoff className="w-3.5 h-3.5 text-amber-400/50 mb-1.5" />
                  <div className="flex items-center gap-1">
                    <div className="w-5 h-px bg-surface/[0.06]" />
                    <div className="w-1 h-1 rounded-full bg-amber-400/30" />
                    <div className="w-5 h-px bg-surface/[0.06]" />
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[28px] font-bold text-white font-mono leading-none">{to.code}</p>
                  <p className="text-[10px] text-white/20 mt-1">{to.cityKo}</p>
                </div>
              </div>
            </div>

            {/* Tear perforation */}
            <div className="relative flex items-center">
              <div className="w-4 h-7 -ml-2 rounded-r-full bg-night-950 border-r border-y border-surface/[0.04] shrink-0" />
              <div className="flex-1 border-t border-dashed border-surface/[0.06]" />
              <div className="w-4 h-7 -mr-2 rounded-l-full bg-night-950 border-l border-y border-surface/[0.04] shrink-0" />
            </div>

            {/* Duration selector */}
            <div className="px-5 pt-4 pb-2">
              <div className="flex items-center justify-between mb-3">
                <p className="text-[7px] font-mono text-white/20 tracking-[0.2em]">FOCUS TIME</p>
                <span className="text-[18px] font-mono font-bold text-amber-400 leading-none">
                  {activeDuration > 0 ? `${activeDuration}'` : '--'}
                </span>
              </div>
              <div className="flex gap-1 mb-2">
                {DURATION_PRESETS.map(preset => (
                  <button
                    key={preset.minutes}
                    onClick={() => { setSelectedMinutes(preset.minutes); setIsCustom(false) }}
                    className={`flex-1 py-1.5 text-[11px] font-mono font-semibold transition-all duration-150 border-b-2 ${
                      !isCustom && selectedMinutes === preset.minutes
                        ? 'border-amber-400 text-amber-400'
                        : 'border-transparent text-white/20 hover:text-white/40'
                    }`}
                  >{preset.minutes}min</button>
                ))}
              </div>
              <div
                className={`flex items-center rounded-md px-3 py-1.5 cursor-text transition-all border ${
                  isCustom ? 'border-amber-400/30 bg-amber-400/5' : 'border-surface/[0.04] bg-transparent'
                }`}
                onClick={() => setIsCustom(true)}
              >
                <input type="number" placeholder="Custom" value={customMinutes}
                  onChange={e => { setCustomMinutes(e.target.value); setIsCustom(true) }}
                  onFocus={() => setIsCustom(true)}
                  className="flex-1 bg-transparent text-[11px] font-mono text-white/50 placeholder:text-white/12 outline-none"
                  min={1} max={480} />
                <span className="text-[9px] text-white/15 font-mono">min</span>
              </div>
            </div>

            {/* Todo list */}
            <div className="px-5 pt-2 pb-1 flex flex-col">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[7px] font-mono text-white/20 tracking-[0.2em]">TO-DO</p>
                {todoItems.length > 0 && (
                  <span className="text-[9px] font-mono text-white/15">{todoItems.length}</span>
                )}
              </div>
              <div className="flex gap-1 mb-1">
                <input
                  type="text"
                  placeholder="+ Add task"
                  value={todoInput}
                  onChange={e => setTodoInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && todoInput.trim()) {
                      setTodoItems(prev => [...prev, todoInput.trim()])
                      setTodoInput('')
                    }
                  }}
                  className="flex-1 border-b border-surface/[0.06] bg-transparent px-1 py-1.5 text-[11px] font-mono text-white/50 placeholder:text-white/12 outline-none focus:border-amber-400/30 transition-colors"
                />
                <button
                  onClick={() => { if (todoInput.trim()) { setTodoItems(prev => [...prev, todoInput.trim()]); setTodoInput('') } }}
                  className="px-2 py-1 text-[10px] font-mono text-amber-400/60 hover:text-amber-400 transition-colors"
                >
                  ADD
                </button>
              </div>
              {todoItems.length > 0 && (
                <div className="space-y-0 max-h-[120px] overflow-y-auto mt-1">
                  {todoItems.map((item, i) => (
                    <div key={i} className="flex items-center gap-2 py-1.5 border-b border-surface/[0.03] group">
                      <div className="w-3.5 h-3.5 rounded border border-surface/[0.08] shrink-0 flex items-center justify-center hover:border-amber-400/30 cursor-pointer"
                        onClick={() => setTodoItems(prev => prev.filter((_, j) => j !== i))}>
                        <X className="w-2 h-2 text-transparent group-hover:text-white/30" />
                      </div>
                      <span className="text-[11px] font-mono text-white/40 flex-1">{item}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Board button */}
            <div className="px-5 pt-3 pb-5">
              <motion.button
                whileHover={{ scale: 1.015 }}
                whileTap={{ scale: 0.97 }}
                onClick={handleBoard}
                disabled={activeDuration <= 0 || tearing}
                className="w-full py-3.5 rounded-xl bg-amber-400 text-black font-bold text-[14px] tracking-[0.04em] hover:bg-amber-300 transition-all disabled:opacity-20 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-amber-400/10"
              >
                <PlaneTakeoff className="w-4 h-4" />
                탑승하기
              </motion.button>
            </div>
          </div>

          <p className="text-center mt-2.5 text-[7px] text-white/5 tracking-[0.4em] uppercase font-mono">
            Flightime
          </p>
        </motion.div>
      </div>
    </div>
  )
}
