import { useState, useCallback, useEffect, useRef } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useAuth } from './contexts/AuthContext'
import { AuthScreen } from './components/AuthScreen'
import { HomeScreen } from './components/HomeScreen'
import { BoardingPass } from './components/BoardingPass'
import { FlightView } from './components/FlightView'
import { LandingComplete } from './components/LandingComplete'
import { saveTripSupabase, migrateLocalTrips } from './utils/tripHistorySupabase'
import { useOnlinePresence } from './hooks/useOnlinePresence'
import type { FlightConfig, PresenceState } from './types'

type Screen = 'home' | 'boarding' | 'inflight' | 'landed'

export default function App() {
  const { user, loading } = useAuth()
  const [screen, setScreen] = useState<Screen>('home')
  const [config, setConfig] = useState<FlightConfig | null>(null)
  const [durationMinutes, setDurationMinutes] = useState(50)
  const [todos, setTodos] = useState<string[]>([])
  const migrated = useRef(false)
  const [presenceMap, setPresenceMap] = useState<Map<string, PresenceState>>(new Map())

  const presenceStatus = screen === 'inflight' ? 'flying' as const : 'online' as const
  useOnlinePresence(
    user?.id,
    user?.user_metadata?.username,
    presenceStatus,
    setPresenceMap,
  )

  // Migrate localStorage trips on first login
  useEffect(() => {
    if (user && !migrated.current) {
      migrated.current = true
      migrateLocalTrips(user.id)
    }
  }, [user])

  const handleFlightConfigured = useCallback((c: FlightConfig) => {
    setConfig(c)
    setScreen('boarding')
  }, [])

  const handleBoard = useCallback((minutes: number, todoItems: string[]) => {
    setDurationMinutes(minutes)
    setTodos(todoItems)
    setScreen('inflight')
  }, [])

  const handleLanded = useCallback(() => {
    if (config && user) {
      saveTripSupabase(user.id, config, durationMinutes)
    }
    setScreen('landed')
  }, [config, durationMinutes, user])

  const handleGoHome = useCallback(() => {
    setConfig(null)
    setScreen('home')
  }, [])

  if (loading) {
    return (
      <div className="h-full w-full bg-night-950 flex items-center justify-center">
        <div className="text-white/20 text-[12px] font-mono tracking-widest">LOADING...</div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="h-full w-full bg-night-950 overflow-hidden">
        <AuthScreen />
      </div>
    )
  }

  return (
    <div className="h-full w-full bg-night-950 overflow-hidden">
      <AnimatePresence mode="wait">
        {screen === 'home' && (
          <motion.div key="home" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.4 }} className="h-full">
            <HomeScreen onFlightConfigured={handleFlightConfigured} presenceMap={presenceMap} />
          </motion.div>
        )}
        {screen === 'boarding' && config && (
          <motion.div key="boarding" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.4 }} className="h-full">
            <BoardingPass config={config} onBoard={handleBoard} />
          </motion.div>
        )}
        {screen === 'inflight' && config && (
          <motion.div key="inflight" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.6 }} className="h-full">
            <FlightView config={config} durationMinutes={durationMinutes} todos={todos} onLanded={handleLanded} onExit={handleGoHome} />
          </motion.div>
        )}
        {screen === 'landed' && config && (
          <motion.div key="landed" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.5 }} className="h-full">
            <LandingComplete config={config} durationMinutes={durationMinutes} onReset={handleGoHome} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
