import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { MotionConfig } from 'framer-motion'

import '@fontsource/poppins/latin-400.css'
import '@fontsource/poppins/latin-500.css'
import '@fontsource/poppins/latin-600.css'
import '@fontsource/poppins/latin-700.css'
import '@fontsource/poppins/latin-800.css'
import '@fontsource/cairo/arabic-400.css'
import '@fontsource/cairo/arabic-500.css'
import '@fontsource/cairo/arabic-600.css'
import '@fontsource/cairo/arabic-700.css'
import '@fontsource/cairo/arabic-800.css'
import './index.css'

import './i18n'
import App from './App'
import { ThemeProvider } from './context/ThemeContext'
import { AuthProvider } from './context/AuthContext'
import { LangProvider } from './context/LangContext'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      {/* index.css only gates the CSS `.shake`; framer-motion's transforms (the
          card rise, the error message height, the /login->/verify push) ignore
          the media query unless told to. "user" makes them animate opacity only. */}
      <MotionConfig reducedMotion="user">
        <ThemeProvider>
          <AuthProvider>
            <LangProvider>
              <App />
            </LangProvider>
          </AuthProvider>
        </ThemeProvider>
      </MotionConfig>
    </BrowserRouter>
  </StrictMode>,
)

/**
 * Retire the cold-start splash from index.html.
 *
 * Two animation frames, not a timeout: the first rAF fires when the browser has
 * decided to paint, the second when that paint is actually on screen, so the
 * splash is never removed over an empty #root. The fade is the CSS transition on
 * [data-hide]; the node is removed after it so it cannot catch clicks.
 *
 * This has to be prompt rather than a fixed "minimum splash time": the accuracy
 * harness screenshots each route after load, and a splash still covering the page
 * would render every scenario as a grey rectangle.
 */
function retireBootSplash() {
  const el = document.getElementById('boot-splash')
  if (!el) return
  requestAnimationFrame(() =>
    requestAnimationFrame(() => {
      el.dataset.hide = '1'
      setTimeout(() => el.remove(), 260)
    }),
  )
}
retireBootSplash()
