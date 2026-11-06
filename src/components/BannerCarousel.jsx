import { useCallback, useEffect, useRef, useState } from 'react'
import { animate, motion, useMotionValue } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { useLang } from '../context/LangContext'

/**
 * Slides per language, MEASURED rather than assumed. Comparing the dark EN and
 * AR captures inside the banner ink box (519x151 device px, 78,369 px):
 *   slide 1  meanΔ 0.00, 0.0% of pixels differ  -> same artwork, one asset
 *   slide 2  meanΔ 73.4, 93.1% of pixels differ  -> the donor really ships an
 *                                              Arabic matricule card
 * So only slide 2 has an AR variant. An AR slide-1 asset would be a duplicate
 * invented to make the code look mirrored, which is the same false-mirror
 * mistake already refuted for the tile grid and the field icon.
 */
const SLIDE_1 = '/assets/banner-1-studentcamp.png'
const slidesFor = (lang) =>
  lang === 'ar'
    ? [SLIDE_1, '/assets/banner-2-matricule-ar.png']
    : [SLIDE_1, '/assets/banner-2-matricule.png']

/**
 * Two banners, manual swipe only (no autoplay).
 *
 * Geometry transcribed from the a394 home captures with scripts/qa/pxprobe.mjs
 * (device px ÷ 1.5): viewport 24,111 346x101, radius 10 — the corner arc puts
 * the top edge 4 CSS px lower at x=26 than at x=34, which only fits r≈10.
 * Dots are 8x8 with a 16x8 active pill, 8 apart, so the pair spans 181..213
 * centred on x=197; the strip sits at y 222.5..230.5, 10.5 below the banner.
 * Active #009577, inactive #cbcbcb — the same grey in both themes, so it is a
 * solid colour and not bg-muted/45 (which lands near #4f525c in dark).
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
  // The value is unread (the track position comes from widthRef and the motion
  // value), but setWidth still fires the post-measure render, so the binding is
  // dropped rather than the state deleted — no behaviour change.
  const [, setWidth] = useState(0)
  const indexRef = useRef(0)
  const widthRef = useRef(0)
  const dragging = useRef(false)
  const viewportRef = useRef(null)
  const x = useMotionValue(0)
  const { t } = useTranslation()
  const { lang } = useLang()
  const slides = slidesFor(lang)

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
      const clamped = Math.max(0, Math.min(slides.length - 1, next))
      indexRef.current = clamped
      setIndex(clamped)
      if (!w) return
      animate(x, -clamped * w, { type: 'tween', duration: 0.26, ease: 'easeOut' })
    },
    [x, slides.length],
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
    const min = -(slides.length - 1) * w

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
    <div data-qa="bannerRoot">
      <div
        ref={viewportRef}
        data-qa="bannerViewport"
        data-testid="banner-viewport"
        dir="ltr"
        onPointerDown={onPointerDown}
        className="relative h-[101px] w-full touch-pan-y select-none overflow-hidden rounded-[10px]"
      >
        <motion.div data-qa="bannerTrack" className="flex h-full will-change-transform" style={{ x }}>
          {slides.map((src, i) => (
            <img
              key={src}
              data-qa={`bannerSlide-${i}`}
              src={src}
              alt={t('home.bannerAlt', { index: i + 1, total: slides.length })}
              draggable={false}
              className="h-full w-full shrink-0 object-cover pointer-events-none"
            />
          ))}
        </motion.div>
      </div>

      <div
        data-qa="bannerDots"
        dir="ltr"
        className="mt-[10.5px] flex items-center justify-center gap-[8px]"
      >
        {slides.map((_, i) => (
          <button
            key={i}
            type="button"
            data-qa={`bannerDot-${i}`}
            data-testid={`banner-dot-${i}`}
            aria-label={t('home.goToBanner', { index: i + 1 })}
            aria-current={i === index}
            onClick={() => goTo(i)}
            className={`h-[8px] rounded-[4px] transition-all duration-200 ${
              i === index ? 'w-[16px] bg-[#009577]' : 'w-[8px] bg-[#cbcbcb]'
            }`}
          />
        ))}
      </div>
    </div>
  )
}
