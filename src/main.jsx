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
 * In an INSTALLED launch it then holds for SPLASH_MIN_MS. The reason is the OS
 * splash in front of us: Chrome composites it from the manifest icon and it is
 * gone in a fraction of a second, so a layer that retires on the first frames
 * leaves the user seeing only the OS mark — this page's own PROGRES screen
 * flashes for a few frames and reads as if it never happened. Holding it briefly
 * makes our artwork the loading screen you actually see.
 *
 * The hold is gated on display-mode:standalone, so it does NOT apply in a browser
 * tab or in the accuracy harness — both report `browser`, retire on the frames as
 * before, and no scenario can be captured as a grey rectangle.
 */
const SPLASH_MIN_MS = 600

function isStandaloneLaunch() {
  try {
    return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true
  } catch {
    return false
  }
}

function retireBootSplash() {
  const el = document.getElementById('boot-splash')
  if (!el) return
  const drop = () => {
    el.dataset.hide = '1'
    setTimeout(() => el.remove(), 260)
  }
  requestAnimationFrame(() =>
    requestAnimationFrame(() => {
      if (isStandaloneLaunch()) setTimeout(drop, SPLASH_MIN_MS)
      else drop()
    }),
  )
}
retireBootSplash()
