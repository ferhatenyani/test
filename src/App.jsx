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
   * No `exit` for the tab pages: giving them an empty exit makes removal immediate
   * instead of stalling the incoming page for the length of a fade-out.
   *
   * The push gets its own shorter duration. Measured with mode="wait" the auth push
   * was click -> 307ms of exit -> a ~58ms frame where the old page had unmounted and
   * the new one was still parked at x:100% -> 43ms of enter, so ~410ms with a visible
   * stall in the middle. That two-stage gap is the "stutter"; the donor's push reads
   * as instant because both pages move at once.
   */
  const isPush = PUSH.has(path)
  const variants = isPush
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
      {/*
        grid + one shared cell, not a stack: the two route pages have to occupy the
        SAME cell for mode="sync" to be safe. Without it the document briefly held
        two .app-shell { min-height: 100dvh } boxes — measured 1562 CSS px tall at a
        780 viewport, which is what made sync unacceptable before.

        grid-cols-[minmax(0,1fr)] is load-bearing, not decoration. A bare `grid`
        sizes its auto column to the item's min-content width, and the timetable
        page's day strip is wider than the screen, so the column grew to 683.1 CSS
        px and every full-width element on every Service page reported that width
        (svcHeader/svcBand/svcTitle/svcDayStrip all Δ323 red). minmax(0,…) lets the
        track shrink back to the container.

        overflow-clip, NOT overflow-hidden: the incoming page starts at x:100%, which
        overflows this box, and `hidden` makes it a scroll container — the browser
        then scrolls it when the OTP field autofocuses (measured: the whole stack
        shifted -214 CSS px mid-push). `clip` paints the same and is not scrollable.

        sync, not wait. `wait` holds the incoming page until the outgoing one has
        finished leaving, which measured as click -> 307ms exit -> a ~58ms frame with
        nothing on screen -> enter: ~410ms with a visible stall in the middle. That
        stall is the "stutter". The donor reads as instant because both pages move at
        once. (popLayout was tried first and rejected: its layout projection animates
        the exiting element's own position and fights the explicit x slide.)
      */}
      <div className="grid grid-cols-[minmax(0,1fr)] overflow-clip">
        <AnimatePresence initial={false} mode="sync">
          <motion.div
            key={path}
            {...variants}
            transition={{
              type: 'tween',
              duration: isPush ? 0.18 : 0.26,
              ease: [0.22, 0.61, 0.36, 1],
            }}
            className="app-shell col-start-1 row-start-1"
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
      </div>
      {onTab && <BottomNav />}
    </>
  )
}

export default function App() {
  return <AnimatedRoutes />
}
