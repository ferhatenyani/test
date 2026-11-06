import { useTranslation } from 'react-i18next'
import { TRANSCRIPT_YEARS } from '../data/services'
import { CalendarXIcon } from './icons'

/**
 * Body variants measured from the 540x1170 service captures (÷1.5 for CSS):
 *   sad-box  illustration top ~75 CSS below the band, art ~247 CSS wide,
 *            caption 40 CSS under the art
 *   cal-x    59 CSS circle ~111 CSS below the band, caption 30 CSS under it
 * Caption is 12.5 CSS bold slate, not the large muted line I had.
 */
export default function EmptyState({ variant = 'sad-box' }) {
  const { t } = useTranslation()

  if (variant === 'blank') return null

  const caption = (
    <p className="text-center text-[12px] font-bold text-[#5f6b7a] dark:text-[#8b90a0] px-6">
      {t('empty.notAvailable')}
    </p>
  )

  if (variant === 'cal-x') {
    return (
      <div className="flex flex-col items-center pt-[111px]">
        <div className="w-[59px] h-[59px] rounded-full bg-[#e8ebf0] dark:bg-[#232734] grid place-items-center text-[#5b6472] dark:text-[#8b90a0]">
          <CalendarXIcon size={32} />
        </div>
        <div className="mt-[32px] w-full">{caption}</div>
      </div>
    )
  }

  const chips =
    variant === 'sad-box-chips' ? (
      <div
        dir="ltr"
        className="flex gap-3 overflow-x-auto px-2 pt-3 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {TRANSCRIPT_YEARS.map((y) => (
          <span
            key={y}
            className="shrink-0 h-[37px] px-5 grid place-items-center rounded-full border-[1.5px] border-brand text-brand font-bold text-[11px]"
          >
            {t(`years.${y}`)}
          </span>
        ))}
      </div>
    ) : null

  return (
    <div>
      {chips}
      <div className="flex flex-col items-center pt-[75px]">
        <img
          src="/assets/empty-sad-box.png"
          alt=""
          className="w-[247px] max-w-[68%] select-none pointer-events-none"
          draggable={false}
        />
        <div className="mt-[40px] w-full">{caption}</div>
      </div>
    </div>
  )
}
