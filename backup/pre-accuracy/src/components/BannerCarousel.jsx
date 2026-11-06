import { useCallback, useEffect, useRef, useState } from 'react'
import { animate, motion, useMotionValue } from 'framer-motion'
import { useTranslation } from 'react-i18next'

const SLIDES = ['/assets/banner-1-studentcamp.png', '/assets/banner-2-matricule.png']

/**
 * Two banners, manual swipe only (no autoplay).
 *
 * The drag is owned here rather than by framer's `drag` prop: animating the same
 * motion value that framer owns left its drag origin stale, so a second gesture
 * clamped and the carousel looked stuck.
 *
 * Gestures use window-scoped listeners and refs, not element handlers closing
 * over React state. An element handler + setPointerCapture combination dropped
 * the reverse swipe entirely (forward worked, backward never did), and a
 * `x.set()` effect on index change fought the snap animation.
 *
 * Track is pinned LTR; the reference shows the same first banner in Arabic.
 */
export default function BannerCarousel() {
  const [index, setIndex] = useState(0)
  const [width, setWidth] = useState(0)
  const indexRef = useRef(0)
  const widthRef = useRef(0)
  const dragging = useRef(false)
  const viewportRef = useRef(null)
  const x = useMotionValue(0)
  const { t } = useTranslation()

  useEffect(() => {
    const el = viewportRef.current
    if (!el) return
    const apply = (w) => {
      if (!w) return
      widthRef.current = w
      setWidth(w)
      x.set(-indexRef.current * w)
    }
    const ro = new ResizeObserver(([entry]) => apply(entry.contentRect.width))
    ro.observe(el)
    apply(el.clientWidth)
    return () => ro.disconnect()
  }, [x])

  const goTo = useCallback(
    (next) => {
      const w = widthRef.current
      const clamped = Math.max(0, Math.min(SLIDES.length - 1, next))
      indexRef.current = clamped
      setIndex(clamped)
      if (!w) return
      animate(x, -clamped * w, { type: 'tween', duration: 0.26, ease: 'easeOut' })
    },
    [x],
  )

  const onPointerDown = (e) => {
    const w = widthRef.current
    if (!w || dragging.current) return
    if (e.button !== undefined && e.button !== 0) return

    dragging.current = true
    const start = {
      x0: e.clientX,
      lastX: e.clientX,
      lastT: performance.now(),
      vel: 0,
      base: -indexRef.current * w,
    }
    const min = -(SLIDES.length - 1) * w

    const move = (ev) => {
      const now = performance.now()
      const dt = Math.max(1, now - start.lastT)
      start.vel = (ev.clientX - start.lastX) / dt
      start.lastX = ev.clientX
      start.lastT = now

      let target = start.base + (ev.clientX - start.x0)
      // Rubber-band past the ends instead of stopping dead.
      if (target > 0) target *= 0.35
      else if (target < min) target = min + (target - min) * 0.35
      x.set(target)
    }

    const end = (ev) => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', end)
      window.removeEventListener('pointercancel', end)
      dragging.current = false

      const delta = ev.clientX - start.x0
      const flick = start.vel * 1000
      const passed = Math.abs(delta) > w * 0.16 || Math.abs(flick) > 420
      goTo(passed ? indexRef.current + (delta < 0 ? 1 : -1) : indexRef.current)
    }

    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', end)
    window.addEventListener('pointercancel', end)
  }

  return (
    <div>
      <div
        ref={viewportRef}
        data-testid="banner-viewport"
        dir="ltr"
        onPointerDown={onPointerDown}
        className="relative overflow-hidden rounded-[18px] touch-pan-y select-none"
      >
        <motion.div className="flex will-change-transform" style={{ x }}>
          {SLIDES.map((src, i) => (
            <img
              key={src}
              src={src}
              alt={t('home.bannerAlt', { index: i + 1, total: SLIDES.length })}
              draggable={false}
              className="w-full shrink-0 pointer-events-none"
            />
          ))}
        </motion.div>
      </div>

      <div className="flex justify-center items-center gap-1.5 mt-3" dir="ltr">
        {SLIDES.map((_, i) => (
          <button
            key={i}
            type="button"
            data-testid={`banner-dot-${i}`}
            aria-label={t('home.goToBanner', { index: i + 1 })}
            aria-current={i === index}
            onClick={() => goTo(i)}
            className={`h-[7px] rounded-full transition-all duration-200 ${
              i === index ? 'w-[13px] bg-brand' : 'w-[7px] bg-muted/45'
            }`}
          />
        ))}
      </div>
    </div>
  )
}
