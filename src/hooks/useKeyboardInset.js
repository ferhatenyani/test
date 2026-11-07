import { useEffect, useState } from 'react'

/**
 * Detects the on-screen keyboard by watching the visual viewport, and reports
 * where the visible area actually ends.
 *
 * NOT `:focus-within`: a desktop click into a field fires that with no keyboard
 * at all, and the header would collapse for no reason. The viewport is the only
 * signal that distinguishes "a keyboard took the bottom of the screen" from
 * "the user focused an input".
 *
 * Returns `{ inset, bottom }`:
 *   inset  — CSS px the keyboard has taken, 0 when it is not showing.
 *   bottom — the y of the visible area's bottom edge in LAYOUT coordinates. The
 *            caller lifts the form card to this line, which is the one number
 *            that is correct in both keyboard modes below.
 *
 * Two modes exist and a real device picks one, so both must work:
 *
 *   resizes-visual (Chrome's web-page default) — `innerHeight` stays, the visual
 *   viewport shrinks. The keyboard is `innerHeight - (vv.height + vv.offsetTop)`.
 *
 *   resizes-content (what an installed PWA on Android does — there is no browser
 *   UI left to collapse into) — `innerHeight` shrinks WITH the keyboard, so the
 *   visual viewport and the layout viewport agree and that difference is 0. A
 *   hook that only knew the first mode reported "no keyboard" on exactly the
 *   devices the captures came from, and the header never moved.
 *   Here the signal is the gap to the keyboard-free height, `rest`.
 *
 * `rest` is re-seeded from `innerHeight` whenever nothing editable has focus,
 * which is the only moment a viewport is provably keyboard-free. That also
 * absorbs rotation and desktop window resizes, both of which arrive as a plain
 * resize with no focused input.
 *
 * `offsetTop` is included because iOS also scrolls the layout viewport when it
 * raises the keyboard, so the visual viewport's top is not always at page y=0.
 *
 * MIN_KEYBOARD filters out the other things that shrink a viewport — a mobile
 * URL bar hiding (~100 CSS px) and DevTools docking. Real keyboards on the
 * reference devices measured 293.5 (a360) and 312 (the 384x832 video device), so
 * the threshold sits well below both and well above a URL bar.
 */
const MIN_KEYBOARD = 150

/** A keyboard only ever exists under a focused text input; a resize does not care. */
const editableFocused = () => {
  const el = document.activeElement
  if (!el) return false
  return el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable === true
}

const NO_KEYBOARD = { inset: 0, bottom: 0 }

export default function useKeyboardInset() {
  const [kb, setKb] = useState(NO_KEYBOARD)

  useEffect(() => {
    const vv = window.visualViewport
    if (!vv) return
    let rest = window.innerHeight
    const read = () => {
      if (editableFocused()) rest = Math.max(rest, window.innerHeight)
      else rest = window.innerHeight
      const bottom = Math.round(vv.height + vv.offsetTop)
      const taken = Math.round(rest - bottom)
      // Identity-stable: an object literal here on every resize would make every
      // consumer re-render even when the keyboard did not move.
      setKb((prev) => {
        const next = taken >= MIN_KEYBOARD ? { inset: taken, bottom } : NO_KEYBOARD
        return prev.inset === next.inset && prev.bottom === next.bottom ? prev : next
      })
    }
    read()
    vv.addEventListener('resize', read)
    vv.addEventListener('scroll', read)
    window.addEventListener('resize', read)
    return () => {
      vv.removeEventListener('resize', read)
      vv.removeEventListener('scroll', read)
      window.removeEventListener('resize', read)
    }
  }, [])

  return kb
}
