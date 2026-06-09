import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Lock, Unlock, Check, MapPin } from 'lucide-react'
import { AIRPORTS } from '../constants'
import { AIRPORT_UNLOCK_COST } from '../constants/unlockCosts'

interface Props {
  onClose: () => void
  unlockedAirports: Set<string>
  mileageBalance: number
  onUnlock: (type: 'airport' | 'aircraft', itemId: string) => Promise<void>
}

const CONTINENT_GROUPS: { label: string; countries: string[] }[] = [
  { label: '한국', countries: ['KR'] },
  { label: '일본', countries: ['JP'] },
  { label: '동남아시아', countries: ['TH', 'SG', 'HK', 'MY', 'PH', 'VN', 'ID'] },
  { label: '동아시아', countries: ['TW', 'CN'] },
  { label: '남아시아', countries: ['IN'] },
  { label: '중동', countries: ['AE', 'QA', 'TR'] },
  { label: '유럽', countries: ['FR', 'GB', 'DE', 'IT', 'ES', 'NL'] },
  { label: '미주', countries: ['US', 'CA', 'BR'] },
  { label: '오세아니아', countries: ['AU', 'NZ'] },
]

export function AirportCatalog({ onClose, unlockedAirports, mileageBalance, onUnlock }: Props) {
  const [unlockConfirm, setUnlockConfirm] = useState<{ code: string; name: string; cost: number } | null>(null)

  const grouped = useMemo(() => {
    return CONTINENT_GROUPS.map(group => {
      const countrySet = new Set(group.countries)
      const airports = AIRPORTS.filter(a => countrySet.has(a.country))
      return { label: group.label, airports }
    }).filter(g => g.airports.length > 0)
  }, [])

  const handleTapAirport = (code: string, cityKo: string) => {
    if (unlockedAirports.has(code)) return
    const cost = AIRPORT_UNLOCK_COST[code]
    if (!cost) return // initially free
    setUnlockConfirm({ code, name: cityKo, cost })
  }

  const getCardState = (code: string): 'unlocked' | 'free' | 'locked' => {
    if (unlockedAirports.has(code)) return 'unlocked'
    if (!AIRPORT_UNLOCK_COST[code]) return 'free'
    return 'locked'
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      className="absolute inset-0 z-20 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        transition={{ duration: 0.25 }}
        onClick={e => e.stopPropagation()}
        className="w-[380px] max-h-[70vh] bg-[#0c1018] border border-white/[0.08] rounded-2xl flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-white/[0.06] flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <MapPin className="w-3.5 h-3.5 text-sky-400/70" />
            <span className="text-[13px] font-mono font-semibold text-white/75 tracking-wider">공항</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-mono text-sky-400/70 tracking-wider">
              ✈ {mileageBalance.toLocaleString()} M
            </span>
            <button
              onClick={onClose}
              className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-white/[0.08] transition-colors"
            >
              <X className="w-3.5 h-3.5 text-white/50" />
            </button>
          </div>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
          {grouped.map(group => (
            <div key={group.label}>
              <h3 className="text-[10px] font-mono text-white/40 tracking-[0.15em] mb-2">{group.label}</h3>
              <div className="grid grid-cols-4 gap-1.5">
                {group.airports.map(airport => {
                  const state = getCardState(airport.code)
                  const cost = AIRPORT_UNLOCK_COST[airport.code]
                  const canAfford = cost ? mileageBalance >= cost : true

                  return (
                    <button
                      key={airport.code}
                      onClick={() => handleTapAirport(airport.code, airport.cityKo)}
                      disabled={state !== 'locked'}
                      className={`relative rounded-lg border px-2 py-2 text-left transition-all duration-200 ${
                        state === 'unlocked'
                          ? 'bg-white/[0.06] border-sky-400/20'
                          : state === 'free'
                          ? 'bg-white/[0.06] border-emerald-400/20'
                          : canAfford
                          ? 'bg-white/[0.04] border-white/[0.06] hover:bg-white/[0.07] cursor-pointer'
                          : 'bg-white/[0.04] border-white/[0.06] opacity-40'
                      }`}
                    >
                      <p className={`text-[12px] font-mono font-bold tracking-wider ${
                        state === 'unlocked' ? 'text-white/80' : state === 'free' ? 'text-white/80' : 'text-white/50'
                      }`}>
                        {airport.code}
                      </p>
                      <p className={`text-[9px] mt-0.5 ${
                        state === 'unlocked' ? 'text-white/45' : state === 'free' ? 'text-white/45' : 'text-white/25'
                      }`}>
                        {airport.cityKo}
                      </p>
                      <div className="mt-1 flex items-center gap-1">
                        {state === 'unlocked' && (
                          <Check className="w-2.5 h-2.5 text-sky-400/70" />
                        )}
                        {state === 'free' && (
                          <span className="text-[8px] font-mono text-emerald-400/70">무료</span>
                        )}
                        {state === 'locked' && (
                          <>
                            <Lock className="w-2 h-2 text-white/30" />
                            <span className="text-[8px] font-mono text-amber-400/70">{cost!.toLocaleString()}M</span>
                          </>
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Unlock confirmation modal */}
      <AnimatePresence>
        {unlockConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
            onClick={(e) => { e.stopPropagation(); setUnlockConfirm(null) }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="w-[260px] bg-[#0f1420] border border-white/[0.08] rounded-2xl p-5"
            >
              <div className="flex items-center justify-center mb-3">
                <div className="w-9 h-9 rounded-full bg-amber-400/[0.08] flex items-center justify-center">
                  <Unlock className="w-4 h-4 text-amber-400/70" />
                </div>
              </div>
              <p className="text-center text-[12px] text-white/70 mb-1">
                {unlockConfirm.cost.toLocaleString()} 마일을 사용하여
              </p>
              <p className="text-center text-[13px] text-white/85 font-semibold mb-3">
                {unlockConfirm.name} ({unlockConfirm.code}) 해제
              </p>
              <p className="text-center text-[9px] font-mono text-white/40 mb-4">
                잔액: {mileageBalance.toLocaleString()}M → {(mileageBalance - unlockConfirm.cost).toLocaleString()}M
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setUnlockConfirm(null)}
                  className="flex-1 py-2 rounded-xl bg-white/[0.06] text-white/50 text-[11px] hover:bg-white/[0.1] transition-colors"
                >
                  취소
                </button>
                <button
                  onClick={async () => {
                    await onUnlock('airport', unlockConfirm.code)
                    setUnlockConfirm(null)
                  }}
                  disabled={mileageBalance < unlockConfirm.cost}
                  className={`flex-1 py-2 rounded-xl text-[11px] font-medium transition-colors ${
                    mileageBalance >= unlockConfirm.cost
                      ? 'bg-amber-400/[0.15] text-amber-400/90 hover:bg-amber-400/[0.25]'
                      : 'bg-white/[0.04] text-white/20 cursor-not-allowed'
                  }`}
                >
                  {mileageBalance >= unlockConfirm.cost ? '해제' : '마일 부족'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
