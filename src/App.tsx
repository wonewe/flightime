import { useState, useCallback } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Onboarding } from './components/Onboarding'
import { BoardingPass } from './components/BoardingPass'
import { FlightView } from './components/FlightView'
import { LandingComplete } from './components/LandingComplete'
import type { FlightConfig } from './types'

type Screen = 'onboarding' | 'boarding' | 'inflight' | 'landed'

export default function App() {
  const [screen, setScreen] = useState<Screen>('onboarding')
  const [config, setConfig] = useState<FlightConfig | null>(null)
  const [durationMinutes, setDurationMinutes] = useState(50)

  const handleOnboardingComplete = useCallback((c: FlightConfig) => {
    setConfig(c)
    setScreen('boarding')
  }, [])

  const handleBoard = useCallback((minutes: number) => {
    setDurationMinutes(minutes)
    setScreen('inflight')
  }, [])

  const handleLanded = useCallback(() => setScreen('landed'), [])
  const handleReset = useCallback(() => setScreen('onboarding'), [])

  return (
    <div className="h-screen w-screen bg-night-950 overflow-hidden">
      <AnimatePresence mode="wait">
        {screen === 'onboarding' && (
          <motion.div key="onboarding" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.4 }} className="h-full">
            <Onboarding onComplete={handleOnboardingComplete} />
          </motion.div>
        )}
        {screen === 'boarding' && config && (
          <motion.div key="boarding" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.4 }} className="h-full">
            <BoardingPass config={config} onBoard={handleBoard} />
          </motion.div>
        )}
        {screen === 'inflight' && config && (
          <motion.div key="inflight" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.6 }} className="h-full">
            <FlightView config={config} durationMinutes={durationMinutes} onLanded={handleLanded} onExit={handleReset} />
          </motion.div>
        )}
        {screen === 'landed' && config && (
          <motion.div key="landed" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.5 }} className="h-full">
            <LandingComplete config={config} durationMinutes={durationMinutes} onReset={handleReset} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
