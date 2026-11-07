import { Link, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import GlyphMask from '../components/GlyphMask'
import { useLang } from '../context/LangContext'

const ITEMS = [
  { path: '/home', key: 'home', icon: '/assets/nav/home.png' },
  { path: '/cards', key: 'cards', icon: '/assets/nav/cards.png' },
  { path: '/profile', key: 'profile', icon: '/assets/nav/profile.png' },
]

/**
 * Geometry transcribed from the a394 home captures with scripts/qa/pxprobe.mjs
 * (device px ÷ 1.5):
 *  - bar 24,744.5 -> 369.5,810.5, i.e. 346x66, radius ~12 (the top edge sits 6
 *    CSS px lower at x=26 than at x=34, which only fits a large radius)
 *  - active pill is exactly one third of the bar (24..139) and full height
 *  - bg #33354e and pill #009577 in *both* themes (sampled at 197,800 and
 *    60,790 in the light and the dark capture: identical)
 *  - icon ink centred at y 766.5, label ink 784..791.5
 *  - the bar's bottom edge is 42.5 above the 853 viewport bottom — the phone's
 *    gesture area. That is the capture's 34 CSS px inset plus the app's own 8.5,
 *    so the padding is `max(10px, --safe-bottom) + 8.5px` and `measure.mjs` pins
 *    the var to 34 headless. The old `max(42.5px, env(...))` floor reserved the
 *    gesture area twice on a device that reports a smaller inset, which is what
 *    left the deck floating too far off the bottom on a real phone.
 *
 * dir="ltr" is deliberate — the reference keeps Home on the left in Arabic too
 * (the green pill spans 24..139 in the AR capture exactly as in EN).
 */
export default function BottomNav() {
  const { pathname } = useLocation()
  const { t } = useTranslation()
  const { isRtl } = useLang()
  const active = ITEMS.findIndex((i) => pathname.startsWith(i.path))

  return (
    <nav
      dir="ltr"
      aria-label="Primary"
      data-qa="bottomNav"
      className="fixed bottom-0 left-0 right-0 z-50 px-6 pb-[calc(max(10px,var(--safe-bottom))+8.5px)]"
    >
      <div
        data-qa="navBar"
        className="relative h-[66px] rounded-[12px] bg-nav shadow-[0_8px_24px_rgba(15,18,30,0.28)]"
      >
        <div className="relative flex h-full items-stretch">
          {active !== -1 && (
            <motion.div
              layoutId="activeTab"
              initial={false}
              transition={{ duration: 0.2, ease: 'linear' }}
              data-qa="navPill"
              className="absolute top-0 bottom-0 rounded-[12px] border border-nav-active-border bg-nav-active"
              style={{
                width: `${100 / ITEMS.length}%`,
                left: `${(active * 100) / ITEMS.length}%`,
              }}
            />
          )}
          {ITEMS.map((item) => {
            const isActive = pathname.startsWith(item.path)
            return (
              <Link
                key={item.path}
                to={item.path}
                aria-current={isActive ? 'page' : undefined}
                data-qa={`navItem-${item.key}`}
                className="relative z-10 flex flex-1 flex-col items-center justify-start gap-[7px]
                  rounded-[12px] pt-[12px]"
              >
                <GlyphMask data-qa={`navIcon-${item.key}`} src={item.icon} size={20} className="text-white" />
                <span
                  data-qa={`navLabel-${item.key}`}
                  className={`text-white leading-none ${
                    isRtl ? 'text-[10px]' : 'text-[8.5px]'
                  }`}
                >
                  {t(`nav.${item.key}`)}
                </span>
              </Link>
            )
          })}
        </div>
      </div>
    </nav>
  )
}
