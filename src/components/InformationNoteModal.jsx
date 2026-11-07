import { useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { BuildingIcon, UserIcon, CloseIcon, ExternalLinkIcon } from './icons'
import { useLang } from '../context/LangContext'
import { nameOf } from '../data/student'

/**
 * ASSUMPTION, not read from any reference: the four photos never show what the CTA
 * does after it is pressed. qa/HANDOFF.md §8.5 records the target URL and leaves the
 * behaviour unanswered; the user's decision is "new tab, external URL", so that is
 * what ships. Change this one constant if the real behaviour turns out otherwise.
 */
const DONNEES_URL = 'https://progres.mesrs.dz/donnees/'

/**
 * §8.5 — the information-note modal, opened from Profile > settings.
 *
 * Built STRUCTURALLY from `informations1/info2/info3/info4.jpeg`, which are
 * 1536x2048 photographs of a physical screen. Per qa/PENDING.md those refs give
 * order and proportion only — they cannot yield a CSS px number or a colour — so
 * every size here is an existing token or a value already used elsewhere on the
 * page (the 24px card radius is qaSetCard's, the 44px CTA height is the logout
 * pill's), and NO qa/specs/4x-profile-* entry is written from this component.
 *
 * The declarations themselves were transcribed at native resolution from the two
 * photos, EN from informations1 and AR from info2 — they exist in no source file
 * and the donor has none either. Reading them full-size corrected three things
 * that the downscaled contact sheet had wrong: the law is 18-07 of 10 June 2018
 * (not 16-01/2016), the name is FERHATEN Yani (not FERHATNI), and there are FOUR
 * declarations (not five). The AR text independently confirms the law number.
 *
 * Title and close sit in one plain flex row, so the X lands right in EN and left
 * in AR automatically — the reference mirrors it, and this is the per-component
 * kind of mirroring that actually happens (no dir override wanted).
 */
export default function InformationNoteModal({ onClose }) {
  const { t } = useTranslation()
  const { isRtl } = useLang()
  const closeRef = useRef(null)

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    closeRef.current?.focus()
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  const link = { href: DONNEES_URL, target: '_blank', rel: 'noopener noreferrer' }

  return (
    <div data-qa="noteOverlay" className="fixed inset-0 z-[60] grid place-items-center px-6">
      <div data-qa="noteScrim" className="absolute inset-0 bg-black/45" onClick={onClose} />

      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label={t('profile.note.title')}
        data-qa="noteModal"
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.18, ease: 'easeOut' }}
        className="relative max-h-[80dvh] w-full max-w-[346px] overflow-y-auto rounded-[24px] bg-card
          p-[18px] shadow-[0_18px_48px_rgba(15,18,30,0.34)]"
      >
        <div className="flex items-center gap-3">
          <h2
            data-qa="noteTitle"
            className="min-w-0 flex-1 text-[17px] leading-6 font-bold text-ink"
          >
            {t('profile.note.title')}
          </h2>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label={t('profile.note.close')}
            data-qa="noteClose"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-ink transition active:scale-95"
          >
            <CloseIcon size={18} />
          </button>
        </div>

        <div className="mt-[14px] space-y-[10px]">
          <div
            data-qa="noteRowUniversity"
            className="flex items-center gap-3 rounded-[14px] bg-app px-[12px] py-[11px] dark:bg-field"
          >
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-[10px] bg-ink/90 text-brand dark:bg-white/10">
              <BuildingIcon size={18} />
            </span>
            <span className="min-w-0 flex-1 text-[12px] leading-4 font-bold tracking-[0.06em] uppercase text-ink">
              {t('profile.note.university')}
            </span>
          </div>

          <div
            data-qa="noteRowUndersigned"
            className="flex items-center gap-3 rounded-[14px] bg-app px-[12px] py-[11px] dark:bg-field"
          >
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-[10px] bg-ink/90 text-brand dark:bg-white/10">
              <UserIcon size={18} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[11.5px] leading-4 tracking-[0.05em] uppercase text-muted">
                {t('profile.note.undersigned')}
              </span>
              <span data-qa="noteName" className="mt-[1px] block text-[14px] leading-5 font-bold text-ink">
                {nameOf(isRtl)}
              </span>
            </span>
          </div>
        </div>

        <ol
          data-qa="noteList"
          className="mt-[14px] space-y-[6px] border-t border-hairline pt-[12px] text-[12.5px] leading-[19px] text-muted"
        >
          <li data-qa="noteD1">1. {t('profile.note.d1')}</li>
          <li data-qa="noteD2">
            2. {t('profile.note.d2a')}{' '}
            <span className="font-bold text-brand">{t('profile.note.d2b')}</span>
          </li>
          <li data-qa="noteD3">
            3. {t('profile.note.d3')}{' '}
            <a {...link} className="font-semibold text-brand underline">
              {t('profile.note.see')}
            </a>
          </li>
          <li data-qa="noteD4">
            4. {t('profile.note.d4')}{' '}
            <a {...link} className="font-semibold text-brand underline">
              {t('profile.note.see')}
            </a>
          </li>
        </ol>

        <a
          {...link}
          data-qa="noteCta"
          className="mt-[16px] flex h-[44px] w-full items-center justify-center gap-2 rounded-[14px]
            bg-brand-surface text-[15px] font-semibold text-white transition active:brightness-95"
        >
          <ExternalLinkIcon size={17} />
          {t('profile.note.seeDetails')}
        </a>
      </motion.div>
    </div>
  )
}
