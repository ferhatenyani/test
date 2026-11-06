import { useEffect, useRef, useState } from 'react'

const LENGTH = 6

/**
 * Six digit boxes, measured from the 2FA capture "WhatsApp Image 2026-10-25 at
 * 18.35.12.jpeg" (591x1280 device = 394x853 CSS, device px ÷ 1.5) with
 * scripts/qa/pxprobe.mjs row/col/bbox.
 *
 * Row ink: x 48.5..344, y 578.5..633 -> 6 boxes of 46 x 54 CSS on a 50 CSS
 * pitch, so the gap is 4 CSS and the row is 296 CSS wide and CENTRED (ink cx
 * 196.5 = page centre), not spread edge to edge. The old `justify-between`
 * filled the whole sheet and made the gap 8.8 CSS.
 * Box fill #eef2f3 (ink of every empty box, box 100,585 44x12 -> #eef2f3 76%),
 * idle border ~2 CSS #cfd3da (border cores #c6c6c8..#d1d2d4 along row y=590),
 * focused border 2 CSS brand green (row y=590 shows a 2 CSS green edge at
 * x 48.5..51 / 93..96, col x=70 at y 578..581 and 630.5..633).
 * Corner inset of box 4 (bbox 195,578..250,582 vs #ffffff -> x 202..240.5)
 * puts the radius at 8-10 CSS; 8 is used.
 *
 * The capture shows no typed digit, so the digit glyph size/weight is NOT
 * measurable from it and is deliberately left at its previous value.
 */
export default function OtpInput({ value, onChange, error = '' }) {
  const refs = useRef([])
  const [focusIndex, setFocusIndex] = useState(-1)
  const digits = value.split('').slice(0, LENGTH)

  useEffect(() => {
    refs.current[digits.length]?.focus()
  }, [digits.length])

  const setAt = (i, d) => {
    const next = value.split('')
    next[i] = d
    onChange(next.join('').replace(/\s/g, '').slice(0, LENGTH))
  }

  const handleChange = (i, raw) => {
    const taken = raw.replace(/\D/g, '')
    if (!taken) {
      setAt(i, '')
      return
    }
    if (taken.length > 1) {
      const filled = (value.slice(0, i) + taken).replace(/\D/g, '').slice(0, LENGTH)
      onChange(filled)
      refs.current[Math.min(filled.length, LENGTH - 1)]?.focus()
      return
    }
    setAt(i, taken)
    if (i < LENGTH - 1) refs.current[i + 1]?.focus()
  }

  const handleKeyDown = (i, e) => {
    if (e.key === 'Backspace' && !digits[i] && i > 0) {
      e.preventDefault()
      setAt(i - 1, '')
      refs.current[i - 1]?.focus()
    } else if (e.key === 'ArrowLeft' && i > 0) {
      e.preventDefault()
      refs.current[i - 1]?.focus()
    } else if (e.key === 'ArrowRight' && i < LENGTH - 1) {
      e.preventDefault()
      refs.current[i + 1]?.focus()
    }
  }

  const handlePaste = (e) => {
    const text = e.clipboardData.getData('text')?.replace(/\D/g, '') ?? ''
    if (!text) return
    e.preventDefault()
    onChange(text.slice(0, LENGTH))
    refs.current[Math.min(text.length, LENGTH - 1)]?.focus()
  }

  return (
    <div dir="ltr" data-qa="otpRow" className="mx-auto flex w-fit justify-center gap-[4px]">
      {Array.from({ length: LENGTH }, (_, i) => {
        const active = focusIndex === i
        return (
          <input
            key={i}
            data-qa={`otp${i}`}
            ref={(el) => {
              refs.current[i] = el
            }}
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            aria-label={`digit ${i + 1}`}
            maxLength={LENGTH}
            value={digits[i] ?? ''}
            onFocus={(e) => {
              setFocusIndex(i)
              e.target.select()
            }}
            onBlur={() => setFocusIndex(-1)}
            onChange={(e) => handleChange(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            onPaste={handlePaste}
            className={`w-[46px] h-[54px] rounded-[8px] text-center text-[18px] font-bold text-ink
              outline-none transition-[border-color] duration-150
              ${
                error
                  ? 'border-2 border-error'
                  : active
                    ? 'border-2 border-brand'
                    : 'border-2 border-field-border'
              } bg-field`}
          />
        )
      })}
    </div>
  )
}
