/**
 * Split the two monolithic i18n files into one file per namespace so parallel
 * page agents each own a disjoint set of translation files.
 *   node scripts/split-i18n.mjs
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import path from 'node:path'

const ROOT = path.resolve(import.meta.dirname, '..')
const I18N = path.join(ROOT, 'src/i18n')

for (const lang of ['en', 'ar']) {
  const full = JSON.parse(readFileSync(path.join(I18N, `${lang}.json`), 'utf8'))
  const dir = path.join(I18N, lang)
  mkdirSync(dir, { recursive: true })
  for (const [ns, val] of Object.entries(full)) {
    const body = typeof val === 'object' && val !== null ? val : { '': val }
    writeFileSync(path.join(dir, `${ns}.json`), JSON.stringify(body, null, 2) + '\n')
    console.log(`${lang}/${ns}.json (${Object.keys(body).length} keys)`)
  }
}
