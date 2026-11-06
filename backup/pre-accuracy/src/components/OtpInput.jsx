import { useEffect, useRef, useState } from 'react'

const LENGTH = 6

/**
 * Six 45x50 CSS boxes, 8 CSS radius, measured from the 2FA capture. Focused box
 * gets a 2px brand border on a clear field; the rest are grey-filled with a 1px
 * border. Order stays LTR in Arabic, matching the reference frame.
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
    <div dir="ltr" className="flex justify-between">
      {Array.from({ length: LENGTH }, (_, i) => {
        const active = focusIndex === i
        return (
          <input
            key={i}
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
            className={`w-[45px] h-[50px] rounded-[8px] text-center text-[18px] font-bold text-ink
              outline-none transition-[border-color,box-shadow,background-color] duration-150
              ${
                error
                  ? 'border-[1.5px] border-error bg-field'
                  : active
                    ? 'border-2 border-brand bg-transparent'
                    : 'border-[1.5px] border-field-border bg-field'
              }`}
          />
        )
      })}
    </div>
  )
}
