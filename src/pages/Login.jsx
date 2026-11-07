import { useLayoutEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, animate, useMotionValue } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import Field from '../components/Field'
import Button from '../components/Button'
import useKeyboardInset from '../hooks/useKeyboardInset'
import { LockIcon, UserIcon } from '../components/icons'

const rise = { initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 } }

/**
 * On-screen keyboard choreography, measured from
 * screenshots/WhatsApp Video 2026-10-25 at 18.56.13.mp4 with scripts/qa/kbanim.mjs
 * (384x832, ~1x CSS) and cross-checked against the a360 keyboard-up captures
 * 18.25.55 / 18.25.56. Numbers are the video's, in its own px:
 *
 *   rest        logo card top 96, width 268, band 46..157, form card top 368
 *   keyboard up logo card top 82, width 158 (scale 0.586), band GONE, form top 240
 *
 * The scale target here is the CAPTURE's 0.65 (card h 162.5 -> 106, title ink
 * 15.5 -> 10, both 0.65), not the video's 0.586 — the QA gate is pinned to the
 * captures, and the two devices differ. The video contributes the TIMING:
 *   appear  t 1.287 -> 1.555 (0.27s): form card leads (home by frame 28), scale trails
 *   dismiss t 2.073 -> 2.357 (0.28s): scale passes rest by +4.5% (268 -> 284)
 *   So the bounce is on the way BACK only; the appear side never undershoots.
 */
/**
 * Direction matters: the appear ramp never
 * undershoots and only the dismiss passes rest, so ONE spring cannot serve both.
 * The single 420/28 that used to do both bounced on the way IN as well — measured
 * on this page at 1 -> 0.6317 -> 0.65 settling in ~450ms — and that wobble is what
 * the eye reads as "not smooth". Critical damping (damping = 2*sqrt(stiffness)) is
 * the fastest settle with no overshoot and lands in ~0.30s at these stiffnesses,
 * i.e. the capture's 0.27s. The form card LEADS and the header TRAILS (the frame
 * order in the video), so the form is the stiffer pair; the card lands and holds
 * in both directions, so only the header ever bounces.
 */
// Was 0.65 (from 18.25.56, the "open dial" in qa/HANDOFF.md §2). Three later
// reads of the same state agree it is lower: target.jpeg measures the lifted card
// 174 wide (174/273.5 = 0.636) and 100 tall (100/162.25 = 0.616), and
// loginKeyboardActive.jpeg 103/162.25 = 0.635. 0.63 is the centre of that band;
// at 0.65 the lifted card top sat 8.7 CSS px below the donor's.
const KB_SCALE = 0.63
// Air the donor leaves between the scaled underline and the lifted card.
const HEADER_GAP = 6
const HEADER_APPEAR = { type: 'spring', stiffness: 620, damping: 50 } // 2*sqrt(620) = 49.8
const HEADER_DISMISS = { type: 'spring', stiffness: 700, damping: 28 } // ~5% of rest, ~0.29s
const FORM_SPRING = { type: 'spring', stiffness: 760, damping: 55 } // 2*sqrt(760) = 55.1
const BAND_FADE = { duration: 0.14, ease: 'easeOut' }
const BAND_BACK = { duration: 0.22, ease: 'easeOut' }

/**
 * Status reserve. Every login capture paints the FIRST 25 CSS px with the page
 * background and starts the green band below it — `col 20 0 60` on 18.25.55
 * (EN light) reads #f5f6f8 from 0 to 24.5 then brand, and `col 20 0 160` on
 * 18.25.56 (2) (EN dark) reads #101115 from 0 to 25 then brand. The donor's web
 * view sits under the iOS status strip, so page y=0 in the capture is the top of
 * the *screen*, not the top of the app.
 *
 * The harness viewport is 360x780 — the capture's full height including that
 * strip — and `env(safe-area-inset-top)` resolves to 0px headless, so
 * `measure.mjs` pins `--safe-top` to the capture device's 25px and page
 * coordinates and capture coordinates share one origin.
 *
 * It must NOT be floored at 25px in the component. public/assets/mine.jpeg vs
 * target.jpeg (same phone, keyboard up) is the proof: when the OS draws its own
 * status strip instead of letting the app paint under it, `env()` is 0 and a
 * `max(25px, env(...))` floor reserves a second status bar — the PROGRES card
 * landed 19 CSS px lower than the donor's and the lifted form card then covered
 * the title entirely. `var(--safe-top)` alone is correct in both cases.
 */
