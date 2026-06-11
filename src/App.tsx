import { useState, useCallback, useEffect, useRef } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Toaster, toast } from 'sonner'
import { useAuth } from './contexts/AuthContext'
import { AuthScreen } from './components/AuthScreen'
import { HomeScreen } from './components/HomeScreen'
import { BoardingPass } from './components/BoardingPass'
import { FlightView } from './components/FlightView'
import { LandingComplete } from './components/LandingComplete'
import { saveTripSupabase, migrateLocalTrips } from './utils/tripHistorySupabase'
import { useOnlinePresence } from './hooks/useOnlinePresence'
import { useFlightInvites } from './hooks/useFlightInvites'
import { useMileage } from './hooks/useMileage'
import { MILEAGE_PER_MINUTE } from './constants/unlockCosts'
import { AIRPORTS, AIRCRAFT } from './constants'
import { haversineDistance } from './utils/geo'
import type { FlightConfig, FlightInvite, PresenceState } from './types'

type Screen = 'home' | 'boarding' | 'inflight' | 'landed'

export default function App() {
  const { user, loading } = useAuth()
  const [screen, setScreen] = useState<Screen>('home')
  const [config, setConfig] = useState<FlightConfig | null>(null)
  const [durationMinutes, setDurationMinutes] = useState(50)
  const [todos, setTodos] = useState<string[]>([])
  const migrated = useRef(false)
  const [presenceMap, setPresenceMap] = useState<Map<string, PresenceState>>(new Map())

  const mileage = useMileage(user?.id)

  const presenceStatus = screen === 'inflight' ? 'flying' as const : 'online' as const
  useOnlinePresence(
    user?.id,
    user?.user_metadata?.username,
    presenceStatus,
    setPresenceMap,
  )

  const handleFlightInvite = useCallback((invite: FlightInvite) => {
    toast(`${invite.fromUsername}님이 ${invite.fromCode} → ${invite.toCode} 비행에 초대했습니다`, {
      duration: 5000,
    })
  }, [])

  const { sendInvite, pendingInvites, dismissInvite } = useFlightInvites(user?.id, handleFlightInvite)

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

  const handleAcceptInvite = useCallback((invite: FlightInvite) => {
    const fromAirport = AIRPORTS.find(a => a.code === invite.fromCode)
    const toAirport = AIRPORTS.find(a => a.code === invite.toCode)
    const aircraft = AIRCRAFT.find(a => a.id === invite.aircraftId)
    if (!fromAirport || !toAirport || !aircraft) return

    const seatLetters = ['A', 'C', 'F']
    const seat = `${Math.floor(Math.random() * 30) + 1}${seatLetters[Math.floor(Math.random() * seatLetters.length)]}`

    const flightConfig: FlightConfig = {
      from: fromAirport,
      to: toAirport,
      aircraft,
      seat,
      distanceKm: Math.round(haversineDistance(fromAirport, toAirport)),
      flightNumber: invite.flightNumber,
    }

    dismissInvite(invite.fromUserId)
    handleFlightConfigured(flightConfig)
  }, [dismissInvite, handleFlightConfigured])

  const handleBoard = useCallback((minutes: number, todoItems: string[]) => {
    setDurationMinutes(minutes)
    setTodos(todoItems)
    setScreen('inflight')
  }, [])

  const handleLanded = useCallback(() => {
    if (config && user) {
      saveTripSupabase(user.id, config, durationMinutes)
      mileage.earn(durationMinutes * MILEAGE_PER_MINUTE)
    }
    setScreen('landed')
  }, [config, durationMinutes, user, mileage])

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
      <Toaster
        position="top-center"
        toastOptions={{
          style: {
            background: '#1a1f2e',
            color: 'rgba(255,255,255,0.85)',
            border: '1px solid rgba(255,255,255,0.1)',
            fontSize: '13px',
            fontFamily: 'monospace',
          },
        }}
      />
      <AnimatePresence mode="wait">
        {screen === 'home' && (
          <motion.div key="home" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.4 }} className="h-full">
            <HomeScreen onFlightConfigured={handleFlightConfigured} presenceMap={presenceMap} mileageBalance={mileage.balance} unlockedAirports={mileage.unlockedAirports} unlockedAircraft={mileage.unlockedAircraft} onUnlock={mileage.unlock} sendFlightInvite={sendInvite} pendingFlightInvites={pendingInvites} onAcceptFlightInvite={handleAcceptInvite} onDismissFlightInvite={dismissInvite} />
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
            <LandingComplete config={config} durationMinutes={durationMinutes} onReset={handleGoHome} earnedMiles={durationMinutes * MILEAGE_PER_MINUTE} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
