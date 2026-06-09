import { useState, useMemo, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { Aircraft } from '../types'
import { SEAT_CONFIGS, type SeatConfig } from '../seatConfigs'

const ease = [0.16, 1, 0.3, 1] as const

interface Props {
  aircraft: Aircraft
  onSelectSeat: (seatCode: string) => void
}

// Direct pixel values — no transform: scale needed
const LAYOUT = {
  narrow: { seatSize: 44, seatGap: 5, aisleWidth: 34, fontSize: 14, rowNumW: 38 },
  wide:   { seatSize: 34, seatGap: 4, aisleWidth: 24, fontSize: 11, rowNumW: 34 },
}

function getSeatType(col: string, config: SeatConfig): string {
  const idx = config.columns.indexOf(col)
  if (idx === 0 || idx === config.columns.length - 1) return '창가'
  if (config.aisleAfter.includes(idx) || config.aisleAfter.includes(idx - 1)) return '복도'
  return '가운데'
}

export function SeatMap({ aircraft, onSelectSeat }: Props) {
  const config = SEAT_CONFIGS[aircraft.id]
  const layout = aircraft.type === 'Narrow' ? LAYOUT.narrow : LAYOUT.wide
  const [selectedSeat, setSelectedSeat] = useState<string | null>(null)
  const seatRefs = useRef<Map<string, HTMLButtonElement>>(new Map())
  const scrollRef = useRef<HTMLDivElement>(null)

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

  const rows = useMemo(() => {
    const arr: number[] = []
    for (let r = 1; r <= config.rows; r++) arr.push(r)
    return arr
  }, [config])

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
  const gridWidth = colCount * layout.seatSize + (colCount - 1 - aisleCount) * layout.seatGap + aisleCount * layout.aisleWidth + layout.rowNumW
  const fuselageWidth = gridWidth + 20
  const rowHeight = layout.seatSize + layout.seatGap * 2

  return (
    <div className="relative flex-1 flex flex-col w-full items-center overflow-hidden">
      <h2 className="text-[18px] font-mono font-semibold text-white/70 tracking-[0.1em] mb-3 shrink-0">
        좌석을 선택하세요
      </h2>

      {/* Column headers */}
      <div className="flex items-center mb-1 shrink-0" style={{ width: gridWidth }}>
        <span style={{ width: layout.rowNumW }} />
        {config.columns.map((col, i) => (
          <span key={col} className="flex items-center">
            {config.aisleAfter.includes(i - 1) && i > 0 && (
              <span style={{ width: layout.aisleWidth }} />
            )}
            {i > 0 && !config.aisleAfter.includes(i - 1) && (
              <span style={{ width: layout.seatGap }} />
            )}
            <span
              className="text-center font-mono text-white/30"
              style={{ width: layout.seatSize, fontSize: layout.fontSize }}
            >
              {col}
            </span>
          </span>
        ))}
      </div>

      {/* Fuselage */}
      <div
        className="relative flex flex-col overflow-hidden flex-1 min-h-0"
        style={{ width: fuselageWidth }}
      >
        {/* Nose — viewBox matches pixel width so strokeWidth=1 = 1px */}
        <svg
          viewBox={`0 0 ${fuselageWidth} 40`}
          width={fuselageWidth}
          height={40}
          className="shrink-0 block"
        >
          <path
            d={`M 0,40 L 0,28 Q 0,6 ${fuselageWidth / 2},1 Q ${fuselageWidth},6 ${fuselageWidth},28 L ${fuselageWidth},40`}
            fill="rgba(17,24,39,0.35)"
            stroke="none"
          />
          <path
            d={`M 0,28 Q 0,6 ${fuselageWidth / 2},1 Q ${fuselageWidth},6 ${fuselageWidth},28`}
            fill="none"
            stroke="rgba(255,255,255,0.06)"
            strokeWidth="1"
          />
          <rect x={fuselageWidth / 2 - 12} y={12} width="7" height="4" rx="2" fill="rgba(96,165,250,0.12)" />
          <rect x={fuselageWidth / 2 + 5} y={12} width="7" height="4" rx="2" fill="rgba(96,165,250,0.12)" />
        </svg>

        {/* Seat rows - scrollable, no scrollbar */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto overflow-x-hidden bg-[rgba(17,24,39,0.35)] border-l border-r border-white/[0.06] pt-2 pb-16"
          style={{
            scrollbarWidth: 'none',
            paddingLeft: (fuselageWidth - gridWidth) / 2,
            paddingRight: (fuselageWidth - gridWidth) / 2,
          }}
        >
          {rows.map((row) => (
            <div key={row}>
              {config.exitRows.includes(row) && (
                <div className="flex items-center gap-2 py-1 my-0.5">
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
                        <span style={{ width: layout.seatGap }} />
                      )}
                      <motion.button
                        ref={(el) => {
                          if (el) seatRefs.current.set(seatCode, el)
                        }}
                        whileHover={!isOccupied ? { scale: 1.12 } : undefined}
                        whileTap={!isOccupied ? { scale: 0.92 } : undefined}
                        onClick={() => !isOccupied && handleSeatClick(seatCode)}
                        disabled={isOccupied}
                        className={`flex items-center justify-center rounded-lg font-mono transition-all duration-200 ${
                          isOccupied
                            ? 'bg-white/[0.04] border border-white/[0.04] cursor-not-allowed'
                            : isSelected
                            ? 'bg-sky-400/20 border-[1.5px] border-sky-400/40 text-sky-400 shadow-[0_0_12px_rgba(96,165,250,0.35)]'
                            : 'bg-white/[0.06] border border-white/[0.08] text-white/20 hover:bg-white/[0.12] hover:border-white/[0.14] hover:text-white/45'
                        }`}
                        style={{
                          width: layout.seatSize,
                          height: layout.seatSize,
                          fontSize: layout.fontSize - 1,
                        }}
                      >
                        {isOccupied ? (
                          <span className="text-white/[0.08]" style={{ fontSize: layout.fontSize - 3 }}>
                            &#x2715;
                          </span>
                        ) : isSelected ? (
                          col
                        ) : (
                          ''
                        )}
                      </motion.button>
                    </span>
                  )
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Tail — viewBox matches pixel width so strokeWidth=1 = 1px */}
        <svg
          viewBox={`0 0 ${fuselageWidth} 28`}
          width={fuselageWidth}
          height={28}
          className="shrink-0 block"
        >
          <path
            d={`M 0,0 L 0,6 Q 0,20 ${fuselageWidth * 0.3},26 L ${fuselageWidth * 0.7},26 Q ${fuselageWidth},20 ${fuselageWidth},6 L ${fuselageWidth},0`}
            fill="rgba(17,24,39,0.35)"
            stroke="none"
          />
          <path
            d={`M 0,6 Q 0,20 ${fuselageWidth * 0.3},26 L ${fuselageWidth * 0.7},26 Q ${fuselageWidth},20 ${fuselageWidth},6`}
            fill="none"
            stroke="rgba(255,255,255,0.06)"
            strokeWidth="1"
          />
        </svg>
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
            <div className="flex items-center justify-between max-w-[340px] mx-auto px-5 py-3 rounded-2xl bg-night-950/80 backdrop-blur-md border border-white/[0.08]">
              <div className="flex items-baseline gap-3">
                <p className="text-[22px] font-mono font-bold text-white/85 tracking-wider">
                  {selectedSeat}
                </p>
                <p className="text-[11px] text-white/40">{selectedType}</p>
              </div>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => onSelectSeat(selectedSeat)}
                className="px-8 py-2.5 rounded-xl bg-white/[0.08] border border-white/[0.10] text-white/75 font-medium text-[13px] tracking-wide hover:bg-white/[0.14] hover:text-white/90 transition-all duration-300"
              >
                선택
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
