import { createContext, useContext, useState, useCallback, useEffect } from 'react'

type Theme = 'dark' | 'light'

const THEME_KEY = 'theme'
const VALID_THEMES: Theme[] = ['dark', 'light']

function getInitialTheme(): Theme {
  const stored = localStorage.getItem(THEME_KEY)
  if (stored && VALID_THEMES.includes(stored as Theme)) return stored as Theme
  return 'dark'
}

interface ThemeContextValue {
  theme: Theme
  setTheme: (t: Theme) => void
}

const ThemeContext = createContext<ThemeContextValue>({ theme: 'dark', setTheme: () => {} })

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(getInitialTheme)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t)
    localStorage.setItem(THEME_KEY, t)
  }, [])

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  return useContext(ThemeContext)
}
