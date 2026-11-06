import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

/**
 * Translations live one file per namespace under <lang>/ so parallel work on
 * different pages never edits the same JSON. import.meta.glob keeps the merge
 * automatic when a namespace file is added.
 */
function mergeNs(modules) {
  const out = {}
  for (const [file, mod] of Object.entries(modules)) {
    const ns = file.slice(file.lastIndexOf('/') + 1).replace(/\.json$/, '')
    out[ns] = mod
  }
  return out
}

const en = mergeNs(import.meta.glob('./en/*.json', { eager: true, import: 'default' }))
const ar = mergeNs(import.meta.glob('./ar/*.json', { eager: true, import: 'default' }))

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
