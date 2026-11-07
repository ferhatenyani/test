import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../context/AuthContext'
import { useLang } from '../context/LangContext'
import { useTheme } from '../context/ThemeContext'
import { STUDENT, nameOf, placeOfBirthOf } from '../data/student'
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
import InformationNoteModal from '../components/InformationNoteModal'

/* Geometry below was read off the 18.34.09 photos, which are 2048x1536 photos OF A
   PHYSICAL SCREEN (landscape, moiré, perspective). They are good for ORDER and
   PROPORTION only: they cannot give a transcribable CSS px number, and they must
   never be used for colour. There is deliberately NO qa/specs/4x-profile-* file
   yet and no qa/requests/profile.md — see qa/PENDING.md "PHASE 5", which records
   why writing capture:null specs here would produce render-derived false greens.

   Dark surfaces: page #101115 and card #171a21 (login-dark 18.25.56 (2)/(4),
   home-dark 18.56.17 / 18.56.55 (1)). These now EQUAL index.css's dark tokens
   --app / --card, so the `dark:bg-[...]` classes on this page are no-ops kept
   only until the Profile specs exist that would prove it; they are NOT a
   disagreement with the tokens. */

// §8.3 USER-DIRECTED styling (reported 2026-10-26): row titles gray not black, the
// Akbou / 12-03-2003 value weight too big, the logout pill and the EN/AR + theme
// segmented controls too rounded. These are directed opinions, NOT measurements —
// the only Profile refs are photos of a physical screen. The magnitudes below are
// deliberately modest and are NOT written into any qa/specs/4x-profile-* file, so
// they cannot become false greens; they need the user's eye to settle.
//
// Round 2 (2026-11-06, against screenshots/profile.jpeg — still a photo of a
// physical screen, so still order/proportion only and still no spec numbers):
// the PERSONAL INFORMATION / SETTINGS eyebrows, the LOGOUT label and the modal's
// See CTA all read too heavy, so 700/800 -> 500/600; and the theme glyphs were the
// wrong glyphs, not the wrong weight — the row icon and the third segment are the
// same moon-star-slashed-sun mark, and the dark segment is an OUTLINED crescent
// with two stars. See ThemeSystemIcon / ThemeMoonIcon in components/icons.jsx.
const THEME_ORDER = ['light', 'dark', 'system']
const THEME_ICONS = { system: ThemeSystemIcon, dark: ThemeMoonIcon, light: ThemeSunIcon }

function InfoRow({ qa, icon, label, value }) {
  return (
    <div data-qa={qa} className="flex h-[66px] items-center gap-5 px-[14px]">
      <span data-qa={`${qa}Icon`} className="grid h-6 w-6 shrink-0 place-items-center text-brand">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span data-qa={`${qa}Label`} className="block text-[12px] leading-4 text-muted">
          {label}
        </span>
        <span data-qa={`${qa}Value`} className="mt-[2px] block text-[14px] font-bold leading-5">
          {value}
        </span>
      </span>
    </div>
  )
}

function Hair({ qa }) {
  return <div data-qa={qa} className="h-px w-full bg-hairline dark:bg-[#21252e]" />
}

