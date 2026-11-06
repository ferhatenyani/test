import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowLeftIcon } from './icons'

/**
 * Measured from the 540x1170 service captures (1.5x device px of a 360 CSS phone):
 * green band 64 CSS, back circle 40 CSS at 20 CSS from the edge, centred title
 * ~15 CSS bold white.
 */
export default function ServiceHeader({ title }) {
  const navigate = useNavigate()
  const { t } = useTranslation()

  return (
    <header className="bg-brand text-white safe-top sticky top-0 z-30">
      <div className="relative h-16 flex items-center px-5">
        <button
          type="button"
          onClick={() => navigate(-1)}
          aria-label={t('common.back')}
          className="w-10 h-10 grid place-items-center rounded-full bg-white/20 active:bg-white/30 transition-colors"
        >
          <ArrowLeftIcon size={17} />
        </button>
        <h1 className="absolute left-0 right-0 text-center font-extrabold text-[15px] px-16 truncate pointer-events-none">
          {title}
        </h1>
      </div>
    </header>
  )
}
