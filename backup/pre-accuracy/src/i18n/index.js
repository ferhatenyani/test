import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import en from './en.json'
import ar from './ar.json'

export const LANG_STORAGE_KEY = 'webetu.lang'
export const SUPPORTED_LANGS = ['en', 'ar']

function readStoredLang() {
  try {
    const stored = localStorage.getItem(LANG_STORAGE_KEY)
    return SUPPORTED_LANGS.includes(stored) ? stored : null
  } catch {
    return null
  }
}

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    ar: { translation: ar },
  },
  lng: readStoredLang() ?? 'en',
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
  returnNull: false,
})

export default i18n
