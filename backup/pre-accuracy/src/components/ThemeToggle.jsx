import { useTranslation } from 'react-i18next'
import { useTheme } from '../context/ThemeContext'
import { StarMoonIcon } from './icons'

/**
 * Home header icon. Cycles the same shared state the Profile segmented control
 * writes to: system -> light -> dark (D4).
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
      className={`w-10 h-10 -me-1.5 grid place-items-center rounded-full text-ink
        active:scale-95 transition-transform duration-150 ${className}`}
    >
      <StarMoonIcon size={26} />
    </button>
  )
}
