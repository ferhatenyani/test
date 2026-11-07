import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import BannerCarousel from '../components/BannerCarousel'
import GlyphMask from '../components/GlyphMask'
import ThemeToggle from '../components/ThemeToggle'
import { useLang } from '../context/LangContext'
import { TileGlyph } from '../components/icons'
import { SERVICES } from '../data/services'

/**
 * All numbers below are CSS px transcribed from the a394 home captures
 * (591x1280 device ÷ 1.5) with scripts/qa/pxprobe.mjs. Source per number is
 * recorded in qa/specs/2x-home-*.json.
 *
 * 394x853 CSS capture, content margins 24 (banner and grid both span 24..370).
 *
 * Header row centre 77.5, 52 tall -> the block starts at y 51.5. The capture is
 * a standalone PWA on a phone: the top 0..~45 is the OS status bar the app sits
 * under and the nav ends at y 810.5, i.e. 42.5 above the 853 bottom.
 *
 * 51.5 is therefore inset + margin, not a constant: the capture's device drew a
 * 47 CSS px status area and the app added 4.5. `--safe-top` carries the real
 * inset (index.css) and `measure.mjs` pins it to 47 headless, where env() would
 * otherwise be 0. Baking 51.5 instead made every notched phone pay the status bar
 * twice, which is why the header sat too low on-device.
 *
 * The floor is 8px, not 24. On a device where the OS keeps its own status strip
 * outside the web viewport, env() is 0 and the app should add only its own air —
 * 28.5 CSS px there read as the title floating far from the top edge. 8 + 4.5 puts
 * the header 16 CSS px higher on such a device and leaves the harness unchanged,
 * because 47 > 8 and the pinned inset still wins.
 *
 * Banner 24,111 346x101. Dots 8 tall at y 222.5..230.5 (group 181..213).
 * Grid top 235.5; tiles 167x58, radius 9, column gap 12, row pitch 61.67
 * (gap 3.67). Bottom nav 24,744.5 346x66.
 *
 * The grid is pinned dir="ltr" like the nav: in the Arabic capture the first
 * tile (التبرئة الإلكترونية / Discharge) is at the top *left*, and its glyph and
 * label ink boxes are pixel-identical to the English capture's top-left tile.
 * A plain CSS grid in an RTL document mirrors that, which is the defect. Each
 * tile keeps dir="rtl" so its own Arabic label still shapes right.
 */
export default function Home() {
  const { t } = useTranslation()
  const { isRtl } = useLang()

  return (
    <div
      className="app-shell bg-app text-ink"
      data-qa="homeShell"
    >
      <div
        data-qa="homeContent"
        className="px-6 pt-[calc(max(8px,var(--safe-top))+4.5px)] pb-[120px]"
      >
        <header data-qa="homeHeader" className="flex h-[52px] items-center justify-between">
          <h1
            data-qa="homeTitle"
            className={`${isRtl ? 'text-[22px]' : 'text-[20px]'} font-extrabold leading-none
              tracking-[-0.01em] text-ink`}
          >
            {t('home.title')}
          </h1>
          <ThemeToggle />
        </header>

        <div className="mt-[7.5px]">
          <BannerCarousel />
        </div>

        <div
          data-qa="tileGrid"
          dir="ltr"
          className="mt-[5px] grid grid-cols-2 gap-x-3 gap-y-[3.67px]"
        >
          {SERVICES.map((service, i) => (
            <Link
              key={service.slug}
              to={`/service/${service.slug}`}
              data-qa={`tile-${i}`}
              className="flex h-[58px] flex-col items-center justify-start gap-[6px] rounded-[9px]
                border border-tile-border bg-tile px-1 pt-[8px] transition active:brightness-95"
            >
              {service.icon === 'absences' || service.icon === 'onou' ? (
                <TileGlyph
                  slug={service.icon}
                  className="shrink-0 text-white"
                  data-qa={`tileGlyph-${i}`}
                />
              ) : (
                <GlyphMask
                  data-qa={`tileGlyph-${i}`}
                  src={`/assets/tiles/${service.icon}.png`}
                  size={20}
                  className="text-white"
                />
              )}
              <span
                data-qa={`tileLabel-${i}`}
                dir="auto"
                className={`text-center font-semibold leading-none text-white ${
                  isRtl ? 'text-[11.4px]' : 'text-[9px]'
                }`}
              >
                {t(`services.${service.slug}`)}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
