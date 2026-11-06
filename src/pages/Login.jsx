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
 * A spring at stiffness 420 / damping 28 gives ~5% overshoot settling in ~0.28s,
 * which is that asymmetry. The form card lands exactly and holds, so it is damped.
 */
const KB_SCALE = 0.65
const HEADER_SPRING = { type: 'spring', stiffness: 420, damping: 28 }
const FORM_SPRING = { type: 'spring', stiffness: 480, damping: 36 }
const BAND_FADE = { duration: 0.14, ease: 'easeOut' }

/**
 * Status reserve. Every login capture paints the FIRST 25 CSS px with the page
 * background and starts the green band below it — `col 20 0 60` on 18.25.55
 * (EN light) reads #f5f6f8 from 0 to 24.5 then brand, and `col 20 0 160` on
 * 18.25.56 (2) (EN dark) reads #101115 from 0 to 25 then brand. The donor's web
 * view sits under the iOS status strip, so page y=0 in the capture is the top of
 * the *screen*, not the top of the app.
 *
 * The harness viewport is 360x780 — the capture's full height including that
 * strip — and `env(safe-area-inset-top)` resolves to 0px headless. With the
 * band pinned at top-0 every element under it rendered 25 CSS px above its
 * reference, which is the single biggest error in the pixel diff. Flooring the
 * inset at 25px (the same convention ServiceHeader.jsx uses) puts page
 * coordinates and capture coordinates on the same origin and still honours a
 * real notch.
 */
const INSET = 'max(25px, env(safe-area-inset-top))'

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
  const restBottomRef = useRef(0)
  const formY = useMotionValue(0)

  const readRestBottom = () => {
    const el = formWrapRef.current
    if (el) restBottomRef.current = el.getBoundingClientRect().bottom
  }

  /**
   * The form card rises by exactly the overlap between the keyboard and its own
   * bottom edge, so its bottom lands ON the keyboard's top edge. That single rule
   * reproduces both references: a360 -(293.5 - 171.5) = -122 (the capture's number)
   * and the video device -(312 - 184) = -128 (measured, frame 28).
   *
   * Driven by a MotionValue, not state: the target depends on a DOM measurement, so
   * holding it in state means either reading a ref during render or writing state
   * synchronously in an effect — both are real cascading-render bugs and the lint
   * rules reject them. The measured element is the wrapper rather than the form
   * because the wrapper never carries the mount rise, and the rest bottom is only
   * sampled while formY is at 0, so the transform can never feed itself.
   */
  useLayoutEffect(() => {
    const el = formWrapRef.current
    if (!el) return
    if (!keyboard) {
      if (formY.get() === 0) readRestBottom()
      else animate(formY, 0, { ...FORM_SPRING, onComplete: readRestBottom })
      return
    }
    const rest = restBottomRef.current || el.getBoundingClientRect().bottom
    animate(formY, Math.min(0, window.innerHeight - keyboard - rest), FORM_SPRING)
  }, [keyboard, formY])

  const submit = (e) => {
    e.preventDefault()
    const next = {}
    if (!user.trim()) next.user = t('login.registrationRequired')
    if (!pass) next.pass = t('login.passwordRequired')
    setErrors(next)
    if (Object.keys(next).length === 0) navigate('/verify')
  }

  return (
    <div className="app-shell relative flex flex-col overflow-hidden bg-app">
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
        */}
        <motion.div
          data-qa="header"
          initial={false}
          animate={{ scale: keyboard ? KB_SCALE : 1 }}
          transition={HEADER_SPRING}
          style={{ transformOrigin: 'top center' }}
          className="relative -mx-[17.5px] flex flex-col items-center self-stretch"
        >
          <motion.div
            data-qa="band"
            initial={false}
            animate={{ opacity: keyboard ? 0 : 1 }}
            transition={BAND_FADE}
            className="absolute inset-x-0 top-0 bg-brand-surface h-[113.5px] rounded-b-[25px]"
          />

          <motion.div
            {...rise}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            data-qa="logoCard"
            className="mt-[48px] grid h-[162.25px] w-[273.5px] max-w-full place-items-center
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
          style={{ y: formY }}
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
