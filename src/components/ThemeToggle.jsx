import { useTranslation } from 'react-i18next'
import { useTheme } from '../context/ThemeContext'
import { StarMoonIcon } from './icons'

/**
 * Home header icon. Cycles the same shared state the Profile segmented control
 * writes to: system -> light -> dark (D4).
 *
 * Position transcribed from the a394 home captures with scripts/qa/pxprobe.mjs:
 * the glyph ink is 22x22 centred at (343.0, 77.5) in the English capture and at
 * (50.3, 77.5) in the Arabic one — a mirror of 394-343 = 51, so the icon keeps
 * the same 27 CSS px from the content edge on both sides. The header's content
 * box ends at x 370, so a 40px button has to sit 7px short of it; the old
 * -me-1.5 pushed the ink out to ~356 instead.
 */
export default function ThemeToggle({ className = '' }) {
  const { cycleTheme, theme } = useTheme()
  const { t } = useTranslation()
  const label = t(`profile.theme${theme === 'system' ? 'System' : theme === 'dark' ? 'Dark' : 'Light'}`)

  return (
    <button
      type="button"
      onClick={cycleTheme}
      aria-label={`${t('profile.theme')}: ${label}`}
      data-qa="themeToggle"
      className={`grid h-10 w-10 shrink-0 place-items-center rounded-full text-ink
        transition-transform duration-150 active:scale-95 me-[7px] ${className}`}
    >
      <span data-qa="themeToggleIcon" className="flex h-[29px] w-[29px] items-center justify-center">
        <StarMoonIcon size={29} />
      </span>
    </button>
  )
}
