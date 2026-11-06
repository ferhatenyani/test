import { createContext, useCallback, useContext, useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { LANG_STORAGE_KEY, SUPPORTED_LANGS } from '../i18n'

const LangContext = createContext(null)

export const RTL_LANGS = ['ar']

export function isRtl(lang) {
  return RTL_LANGS.includes(lang)
}

export function LangProvider({ children }) {
  const { i18n } = useTranslation()
  const lang = i18n.language

  useEffect(() => {
    const root = document.documentElement
    root.lang = lang
    root.dir = isRtl(lang) ? 'rtl' : 'ltr'
  }, [lang])

  const setLang = useCallback(
    (next) => {
      if (!SUPPORTED_LANGS.includes(next) || next === lang) return
      try {
        localStorage.setItem(LANG_STORAGE_KEY, next)
      } catch {
        /* private mode: language lives in memory only */
      }
      i18n.changeLanguage(next)
    },
    [i18n, lang],
  )

  const value = useMemo(
    () => ({ lang, dir: isRtl(lang) ? 'rtl' : 'ltr', setLang, isRtl: isRtl(lang) }),
    [lang, setLang],
  )
  return <LangContext.Provider value={value}>{children}</LangContext.Provider>
}

export function useLang() {
  const ctx = useContext(LangContext)
  if (!ctx) throw new Error('useLang must be used inside LangProvider')
  return ctx
}
