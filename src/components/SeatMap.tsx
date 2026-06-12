import { useState, useMemo, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Users } from 'lucide-react'
import type { Aircraft } from '../types'
import { SEAT_CONFIGS, type SeatConfig } from '../seatConfigs'

const ease = [0.16, 1, 0.3, 1] as const

interface Props {
  aircraft: Aircraft
  onSelectSeat: (seatCode: string) => void
  onInviteFriend?: () => void
}

// Layout constants — no fuselage padding needed
const LAYOUT = {
  narrow: { seatW: 42, seatH: 36, gap: 4, aisleWidth: 30, fontSize: 13, rowNumW: 34 },
  wide:   { seatW: 32, seatH: 28, gap: 3, aisleWidth: 22, fontSize: 10, rowNumW: 30 },
}

// Diagonal stripe pattern for occupied seats
const STRIPE_BG = 'repeating-linear-gradient(45deg, rgba(255,255,255,0.04) 0px, rgba(255,255,255,0.04) 2px, transparent 2px, transparent 6px)'

function getSeatType(col: string, config: SeatConfig): string {
  const idx = config.columns.indexOf(col)
  if (idx === 0 || idx === config.columns.length - 1) return '창가'
  if (config.aisleAfter.includes(idx) || config.aisleAfter.includes(idx - 1)) return '복도'
  return '가운데'
}

// Compute sections from exit rows
function computeSections(config: SeatConfig): { label: string; startRow: number; endRow: number }[] {
  const boundaries = [0, ...config.exitRows, config.rows]
  const sections: { label: string; startRow: number; endRow: number }[] = []
  for (let i = 0; i < boundaries.length - 1; i++) {
    sections.push({
      label: `${i + 1}`,
      startRow: boundaries[i] + 1,
      endRow: boundaries[i + 1],
    })
  }
  return sections
}

