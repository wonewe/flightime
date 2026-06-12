import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { AuthProvider } from './contexts/AuthContext'
import { UIScaleProvider } from './contexts/UIScaleContext'
import { ThemeProvider } from './contexts/ThemeContext'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AuthProvider>
      <UIScaleProvider>
        <ThemeProvider>
          <App />
        </ThemeProvider>
      </UIScaleProvider>
    </AuthProvider>
  </React.StrictMode>,
)
