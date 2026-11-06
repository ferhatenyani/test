import { useEffect, useState } from 'react'

/**
 * Detects the on-screen keyboard by watching the visual viewport shrink.
 *
 * NOT `:focus-within`: a desktop click into a field fires that with no keyboard
 * at all, and the header would collapse for no reason. The visual viewport is the
 * only signal that distinguishes "a keyboard took the bottom of the screen" from
 * "the user focused an input".
 *
 * Returns the keyboard's height in CSS px (0 when it is not showing).
 *
 * `offsetTop` is included because iOS also scrolls the layout viewport when it
 * raises the keyboard, so the visual viewport's top is not always at page y=0.
 *
 * MIN_KEYBOARD filters out the other things that shrink the visual viewport —
 * a mobile URL bar hiding (~100 CSS px) and DevTools docking. Real keyboards on
 * the reference devices measured 293.5 (a360) and 312 (the 384x832 video device),
 * so the threshold sits well below both and well above a URL bar.
 */
const MIN_KEYBOARD = 150

/** A keyboard only ever exists under a focused text input; a resize does not care. */
const editableFocused = () => {
  const el = document.activeElement
  if (!el) return false
  return el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable === true
}

export default function useKeyboardInset() {
  const [inset, setInset] = useState(0)

  useEffect(() => {
    const vv = window.visualViewport
    if (!vv) return
    const read = () => {
      const free = vv.height + vv.offsetTop
      const taken = Math.round(window.innerHeight - free)
      setInset(taken >= MIN_KEYBOARD && editableFocused() ? taken : 0)
    }
    read()
    vv.addEventListener('resize', read)
    vv.addEventListener('scroll', read)
    return () => {
      vv.removeEventListener('resize', read)
      vv.removeEventListener('scroll', read)
    }
  }, [])

  return inset
}
