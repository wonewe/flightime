import { useState, useEffect, useMemo, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Settings, Pause, Play, Volume2, VolumeX, CheckCircle2, Circle, ListTodo } from 'lucide-react'
import { FlightMap } from './FlightMap'
import { useTimer } from '../hooks/useTimer'
import { useAmbientNoise } from '../hooks/useAmbientNoise'
import { PHASE_THRESHOLDS } from '../constants'
import { upsertActiveFlight, removeActiveFlight } from '../lib/activeFlights'
import { useAuth } from '../contexts/AuthContext'
import { useFriends } from '../hooks/useFriends'
import { useFriendFlights } from '../hooks/useFriendFlights'
import type { FlightConfig, FlightPhase } from '../types'

interface Props {
  config: FlightConfig
  durationMinutes: number
  todos: string[]
  onLanded: () => void
  onExit: () => void
}

interface HudSettings { showRoute: boolean; showTimer: boolean; showPhase: boolean; showStats: boolean }

function formatTime(ms: number): string {
  const t = Math.floor(ms / 1000), h = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60), s = t % 60
  return h > 0 ? `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}` : `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`
}

function phaseLabel(p: FlightPhase) { return ({ taxiing:'TAKEOFF', cruising:'CRUISE', descending:'DESCENT', landed:'LANDED', boarding:'' })[p] }

function phaseAlt(p: FlightPhase, prog: number): number {
  if (p === 'taxiing') return Math.round((prog / PHASE_THRESHOLDS.cruising) * 35000)
  if (p === 'cruising') return 35000
  if (p === 'descending') return Math.round((1 - (prog - PHASE_THRESHOLDS.descending) / (1 - PHASE_THRESHOLDS.descending)) * 35000)
  return 0
}

function calcSpd(prog: number, p: FlightPhase): number {
  if (p === 'taxiing') return Math.round((prog / PHASE_THRESHOLDS.cruising) * 850)
  if (p === 'cruising') return 850 + Math.round(Math.sin(prog * Math.PI * 4) * 15)
  if (p === 'descending') return Math.round((1 - ((prog - PHASE_THRESHOLDS.descending) / (1 - PHASE_THRESHOLDS.descending)) * 0.6) * 850)
  return 0
}

