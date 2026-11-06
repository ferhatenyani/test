# Accuracy Pass — Orchestration Brief

Goal: make each page a measured replica of its reference capture. Not "looks close" — every component's geometry, colour, font size/weight and radius asserted against numbers transcribed from the screenshot.

## The reference set is authoritative, and it is 1.5x

Every capture is **1.5 device px per CSS px** and exactly **780 CSS pt tall**:

| capture px | profile | CSS viewport | harness key |
|---|---|---|---|
| 540×1170 | `a360` | 360×780 | renders 1:1 |
| 591×1280 | `a394` | 394×853 | renders 1:1 |

**To get a CSS value from a capture, divide measured device pixels by 1.5.** Sizing off raw device px makes everything ~1.5x too large and is the single most common cause of "proportions don't match".

The video `WhatsApp Video 2026-10-25 at 18.56.13.mp4` is 384×832 ≈ 1x CSS — read it directly, no division.

## Harness

```
node scripts/qa/sheet.mjs [filter]      # contact sheet of captures, labels burned in
node scripts/qa/ruler.mjs "<capture>"   # CSS-px grid overlay to transcribe numbers
node scripts/qa/pxprobe.mjs ...         # NUMERIC probe — read numbers as text, no images
node scripts/qa/measure.mjs [page]      # render + dump every [data-qa] rect/style
node scripts/qa/check.mjs   [page]      # assert measured DOM vs qa/specs/<id>.json  -> THE GATE
node scripts/qa/pixdiff.mjs [page]      # masked pixel diff -> smoke test + trend number
```

`measure` builds for you, under a global lock. Never build manually.

### Prefer `pxprobe` over looking at images

An earlier agent burned 4.9M tokens and died on a provider request timeout, because it kept reading full screenshots into context. **Images are expensive; numbers are cheap.** `pxprobe` reports edges and colours as text:

```
node scripts/qa/pxprobe.mjs "<capture>" row <cssY> [cssX0] [cssX1]   # colour transitions along a scanline
node scripts/qa/pxprobe.mjs "<capture>" col <cssX> [cssY0] [cssY1]   # vertical edges
node scripts/qa/pxprobe.mjs "<capture>" at <cssX> <cssY>             # one pixel's hex colour
node scripts/qa/pxprobe.mjs "<capture>" box <cssX> <cssY> <w> <h>    # colour histogram of a region
node scripts/qa/pxprobe.mjs "<capture>" bbox <x0> <y0> <x1> <y1>     # tight box of non-bg pixels (BG=hex, MIN=delta)
```

Coordinates are CSS px and it prints device-px÷scale itself. It accepts a `qa/out/<id>` render name too, so the **same call** measures reference and render — that is how you compare a glyph size or text baseline without eyeballing anything. `MIN`/`BG`/`TOP` come from env.

Budget your image reads: one `sheet.mjs` to confirm pairing, then `pxprobe` for every number. Read an individual capture only if a probe leaves a genuine ambiguity, and say which one and why.

**`ruler.mjs` is a last resort, not a default.** It emits a 2x-zoomed PNG of the whole capture (~600x1560 px) — reading several of them is what killed four page agents at ~5M tokens each. Reach for `pxprobe row|col|bbox` first; it answers the same question in four lines of text.



### Gate vs smoke test — do not confuse them

- **`check.mjs` is the gate.** It compares the real DOM against your spec numbers. It is deterministic and it names the exact failing component and field.
- **`pixdiff.mjs` is a smoke test.** It can never reach 0% (font hinting, JPEG artifacts, OS chrome). Use it to catch what you forgot to assert and to show the number went down. Its bands are in `qa/refs/*.json` `mask`, default `[[0,38],[1136,1170]]` for a360 — the status bar and gesture pill, which no app can repaint.

## Workflow per page (repeat until green)

1. `node scripts/qa/sheet.mjs <time-prefix>` and **confirm which capture actually shows your page**. Pairings have been wrong before: `18.18.55` and `18.22.04` are both **HOME**, not login. A nonsense pairing produces confident nonsense.
2. `node scripts/qa/ruler.mjs "<capture>"` — read the grid, transcribe CSS-px numbers for every component on the page. Record in the spec's `source` field how you got each number.
3. Add `data-qa="uniqueKey"` to each element you assert in **your own page/component files only**.
4. Write `qa/refs/<page>.json` scenarios and `qa/specs/<scenario>.json` expectations.
5. `npm run build && node scripts/qa/measure.mjs <prefix> && node scripts/qa/check.mjs <prefix>`.
6. Fix the **component code** until check is green. Never loosen a tolerance to pass, never edit a spec number to match a wrong render — the spec comes from the screenshot. Tolerances default to geometry ±2 CSS px, colour exact; raise one only with a stated reason in `tol`.
7. Finish with `pixdiff` and report the before/after percentage.