export function SeatMap({ aircraft, onSelectSeat, onInviteFriend }: Props) {
  const config = SEAT_CONFIGS[aircraft.id]
  const layout = aircraft.type === 'Narrow' ? LAYOUT.narrow : LAYOUT.wide
  const [selectedSeat, setSelectedSeat] = useState<string | null>(null)
  const [activeSection, setActiveSection] = useState(0)
  const seatRefs = useRef<Map<string, HTMLButtonElement>>(new Map())
  const scrollRef = useRef<HTMLDivElement>(null)

  const sections = useMemo(() => computeSections(config), [config])

  const occupiedSeats = useMemo(() => {
    const occupied = new Set<string>()
    let seed = 0
    for (let i = 0; i < aircraft.id.length; i++) seed += aircraft.id.charCodeAt(i)
    const rng = () => {
      seed = (seed * 16807 + 0) % 2147483647
      return seed / 2147483647
    }
    for (let row = 1; row <= config.rows; row++) {
      for (const col of config.columns) {
        if (rng() < config.occupancyRate) {
          occupied.add(`${row}${col}`)
        }
      }
    }
    return occupied
  }, [aircraft.id, config])

  // Rows for the active section
  const visibleRows = useMemo(() => {
    const section = sections[activeSection]
    if (!section) return []
    const arr: number[] = []
    for (let r = section.startRow; r <= section.endRow; r++) arr.push(r)
    return arr
  }, [sections, activeSection])

  const handleSeatClick = useCallback((seatCode: string) => {
    setSelectedSeat(prev => prev === seatCode ? null : seatCode)
    requestAnimationFrame(() => {
      const el = seatRefs.current.get(seatCode)
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    })
  }, [])

  const selectedType = selectedSeat
    ? getSeatType(selectedSeat.replace(/\d+/, ''), config)
    : null

  const colCount = config.columns.length
  const aisleCount = config.aisleAfter.length
  const gridWidth = layout.rowNumW + colCount * layout.seatW + (colCount - 1 - aisleCount) * layout.gap + aisleCount * layout.aisleWidth

  return (
    <div className="relative flex-1 flex flex-col w-full items-center overflow-hidden">
      {/* Title */}
      <h2 className="text-[18px] font-mono font-semibold text-white/70 tracking-[0.1em] mb-3 shrink-0">
        좌석을 선택하세요
      </h2>

      {/* Legend */}
      <div className="flex items-center gap-5 mb-3 shrink-0">
        <div className="flex items-center gap-1.5">
          <span
            className="inline-block rounded-[4px]"
            style={{
              width: 14, height: 14,
              backgroundColor: 'rgba(129,140,248,0.35)',
              borderRadius: '5px 5px 3px 3px',
            }}
          />
          <span className="text-[10px] text-white/40 font-mono">빈 좌석</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span
            className="inline-block border border-surface/[0.06]"
            style={{
              width: 14, height: 14,
              borderRadius: '5px 5px 3px 3px',
              background: STRIPE_BG,
            }}
          />
          <span className="text-[10px] text-white/40 font-mono">예약됨</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span
            className="inline-block"
            style={{
              width: 14, height: 14,
              borderRadius: '5px 5px 3px 3px',
              backgroundColor: 'rgba(129,140,248,0.7)',
              boxShadow: '0 0 8px rgba(129,140,248,0.5)',
            }}
          />
          <span className="text-[10px] text-white/40 font-mono">선택</span>
        </div>
      </div>

      {/* Section tabs */}
      <div className="flex items-center gap-2 mb-4 shrink-0">
        {sections.map((section, i) => (
          <button
            key={i}
            onClick={() => { setActiveSection(i); scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' }) }}
            className={`px-3.5 py-1.5 rounded-full text-[11px] font-mono tracking-wider transition-all duration-200 ${
              i === activeSection
                ? 'bg-white/90 text-night-950 font-semibold shadow-[0_0_12px_rgba(255,255,255,0.15)]'
                : 'bg-surface/[0.06] text-white/40 hover:bg-surface/[0.12] hover:text-white/60'
            }`}
          >
            구역 {section.label}
          </button>
        ))}
      </div>

      {/* Column headers */}
      <div className="flex items-center mb-1 shrink-0" style={{ width: gridWidth }}>
        <span style={{ width: layout.rowNumW }} />
        {config.columns.map((col, i) => (
          <span key={col} className="flex items-center">
            {config.aisleAfter.includes(i - 1) && i > 0 && (
              <span style={{ width: layout.aisleWidth }} />
            )}
            {i > 0 && !config.aisleAfter.includes(i - 1) && (
              <span style={{ width: layout.gap }} />
            )}
            <span
              className="text-center font-mono text-white/30"
              style={{ width: layout.seatW, fontSize: layout.fontSize }}
            >
              {col}
            </span>
          </span>
        ))}
      </div>

      {/* Seat grid — clean floating, no fuselage */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto overflow-x-hidden min-h-0 pt-2 pb-20"
        style={{ scrollbarWidth: 'none' }}
      >
        {visibleRows.map((row) => {
          const rowHeight = layout.seatH + layout.gap * 2
          return (
            <div key={row}>
              {config.exitRows.includes(row) && (
                <div className="flex items-center gap-2 py-1 my-0.5" style={{ width: gridWidth }}>
                  <div className="flex-1 h-px bg-emerald-400/15" />
                  <span className="font-mono text-emerald-400/30 tracking-[0.2em]" style={{ fontSize: 7 }}>EXIT</span>
                  <div className="flex-1 h-px bg-emerald-400/15" />
                </div>
              )}

              <div
                className="flex items-center"
                style={{ height: rowHeight, width: gridWidth }}
              >
                <span
                  className="text-right font-mono text-white/20 shrink-0 pr-1.5"
                  style={{ width: layout.rowNumW, fontSize: layout.fontSize - 2 }}
                >
                  {row}
                </span>

                {config.columns.map((col, ci) => {
                  const seatCode = `${row}${col}`
                  const isOccupied = occupiedSeats.has(seatCode)
                  const isSelected = selectedSeat === seatCode

                  return (
                    <span key={col} className="flex items-center">
                      {config.aisleAfter.includes(ci - 1) && ci > 0 && (
                        <span style={{ width: layout.aisleWidth }} />
                      )}
                      {ci > 0 && !config.aisleAfter.includes(ci - 1) && (
                        <span style={{ width: layout.gap }} />
                      )}
                      <motion.button
                        ref={(el) => {
                          if (el) seatRefs.current.set(seatCode, el)
                        }}
                        whileHover={!isOccupied ? { scale: 1.12 } : undefined}
                        whileTap={!isOccupied ? { scale: 0.92 } : undefined}
                        onClick={() => !isOccupied && handleSeatClick(seatCode)}
                        disabled={isOccupied}
                        className="flex items-center justify-center font-mono transition-all duration-200"
                        style={{
                          width: layout.seatW,
                          height: layout.seatH,
                          fontSize: layout.fontSize - 1,
                          borderRadius: '8px 8px 4px 4px',
                          ...(isOccupied
                            ? {
                                background: STRIPE_BG,
                                border: '1px solid rgba(255,255,255,0.06)',
                                cursor: 'not-allowed',
                                color: 'transparent',
                              }
                            : isSelected
                            ? {
                                backgroundColor: 'rgba(129,140,248,0.7)',
                                border: '1.5px solid rgba(129,140,248,0.6)',
                                color: 'rgba(255,255,255,0.9)',
                                boxShadow: '0 0 14px rgba(129,140,248,0.5)',
                              }
                            : {
                                backgroundColor: 'rgba(129,140,248,0.35)',
                                border: '1px solid rgba(129,140,248,0.15)',
                                color: 'rgba(255,255,255,0.2)',
                              }
                          ),
                        }}
                      >
                        {isSelected ? col : ''}
                      </motion.button>
                    </span>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      {/* Confirmation bar */}
      <AnimatePresence>
        {selectedSeat && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            transition={{ duration: 0.25, ease }}
            className="absolute bottom-6 left-0 right-0 z-20"
          >
            <div className="flex items-center justify-between max-w-[380px] mx-auto px-5 py-3 rounded-2xl bg-night-950/80 backdrop-blur-md border border-surface/[0.08]">
              <div className="flex items-baseline gap-3">
                <p className="text-[22px] font-mono font-bold text-white/85 tracking-wider">
                  {selectedSeat}
                </p>
                <p className="text-[11px] text-white/40">{selectedType}</p>
              </div>
              <div className="flex items-center gap-2">
                {onInviteFriend && (
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={onInviteFriend}
                    className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-surface/[0.05] border border-surface/[0.08] text-white/50 text-[12px] tracking-wide hover:bg-surface/[0.10] hover:text-white/70 transition-all duration-300"
                  >
                    <Users className="w-3.5 h-3.5" />
                    친구 초대
                  </motion.button>
                )}
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => onSelectSeat(selectedSeat)}
                  className="px-8 py-2.5 rounded-xl bg-surface/[0.08] border border-surface/[0.10] text-white/75 font-medium text-[13px] tracking-wide hover:bg-surface/[0.14] hover:text-white/90 transition-all duration-300"
                >
                  선택
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
