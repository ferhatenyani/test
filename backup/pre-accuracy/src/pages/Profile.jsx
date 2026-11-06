import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import BottomNav from '../components/BottomNav'
import GlyphMask from '../components/GlyphMask'
import { useAuth } from '../context/AuthContext'
import { useLang } from '../context/LangContext'
import { useTheme, THEMES } from '../context/ThemeContext'
import { STUDENT } from '../data/student'
import {
  CalendarIcon,
  ChevronRightIcon,
  LogoutIcon,
  PinIcon,
  ShieldCheckIcon,
  InfoIcon,
  ThemeMoonIcon,
  ThemeSunIcon,
  ThemeSystemIcon,
  TranslateIcon,
} from '../components/icons'

function Row({ children }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3.5 [&:not(:last-child)]:border-b border-hairline">
      {children}
    </div>
  )
}

function Label({ icon, title, sub }) {
  return (
    <>
      <span className="w-6 shrink-0 grid place-items-center text-brand">{icon}</span>
      <span className="flex-1 min-w-0">
        <span className="block text-[14.5px] font-bold leading-tight">{title}</span>
        {sub ? <span className="block text-[12.5px] text-muted mt-0.5">{sub}</span> : null}
      </span>
    </>
  )
}

const THEME_ICONS = {
  system: ThemeSystemIcon,
  dark: ThemeMoonIcon,
  light: ThemeSunIcon,
}

export default function Profile() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { signOut } = useAuth()
  const { lang, setLang } = useLang()
  const { theme, setTheme } = useTheme()

  const logout = () => {
    signOut()
    navigate('/login', { replace: true })
  }

  return (
    <div className="app-shell bg-app">
      <div className="px-4 pt-[max(16px,env(safe-area-inset-top))] pb-[120px]">
        <div className="flex flex-col items-center pt-2">
          <img
            src="/assets/avatar.png"
            alt={STUDENT.fullName}
            className="w-[78px] h-[78px] rounded-full object-cover ring-2 ring-hairline select-none"
            draggable={false}
          />
          <h1 className="mt-3 text-[21px] font-extrabold tracking-tight">{STUDENT.fullName}</h1>
        </div>

        <h2 className="mt-7 mb-2 px-1 text-[11.5px] font-bold uppercase tracking-[0.07em] text-muted">
          {t('profile.personalInformation')}
        </h2>
        <section className="bg-card rounded-[20px] border border-hairline overflow-hidden">
          <Row>
            <Label icon={<PinIcon size={20} />} title={t('profile.placeOfBirth')} />
            <span className="text-[14.5px] font-extrabold">{STUDENT.placeOfBirth}</span>
          </Row>
          <Row>
            <Label icon={<CalendarIcon size={20} />} title={t('profile.dateOfBirth')} />
            <span className="text-[14.5px] font-extrabold">{STUDENT.dateOfBirth}</span>
          </Row>
        </section>

        <h2 className="mt-6 mb-2 px-1 text-[11.5px] font-bold uppercase tracking-[0.07em] text-muted">
          {t('profile.settings')}
        </h2>
        <section className="bg-card rounded-[20px] border border-hairline overflow-hidden">
          <Row>
            <Label icon={<TranslateIcon size={21} />} title={t('profile.changeLanguage')} />
            <div className="flex bg-app rounded-full p-1 gap-1">
              {['en', 'ar'].map((code) => (
                <button
                  key={code}
                  type="button"
                  onClick={() => setLang(code)}
                  aria-pressed={lang === code}
                  className={`h-[26px] px-3 rounded-full text-[11.5px] font-extrabold uppercase transition-colors ${
                    lang === code ? 'bg-brand text-white' : 'text-muted'
                  }`}
                >
                  {code}
                </button>
              ))}
            </div>
          </Row>

          <Row>
            <Label icon={<TranslateIcon size={21} />} title={t('profile.theme')} />
            <div className="flex gap-1.5" dir="ltr">
              {THEMES.map((mode) => {
                const Icon = THEME_ICONS[mode]
                const activeTheme = theme === mode
                return (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setTheme(mode)}
                    aria-pressed={activeTheme}
                    aria-label={t(`profile.theme${mode === 'system' ? 'System' : mode === 'dark' ? 'Dark' : 'Light'}`)}
                    className={`w-[34px] h-[34px] grid place-items-center rounded-[11px] transition-colors ${
                      activeTheme ? 'bg-brand text-white' : 'bg-app text-muted'
                    }`}
                  >
                    <Icon size={18} />
                  </button>
                )
              })}
            </div>
          </Row>

          <Link to="/verify" className="block">
            <Row>
              <Label
                icon={<ShieldCheckIcon size={21} />}
                title={t('profile.twoFactor')}
                sub={STUDENT.twoFactorEnabled ? t('profile.enabled') : undefined}
              />
              <ChevronRightIcon size={19} className="text-muted shrink-0" />
            </Row>
          </Link>

          <Link to="/service/other-services">
            <Row>
              <Label icon={<InfoIcon size={21} />} title={t('profile.informationNote')} />
              <ChevronRightIcon size={19} className="text-muted shrink-0" />
            </Row>
          </Link>
        </section>

        <button
          type="button"
          onClick={logout}
          className="mt-6 w-full h-[52px] rounded-full bg-danger text-white font-extrabold text-[15px] tracking-wide flex items-center justify-center gap-2 active:brightness-95 transition"
        >
          <LogoutIcon size={19} />
          {t('profile.logout')}
        </button>
      </div>

      <BottomNav />
    </div>
  )
}