## Spec format

```json
{
  "source": "18.25.55.jpeg, ruler overlay, device px ÷ 1.5",
  "page": { "dir": "ltr", "lang": "en" },
  "components": [
    { "key": "pillReg", "expect": { "x": 24, "y": 300, "w": 312, "h": 48,
      "radius": 24, "fontSize": 14, "fontWeight": "500", "bg": "#ffffff",
      "borderColor": "#d8dbe0", "text": "Registration number" }, "tol": { "geom": 1.5 } }
  ]
}
```

`expect` keys: `x y w h cx cy` (CSS px, `cx`/`cy` = centre) · `fontSize lineHeight letterSpacing radius borderWidth opacity` · `fontWeight textAlign fontFamily text` (exact) · `color bg borderColor` (hex or `rgb()`, compared by max channel distance; set `"tol": {"color": 8}` for values sampled off JPEG).

## Ownership map (exclusive write scope)

Five agents run concurrently. **Edit only files in your own row.** A shared file edited by two agents loses one agent's work silently.

| Agent | Owns (may edit) | Uses but must NOT edit |
|---|---|---|
| `login` | `src/pages/Login.jsx`, `src/components/Field.jsx`, `src/components/Button.jsx`, `src/i18n/{en,ar}/login.json`, `common.json`, `qa/refs/login.json`, `qa/specs/*login*` | `BottomNav.jsx`, `icons.jsx`, `index.css` |
| `verify` | `src/pages/Verify.jsx`, `src/components/OtpInput.jsx`, `src/i18n/{en,ar}/verify.json`, `qa/refs/verify.json`, `qa/specs/*verify*` | **`Field.jsx`, `Button.jsx`**, `icons.jsx`, `index.css` |
| `home` | `src/pages/Home.jsx`, `src/components/{BottomNav,BannerCarousel,ThemeToggle}.jsx`, `src/i18n/{en,ar}/home.json`, `nav.json`, `app.json`, `qa/refs/home.json`, `qa/specs/*home*` | `icons.jsx`, `index.css`, `Button.jsx` |
| `service` | `src/pages/Service.jsx`, `src/components/{ServiceHeader,EmptyState,GlyphMask}.jsx`, `src/data/services.js`, `src/i18n/{en,ar}/services.json`, `empty.json`, `years.json`, `qa/refs/service.json`, `qa/specs/*service*` | `BottomNav.jsx`, `icons.jsx`, `index.css` |
| `profile` | `src/pages/Profile.jsx`, `src/i18n/{en,ar}/profile.json`, `qa/refs/profile.json`, `qa/specs/*profile*` | `Button.jsx`, `Field.jsx`, `BottomNav.jsx`, `ThemeToggle.jsx`, `icons.jsx`, `index.css` |

If a file you don't own needs changing to hit the reference, write the exact change to **`qa/requests/<page>.md`** and keep going on what you can. I apply those centrally between waves.

`src/pages/Cards.jsx` is excluded — no reference capture exists for it.

## Build discipline

**Never run `npm run build` or `vite preview` yourself.** `measure.mjs` builds under a global render lock (`qa/.lock`) and serialises agents; a manual build races another agent's and serves a half-written bundle. Just run `node scripts/qa/measure.mjs <page>`. If it prints `[lock] waiting`, that is correct behaviour, not a hang — let it run.

## Hard rules

- **Edit only files in your ownership list.** Shared files are off-limits: `src/index.css`, `src/components/icons.jsx`, `src/App.jsx`, `src/main.jsx`, `src/routes/*`, anything under another page's list. Parallel agents editing one file overwrite each other silently.
- **Do not change design tokens.** Use arbitrary Tailwind values (`rounded-[24px]`, `text-[13px]`, `bg-[#009577]`) in your own files. If a token in `index.css` is genuinely wrong, write it to `qa/requests/<page>.md` and I apply it centrally.
- **`100dvh`, never `100vh`.** Phone viewports only.
- Do not touch `src/pages/Cards.jsx` — it has no reference capture and is excluded from this pass.
- If you need a string that is missing, add it to **your own** namespace files under `src/i18n/en/` and `src/i18n/ar/`.

## Report back

Per page: the spec numbers you transcribed and from which capture; `check.mjs` output showing green; `pixdiff` before → after; every `tol` you raised and why; anything in `qa/requests/`; and any reference you could not read well enough to assert — say so rather than guessing.