export default function Profile() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { signOut } = useAuth()
  const { lang, setLang, isRtl } = useLang()
  const { theme, setTheme } = useTheme()
  const [noteOpen, setNoteOpen] = useState(false)

  const logout = () => {
    signOut()
    navigate('/login', { replace: true })
  }

  return (
    <div data-qa="qaPage" className="app-shell bg-app dark:bg-[#101115]">
      {/* Header: full-bleed card with rounded bottom, avatar + name inside. */}
      <section
        data-qa="qaHeaderCard"
        className="flex flex-col items-center rounded-b-[24px] bg-card pb-[43px] pt-[16px] dark:bg-[#171a21]"
      >
        <img
          data-qa="qaAvatar"
          src="/assets/avatar.jpg"
          alt={nameOf(isRtl)}
          className="h-[48px] w-[48px] rounded-full object-cover object-top shadow-[0_2px_10px_rgba(0,0,0,0.18)] ring-[2px] ring-hairline select-none dark:ring-[#21252e]"
          draggable={false}
        />
        <h1 data-qa="qaName" className="mt-[21px] text-[21px] font-extrabold leading-[26px] tracking-[-0.01em]">
          {nameOf(isRtl)}
        </h1>
      </section>

      <div className="px-[21px] pb-[120px]">
        <h2
          data-qa="qaPiLabel"
          className="mt-[15px] px-[5px] text-[11px] leading-[15px] font-medium tracking-[0.07em] text-muted uppercase"
        >
          {t('profile.personalInformation')}
        </h2>
        <section
          data-qa="qaInfoCard"
          className="mt-[11px] overflow-hidden rounded-[24px] bg-card dark:bg-[#171a21]"
        >
          <InfoRow
            qa="qaPob"
            icon={<PinIcon size={20} />}
            label={t('profile.placeOfBirth')}
            value={placeOfBirthOf(isRtl)}
          />
          <Hair qa="qaInfoHair" />
          <InfoRow
            qa="qaDob"
            icon={<CalendarIcon size={20} />}
            label={t('profile.dateOfBirth')}
            value={STUDENT.dateOfBirth}
          />
        </section>

        <h2
          data-qa="qaSetLabel"
          className="mt-[13px] px-[5px] text-[11px] leading-[15px] font-medium tracking-[0.07em] text-muted uppercase"
        >
          {t('profile.settings')}
        </h2>
        <section
          data-qa="qaSetCard"
          className="mt-[10px] overflow-hidden rounded-[24px] bg-card dark:bg-[#171a21]"
        >
          {/* Language: EN/AR segmented control */}
          <div data-qa="qaLangRow" className="flex h-[46px] items-center gap-5 px-[14px]">
            <span data-qa="qaLangIcon" className="grid h-6 w-6 shrink-0 place-items-center text-brand">
              <TranslateIcon size={22} />
            </span>
            <span data-qa="qaLangLabel" className="min-w-0 flex-1 text-[14.5px] leading-5 font-medium text-muted">
              {t('profile.changeLanguage')}
            </span>
            <div
              data-qa="qaLangCtl"
              className="flex h-[36px] w-[70px] shrink-0 rounded-[12px] bg-app p-[4px] me-[2px] dark:bg-field"
            >
              {['en', 'ar'].map((code, i) => (
                <button
                  key={code}
                  data-qa={code === 'en' ? 'qaLangEn' : 'qaLangAr'}
                  type="button"
                  onClick={() => setLang(code)}
                  aria-pressed={lang === code}
                  className={`h-[27px] rounded-[9px] text-[12px] font-extrabold uppercase transition-colors ${
                    i === 0 ? 'w-[31px]' : 'w-[29px]'
                  } ${lang === code ? 'bg-brand text-white' : 'text-ink'}`}
                >
                  {code}
                </button>
              ))}
            </div>
          </div>
          <Hair qa="qaSetHair1" />

          {/* Theme: 3-way segmented control, photo order light/dark/system */}
          <div data-qa="qaThemeRow" className="flex h-[46px] items-center gap-5 px-[14px]">
            <span data-qa="qaThemeIcon" className="grid h-6 w-6 shrink-0 place-items-center text-brand">
              <ThemeSystemIcon size={20} />
            </span>
            <span data-qa="qaThemeLabel" className="min-w-0 flex-1 text-[14.5px] leading-5 font-medium text-muted">
              {t('profile.theme')}
            </span>
            <div data-qa="qaThemeCtl" className="flex h-[36px] w-[90px] shrink-0 rounded-[12px] bg-app p-[4px] me-[2px] dark:bg-field">
              {THEME_ORDER.map((mode) => {
                const Icon = THEME_ICONS[mode]
                const active = theme === mode
                return (
                  <button
                    key={mode}
                    data-qa={`qaTheme${mode[0].toUpperCase()}${mode.slice(1)}`}
                    type="button"
                    onClick={() => setTheme(mode)}
                    aria-pressed={active}
                    aria-label={t(`profile.theme${mode === 'system' ? 'System' : mode === 'dark' ? 'Dark' : 'Light'}`)}
                    className={`grid h-[27px] w-[27px] place-items-center rounded-[10px] transition-colors ${
                      active ? 'bg-brand text-white' : 'text-muted'
                    }`}
                  >
                    <Icon size={17} />
                  </button>
                )
              })}
            </div>
          </div>
          <Hair qa="qaSetHair2" />

          {/* 2FA */}
          <div data-qa="qa2faRow" className="flex h-[54px] items-center gap-5 px-[14px]">
            <button type="button" onClick={() => navigate('/verify')} className="flex flex-1 items-center gap-5 text-start">
              <span data-qa="qa2faIcon" className="grid h-6 w-6 shrink-0 place-items-center text-brand">
                <ShieldCheckIcon size={21} />
              </span>
              <span className="min-w-0 flex-1">
                <span data-qa="qa2faTitle" className="block text-[14.5px] leading-5 font-medium text-muted">
                  {t('profile.twoFactor')}
                </span>
                {STUDENT.twoFactorEnabled ? (
                  <span data-qa="qa2faSub" className="block text-[12px] leading-[14px] text-muted">
                    {t('profile.enabled')}
                  </span>
                ) : null}
              </span>
            </button>
            <ChevronRightIcon data-qa="qa2faChev" size={20} className="shrink-0 text-muted" />
          </div>
          <Hair qa="qaSetHair3" />

          {/* Information note */}
          <div data-qa="qaNoteRow" className="flex h-[44px] items-center gap-5 px-[14px]">
            <button
              type="button"
              onClick={() => setNoteOpen(true)}
              className="flex flex-1 items-center gap-5 text-start"
            >
              <span data-qa="qaNoteIcon" className="grid h-6 w-6 shrink-0 place-items-center text-brand">
                <InfoIcon size={21} />
              </span>
              <span data-qa="qaNoteTitle" className="min-w-0 flex-1 text-[14.5px] leading-5 font-medium text-muted">
                {t('profile.informationNote')}
              </span>
            </button>
            <ChevronRightIcon data-qa="qaNoteChev" size={20} className="shrink-0 text-muted" />
          </div>
        </section>

        {/* Logout: red pill; the label is centred and the icon sits beside it (photo). */}
        <button
          data-qa="qaLogout"
          type="button"
          onClick={logout}
          className="relative mt-[10px] flex h-[44px] w-full items-center justify-center rounded-[14px] bg-danger text-[16px] font-semibold text-white transition active:brightness-95"
        >
          <span data-qa="qaLogoutLabel" className="relative inline-flex items-center">
            <LogoutIcon size={20} className="absolute inset-y-0 my-auto end-full me-[6px]" />
            {t('profile.logout')}
          </span>
        </button>
      </div>

      {noteOpen && <InformationNoteModal onClose={() => setNoteOpen(false)} />}
    </div>
  )
}
