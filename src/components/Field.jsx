import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { EyeIcon, EyeOffIcon } from './icons'

/**
 * Slim pill field, transcribed from the a360 login captures with pxprobe
 * (capture device px ÷ 1.5). Every number is capture CSS px and was re-read on
 * qa/out/<id>.png with the IDENTICAL call, so reference and render share origin.
 *
 *   pill     x 37.5 .. 322 (w 285) · y 379.5 (reg) / 473 (pass) · h 46.5 · r 23.25
 *            Read the left/right edges at the pill's WIDEST row (y 403, its
 *            middle): `row 403 33 48` → card white to 37, hairline 37..38.5,
 *            fill from ~40; the right hairline is 321..322.5. A row nearer the
 *            top or bottom reads ~46/313 instead (row 420) — that is the corner
 *            arc curving in, not the box; reading it as the box once produced a
 *            "269 wide / 27 gutter" transcription 15 CSS too narrow.
 *   fill     #eef2f3 light / #21252e dark — one flat colour across a 1200 px
 *            probe box (`box 200 400 80 15`), so not JPEG drift. --field
 *            (#e8eaee / #2a2e3a) is 8 / 12 off → qa/requests/login.md.
 *   border   ~1 px hairline, samples #a1a3a2 on the light card and #93969d on
 *            the dark card, on both sides of both pills in every theme. Neither
 *            can be AA of its neighbours (white↔#eef2f3 stays ≥238; #171a21↔
 *            #21252e stays ≤46), so the stroke is real. --field-border
 *            (#cfd3da / #3a3f4d) is 46 / 89 off → requested.
 *   accent   A pill that HOLDS A VALUE carries the brand border and a brand
 *            glyph, not just while focused: in 18.25.56 (1) BOTH the reg row
 *            (y 403) and the pass row (y 497) read green edges (#11886c,
 *            #2a9279) and green icons, and 18.25.56 (5)/(6) (AR filled) read
 *            #138b70 / #188d71 edges with a mint halo (#e5f7f9) — only one of
 *            them can have focus, so the accent follows the value.
 *   icon     ink x 52.5..67.5 (w 15) · y 395..409.5 (h 14.5) · cy 402.3 = the
 *            pill's vertical centre; a 16 box starting 15 CSS from the edge.
 *            It stays on the physical LEFT in Arabic too — AR icon ink 57..65
 *            (18.25.56 (4)), 57..66 ((5)), 57..66 ((6)) — while the value runs
 *            to the right (AR digits ink 174..288.5). A plain flex row in an
 *            RTL document puts the first child on the right, so the row is
 *            reversed under RTL to keep the glyph where the capture has it.
 *   value    16 CSS / weight 400, NOT the 13 medium the class used to claim.
 *            The cause was index.css declaring `input, textarea, button
 *            { font: inherit }` OUTSIDE @layer, where it outranked every
 *            Tailwind utility and made text-[13px]/font-medium on a control dead
 *            code (measured DOM reported fontSize 16 / fontWeight 400). That rule
 *            was DELETED on 2026-10-26 — Tailwind v4 preflight already applies
 *            font:inherit to form controls inside @layer base, so the app's copy
 *            was a redundant duplicate whose only real effect was breaking the
 *            cascade. The measurement it produced is still correct and still
 *            asserted: the capture's own digits measure 106.5 x 11
 *            (`bbox 72 388 300 418` on 18.25.56 (1)) and the render measures
 *            105 x 11.5 — so 16 is the right size, the old class was lying.
 *            Type is set on the PILL (which the input inherits) and asserted as
 *            16/400. Do not reintroduce the unlayered rule; do not read a
 *            control's type off its className — confirm with measure.mjs.
 *   label    12 CSS, weight 500, line box 15, mb 11. Ink "Registration number"
 *            x 42..148 y 356..368 (cap+descender 12) and "Password"
 *            x 42..91.5 y 450..458.5 (cap 8.5 → 8.5/0.7 = 12.1).
 */
export default function Field({
  label,
  value,
  onChange,
  error = '',
  icon: Leading,
  type = 'text',
  id,
  name,
  autoComplete = 'off',
  inputMode,
  enterKeyHint,
  ...rest
}) {
  const [focused, setFocused] = useState(false)
  const [visible, setVisible] = useState(false)
  const [shaking, setShaking] = useState(false)
  const prevError = useRef('')
  const isPassword = type === 'password'
  const shownType = isPassword && visible ? 'text' : type

  useEffect(() => {
    if (error && error !== prevError.current) {
      setShaking(true)
      const t = setTimeout(() => setShaking(false), 320)
      prevError.current = error
      return () => clearTimeout(t)
    }
    prevError.current = error
  }, [error])

  // Measured: the brand accent follows a held value as much as focus (see the
  // header note); only an error overrides it.
  const active = focused || value.length > 0
  const showToggle = isPassword && value.length > 0
  const Icon = showToggle ? (visible ? EyeOffIcon : EyeIcon) : Leading

  const border = error ? 'border-error' : active ? 'border-brand' : 'border-[#a1a3a2] dark:border-[#93969d]'

  return (
    <div className={shaking ? 'shake' : undefined}>
      {label ? (
        <label
          htmlFor={id}
          data-qa={`label-${id}`}
          className="block text-[12px] leading-[15px] font-medium text-label mb-[11px] ps-[3px]"
        >
          {label}
        </label>
      ) : null}

      <div
        data-qa={`pill-${id}`}
        className={`flex flex-row rtl:flex-row-reverse items-center gap-[10px] h-[46.5px] rounded-[23.25px]
          text-[16px] font-normal bg-field border px-[15px]
          transition-[border-color,box-shadow,background-color] duration-200 ease-out
          ${border} ${active && !error ? 'shadow-[0_0_0_3px_rgba(0,149,119,0.13)]' : ''}`}
      >
        {Icon ? (
          <button
            type="button"
            data-qa={`icon-${id}`}
            tabIndex={showToggle ? 0 : -1}
            aria-label={showToggle ? 'toggle password visibility' : undefined}
            disabled={!showToggle}
            onClick={() => showToggle && setVisible((v) => !v)}
            className={`flex items-center justify-center w-[16px] h-[16px] shrink-0 transition-colors duration-200 ${
              error ? 'text-error' : active ? 'text-brand' : 'text-[#98999c] dark:text-[#9a9b9f]'
            } ${showToggle ? '' : 'pointer-events-none'}`}
          >
            <Icon size={16} />
          </button>
        ) : null}

        <input
          id={id}
          name={name}
          type={shownType}
          value={value}
          autoComplete={autoComplete}
          inputMode={inputMode}
          enterKeyHint={enterKeyHint}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onChange={(e) => onChange(e.target.value)}
          data-qa={`input-${id}`}
          className="flex-1 min-w-0 bg-transparent outline-none text-ink placeholder:text-label/70"
          {...rest}
        />
      </div>

      <AnimatePresence initial={false}>
        {error ? (
          <motion.p
            key="err"
            data-qa={`err-${id}`}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="overflow-hidden text-[10.5px] font-semibold text-error pt-[6px] px-0.5"
          >
            {error}
          </motion.p>
        ) : null}
      </AnimatePresence>
    </div>
  )
}
