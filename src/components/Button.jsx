import { motion } from 'framer-motion'

/**
 * Pill CTA. Login's button measured on 18.25.55 (a360, device px ÷ 1.5):
 * x 37.5 y 542.5 w 285 h 49, r = h/2, flat brand fill in every state — the
 * empty, filled and focused captures all read full-strength #009577, so no
 * disabled tint exists in the login references.
 *
 * THE TYPE IS AN INLINE STYLE. It sets 16 CSS / weight 500 / -0.48px, which is
 * what the capture measures: the "LOGIN" ink is x 158.5..200 y 561..572.5
 * (`bbox 60 545 300 590` BG=brand), i.e. cap height 11.5 = 16 CSS at Poppins'
 * 0.70em cap ratio. The widths disagree (capture 41.5, render 49) and ~4.8 CSS
 * of that was the old 0.06em of tracking, taken back out here; the rest is
 * Poppins being wider than the capture's face (qa/requests/login.md — a font
 * choice, not a size).
 *
 * This used to be inline because it HAD to be: index.css declared
 * `input, textarea, button { font: inherit }` outside every @layer, and unlayered
 * author rules outrank every Tailwind utility, so a `text-[13.5px]` class never
 * reached the screen. That rule was DELETED on 2026-10-26 (Tailwind v4 preflight
 * already applies font:inherit to form controls inside @layer base, so the app's
 * copy was a redundant duplicate whose only real effect was breaking the
 * cascade). The inline style is kept because it is now simply the explicit value,
 * not because the classes are dead — but do NOT reintroduce the rule, and do not
 * assume a control's type from its className: confirm with
 * `node scripts/qa/measure.mjs <page>` and the fontSize/fontWeight in
 * qa/measured/<id>.json.
 *
 * `md` is 42 CSS / r 21 per the 2FA capture (qa/requests/verify.md #2): bbox
 * 0 640 394 700 vs #ffffff Δ>13 -> y 644..686 = h 42, and rows 646/665/684 at
 * Δ>60 put the left edge at 42 near the top and 28.5 mid-height, an inset of
 * 13.5 at d=2 -> radius = h/2 = 21. NOT EXERCISED BY ANY SCENARIO today: the
 * only consumer is Login.jsx, which uses `lg`, and Verify.jsx builds its own
 * `<button>`s. So the gate cannot verify this line — it is a capture-backed
 * value in shared code, not a measured pass.
 *
 * Dark mode paints brand surfaces as #1bb495 (`--color-brand-surface`):
 * `box 12,60 20x20` inside the dark header and `box 60,560 40x20` inside this
 * button are 400 and 800 px of ONE flat colour #1bb495, where the same probes on
 * the light captures return exactly #009577. A second brand value, not JPEG
 * drift. `--color-brand` itself must NOT flip (dark *line* brand is still
 * #009577) — see the note in index.css.
 */
const sizes = {
  lg: {
    box: 'h-[49px] rounded-[24.5px]',
    type: { fontSize: 16, fontWeight: 500, letterSpacing: '-0.48px' },
  },
  md: { box: 'h-[42px] rounded-[21px]', type: { fontSize: 12.5, fontWeight: 700 } },
}

export default function Button({
  children,
  active = true,
  disabled = false,
  size = 'lg',
  variant = 'primary',
  className = '',
  style,
  ...rest
}) {
  const { box, type } = sizes[size] || sizes.lg
  const palette =
    variant === 'danger'
      ? 'bg-danger'
      : active
        ? 'bg-brand-surface active:bg-brand-dark'
        : 'bg-gradient-to-r from-[#73c6b2] to-[#74e6cf]'

  return (
    <motion.button
      whileTap={disabled ? undefined : { scale: 0.985 }}
      transition={{ duration: 0.12 }}
      disabled={disabled}
      className={`w-full text-white ${box} ${palette} ${className}`}
      style={{ ...type, ...style }}
      {...rest}
    >
      {children}
    </motion.button>
  )
}
