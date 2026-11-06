import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import BannerCarousel from '../components/BannerCarousel'
import BottomNav from '../components/BottomNav'
import GlyphMask from '../components/GlyphMask'
import ThemeToggle from '../components/ThemeToggle'
import { TileGlyph } from '../components/icons'
import { SERVICES } from '../data/services'

/**
 * Measured from the 591x1280 home capture (1.5x device px -> CSS):
 * content margins 24, title 23/800, header block 52, banner 17 below it,
 * dots 12 below banner (13x7 active pill, 7 circle), grid 5 below dots,
 * tiles 57 tall, radius 9, gap 12x5, glyph 20, label 10/600.
 */
export default function Home() {
  const { t } = useTranslation()

  return (
    <div className="app-shell bg-app">
      <div className="px-6 pt-[max(6px,env(safe-area-inset-top))] pb-[120px]">
        <header className="flex items-center justify-between min-h-[52px]">
          <h1 className="text-[23px] font-extrabold tracking-[-0.01em]">{t('home.title')}</h1>
          <ThemeToggle />
        </header>

        <div className="mt-[17px]">
          <BannerCarousel />
        </div>

        <div className="grid grid-cols-2 gap-x-3 gap-y-[5px] mt-[5px]">
          {SERVICES.map((service) => (
            <Link
              key={service.slug}
              to={`/service/${service.slug}`}
              className="h-[57px] rounded-[9px] bg-tile border border-tile-border flex flex-col
                items-center justify-center gap-[7px] active:brightness-95 transition"
            >
              {service.icon === 'absences' || service.icon === 'onou' ? (
                <TileGlyph slug={service.icon} className="text-white" />
              ) : (
                <GlyphMask src={`/assets/tiles/${service.icon}.png`} size={20} className="text-white" />
              )}
              <span className="text-white text-[10px] font-semibold leading-none px-1 text-center">
                {t(`services.${service.slug}`)}
              </span>
            </Link>
          ))}
        </div>
      </div>

      <BottomNav />
    </div>
  )
}
