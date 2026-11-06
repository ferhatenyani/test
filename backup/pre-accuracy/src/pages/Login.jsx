import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import Field from '../components/Field'
import Button from '../components/Button'
import { LockIcon, UserIcon } from '../components/icons'

const rise = { initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 } }

/**
 * Measured from the 540x1170 login capture (÷1.5 -> CSS): green band 112 with a
 * 27 bottom radius, logo card 273x161 (radius 16) overlapping it, title 23/800,
 * 36x3 underline 13 below, form card 323 (radius 16, px-5, pt-28) with two
 * fields 23 apart, 50 CSS letterspaced LOGIN button 27 below, single-line
 * copyright anchored near the bottom.
 */
export default function Login() {
  const [user, setUser] = useState('')
  const [pass, setPass] = useState('')
  const [errors, setErrors] = useState({})
  const navigate = useNavigate()
  const { t } = useTranslation()

  const submit = (e) => {
    e.preventDefault()
    const next = {}
    if (!user.trim()) next.user = t('login.registrationRequired')
    if (!pass) next.pass = t('login.passwordRequired')
    setErrors(next)
    if (Object.keys(next).length === 0) navigate('/verify')
  }

  return (
    <div className="app-shell relative bg-app flex flex-col overflow-hidden">
      <div className="absolute inset-x-0 top-0 bg-brand rounded-b-[27px] h-[calc(env(safe-area-inset-top)+112px)]" />

      <div className="relative flex flex-col items-center px-5 flex-1">
        <motion.div
          {...rise}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="w-[273px] max-w-full h-[161px] mt-[calc(env(safe-area-inset-top)+49px)]
            rounded-[16px] bg-card shadow-[0_10px_28px_rgba(15,25,35,0.12)]
            grid place-items-center"
        >
          <img
            src="/assets/logo-progress.png"
            alt="PROGRES — Ministry of Higher Education and Scientific Research"
            className="logo-ink w-[200px] h-auto select-none pointer-events-none"
            draggable={false}
          />
        </motion.div>

        <motion.h1
          {...rise}
          transition={{ duration: 0.25, delay: 0.05, ease: 'easeOut' }}
          className="mt-[32px] text-[23px] font-extrabold tracking-[-0.01em] text-ink text-center"
        >
          {t('app.title')}
        </motion.h1>
        <span className="mt-[13px] h-[3px] w-9 rounded-full bg-brand" />

        <motion.form
          {...rise}
          transition={{ duration: 0.28, delay: 0.1, ease: 'easeOut' }}
          onSubmit={submit}
          noValidate
          className="mt-[23px] w-[323px] max-w-full rounded-[16px]
            bg-[#f7f8fa] dark:bg-card px-5 pt-[28px] pb-[10px]
            shadow-[0_6px_22px_rgba(15,25,35,0.06)]"
        >
          <Field
            id="reg"
            label={t('login.registrationLabel')}
            value={user}
            onChange={(v) => {
              setUser(v)
              if (errors.user) setErrors((p) => ({ ...p, user: '' }))
            }}
            error={errors.user}
            icon={UserIcon}
            autoComplete="username"
            enterKeyHint="next"
          />
          <div className="h-[23px]" />
          <Field
            id="pass"
            type="password"
            label={t('login.passwordLabel')}
            value={pass}
            onChange={(v) => {
              setPass(v)
              if (errors.pass) setErrors((p) => ({ ...p, pass: '' }))
            }}
            error={errors.pass}
            icon={LockIcon}
            autoComplete="current-password"
          />
          {/* Solid brand even when empty: the reference shows no disabled tint on
              this design — tapping an empty form just fires validation. */}
          <Button type="submit" size="lg" className="mt-[27px]">
            {t('login.continue')}
          </Button>
        </motion.form>

        <footer className="mt-auto pt-6 pb-[48px] text-center">
          <p className="text-[10.5px] font-medium text-label">{t('login.copyright')}</p>
        </footer>
      </div>
    </div>
  )
}