export function FlightView({ config, durationMinutes, todos, onLanded, onExit }: Props) {
  const { user } = useAuth()
  const { friendUserIds, acceptedFriends, getFriendUserId } = useFriends(user?.id)
  const { flights: friendFlightsMap } = useFriendFlights(friendUserIds)
  const timer = useTimer(durationMinutes)
  const noise = useAmbientNoise(0.5)
  const noiseStarted = useRef(false)
  const { from, to, flightNumber, distanceKm } = config
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [volumeOpen, setVolumeOpen] = useState(false)
  const [exitConfirm, setExitConfirm] = useState(false)
  const [todoDone, setTodoDone] = useState<Set<number>>(new Set())
  const [hud, setHud] = useState<HudSettings>({ showRoute: true, showTimer: true, showPhase: true, showStats: true })
  const soundOn = noise.volume > 0
  const prevVolRef = useRef(0.5)

  useEffect(() => { timer.start(); return () => timer.stop() }, []) // eslint-disable-line
  useEffect(() => { if (timer.phase === 'landed') { const t = setTimeout(onLanded, 2000); return () => clearTimeout(t) } }, [timer.phase, onLanded])

  // Start/stop noise with timer
  useEffect(() => {
    if (timer.isRunning && soundOn) {
      if (!noiseStarted.current) {
        noise.start()
        noiseStarted.current = true
      } else {
        noise.resume()
      }
    } else if (!timer.isRunning || !soundOn) {
      noise.pause()
    }
  }, [timer.isRunning, soundOn]) // eslint-disable-line

  // Stop noise on landed or unmount
  useEffect(() => {
    if (timer.phase === 'landed') {
      noise.stop()
      noiseStarted.current = false
    }
  }, [timer.phase]) // eslint-disable-line

  // Cleanup noise on exit
  useEffect(() => {
    return () => { noise.stop(); noiseStarted.current = false }
  }, []) // eslint-disable-line

  // Upsert active flight every 5 seconds for friend tracking
  useEffect(() => {
    if (!user) return
    // Initial upsert
    upsertActiveFlight(user.id, config, durationMinutes, timer.progress, timer.phase)

    const interval = setInterval(() => {
      if (timer.phase !== 'landed') {
        upsertActiveFlight(user.id, config, durationMinutes, timer.progress, timer.phase)
      }
    }, 5000)

    return () => clearInterval(interval)
  }, [user, config, durationMinutes]) // eslint-disable-line

  // Remove active flight on landed or unmount
  useEffect(() => {
    if (timer.phase === 'landed' && user) {
      removeActiveFlight(user.id)
    }
  }, [timer.phase, user])

  useEffect(() => {
    return () => { if (user) removeActiveFlight(user.id) }
  }, []) // eslint-disable-line

  const toggleMute = () => {
    if (noise.volume > 0) {
      prevVolRef.current = noise.volume
      noise.setVolume(0)
    } else {
      noise.setVolume(prevVolRef.current || 0.5)
    }
  }

  const remaining = distanceKm - Math.round(distanceKm * timer.progress)
  const alt = phaseAlt(timer.phase, timer.progress)
  const spd = calcSpd(timer.progress, timer.phase)
  const eta = useMemo(() => new Date(Date.now() + timer.remainingMs).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }), [Math.floor(timer.remainingMs / 60000)])
  const pc = timer.phase === 'cruising' ? 'bg-emerald-400' : timer.phase === 'descending' ? 'bg-amber-400' : 'bg-sky-400'
  const toggle = (k: keyof HudSettings) => setHud(p => ({ ...p, [k]: !p[k] }))

  return (
    <div className="h-full relative overflow-hidden">
      <FlightMap from={from} to={to} progress={timer.progress} friendFlights={
        Array.from(friendFlightsMap.values()).map(f => {
          const friendship = acceptedFriends.find(af => getFriendUserId(af) === f.user_id)
          return { ...f, username: friendship?.profile.username ?? '?' }
        })
      } />

      {hud.showRoute && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3, duration: 0.6 }}
          className="absolute top-0 left-0 right-0 z-[1000] pointer-events-none">
          <div className="flex items-center justify-center pt-5 gap-4">
            <span className="text-sm font-mono font-semibold tracking-[0.25em] text-white/70 drop-shadow-[0_1px_6px_rgba(0,0,0,0.9)]">{from.code}</span>
            <div className="flex items-center gap-2">
              <div className="w-10 h-px bg-white/15" />
              <div className="w-1.5 h-1.5 rounded-full bg-sky-400 shadow-[0_0_6px_rgba(96,165,250,0.6)]" />
              <div className="w-10 h-px bg-white/15" />
            </div>
            <span className="text-sm font-mono font-semibold tracking-[0.25em] text-white/70 drop-shadow-[0_1px_6px_rgba(0,0,0,0.9)]">{to.code}</span>
          </div>
          <p className="text-center mt-1">
            <span className="text-[10px] font-mono text-white/20 drop-shadow-[0_1px_4px_rgba(0,0,0,0.9)]">{flightNumber}</span>
          </p>
        </motion.div>
      )}

      <div className="absolute top-4 right-4 z-[1001] flex items-center gap-1">
        <button
          onClick={() => timer.isRunning ? timer.pause() : timer.resume()}
          className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors"
        >
          {timer.isRunning
            ? <Pause className="w-3.5 h-3.5 text-white/25" />
            : <Play className="w-3.5 h-3.5 text-white/25" />}
        </button>
        <div className="relative">
          <button
            onClick={() => { setVolumeOpen(v => !v); setSettingsOpen(false) }}
            onContextMenu={e => { e.preventDefault(); toggleMute() }}
            className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors"
            title="볼륨 조절 (우클릭: 음소거)"
          >
            {soundOn
              ? <Volume2 className="w-3.5 h-3.5 text-white/25" />
              : <VolumeX className="w-3.5 h-3.5 text-white/25" />}
          </button>
        </div>
        <button onClick={() => { setSettingsOpen(v => !v); setVolumeOpen(false) }} className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors">
          <Settings className="w-3.5 h-3.5 text-white/25" />
        </button>
        <button onClick={() => { setExitConfirm(true); setSettingsOpen(false); setVolumeOpen(false) }} className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors">
          <X className="w-3.5 h-3.5 text-white/25" />
        </button>
      </div>

      <AnimatePresence>
        {volumeOpen && (
          <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} transition={{ duration: 0.2 }}
            className="absolute top-14 right-4 z-[1001] glass-card rounded-lg p-3 min-w-[160px]">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[9px] font-mono text-white/30 tracking-wider">VOLUME</p>
              <button onClick={toggleMute} className="text-[9px] font-mono text-white/30 hover:text-white/50 transition-colors">
                {soundOn ? '음소거' : '해제'}
              </button>
            </div>
            <div className="flex items-center gap-2.5">
              <VolumeX className="w-3 h-3 text-white/20 flex-shrink-0" />
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={noise.volume}
                onChange={e => noise.setVolume(parseFloat(e.target.value))}
                className="volume-slider flex-1 h-1 appearance-none bg-white/10 rounded-full outline-none cursor-pointer"
              />
              <Volume2 className="w-3 h-3 text-white/20 flex-shrink-0" />
            </div>
            <p className="text-center text-[10px] font-mono text-white/25 mt-1.5">{Math.round(noise.volume * 100)}%</p>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {settingsOpen && (
          <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} transition={{ duration: 0.2 }}
            className="absolute top-14 right-4 z-[1001] glass-card rounded-lg p-3 min-w-[140px]">
            <p className="text-[9px] font-mono text-white/30 tracking-wider mb-2">DISPLAY</p>
            {(['showRoute','showTimer','showPhase','showStats'] as const).map(k => (
              <Toggle key={k} label={{ showRoute:'경로', showTimer:'타이머', showPhase:'페이즈', showStats:'비행 정보' }[k]} on={hud[k]} onToggle={() => toggle(k)} />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5, duration: 0.6 }}
        className="absolute bottom-0 left-0 right-0 z-[1000] pointer-events-none">
        <div className="px-7 pb-7">
          {hud.showTimer && <p className="timer-display text-6xl font-bold text-white leading-none drop-shadow-[0_2px_12px_rgba(0,0,0,0.7)]">{formatTime(timer.remainingMs)}</p>}
          {hud.showPhase && (
            <div className="flex items-center gap-2.5 mt-3.5 mb-5">
              <AnimatePresence mode="wait">
                <motion.div key={timer.phase} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-2.5">
                  <div className={`w-2 h-2 rounded-full ${pc}`} />
                  <span className="text-sm font-mono tracking-wider text-white/45 drop-shadow-[0_1px_4px_rgba(0,0,0,0.9)]">{phaseLabel(timer.phase)}</span>
                </motion.div>
              </AnimatePresence>
            </div>
          )}
          {hud.showStats && (
            <div className="flex items-center gap-8">
              <Stat label="SPD" value={`${spd}`} unit="km/h" />
              <Stat label="ALT" value={`${(alt/1000).toFixed(1)}`} unit="kft" />
              <Stat label="REM" value={`${remaining > 0 ? remaining : 0}`} unit="km" />
              <Stat label="ETA" value={eta} />
            </div>
          )}
        </div>
      </motion.div>

      {/* Todo list */}
      {todos.length > 0 && (
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.8, duration: 0.5 }}
          className="absolute top-16 left-5 z-[1000] w-[260px]">
          <div className="backdrop-blur-md bg-black/35 border border-white/[0.10] rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-3.5">
              <ListTodo className="w-4 h-4 text-white/35" />
              <span className="text-[11px] font-mono text-white/40 tracking-wider">TO-DO</span>
              <span className="text-[11px] font-mono text-white/25 ml-auto">{todoDone.size}/{todos.length}</span>
            </div>
            <div className="space-y-2">
              {todos.map((item, i) => {
                const done = todoDone.has(i)
                return (
                  <button key={i} onClick={() => setTodoDone(prev => {
                    const next = new Set(prev)
                    done ? next.delete(i) : next.add(i)
                    return next
                  })} className="w-full flex items-center gap-3 text-left group py-1">
                    {done
                      ? <CheckCircle2 className="w-4.5 h-4.5 text-emerald-400/70 flex-shrink-0" />
                      : <Circle className="w-4.5 h-4.5 text-white/25 group-hover:text-white/45 flex-shrink-0" />}
                    <span className={`text-[13px] font-mono leading-snug ${done ? 'text-white/25 line-through' : 'text-white/55'}`}>{item}</span>
                  </button>
                )
              })}
            </div>
          </div>
        </motion.div>
      )}

      {/* Exit confirmation modal */}
      <AnimatePresence>
        {exitConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 z-[2000] flex items-center justify-center bg-black/60 backdrop-blur-sm"
            onClick={() => setExitConfirm(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="bg-night-900 border-2 border-white/[0.15] rounded-2xl p-6 w-[280px]"
              onClick={e => e.stopPropagation()}
            >
              <p className="text-[14px] font-mono font-semibold text-white/80 text-center mb-2">
                비행 종료
              </p>
              <p className="text-[12px] text-white/50 text-center mb-6">
                정말로 비행을 종료하시겠습니까?
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setExitConfirm(false)}
                  className="flex-1 py-2.5 rounded-xl bg-white/[0.06] border border-white/[0.10] text-white/60 text-[12px] font-mono hover:bg-white/[0.10] transition-all"
                >
                  취소
                </button>
                <button
                  onClick={() => { timer.stop(); onExit() }}
                  className="flex-1 py-2.5 rounded-xl bg-red-500/15 border border-red-500/25 text-red-400/80 text-[12px] font-mono hover:bg-red-500/25 transition-all"
                >
                  종료
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function Stat({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <div>
      <p className="text-[11px] text-white/30 tracking-wider mb-1 drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]">{label}</p>
      <p className="text-[17px] font-mono text-white/60 leading-none drop-shadow-[0_1px_5px_rgba(0,0,0,0.9)]">
        {value}{unit && <span className="text-[12px] text-white/30 ml-0.5">{unit}</span>}
      </p>
    </div>
  )
}

function Toggle({ label, on, onToggle }: { label: string; on: boolean; onToggle: () => void }) {
  return (
    <button onClick={onToggle} className="flex items-center justify-between w-full py-1.5 group">
      <span className="text-[11px] text-white/50 group-hover:text-white/70 transition-colors">{label}</span>
      <div className={`w-7 h-4 rounded-full transition-colors relative ${on ? 'bg-sky-500/50' : 'bg-white/10'}`}>
        <div className={`absolute top-0.5 w-3 h-3 rounded-full transition-all ${on ? 'left-3.5 bg-sky-400' : 'left-0.5 bg-white/30'}`} />
      </div>
    </button>
  )
}
