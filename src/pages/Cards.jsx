import { useEffect, useRef, useState } from 'react'
import { animate, motion, useMotionValue } from 'framer-motion'
import { useTranslation } from 'react-i18next'

// ========== ADJUSTABLE SETTINGS ==========
const SNAP_THRESHOLD = 45 // Degrees - below this, snap back to current face
const DEAD_ZONE = 10 // Pixels - minimum drag before rotation starts
// =========================================

/**
 * One spring for every settle — drag, tap and cancel alike — so a tap rotates the
 * card exactly as a swipe of the same distance does, instead of being a second
 * hand-tuned animation that drifts out of sync with the first.
 */
const SPRING = { type: 'spring', stiffness: 300, damping: 30, velocity: 0 }

/**
 * Drag-to-flip choreography copied verbatim from old/webetu/src/pages/MyCards.jsx
 * (PLAN.md D12): same thresholds, same 180deg/screen-width sensitivity, same
 * spring, same ref-based drag state that sidesteps React batching. Only the card
 * faces changed — real artwork is a drop-in replacement for the two mock divs.
 */
export default function Cards() {
  const [screenWidth, setScreenWidth] = useState(
    typeof window !== 'undefined' ? window.innerWidth : 1000,
  )

  const isDraggingRef = useRef(false)
  const isAnimatingRef = useRef(false)
  const isTapRef = useRef(true)
  const startXRef = useRef(0)
  const baseRotationRef = useRef(0) // The "settled" rotation (0, 180, 360, etc.)
  const cardRef = useRef(null)

  const rotation = useMotionValue(0)
  const dragSensitivity = 180 / screenWidth

  const { t } = useTranslation()

  useEffect(() => {
    const handleResize = () => setScreenWidth(window.innerWidth)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const beginDrag = (clientX) => {
    if (isAnimatingRef.current) return
    isDraggingRef.current = true
    isTapRef.current = true
    startXRef.current = clientX
  }

  const moveDrag = (clientX) => {
    if (!isDraggingRef.current || isAnimatingRef.current) return

    const deltaX = clientX - startXRef.current

    let effectiveDelta = 0
    if (Math.abs(deltaX) > DEAD_ZONE) {
      effectiveDelta = deltaX > 0 ? deltaX - DEAD_ZONE : deltaX + DEAD_ZONE
      isTapRef.current = false
    }

    const rotationDelta = effectiveDelta * dragSensitivity
    const clampedDelta = Math.max(-180, Math.min(180, rotationDelta))

    rotation.set(baseRotationRef.current + clampedDelta)
  }

  /**
   * Settles a drag onto the next face, or — when the gesture never left the dead
   * zone, so it was a TAP — flips to the next face in the direction of the half
   * that was touched. Tapping the right half rotates the same way a rightward
   * swipe does (+180), the left half the same way a leftward swipe does (-180).
   *
   * Both branches land in the single animate() below, which is the point of the
   * shape: a tap must be indistinguishable from the swipe it imitates, so it gets
   * the same spring, the same ±180 target and the same commit of
   * baseRotationRef.onComplete.
   */
  const settleDrag = (tapX = null) => {
    if (!isDraggingRef.current || isAnimatingRef.current) return
    isDraggingRef.current = false

    const currentRotation = rotation.get()
    const dragDelta = currentRotation - baseRotationRef.current
    const absAngle = Math.abs(dragDelta)

    let targetRotation
    if (isTapRef.current && tapX !== null) {
      const box = cardRef.current?.getBoundingClientRect()
      const centre = box ? box.left + box.width / 2 : screenWidth / 2
      targetRotation = baseRotationRef.current + (tapX >= centre ? 180 : -180)
    } else if (absAngle >= SNAP_THRESHOLD) {
      targetRotation = baseRotationRef.current + (dragDelta > 0 ? 180 : -180)
    } else {
      targetRotation = baseRotationRef.current
    }

    isAnimatingRef.current = true
    animate(rotation, targetRotation, {
      ...SPRING,
      onComplete: () => {
        baseRotationRef.current = targetRotation
        isAnimatingRef.current = false
      },
    })
  }

  const cancelDrag = () => {
    if (!isDraggingRef.current) return
    isDraggingRef.current = false
    isAnimatingRef.current = true
    animate(rotation, baseRotationRef.current, {
      ...SPRING,
      onComplete: () => {
        isAnimatingRef.current = false
      },
    })
  }

  const handleTouchStart = (e) => {
    e.preventDefault()
    beginDrag(e.touches[0].clientX)
  }
  const handleTouchMove = (e) => {
    e.preventDefault()
    moveDrag(e.touches[0].clientX)
  }
  const handleTouchEnd = (e) => {
    e.preventDefault()
    settleDrag(e.changedTouches?.[0]?.clientX ?? null)
  }

  // Mouse parity so the flip is testable on a desktop browser / Playwright.
  const handleMouseDown = (e) => {
    e.preventDefault()
    beginDrag(e.clientX)
    const onMove = (ev) => moveDrag(ev.clientX)
    const onUp = (ev) => {
      settleDrag(ev.clientX)
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  return (
    <div className="h-[100dvh] bg-app flex flex-col overflow-hidden">
      <div className="flex-1 flex items-start justify-center px-4 pt-[max(12px,env(safe-area-inset-top))] pb-[120px]">
        <div
          data-testid="card-stage"
          className="relative w-[80vw] h-[65vh] [perspective:1200px]"
        >
          <motion.div
            ref={cardRef}
            data-testid="card"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onTouchCancel={cancelDrag}
            onMouseDown={handleMouseDown}
            style={{
              rotateY: rotation,
              WebkitUserSelect: 'none',
              WebkitTouchCallout: 'none',
              WebkitTapHighlightColor: 'transparent',
            }}
            className="w-full h-full [transform-style:preserve-3d] [transform-origin:center] touch-none select-none"
          >
            {/* Front face (recto) - visible at rotateY(0deg) */}
            <div
              className="absolute inset-0 [backface-visibility:hidden] drop-shadow-2xl flex items-center justify-center"
              style={{ transform: 'rotateY(0deg)' }}
            >
              <div className="relative h-full aspect-[429/691] rounded-2xl overflow-hidden bg-card border border-hairline grid place-items-center">
                <span className="text-[15px] font-extrabold tracking-[0.2em] text-muted">
                  {t('cards.front')}
                </span>
              </div>
            </div>

            {/* Back face (verso) - visible at rotateY(180deg) */}
            <div
              className="absolute inset-0 [backface-visibility:hidden] drop-shadow-2xl flex items-center justify-center"
              style={{ transform: 'rotateY(180deg)' }}
            >
              <div className="relative h-full aspect-[429/691] rounded-2xl overflow-hidden bg-tile grid place-items-center">
                <span className="text-[15px] font-extrabold tracking-[0.2em] text-white">
                  {t('cards.back')}
                </span>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
