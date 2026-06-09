import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Settings, User, Monitor, LogOut, MapPin, Search, ChevronRight } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useUIScale } from '../contexts/UIScaleContext'
import { AIRPORTS } from '../constants'
import type { Airport } from '../types'

interface Props {
  onClose: () => void
}

const SCALE_OPTIONS = [
  { label: '작게', value: 0.85 },
  { label: '보통', value: 1.0 },
  { label: '크게', value: 1.15 },
] as const

const HUB_KEY = 'hub-airport'

export function getHubAirport(): Airport | null {
  const code = localStorage.getItem(HUB_KEY)
  if (!code) return null
  return AIRPORTS.find(a => a.code === code) ?? null
}

function setHubAirport(airport: Airport | null) {
  if (airport) {
    localStorage.setItem(HUB_KEY, airport.code)
  } else {
    localStorage.removeItem(HUB_KEY)
  }
}

export function SettingsPanel({ onClose }: Props) {
  const { user, signOut } = useAuth()
  const { scale, setScale } = useUIScale()
  const [hub, setHub] = useState<Airport | null>(getHubAirport)
  const [hubSearch, setHubSearch] = useState('')
  const [showHubPicker, setShowHubPicker] = useState(false)

  const username = user?.user_metadata?.username ?? ''

  const filteredAirports = useMemo(() => {
    if (!hubSearch.trim()) return AIRPORTS
    const q = hubSearch.toLowerCase()
    return AIRPORTS.filter(a =>
      a.code.toLowerCase().includes(q) ||
      a.city.toLowerCase().includes(q) ||
      a.cityKo.includes(q) ||
      a.country.toLowerCase().includes(q)
    )
  }, [hubSearch])

  const handleSelectHub = (airport: Airport) => {
    setHub(airport)
    setHubAirport(airport)
    setShowHubPicker(false)
    setHubSearch('')
  }

  const handleClearHub = () => {
    setHub(null)
    setHubAirport(null)
  }

  const handleSignOut = async () => {
    await signOut()
    onClose()
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="absolute inset-0 z-20 bg-night-950"
    >
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-[1001] w-8 h-8 flex items-center justify-center rounded-full bg-white/10 border border-white/10 hover:bg-white/20 transition-colors"
      >
        <X className="w-4 h-4 text-white/60" />
      </button>

      <div className="h-full flex flex-col items-center justify-center px-6">
        {/* Header */}
        <div className="flex items-center gap-2 mb-10">
          <Settings className="w-4 h-4 text-sky-400/80" />
          <span className="text-[15px] font-mono font-semibold text-white/80 tracking-[0.15em]">설정</span>
        </div>

        <div className="w-full max-w-[320px] space-y-6">
          {/* Profile section */}
          <div className="backdrop-blur-xl bg-white/[0.06] border border-white/[0.12] rounded-2xl p-6">
            <p className="text-[10px] font-mono text-white/45 tracking-[0.2em] mb-4">PROFILE</p>
            <div className="flex items-center gap-4">
              <div className="w-11 h-11 rounded-full bg-sky-400/10 border border-sky-400/25 flex items-center justify-center flex-shrink-0">
                <User className="w-5 h-5 text-sky-400/70" />
              </div>
              <div className="min-w-0">
                <p className="text-[15px] font-mono font-semibold text-white/85 tracking-wide truncate">
                  {username}
                </p>
              </div>
            </div>

            {/* Hub airport */}
            <div className="mt-5 pt-5 border-t border-white/[0.08]">
              <div className="flex items-center gap-2 mb-3">
                <MapPin className="w-3.5 h-3.5 text-white/50" />
                <span className="text-[10px] font-mono text-white/45 tracking-[0.2em]">HUB AIRPORT</span>
              </div>

              {hub && !showHubPicker ? (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-[16px] font-mono font-bold text-sky-400/90 tracking-wider">{hub.code}</span>
                    <span className="text-[11px] text-white/55">{hub.cityKo}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => { setShowHubPicker(true); setHubSearch('') }}
                      className="text-[10px] text-white/45 hover:text-white/70 transition-colors px-2 py-1"
                    >
                      변경
                    </button>
                    <button
                      onClick={handleClearHub}
                      className="text-[10px] text-white/35 hover:text-red-400/60 transition-colors px-2 py-1"
                    >
                      삭제
                    </button>
                  </div>
                </div>
              ) : (
                <div className="relative">
                  <div className="flex items-center gap-2 bg-white/[0.07] border border-white/[0.12] rounded-xl px-3 py-2.5">
                    <Search className="w-3.5 h-3.5 text-white/40 flex-shrink-0" />
                    <input
                      type="text"
                      placeholder="공항 검색"
                      value={hubSearch}
                      onChange={e => setHubSearch(e.target.value)}
                      className="flex-1 bg-transparent text-[12px] font-mono text-white/80 placeholder:text-white/40 outline-none"
                      autoFocus={showHubPicker}
                    />
                    {showHubPicker && hub && (
                      <button
                        onClick={() => { setShowHubPicker(false); setHubSearch('') }}
                        className="text-[10px] text-white/45 hover:text-white/70 transition-colors"
                      >
                        취소
                      </button>
                    )}
                  </div>

                  <AnimatePresence>
                    {hubSearch.trim() && (
                      <motion.div
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        className="absolute left-0 right-0 mt-1.5 rounded-xl bg-night-800 border border-white/[0.12] overflow-hidden max-h-[150px] overflow-y-auto z-10"
                      >
                        {filteredAirports.length === 0 ? (
                          <div className="px-3 py-3 text-[11px] text-white/45 text-center">결과 없음</div>
                        ) : (
                          filteredAirports.map(airport => (
                            <button
                              key={airport.code}
                              onClick={() => handleSelectHub(airport)}
                              className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-white/[0.08] transition-colors group"
                            >
                              <div className="flex items-center gap-3">
                                <span className="text-[13px] font-mono font-semibold tracking-wider text-white/75 w-10">{airport.code}</span>
                                <span className="text-[11px] text-white/50">{airport.cityKo}</span>
                              </div>
                              <ChevronRight className="w-3 h-3 text-white/0 group-hover:text-white/30 transition-colors" />
                            </button>
                          ))
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </div>
          </div>

          {/* UI Scale section */}
          <div className="backdrop-blur-xl bg-white/[0.06] border border-white/[0.12] rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <Monitor className="w-3.5 h-3.5 text-white/50" />
              <span className="text-[10px] font-mono text-white/45 tracking-[0.2em]">UI SIZE</span>
            </div>

            <div className="flex gap-2">
              {SCALE_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setScale(opt.value)}
                  className={`flex-1 py-2.5 rounded-xl text-[12px] font-mono tracking-wide transition-all duration-300 ${
                    scale === opt.value
                      ? 'bg-sky-400/15 border border-sky-400/35 text-sky-400/95'
                      : 'bg-white/[0.05] border border-white/[0.10] text-white/55 hover:bg-white/[0.10] hover:text-white/75'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Sign out */}
          <button
            onClick={handleSignOut}
            className="w-full py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white/50 text-[12px] font-mono tracking-wide hover:bg-red-500/10 hover:border-red-500/25 hover:text-red-400/70 transition-all duration-300 flex items-center justify-center gap-2"
          >
            <LogOut className="w-3.5 h-3.5" />
            로그아웃
          </button>
        </div>
      </div>
    </motion.div>
  )
}
