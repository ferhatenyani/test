import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import ProtectedRoute from './routes/ProtectedRoute'
import Login from './pages/Login'
import Verify from './pages/Verify'
import Home from './pages/Home'
import Cards from './pages/Cards'
import Profile from './pages/Profile'
import Service from './pages/Service'
import BottomNav from './components/BottomNav'
import { useAuth } from './context/AuthContext'

/*
 * The reference video ends with the 2FA page pushing in over the login page, so
 * the auth flow gets a horizontal push. The tabbed area and service pages switch
 * with a fade — the bottom nav in the captures changes instantly, and sliding
 * those would fight the nav's own pill animation.
 */
const PUSH = new Set(['/login', '/verify'])

/**
 * The nav is rendered HERE, not by the pages. It used to be a `<BottomNav />` at
 * the end of Home/Cards/Profile, which put it inside the keyed motion.div below:
 * every tab change unmounted the nav, waited out the exit, then remounted it — the
 * "full refresh where even the bottom nav disappears" the captures do not show,
 * and the reason `layoutId="activeTab"` could never glide. Kept as an explicit
 * set rather than "any protected route", because Service has no nav.
 */
const TABS = ['/home', '/cards', '/profile']

function AnimatedRoutes() {
  const location = useLocation()
  const { signedIn } = useAuth()
  const path = location.pathname
  const onTab = TABS.some((t) => path.startsWith(t))

  /*
   * No `exit` for the tab pages. AnimatePresence runs in mode="wait", so an
   * exiting element is awaited before the next one mounts; giving the tabs an
   * empty exit makes removal immediate instead of stalling the incoming page for
   * the length of a fade-out. A cross-fade (mode="sync") was the other option and
   * is rejected: both pages carry .app-shell { min-height: 100dvh }, so for the
   * overlap window the document is briefly 200dvh tall.
   */
  const variants = PUSH.has(path)
    ? {
        initial: { x: '100%', opacity: 0.4 },
        animate: { x: 0, opacity: 1 },
        exit: { x: '-18%', opacity: 0.35 },
      }
    : {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
      }

  return (
    <>
      <AnimatePresence initial={false} mode="wait">
        <motion.div
          key={path}
          {...variants}
          transition={{ type: 'tween', duration: 0.26, ease: [0.22, 0.61, 0.36, 1] }}
          className="app-shell"
        >
          <Routes location={location}>
            <Route path="/" element={<Navigate to={signedIn ? '/home' : '/login'} replace />} />
            <Route path="/login" element={<Login />} />
            <Route path="/verify" element={<Verify />} />
            <Route element={<ProtectedRoute />}>
              <Route path="/home" element={<Home />} />
              <Route path="/cards" element={<Cards />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/service/:slug" element={<Service />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </motion.div>
      </AnimatePresence>
      {onTab && <BottomNav />}
    </>
  )
}

export default function App() {
  return <AnimatedRoutes />
}