const INSET = 'var(--safe-top)'

/**
 * Transcribed with scripts/qa/pxprobe.mjs from the a360 login set
 * (540x1170 device ÷ 1.5 = 360x780 CSS). Capture CSS px, origin = top of the
 * capture, i.e. the same origin the qa/out render shares after INSET:
 *
 *   band       x 0 y 25 w 360 h 113.5   bottom radius 25   #009577 / #1bb495
 *              (flat bottom edge reads 138.5 from x=27 to x=333; at x=10 it has
 *               curled up to 133.5 — that drop only solves for r≈25, so the
 *               27 this file carried was 2 CSS too round)
 *   logo card  x 43 y 73 w 273.5 h 162.25 r 16   #ffffff / #171a21
 *              row 120: band→card at 42.75 and card→band at 316.25; col 60:
 *              green to 72.75, card 73..234.5. It lies ON the band: 65 CSS of
 *              its height is over green and 96.75 hangs below the band's edge.
 *   title      ink x 110.5..247.5 (w 137) y 269..284.5 (h 15.5), cx 179.5
 *   bar        ink x 160.5..198.5 (w 38) y 302.5..305.5 (h 3)
 *   form card  x 17.5 y 328.5 w 325 h 280 r 16   #ffffff / #171a21
 *   pill reg   x 37.5 y 379.5 w 285 h 46.5      (Field.jsx)
 *   pill pass  x 37.5 y 473   w 285 h 47
 *   button     x 37.5 y 542.5 w 285 h 49
 *   copyright  ink x 142..217.5 (w 75.5) y 718..728 (h 10)
 *
 * Card internals are a closed chain, so the sums below are the assertion:
 * pt 25 → label box 353.5..368.5 → mb 11 → pill 379.5..426 → gap 20 → label
 * 446.5..461.5 → mb 11 → pill 472.5..519.5 → mt 23 → button 542.5..591.5 →
 * pb 17 → card bottom 608.5 ✓ measured 608.
 */
