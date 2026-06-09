import { createContext, useContext, useState, useCallback } from 'react'

const SCALE_KEY = 'ui-scale'
const VALID_SCALES = [0.85, 1.0, 1.15]

function getInitialScale(): number {
  const stored = localStorage.getItem(SCALE_KEY)
  if (!stored) return 1.0
  const val = parseFloat(stored)
  return VALID_SCALES.includes(val) ? val : 1.0
}

interface UIScaleContextValue {
  scale: number
  setScale: (s: number) => void
}

const UIScaleContext = createContext<UIScaleContextValue>({ scale: 1, setScale: () => {} })

export function UIScaleProvider({ children }: { children: React.ReactNode }) {
  const [scale, setScaleState] = useState(getInitialScale)

  const setScale = useCallback((s: number) => {
    setScaleState(s)
    localStorage.setItem(SCALE_KEY, String(s))
  }, [])

  return (
    <UIScaleContext.Provider value={{ scale, setScale }}>
      <div
        style={{
          transform: `scale(${scale})`,
          transformOrigin: '0 0',
          width: `${100 / scale}vw`,
          height: `${100 / scale}vh`,
          overflow: 'hidden',
        }}
      >
        {children}
      </div>
    </UIScaleContext.Provider>
  )
}

export function useUIScale() {
  return useContext(UIScaleContext)
}
