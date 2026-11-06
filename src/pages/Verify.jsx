import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import QRCode from 'react-qr-code'
import OtpInput from '../components/OtpInput'
import { useAuth } from '../context/AuthContext'
import { TOTP_SECRET_DISPLAY, totpUri } from '../data/student'
import {
  CheckIcon,
  ChevronLeftIcon,
  ClipboardIcon,
  CopyIcon,
  InfoIcon,
  ShieldCheckIcon,
} from '../components/icons'

async function writeClipboard(text) {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

/**
 * Every number below is transcribed from the authoritative 2FA capture
 * "WhatsApp Image 2026-10-25 at 18.35.12.jpeg" — 591x1280 device px on profile
 * a394 = 394x853 CSS, so device px ÷ 1.5. Read with scripts/qa/pxprobe.mjs
 * (row / col / bbox / box / at); the probe calls and their output are recorded
 * in qa/specs/11-verify-en-light.json "source" and in the qa/refs/verify.json
 * note. Nothing here is eyeballed off an image.
 *
 * Page column: the capture's cards start at x=16 and end at x=378 (row y=530
 * Δ>6: #f5f6f8 -> #feffff at x=16.0; x=378 back to page bg), i.e. 16 CSS gutters.
 * Header row is full-bleed left: the chevron ink is x 4..13.5, y 96.5..112.5,
 * which maps a 24 CSS chevron box to x=-3 — the back button is NOT inside the
 * 16 CSS gutter and the glyph is 24 CSS, not 17.
 *
 * Vertical chain (ink boxes, CSS y): title 96.5..112.5 · "Enable 2FA"
 * 138..149.5 (cx 196.8 -> centred) · subtitle 162.5..172.5 (one line, centred)
 * · mint banner 186..213.5 · QR card 218.5..383.5 · amber banner 391.5..427 ·
 * manual-code label 440.5..446.5 · secret ink 470..478.5 · sheet 500..698.5 ·
 * "Later" 713..724.5.
 *
 * The secret string sits on the page background: box 60,464 200x26 reads
 * #f3f4f8/#f4f5f9 (the page #f5f6f8) and row y=487 across the full width has
 * no edge at Δ>4 — there is no white card there, only 13 CSS inner padding.
 *
 * Button.jsx is the login agent's file this pass and its `md` size is 40 CSS;
 * the capture's CTA is 42 (y 644..686) so the CTA is local markup here and the
 * shared change is requested in qa/requests/verify.md.
 */
export default function Verify() {
  const [code, setCode] = useState('')
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()
  const { signIn } = useAuth()
  const { t } = useTranslation()

  const complete = code.length === 6

  const done = () => {
    signIn()
    navigate('/home', { replace: true })
  }

  const confirm = () => {
    if (!complete) {
      setError(t('verify.invalidCode'))
      return
    }
    setError('')
    done()
  }

  const copySecret = async () => {
    if (await writeClipboard(TOTP_SECRET_DISPLAY.replace(/\s/g, ''))) {
      setCopied(true)
      setTimeout(() => setCopied(false), 1600)
    }
  }

  const paste = async () => {
    try {
      const text = (await navigator.clipboard.readText())?.replace(/\D/g, '') ?? ''
      if (text) {
        setCode(text.slice(0, 6))
        setError('')
      }
    } catch {
      /* clipboard read denied — the boxes still accept typing */
    }
  }

  return (
    <div className="app-shell bg-app">
      <div className="px-[16px] pt-[calc(env(safe-area-inset-top)+92px)] pb-[40px]">
        <div className="-mx-[16px] flex items-center gap-[5px]">
          <button
            type="button"
            data-qa="backBtn"
            onClick={() => navigate('/login')}
            aria-label={t('common.back')}
            className="-ms-[3px] w-[24px] h-[24px] shrink-0 grid place-items-center rounded-[12px] text-ink active:bg-hairline"
          >
            <ChevronLeftIcon size={24} />
          </button>
          <h1
            data-qa="title"
            className="text-[13.5px] leading-[20px] font-extrabold tracking-[-0.01em] text-ink"
          >
            {t('verify.title')}
          </h1>
        </div>

        <h2
          data-qa="heading"
          className="mt-[16px] text-center text-[16px] leading-[24px] font-extrabold text-ink"
        >
          {t('verify.enable')}
        </h2>
        <p
          data-qa="subtitle"
          className="mt-[3px] text-center text-[10.5px] leading-[15px] text-label"
        >
          {t('verify.scanHint')}
        </p>

        <div
          data-qa="infoBanner"
          className="mt-[12px] flex items-center gap-[6px] rounded-[8px] bg-info-bg px-[6px] py-[5px] text-info-fg"
        >
          <ShieldCheckIcon size={17} className="shrink-0" />
          {/* 10 CSS is what the capture's single-line banner (h 27.5, one text
              line) allows; Poppins is ~11% wider than the capture's font, so
              -0.01em tracking + a 6 CSS gutter budget keep it on one line
              instead of wrapping to two and pushing the whole page down 8.5. */}
          <p
            data-qa="infoText"
            className="text-[10px] leading-[13px] font-semibold tracking-[-0.01em]"
          >
            {t('verify.protectNote')}
          </p>
        </div>

        <div className="mt-[5px] flex justify-center">
          <div
            data-qa="qrCard"
            className="rounded-[13px] bg-card p-[17px] shadow-[0_10px_24px_rgba(15,25,35,0.10)]"
          >
            {/* react-qr-code does not forward data-* to its <svg>, so the ink
                box is measured through this wrapper: 129 CSS square, card
                padding 17 -> 163 square. */}
            <div data-qa="qr" className="block leading-none">
              <QRCode value={totpUri()} size={129} />
            </div>
          </div>
        </div>

        <div
          data-qa="warnBanner"
          className="mt-[10px] flex items-start gap-[7px] rounded-[8px] bg-warn-bg px-[7px] py-[4px] text-warn-fg"
        >
          <InfoIcon size={17} className="shrink-0" />
          <p data-qa="warnText" className="text-[10px] leading-[13.5px] font-medium">
            {t('verify.loseNote')}
          </p>
        </div>

        <p
          data-qa="manualLabel"
          className="mt-[11px] text-[9px] font-medium uppercase leading-[12px] tracking-[0.05em] text-label"
        >
          {t('verify.manualLabel')}
        </p>
        <div
          data-qa="secretRow"
          className="mt-[8px] flex items-center gap-[8px] rounded-[8px] px-[13px] py-[10px]"
        >
          <span
            data-qa="secretText"
            className="flex-1 text-[11.5px] font-bold leading-[16px] tracking-[0.01em] break-all text-ink"
          >
            {TOTP_SECRET_DISPLAY}
          </span>
          <button
            type="button"
            data-qa="copyBtn"
            onClick={copySecret}
            aria-label={t('verify.copySecret')}
            className="grid h-[15px] w-[15px] shrink-0 place-items-center text-label active:text-ink"
          >
            {copied ? <CheckIcon size={14} className="text-brand" /> : <CopyIcon size={15} />}
          </button>
        </div>

        <div
          data-qa="sheetCard"
          className="mt-[7px] overflow-hidden rounded-[20px] bg-card shadow-[0_10px_24px_rgba(15,25,35,0.08)]"
        >
          <div data-qa="sheetBar" className="h-[5px] bg-gradient-to-r from-[#0e8b70] to-[#0dcca6]" />
          <div data-qa="sheetBody" className="px-[13px] pt-[13px] pb-[12px]">
            <p
              data-qa="sheetLabel"
              className="text-[9px] font-medium uppercase leading-[13px] tracking-[0.05em] text-label"
            >
              {t('verify.confirmLabel')}
            </p>
            <div className="mt-[13px] flex justify-end">
              <button
                type="button"
                data-qa="pasteBtn"
                onClick={paste}
                className="inline-flex items-center gap-[6px] px-[4px] text-[11.5px] font-semibold leading-[17px] text-brand"
              >
                <ClipboardIcon size={13} />
                {t('verify.pasteCode')}
              </button>
            </div>

            <div className="mt-[18px]">
              <OtpInput
                value={code}
                onChange={(v) => {
                  setCode(v)
                  if (v.length === 6) setError('')
                }}
                error={error}
              />
              {error ? (
                <p data-qa="otpError" className="mt-[6px] text-[10.5px] font-semibold leading-[14px] text-error">
                  {error}
                </p>
              ) : null}
            </div>

            <button
              type="button"
              data-qa="cta"
              onClick={confirm}
              className={`mt-[11px] h-[42px] w-full rounded-[21px] text-[12.5px] font-bold tracking-[0.02em] text-white transition-colors ${
                complete ? 'bg-brand active:bg-brand-dark' : 'bg-gradient-to-r from-[#73c6b2] to-[#74e6cf]'
              }`}
            >
              {t('verify.turnOn')}
            </button>
          </div>
        </div>

        <div className="mt-[13px] flex justify-center">
          <button
            type="button"
            data-qa="laterBtn"
            onClick={done}
            className="text-[10.5px] font-semibold leading-[16px] text-label underline underline-offset-[3px]"
          >
            {t('verify.later')}
          </button>
        </div>
      </div>
    </div>
  )
}
