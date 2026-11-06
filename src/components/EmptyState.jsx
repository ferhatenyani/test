import { useTranslation } from 'react-i18next'
import { TRANSCRIPT_YEARS, TIMETABLE_DAYS } from '../data/services'
import { CalendarXIcon } from './icons'

/**
 * Body variants, transcribed from the eight 540x1170 service captures with
 * qa/debug/{service-scan,art-geom,detail-scan,chips-scan}.mjs (raw pixels;
 * device px / 1.5 = CSS px). All y values below are "CSS px from the bottom of
 * the brand band", which sits at capture y 91.7.
 *
 * sad-box  the illustration asset is 454x410 with the page background #f5f6f8
 *          baked into its margins, so its edges are invisible in a capture. It is
 *          anchored instead on the dark box inside it (asset 162x260, capture
 *          108x173.3 CSS -> render scale 0.6667 CSS px per asset px), which puts
 *          the element at w 302.7 h 273.3, x 28.7, top 79.6 below the band.
 * caption  the references use TWO styles of the same sentence and they are not
 *          interchangeable — strong (#1a1a20, ink 207.3 CSS wide, 18.26.06 /
 *          18.26.05) and muted (#6c7278, 185.3 wide, 18.26.06 (1) / (2)). The
 *          width ratio 1.11 fixes the two sizes at ~13.5 and ~12 CSS.
 * cal-x    glyph ink 34 x 37.3 centred at cx 180, top 121.6 below the band, on a
 *          #f3f4f6 disc; caption 42 CSS under it.
 * chips    year pills: h 36.7, w 88, gap 16, ~1.5 border, fully rounded, first
 *          chip 4.67 in from the edge, and the row runs past x 360 — it scrolls
 *          horizontally. Academic transcripts shows no caption at all.
 */
export default function EmptyState({ variant = 'sad-box', caption = 'strong' }) {
  const { t } = useTranslation()

  if (variant === 'blank') return null

  const text = caption === 'notRelevant' ? 'empty.notRelevant' : 'empty.notAvailable'
  const line = (
    <p
      data-qa="svcCaption"
      className={
        caption === 'muted'
          ? 'text-center text-[12px] font-bold text-[#6c7278] dark:text-[#8b90a0] px-4'
          : 'text-center text-[13.5px] font-bold text-[#1a1a20] dark:text-[#e8eaed] px-4'
      }
    >
      {t(text)}
    </p>
  )

  if (variant === 'day-pills') {
    return (
      <div>
        {/* White day-pill strip, measured on 18.26.05 (2): y 148.2..208 (h 59.8),
            full-bleed, directly under the taller 123.2 band. Pill ink row is
            y 156.5..198.5 (h 42) starting at x 14 and running PAST x 360, so the
            row scrolls. `row 250` and `row 450` carry ZERO ink across the full
            width, which is why this variant has no sad-box art at all.
            dir=ltr follows the sibling chips row; it is NOT capture-proven here,
            because no Arabic capture of this variant exists. */}
        <div
          data-qa="svcDayStrip"
          dir="ltr"
          className="flex h-[59.8px] items-center gap-[11px] overflow-x-auto bg-card px-[14px] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {TIMETABLE_DAYS.map((d, i) => {
            const filled = i === 1
            return (
              <span
                key={d}
                data-qa={`svcDay${i}`}
                className={`shrink-0 grid place-items-center h-[42px] rounded-[21px] px-[14px] text-[12px] font-bold whitespace-nowrap ${
                  filled
                    ? 'bg-brand text-white'
                    : 'bg-card border border-[#f1f1f1] text-[#5f6065] dark:border-hairline dark:text-ink'
                }`}
              >
                {t(`days.${d}`)}
              </span>
            )
          })}
        </div>
        {/* Body below the strip is left UNASSERTED by decision: the capture shows
            ink at y 317..408.5 (cx 179.5) that does not resolve cleanly into a
            caption line, and inventing art or a second string there would be
            fabrication. Geometry of the pills is likewise not asserted — pill
            widths in the reference are unequal (78 / 71.5 / 84), so they are
            content-hugging, and which single day is filled is an n=1 observation. */}
        <div className="pt-[42px] w-full">
          <p data-qa="svcCaption" className="text-center text-[13.5px] font-bold text-[#1a1a20] dark:text-[#e8eaed] px-4">
            {t('empty.noClasses')}
          </p>
        </div>
      </div>
    )
  }

  if (variant === 'cal-x') {
    return (
      <div className="flex flex-col items-center pt-[121.6px]">
        <div data-qa="svcGlyphDisc" className="w-[42.7px] h-[42.7px] rounded-[21.35px] bg-[#f3f4f6] dark:bg-[#232734] grid place-items-center text-[#6c727e] dark:text-[#8b90a0]">
          <CalendarXIcon size={34} />
        </div>
        <div data-qa="svcCaptionWrap" className="mt-[42px] w-full">{line}</div>
      </div>
    )
  }

  const chips =
    variant === 'sad-box-chips' ? (
      <div
        data-qa="svcChipRow"
        dir="ltr"
        className="flex gap-4 overflow-x-auto pl-[4.7px] pt-[10.3px] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {TRANSCRIPT_YEARS.map((y, i) => (
          <span
            key={y}
            data-qa={i === 0 ? 'svcChip' : `svcChip${i + 1}`}
            className="shrink-0 w-[88px] h-[36.7px] grid place-items-center rounded-[18.35px] border-[1.5px] border-brand text-brand font-bold text-[11px]"
          >
            {t(`years.${y}`)}
          </span>
        ))}
      </div>
    ) : null

  return (
    <div>
      {chips}
      <div className={`flex flex-col items-center ${chips ? 'pt-[23.1px]' : 'pt-[79.6px]'}`}>
        <img
          data-qa="svcArt"
          src="/assets/empty-sad-box.png"
          alt=""
          className="w-[302.7px] max-w-full select-none pointer-events-none"
          draggable={false}
        />
        {caption !== 'none' && (
          <div data-qa="svcCaptionWrap" className="w-full">{line}</div>
        )}
      </div>
    </div>
  )
}
