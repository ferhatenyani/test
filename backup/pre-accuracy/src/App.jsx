import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import ProtectedRoute from './routes/ProtectedRoute'
import Login from './pages/Login'
import Verify from './pages/Verify'
import Home from './pages/Home'
import Cards from './pages/Cards'
import Profile from './pages/Profile'
import Service from './pages/Service'
import { useAuth } from './context/AuthContext'

/*
 * The reference video ends with the 2FA page pushing in over the login page, so
 * the auth flow gets a horizontal push. The tabbed area and service pages switch
 * with a fade — the bottom nav in the captures changes instantly, and sliding
 * those would fight the nav's own pill animation.
 */
const PUSH = new Set(['/login', '/verify'])

function AnimatedRoutes() {
  const location = useLocation()
  const { signedIn } = useAuth()
  const path = location.pathname

  const variants = PUSH.has(path)
    ? {
        initial: { x: '100%', opacity: 0.4 },
        animate: { x: 0, opacity: 1 },
        exit: { x: '-18%', opacity: 0.35 },
      }
    : {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
      }

  return (
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
  )
}

export default function App() {
  return <AnimatedRoutes />
}
