import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import QRCode from 'react-qr-code'
import Button from '../components/Button'
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
 * Measured from the 591x1280 capture (÷1.5 -> CSS): page 57 below the status
 * bar, thin 17 chevron + 15/800 title, 16.5/800 "Enable 2FA", 10.7 subtitle,
 * 25 CSS mint banner, 168 CSS QR card, 35 CSS amber banner, 11.3/700 secret in
 * a 7-radius card, sheet with a 5 CSS green bar, 45x50 OTP boxes, 40 CSS
 * gradient CTA, 10.7 "Later".
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
      <div className="px-[18px] pt-[calc(env(safe-area-inset-top)+57px)] pb-10">
        <div className="flex items-center gap-[10px] min-h-[20px]">
          <button
            type="button"
            onClick={() => navigate('/login')}
            aria-label={t('common.back')}
            className="w-6 h-6 grid place-items-center rounded-full active:bg-hairline shrink-0"
          >
            <ChevronLeftIcon size={17} />
          </button>
          <h1 className="text-[15px] font-extrabold tracking-tight">{t('verify.title')}</h1>
        </div>

        <h2 className="mt-[24px] text-center text-[16.5px] font-extrabold">{t('verify.enable')}</h2>
        <p className="mt-[10px] text-center text-[10.5px] text-label leading-snug px-2">
          {t('verify.scanHint')}
        </p>

        <div className="flex items-start gap-[8px] mt-[11px] bg-info-bg text-info-fg rounded-[7px] px-[10px] py-[6px]">
          <ShieldCheckIcon size={13} className="shrink-0 mt-0.5" />
          <p className="text-[10px] font-semibold leading-snug">{t('verify.protectNote')}</p>
        </div>

        <div className="flex justify-center mt-[8px]">
          <div className="bg-card rounded-[13px] shadow-[0_10px_24px_rgba(15,25,35,0.10)] p-[18px]">
            <QRCode value={totpUri()} size={132} />
          </div>
        </div>

        <div className="flex items-start gap-[8px] mt-[7px] bg-warn-bg text-warn-fg rounded-[7px] px-[10px] py-[7px]">
          <InfoIcon size={15} className="shrink-0 mt-0.5" />
          <p className="text-[10px] font-medium leading-snug">{t('verify.loseNote')}</p>
        </div>

        <p className="mt-[13px] mb-[1px] px-0.5 text-[10px] font-medium uppercase tracking-[0.04em] text-label">
          {t('verify.manualLabel')}
        </p>
        <div className="flex items-center gap-[8px] mt-[12px] bg-card rounded-[7px] px-[9px] py-[10px]">
          <button
            type="button"
            onClick={copySecret}
            aria-label={t('verify.copySecret')}
            className="w-[15px] h-[15px] grid place-items-center text-label active:text-ink shrink-0"
          >
            {copied ? <CheckIcon size={14} className="text-brand" /> : <CopyIcon size={15} />}
          </button>
          <span className="flex-1 text-[11.5px] font-bold tracking-[0.01em] leading-snug break-all">
            {TOTP_SECRET_DISPLAY}
          </span>
        </div>

        <div className="mt-[17px] bg-card rounded-[11px] shadow-[0_10px_24px_rgba(15,25,35,0.08)] overflow-hidden">
          <div className="h-[5px] bg-brand" />
          <div className="px-[24px] pt-[10px] pb-[14px]">
            <p className="text-[10px] font-medium uppercase tracking-[0.04em] text-label">
              {t('verify.confirmLabel')}
            </p>
            <div className="flex justify-end mt-[12px]">
              <button
                type="button"
                onClick={paste}
                className="inline-flex items-center gap-[6px] text-[11.5px] font-semibold text-brand"
              >
                <ClipboardIcon size={12} />
                {t('verify.pasteCode')}
              </button>
            </div>

            <div className="mt-[14px]">
              <OtpInput
                value={code}
                onChange={(v) => {
                  setCode(v)
                  if (v.length === 6) setError('')
                }}
                error={error}
              />
              {error ? (
                <p className="mt-[6px] text-[10.5px] font-semibold text-error">{error}</p>
              ) : null}
            </div>

            <Button active={complete} size="md" onClick={confirm} className="mt-[29px]">
              {t('verify.turnOn')}
            </Button>
          </div>
        </div>

        <div className="text-center mt-[28px]">
          <button
            type="button"
            onClick={done}
            className="text-[10.5px] font-semibold text-label underline underline-offset-4"
          >
            {t('verify.later')}
          </button>
        </div>
      </div>
    </div>
  )
}