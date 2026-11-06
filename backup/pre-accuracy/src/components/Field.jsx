import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { EyeIcon, EyeOffIcon } from './icons'

/**
 * Slim grey-filled pill measured from the login capture (÷1.5): 47 CSS tall,
 * full radius, 1px border, 16 CSS leading glyph, 11.5 CSS slate label above with
 * a 13 CSS gap. Focus animates the border to brand with a soft glow; an invalid
 * submit turns it red, shakes, and slides the message in — as in the video.
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

  const showToggle = isPassword && value.length > 0
  const Icon = showToggle ? (visible ? EyeOffIcon : EyeIcon) : Leading

  const border = error ? 'border-error' : focused ? 'border-brand' : 'border-field-border'

  return (
    <div className={shaking ? 'shake' : undefined}>
      {label ? (
        <label htmlFor={id} className="block text-[11.5px] font-medium text-label mb-[13px] px-0.5">
          {label}
        </label>
      ) : null}

      <div
        className={`flex items-center gap-[10px] h-[47px] rounded-full bg-field border px-[15px]
          transition-[border-color,box-shadow,background-color] duration-200 ease-out
          ${border} ${focused && !error ? 'shadow-[0_0_0_3px_rgba(0,149,119,0.13)]' : ''}`}
      >
        {Icon ? (
          <button
            type="button"
            tabIndex={showToggle ? 0 : -1}
            aria-label={showToggle ? 'toggle password visibility' : undefined}
            disabled={!showToggle}
            onClick={() => showToggle && setVisible((v) => !v)}
            className={`flex items-center justify-center w-4 shrink-0 transition-colors duration-200 ${
              error ? 'text-error' : focused ? 'text-brand' : 'text-label'
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
          className="flex-1 min-w-0 bg-transparent outline-none text-[13px] font-medium text-ink placeholder:text-label/70"
          {...rest}
        />
      </div>

      <AnimatePresence initial={false}>
        {error ? (
          <motion.p
            key="err"
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
