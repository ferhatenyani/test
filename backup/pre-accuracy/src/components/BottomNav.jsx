import { Link, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import GlyphMask from '../components/GlyphMask'

const ITEMS = [
  { path: '/home', key: 'home', icon: '/assets/nav/home.png' },
  { path: '/cards', key: 'cards', icon: '/assets/nav/cards.png' },
  { path: '/profile', key: 'profile', icon: '/assets/nav/profile.png' },
]

/**
 * Measured: 64 CSS tall, 24 CSS side margins, radius 11, glyph 20, label 9.5
 * regular weight. dir="ltr" is deliberate — the reference keeps Home on the
 * left in Arabic too.
 */
export default function BottomNav() {
  const { pathname } = useLocation()
  const { t } = useTranslation()
  const active = ITEMS.findIndex((i) => pathname.startsWith(i.path))

  return (
    <nav
      dir="ltr"
      aria-label="Primary"
      className="fixed bottom-0 left-0 right-0 z-50 px-6 pb-[calc(env(safe-area-inset-bottom)+12px)]"
    >
      <div className="relative bg-nav rounded-[11px] h-16 shadow-[0_8px_24px_rgba(15,18,30,0.28)]">
        <div className="flex items-stretch h-full relative">
          {active !== -1 && (
            <motion.div
              layoutId="activeTab"
              initial={false}
              transition={{ duration: 0.2, ease: 'linear' }}
              className="absolute top-0 bottom-0 bg-nav-active border border-nav-active-border rounded-[11px]"
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
                className="relative z-10 flex-1 flex flex-col items-center justify-center gap-[6px] rounded-[11px]"
              >
                <GlyphMask
                  src={item.icon}
                  size={item.key === 'cards' ? 21 : 20}
                  className="text-white"
                />
                <span className="text-white text-[9.5px] font-normal leading-none">
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