export default function Login() {
  const [user, setUser] = useState('')
  const [pass, setPass] = useState('')
  const [errors, setErrors] = useState({})
  const navigate = useNavigate()
  const { t } = useTranslation()
  const keyboard = useKeyboardInset()
  const formWrapRef = useRef(null)
  const headerRef = useRef(null)
  // Everything below is the UNTRANSFORMED geometry, sampled only while the page is
  // at rest, so a measurement can never be taken mid-lift and feed itself.
  const restRef = useRef({ formTop: 0, formBottom: 0, headerTop: 0, headerBottom: 0 })
  const formY = useMotionValue(0)

  const readRest = () => {
    const el = formWrapRef.current
    const hd = headerRef.current
    if (!el || !hd) return
    const r = el.getBoundingClientRect()
    const h = hd.getBoundingClientRect()
    const card = el.firstElementChild
    // The wrapper starts 23 CSS px ABOVE the card, because the card's mt-[23px]
    // lives inside it (that is what stops the margin collapsing out and moving the
    // box the gate asserts). Capping against the wrapper's top would let the card
    // rise 23 px too far and cover the title — which is the bug being fixed. The
    // card's own top is its bottom minus its layout height, and offsetHeight is
    // free of the mount rise, unlike a rect taken while the rise is still running.
    const cardH = card ? card.offsetHeight : r.height
    restRef.current = {
      formTop: r.bottom - cardH,
      formBottom: r.bottom,
      headerTop: h.top,
      headerBottom: h.bottom,
    }
  }

  /**
   * The form card rises until its own bottom edge reaches the bottom of the
   * VISIBLE area — the keyboard's top edge. That rule reproduces the still
   * captures: a360 -(293.5 - 171.5) = -122 and the video device -(312 - 184) = -128.
   *
   * But it is a CEILING, not the target. public/assets/target.jpeg (donor, keyboard
   * up) vs mine.jpeg (ours, same phone) shows why: the donor lifts only ~124 CSS px
   * and lets the LOGIN button tuck behind the keyboard, leaving the title and its
   * green underline visible in the 6 CSS px it keeps under the scaled header. The
   * unbounded rule lifts ~172 on that device, which drags the card up OVER the
   * title and hides it — the single most visible difference between the two.
   *
   * So the lift is clamped to the header's own scaled bottom edge: the card may not
   * rise above where the shrunken header ends. Both bounds are measured from the DOM
   * rather than assumed, so the rule holds at every viewport height and every
   * keyboard height — on a short screen the keyboard bound wins, on a tall keyboard
   * the header bound wins, which is exactly the donor's behaviour.
   *
   * Driven by a MotionValue, not state: the target depends on a DOM measurement, so
   * holding it in state means either reading a ref during render or writing state
   * synchronously in an effect — both are real cascading-render bugs and the lint
   * rules reject them. The measured element is the wrapper rather than the form
   * because the wrapper never carries the mount rise.
   */
  useLayoutEffect(() => {
    const el = formWrapRef.current
    if (!el) return
    const { inset, bottom } = keyboard
    if (!inset) {
      if (formY.get() === 0) readRest()
      else animate(formY, 0, { ...FORM_SPRING, onComplete: readRest })
      return
    }
    if (!restRef.current.formBottom) readRest()
    const { formTop, formBottom, headerTop, headerBottom } = restRef.current
    // The header scales about its own top edge, so its lifted bottom is that top
    // plus the scaled height — plus the air the donor keeps under it (target.jpeg
    // measures the underline ending at 198.5 and the card starting at 204.5).
    const ceiling = headerTop + (headerBottom - headerTop) * KB_SCALE + HEADER_GAP
    animate(
      formY,
      Math.min(0, Math.max(bottom - formBottom, ceiling - formTop)),
      FORM_SPRING,
    )
  }, [keyboard, formY])

  const submit = (e) => {
    e.preventDefault()
    const next = {}
    if (!user.trim()) next.user = t('login.registrationRequired')
    if (!pass) next.pass = t('login.passwordRequired')
    setErrors(next)
    if (Object.keys(next).length === 0) navigate('/verify')
  }

  const up = keyboard.inset > 0

  return (
    /*
      Hard height, not the .app-shell min-height. When the keyboard resizes the
      layout viewport the min-height collapses to the keyboard-free content height
      and the document becomes scrollable — and the browser then scrolls the focused
      input into view, which drags the PROGRES card off the top of the screen. That
      is the on-device failure: the animation ran, the card was gone. Pinning the
      shell to exactly the viewport and clipping it leaves the document with no
      scroll range at all, so nothing can be scrolled out of frame and the only
      movement is our own translate.
    */
    <div className="app-shell relative flex h-[100dvh] flex-col overflow-hidden bg-app">
      <div
        className="relative flex flex-1 flex-col items-center px-[17.5px]"
        style={{ paddingTop: INSET }}
      >
        {/*
          One transform for the whole header: the band, the logo card, the title and
          its green underline move as a single unit, because that is what the video
          shows — card and title scale by the SAME ratio (0.65 each), which is what
          proves it is a scale and not a re-layout. transform-origin is the block's
          own top edge, which is the band's top (page y = INSET): solving the
          capture's card top 72.5 -> 57 at scale 0.652 gives origin y = 27.9, i.e.
          the 25px status reserve, not the card's centre.

          The wrapper is self-stretch + -mx so the band inside it still spans the
          full 360 CSS px; the column's 17.5px padding would otherwise inset it.
          It is a flex container so the card's mt-[48px] stays inside the block
          instead of collapsing through the wrapper's top edge.

          will-change promotes the block for the duration of the lift, which is what
          makes the scale a compositor transform instead of a re-raster of the logo's
          dark-mode `filter: invert()` on every frame — the other half of the jank.
        */}
        <motion.div
          ref={headerRef}
          data-qa="header"
          initial={false}
          animate={{ scale: up ? KB_SCALE : 1 }}
          transition={up ? HEADER_APPEAR : HEADER_DISMISS}
          style={{ transformOrigin: 'top center', willChange: 'transform' }}
          className="relative -mx-[17.5px] flex flex-col items-center self-stretch"
        >
          <motion.div
            data-qa="band"
            initial={false}
            animate={{ opacity: up ? 0 : 1 }}
            transition={up ? BAND_FADE : BAND_BACK}
            className="absolute inset-x-0 top-0 bg-brand-surface h-[113.5px] rounded-b-[25px]"
          />

          {/*
            relative + z-index, not just DOM order. The band is `position: absolute`
            and this card is an in-flow block, so once the mount rise finishes and
            framer-motion drops the card's transform, CSS painting order puts the
            absolutely-positioned band OVER the card — 65 CSS px of the card was
            being repainted green at rest, which is exactly the "the card must sit on
            top of the green bar" defect. loginDark.jpeg has the card on top, with the
            band's rounded bottom corners visible either side of it.
          */}
          <motion.div
            {...rise}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            data-qa="logoCard"
            className="relative z-10 mt-[48px] grid h-[162.25px] w-[273.5px] max-w-full place-items-center
            rounded-[16px] bg-card shadow-[0_10px_28px_rgba(15,25,35,0.12)]"
          >
            <img
              data-qa="logo"
              src="/assets/logo-progress.png"
              alt="PROGRES — Ministry of Higher Education and Scientific Research"
              className="logo-ink w-[200px] h-auto select-none pointer-events-none"
              draggable={false}
            />
          </motion.div>

          <motion.h1
            {...rise}
            transition={{ duration: 0.25, delay: 0.05, ease: 'easeOut' }}
            data-qa="title"
            className="mt-[30px] text-center text-[21.5px] leading-[26px] font-extrabold text-[#1c1d21] dark:text-[#e6e7eb]"
          >
            {t('app.title')}
          </motion.h1>
          <span
            data-qa="titleBar"
            className="mt-[11px] h-[3px] w-[38px] rounded-[1.5px] bg-brand-surface"
          />
        </motion.div>

        {/*
          The keyboard translate lives on this wrapper, not on the form, so the
          form keeps its own mount rise on the same y channel — two transforms on
          two elements compose instead of fighting. flex + items-center stops the
          card's mt-[23px] collapsing out of the wrapper, which would move the
          wrapper's box and change the resting geometry the gate asserts.
        */}
        <motion.div
          ref={formWrapRef}
          style={{ y: formY, willChange: 'transform' }}
          className="flex flex-col items-center"
        >
          <motion.form
            {...rise}
            transition={{ duration: 0.28, delay: 0.1, ease: 'easeOut' }}
            onSubmit={submit}
            noValidate
            data-qa="formCard"
            className="mt-[23px] w-[325px] max-w-full rounded-[16px] bg-card px-[20px] pt-[25px]
            pb-[17px] shadow-[0_6px_22px_rgba(15,25,35,0.06)]"
          >
          <Field
            id="reg"
            label={t('login.registrationLabel')}
            value={user}
            onChange={(v) => {
              setUser(v)
              if (errors.user) setErrors((p) => ({ ...p, user: '' }))
            }}
            error={errors.user}
            icon={UserIcon}
            autoComplete="username"
            enterKeyHint="next"
          />
          <div className="h-[21px]" />
          <Field
            id="pass"
            type="password"
            label={t('login.passwordLabel')}
            value={pass}
            onChange={(v) => {
              setPass(v)
              if (errors.pass) setErrors((p) => ({ ...p, pass: '' }))
            }}
            error={errors.pass}
            icon={LockIcon}
            autoComplete="current-password"
          />
          {/* Solid brand even when empty: no login capture (empty, filled or
              focused) shows a disabled tint — tapping an empty form just fires
              validation. */}
          <Button type="submit" size="lg" data-qa="loginBtn" className="mt-[23px]">
            {t('login.continue')}
          </Button>
        </motion.form>
        </motion.div>

        {/* ink 718..728 with a 14px line box → box bottom ≈ 730 → 50 CSS from the
            foot of the capture (757..780 is the gesture strip, OS chrome) */}
        <footer className="mt-auto pb-[50px] text-center">
          <p
            data-qa="copyright"
            className="text-[10.5px] leading-[14px] font-medium text-[#8a8f98]"
          >
            {t('login.copyright')}
          </p>
        </footer>
      </div>
    </div>
  )
}
