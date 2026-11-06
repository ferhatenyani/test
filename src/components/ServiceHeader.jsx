import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowLeftIcon } from './icons'

/**
 * Transcribed from the eight 540x1170 service captures (18.26.05 x3, 18.26.06 x5),
 * device px / 1.5 = CSS px, via qa/debug/service-scan.mjs (raw pixels, not the
 * ruler overlay — scripts/qa/ruler.mjs labels are 2.25x off its own grid).
 *
 * The brand band is #009577 and runs from capture y 25 to y 91.7 — i.e. it starts
 * at the bottom of the 25 CSS status bar and is 66.7 CSS tall. The harness renders
 * the app at the capture's full 780 CSS height with no OS chrome, so the band has
 * to reserve that 25 CSS itself or every row below it sits 25 px high in the diff;
 * max(25px, env(...)) keeps it correct on a device where env() is already 25.
 *
 * Back disc: 41.3 CSS across, 18 CSS in from the leading edge, 10.7 CSS below the
 * band top (so 2 CSS above the band's vertical centre — it is top-biased, not
 * centred). Its colour is white at 20% over the band (measured #34aa92), so the
 * disc is a fill, not a border. Arrow flips to the right edge in RTL (18.26.05)
 * while the title stays centred at cx 180.
 *
 * `tallBand` is the Timetable header only. On 18.26.05 (2) the green runs from
 * y25 to y148.2 — h 123.2, not 66.7 — and it is FLAT green: `bbox 0 92 360 148`
 * against #009577 at Δ>30 returns ink only at the y148 bottom edge (720 px of an
 * 81k px box), so there is no second row of content inside it. The disc does NOT
 * move when the band grows: `row 56` reads band->disc at x18.0 and disc->band at
 * x59.0 (w 41) and `col 38` reads 36..76.5 (h 40.5), i.e. the same top-biased
 * x18 / y35.7 / 41.3 as every other service page — the band grows downward only.
 * The white day-pill strip below it belongs to EmptyState, not to the header.
 */
export default function ServiceHeader({ title, tallBand = false }) {
  const navigate = useNavigate()
  const { t } = useTranslation()

  return (
    <header
      data-qa="svcHeader"
      className="bg-brand text-white sticky top-0 z-30 pt-[max(25px,env(safe-area-inset-top))]"
    >
      <div
        data-qa="svcBand"
        className={`relative flex items-center px-[18px] ${
          tallBand ? 'h-[123.2px]' : 'h-[66.7px]'
        }`}
      >
        <button
          data-qa="svcBack"
          type="button"
          onClick={() => navigate(-1)}
          aria-label={t('common.back')}
          className="self-start mt-[10.7px] w-[41.3px] h-[41.3px] shrink-0 grid place-items-center rounded-[20.65px] bg-[rgba(255,255,255,0.2)] active:bg-[rgba(255,255,255,0.3)] transition-colors"
        >
          <ArrowLeftIcon size={17} />
        </button>
        <h1
          data-qa="svcTitle"
          className="absolute left-0 right-0 top-[25.3px] text-center font-extrabold text-[16px] leading-none px-[76px] truncate pointer-events-none"
        >
          {title}
        </h1>
      </div>
    </header>
  )
}
