# Progress Webetu — PWA Replica Build Plan

**Project root:** `C:\Users\MyHomehP\Desktop\work\webetu2`
**Reference app screenshots/video:** `screenshots/` (29 images + 1 video)
**Code donor project (read-only):** `C:\Users\MyHomehP\Desktop\work\old\webetu`
**Target:** mobile-only PWA (Android Chrome + iOS Safari), frontend-only, mock auth, EN/AR i18n, light/dark/system theme.

---

## 0. Locked decisions (confirmed with the user — do not re-litigate)

| # | Decision | Choice |
|---|---|---|
| D1 | Stack | Vite 7 + React 19 (`@vitejs/plugin-react-swc`) + Tailwind v4 (`@tailwindcss/vite`) + `framer-motion` + `react-router-dom` v7 + `vite-plugin-pwa` + **`react-i18next`**. Plain JSX (no TypeScript). |
| D2 | Pixel assets | **Auto-crop from the screenshots** with a one-off Node + `sharp` script. Icons/logo/banners/illustrations are crops, not redrawn. **Amended in Phase 1 (see §2a).** |
| D3 | Mock auth | Any non-empty username + any non-empty password enables **Continue**; any 6 digits passes verification. No credential checking. |
| D4 | Theme | **3-way: system / light / dark**, one shared persisted state driving both the Profile segmented control and the Home header icon. |
| D5 | 2FA page | The **whole "Enable 2FA" page** (QR, manual secret + copy, both banners, 6 OTP boxes, Paste code, Turn on 2FA, Later). |
| D6 | QR | **Real scannable QR** generated from an `otpauth://totp/...` URI built on the mock secret (a QR library, not a crop). |
| D7 | Service pages | Per-screenshot variant where a screenshot exists; the sad-box empty state as the generic default elsewhere. |
| D8 | i18n | Agent-authored Modern Standard Arabic approved; **full RTL mirroring, per component, following the screenshots**. |
| D9 | Login animation | Exactly the video: focus border + glow + caret, empty-submit red border + inline message + shake, password eye toggle, card entrance. No per-character effects. |
| D10 | Fonts | **Self-hosted** Poppins (Latin) + Cairo (Arabic) as `woff2`, precached for offline. No Google Fonts CDN. |
| D11 | Mock data | Screenshot values (FERHATEN Yani / AKBOU / 2003-03-12 / `UN06012026232333008110`); Cards page uses two plain rounded-rect `FRONT`/`BACK` divs, ready for real artwork. |
| D12 | Card rotation | **Copy the drag-to-flip code verbatim** from `old/webetu/src/pages/MyCards.jsx`, minus the `ID Cards` `<h1>`. |
| D13 | Layout scope | Phone viewports only (~360–430 px wide). No tablet/desktop layouts. |

---

## 1. Ground truth: page inventory from the references

### 1.1 Routes

| Route | Page | Source references |
|---|---|---|
| `/login` | Login | `18.18.55`, `18.22.04`, `18.25.55`, `18.25.56`, `18.25.56 (1)`, `(2)`, `(3)`, `(4)`, `(5)`, `(6)`, `18.25.57`, video 0–7 s |
| `/verify` | Two-factor (Enable 2FA) | `18.35.12`, video 8–10 s |
| `/home` | Student Portal | `18.26.14 (1)`, `18.26.15`, video 11–12 s |
| `/cards` | Rotating ID card | old project `MyCards.jsx` (layout/visuals), no new screenshot yet |
| `/profile` | Profile + settings | `18.34.09` (light), `18.34.09 (1)` (dark) — both are photos of a screen, shot sideways |
| `/service/:slug` | 14 service pages | `18.26.05`, `(1)`, `(2)`, `18.26.06`, `(1)`, `(2)`, `(3)`, `(4)` |
| `/` | redirect → `/login` (or `/home` when a session flag is set) | — |

### 1.2 Login page anatomy (light, EN)

- Light grey page background, white **logo card** (rounded ~24 px, soft shadow) containing the PROGRES wordmark + the ministry Arabic/French lines + the small Algeria-flag swoosh.
- Below it: **`Webetu`** in heavy black Poppins (~28 px), centered, with a short **green underline bar** (~48×4 px, `#009577`) beneath.
- White **form card** (rounded ~28 px, shadow) holding two fields, each with a right-aligned/above label (`ادخل رقم التسجيل` / `ادخل كلمة المرور` in AR; in EN the label sits above the field, left-aligned), a pill input (radius ~999 px, 1.5 px border) with a leading circular icon (person / lock).
- Password field's leading icon swaps to an **eye** when it has content (video 6–7 s).
- **Continue / تسجيل الدخول**: full-width pill, `#009577`, white heavy text. Disabled state is a lighter mint (`#7FD6BE`-ish) with white text; enabled is full `#009577`.
- Footer, two lines, muted grey, centered: `© 2026 Progress Webetu · v1.0.42` and `🔒 Secured with 2FA · TLS` (lock glyph + `·` separators).
- Dark variant: page `#171922`-ish, cards `#20232E`, inputs `#2A2E3A`, borders `#3A3F4D`, text near-white, green unchanged.

### 1.3 Two-factor page anatomy

Top-to-bottom: green back-chevron + `Two-factor authentication` heading row → centered `Enable 2FA` (heavy) → muted subtitle `Scan this QR code with Google Authenticator, Authy, or a similar app.` → **mint info banner** (shield-check icon, `2FA protects your account, even if your password is ever exposed.`) → **white QR card** (rounded ~24 px) → **amber warning banner** (`If you lose this device, contact your institution's administration to reset your two-factor authentication.`) → `CAN'T SCAN? ENTER THIS CODE MANUALLY` (uppercase, letter-spaced, muted) + monospace-ish bold secret `P7SA ZLK3 GUTK 63IQ RJKS GCQU FE7H ST7I` + copy icon → **bottom sheet card** with a 4 px green top border: `ENTER THE GENERATED CODE TO CONFIRM`, right-aligned `📋 Paste code` link in green, **6 rounded-square OTP boxes** (first one focused: green 2 px border), full-width mint **`Turn on 2FA`** button, and an underlined `Later` text link.
Page scrolls; the sheet is in-flow, not fixed.

### 1.4 Home page anatomy

- Header row: `Student Portal` (heavy black, ~24 px) on the start side; **theme icon** (crescent + small star, outline style) on the end side.
- **Banner carousel**: 2 slides, manual swipe only (no autoplay), rounded ~18 px, with **2 dot indicators** below, centered — active dot is a wide green pill, inactive is a small grey dot.
  - Slide 1: the `إنضم الآن / STUDENT CAMP PUGE` promo banner (yellow keyline, teal field, man with phone).
  - Slide 2: green card `université de béjaia` + `UN06012026232333008110` + white rounded box holding the Béjaïa university logo.
- **Service grid**: 2 columns, 14 tiles, tight vertical rhythm (gap ~6 px row / ~12 px column). Tile = `#009576` fill, 1 px `#39a38c` border, radius ~10 px, height ~60 px, white glyph icon (~20 px) above a white 10 px bold label.
- Page scrolls; bottom nav is fixed.
- **Bottom nav**: `#33354E` rounded (~14 px) bar with 16 px outer margin, height ~68 px; active item is a `#009577` pill (border `#328c7a`) that **slides** between tabs (`layoutId="activeTab"`, 0.2 s linear — straight from the old `Navbar.jsx`). White icon + 10 px label. **Home stays on the left in Arabic too** (D8/video).

### 1.5 Profile page anatomy

- Top: circular **avatar** (~72 px) with a thin ring, then the name `FERHATEN Yani` in heavy uppercase-ish black, centered.
- `PERSONAL INFORMATION` — small uppercase muted section label, then a card with two rows separated by hairlines: green pin icon + `Place of Birth` / **`AKBOU`**; green calendar icon + `Date of Birth` / **`2003-03-12`**. Labels are muted, values are bold black on the same line (label left, value right in EN).
- `SETTINGS` — card with 4 rows:
  1. translate glyph (green) + `Change Language` + **EN / AR segmented pill control** (active = green bg, white text).
  2. contrast/sun glyph (green) + `Theme` + **3 icon buttons**: system(auto), dark(moon), light(sun) — active gets a green rounded square.
  3. shield-check (green) + `Two-factor authentication` / `Enabled` + chevron.
  4. info circle (green) + `Information note` + chevron.
- **`LOGOUT`**: full-width red pill (~`#E14B3B`), white heavy text, exit-arrow icon.
- Bottom nav present, Profile active.
- Dark variant: page `#15161C`, cards `#23252F`, hairlines `#2E3140`, nav `#4A4672`-ish purple, active pill green.

### 1.6 Service page anatomy

Full-bleed **green header** (`#009577`, ~96 px incl. safe area) with a translucent circular back button (white arrow) at the start and the **service name centered in white heavy text**. Body is the plain page background. Body content per tile:

| Variant | Tiles | Content |
|---|---|---|
| A — sad box | Group and Section, Academic transcripts, Discharge (AR), + all unspecified | Cropped sad-box illustration (~170 px) centered, then `Data not available currently!` / `عذرا، انت غير معني` in bold muted grey |
| B — calendar-x | Exams Schedule | Grey calendar-with-x glyph in a soft circle + the same text |
| C — blank | Assessment | Header only, empty body |
| D — chips | Academic transcripts | Row of outlined green year chips `2025/2026` `2024/2025` `2023/2024` (horizontally scrollable) above variant A |

### 1.7 Tile inventory (EN / AR — AR from the Arabic video frames)

| # | slug | EN label | AR label |
|---|---|---|---|
| 1 | `discharge` | Discharge | التبرئة الإلكترونية |
| 2 | `timetable` | Timetable | الجدول الزمني |
| 3 | `group-section` | Group and Section | المجموعة و الفوج |
| 4 | `exams-schedule` | Exams Schedule | الجدول الزمني للإمتحانات |
| 5 | `exam-grades` | Exam Grades | علامات الإمتحانات |
| 6 | `assessment` | Assessment | التقييم المستمر |
| 7 | `percentage` | Percentage (%) | النسبة المئوية للمقياس |
| 8 | `academic-transcripts` | Academic transcripts | كشف النقاط |
| 9 | `debts` | Debts | الديون |
| 10 | `academic-vacation` | Academic vacation | عطلة أكاديمية |
| 11 | `enrollments` | Enrollments | تسجيلاتي |
| 12 | `absences` | Absences & Exclusions | الغيابات و الإقصاءات |
| 13 | `onou` | ONOU Services | خدمات جامعية |
| 14 | `other-services` | Other services | خدمات أخرى |

Nav labels: `Home/Cards/Profile` ↔ `الرئيسية/بطاقاتي/حسابي`.

---

## 2. Open discrepancy to resolve at kickoff (only thing I will not decide alone)

The **video** login (0–3 s) shows a **green band across the top of the page with the logo card overlapping it**, while the **static screenshots** show a plain light-grey page with the logo card sitting on it. Both are the same app, different OS/theme capture.

**Default unless told otherwise:** follow the static screenshots (they are the higher-fidelity, more numerous reference), and keep the green-band variant behind a single CSS class so it is a one-line switch. Flag it during Phase 3 review.

---

## 2a. Phase 1 amendment — asset provenance (evidence overrode D2)

D2 said "crop everything from the screenshots". Probing `old/webetu/public` showed that is the **wrong** source for most glyphs: the donor project already ships the app's own artwork as high-resolution alpha PNGs (tile glyphs 116–143 px, nav glyphs 117–156 px, logo 529×332, avatar 403×407), whereas the same marks in the reference captures are ~20 px regions inside a 591 px-wide JPEG. Cropping would have discarded detail that already exists.

Final per-asset source, implemented in `scripts/crop-assets.mjs`:

| Source | Assets | Why |
|---|---|---|
| **Donor PNG copy** | logo, avatar, 3 nav glyphs, 12 of 14 tile glyphs | higher fidelity than any crop possible from these captures |
| **Measured crop** | `banner-1-studentcamp`, `banner-2-matricule`, `empty-sad-box` | unique to this app, no donor equivalent |
| **Inline SVG** (`components/icons.jsx`) | `tiles/absences`, `tiles/onou`, field user/lock/eye, back chevron, chevrons, copy/paste, shield-check, info, translate, pin, calendar, theme auto/moon/sun, logout, star-moon toggle, `empty-calendar-x` | must recolour with the theme, and a ~20 px JPEG crop is mush next to a 126 px crisp neighbour |

Two findings worth keeping:

1. **Donor filenames describe the donor's app, not this one.** Donor `percentage-icon` is a *folder* and `academic-transcripts-icon` is a *pie chart*; donor `debts-icon` is a *document* and `academic-vacation-icon` is a *calculator* — each inverted relative to this app's grid. Mapping is therefore by measured shape (`scripts/grid-overlay.mjs` → `qa/debug/home-grid.png`), asserted in `scripts/verify-tiles.mjs`.
2. **Byte-hash comparisons are useless here** — the pipeline re-encodes every PNG, so verification compares decoded pixels.

---

## 3. Target file tree

```
webetu2/
├── PLAN.md                      ← this file
├── index.html                   ← PWA/iOS meta, safe-area, fonts preload
├── vite.config.js               ← react-swc + tailwind + VitePWA (lift from old, adapt)
├── package.json                 ← D1 deps + sharp/@resvg as devDeps, scripts
├── public/
│   ├── manifest.webmanifest
│   ├── offline.html
│   ├── icons/{16…1024}.png, apple-touch-icon*.png   ← generated from the logo crop
│   ├── fonts/{poppins-*,cairo-*}.woff2              ← self-hosted (D10)
│   ├── assets/                                      ← crops from Phase 1
│   │   ├── logo-progress.png
│   │   ├── banner-1-studentcamp.png
│   │   ├── banner-2-matricule.png
│   │   ├── empty-sad-box.png
│   │   ├── empty-calendar-x.png
│   │   ├── tiles/{14 slugs}.png
│   │   ├── nav/{home,cards,profile}.png
│   │   ├── icons-ui/{user,lock,eye,back,shield,shield-check,info,translate,
│   │   │              theme-auto,theme-moon,theme-sun,pin,calendar,logout,
│   │   │              copy,paste,lock-small,star-moon}.png
│   │   └── avatar.png
│   └── splash/…                                     ← iOS launch images
├── scripts/
│   ├── crop-assets.mjs          ← sharp crop manifest → public/assets
│   ├── make-icons.mjs           ← logo crop → all PWA icon sizes + splash
│   └── verify-shots.mjs         ← Playwright capture matrix (Phase 6)
└── src/
    ├── main.jsx                 ← i18n init, ThemeProvider, LangDirection, Router
    ├── App.css / index.css       ← Tailwind v4 @theme tokens, dark variant, fonts
    ├── i18n/
    │   ├── index.js
    │   ├── en.json
    │   └── ar.json
    ├── context/
    │   ├── ThemeContext.jsx      ← system|light|dark, localStorage, matchMedia
    │   ├── AuthContext.jsx       ← mock session flag + logout
    │   └── LangContext.jsx       ← dir + <html lang> sync
    ├── data/
    │   ├── services.js           ← the 14 tiles: slug, icon, labelKey, emptyVariant
    │   └── student.js            ← FERHATEN Yani, AKBOU, 2003-03-12, matricule, secret
    ├── components/
    │   ├── BottomNav.jsx         ← port of old Navbar.jsx + i18n labels
    │   ├── ThemeToggle.jsx       ← crescent+star cycling button
    │   ├── Field.jsx             ← animated pill input (focus/error/eye)
    │   ├── Button.jsx            ← pill CTA, disabled/enabled states
    │   ├── ServiceHeader.jsx     ← green header + back
    │   ├── EmptyState.jsx        ← variants A/B/C/D
    │   ├── BannerCarousel.jsx    ← 2-slide manual swipe + dots
    │   └── OtpInput.jsx          ← 6 boxes, paste, backspace, arrow nav
    ├── pages/
    │   ├── Login.jsx
    │   ├── Verify.jsx
    │   ├── Home.jsx
    │   ├── Cards.jsx
    │   ├── Profile.jsx
    │   └── Service.jsx
    └── routes/ProtectedRoute.jsx
```

---

## 4. Design tokens (encode once in `index.css` `@theme`, use everywhere)

```
--color-brand:        #009577   /* CTAs, active nav, header, chips */
--color-tile:         #009576
--color-tile-border:  #39A38C
--color-nav-bg:       #33354E
--color-nav-active:   #009577   /* border #328C7A */
--color-mint:         #7FD6BE   /* disabled CTA / "Turn on 2FA" */
--color-info-bg:      #E7F8F0   /* 2FA mint banner */  --color-info-fg: #0B7A5C
--color-warn-bg:      #FDF1DF   /* 2FA amber banner */ --color-warn-fg: #9A6B12
--color-danger:       #E14B3B   /* LOGOUT */
--color-error:        #D9534F   /* login invalid border/message */

light: bg #F2F3F5 · card #FFFFFF · text #1B1C1F · muted #8A8F98 · hairline #ECEDEF · input #F5F6F8
dark : bg #171922 · card #20232E · text #F2F3F7 · muted #8B90A0 · hairline #2C3040 · input #2A2E3A
       (dark profile/nav sampled from 18.34.09 (1): nav bg ≈ #4A4672, page ≈ #15161C — re-sample in Phase 3)

radius: card 28 · logo card 24 · input pill 999 · tile 10 · nav 14 · otp box 14
font:   latin 'Poppins' (400/500/600/700/800) · arabic 'Cairo' (400/600/700/800)
        [dir=rtl] body { font-family: Cairo }  — headings stay heavy weight
safe area: env(safe-area-inset-*) on header padding-top and nav bottom
height: 100dvh only (never 100vh) — iOS Safari URL bar
```

Sampling rule: **only** the clean `540×1170` / `591×1280` captures are valid color sources. `18.34.09*` are photos of a screen (gamma-shifted) — use them for layout/structure only, and re-sample their colors from the dark login shots instead.

---

## 5. Phases, agents, and hand-offs

Agents run as background subagents where their file sets do not overlap; every agent gets this file as its brief plus its own section. **No two agents may edit the same file in the same phase.**

### Phase 0 — Scaffold (1 agent, sequential, blocks everything)
**Agent: `shell-builder`**
- Create the project per §3: `package.json` (D1 deps), `vite.config.js` (lift the `VitePWA` block from `old/webetu/vite.config.js` — keep `navigateFallback`, the font runtime caches, `maximumFileSizeToCacheInBytes`, iOS `skipWaiting`/`clientsClaim`), `index.html` (lift the iOS meta block from `old/webetu/index.html`, add `viewport-fit=cover`, `user-scalable=no`, font preloads, `theme-color` per scheme).
- `public/manifest.webmanifest`: name `Progress Webetu` / short_name `Webetu`, `display: standalone`, `dir: "any"`, icon set, `background_color` `#F2F3F5`, `theme_color` `#009577`.
- Router skeleton with all 7 routes rendering empty placeholders; the 3 contexts; `react-i18next` bootstrap with `en.json`/`ar.json` stubs; Tailwind `@theme` tokens from §4.
- **Accept:** `npm run dev` serves `/login` without console errors; `npm run build` succeeds; Lighthouse PWA installable.

### Phase 1 — Asset pipeline (1 agent, parallel with Phase 0 after the tree exists)
**Agent: `asset-cropper`**
- Write `scripts/crop-assets.mjs`: a declarative manifest of `{ source, out, rect (normalized 0–1), scale }` and run it with `sharp`.
- Crops required (source → output), coordinates to be confirmed visually against each image before running:
  - `18.18.55.jpeg` → `logo-progress.png` (logo card interior, excluding the phone status bar)
  - `18.26.14 (1).jpeg` → `banner-1-studentcamp.png` · `18.26.15.jpeg` → `banner-2-matricule.png`
  - `18.26.05 (1).jpeg` → `empty-sad-box.png` · `18.26.05 (2).jpeg` → `empty-calendar-x.png`
  - `18.26.15.jpeg` → 14 `tiles/*.png` glyphs (crop the white glyph on transparent where possible; else flat green tile crops)
  - `18.26.14 (1).jpeg` → 3 `nav/*.png` glyphs (fall back to `old/webetu/public/icons/{homePageIcon,myCardsIcon,profileIcon}.png` if the crops are mush — they are the same glyphs)
  - `18.22.04` / `18.25.56*` → `icons-ui/{user,lock,eye,lock-small}.png`
  - `18.35.12.jpeg` → `icons-ui/{back,shield-check,info,copy,paste}.png`
  - `18.34.09.jpeg` (deskew first) → `avatar.png`, `icons-ui/{translate,theme-auto,theme-moon,theme-sun,pin,calendar,logout}.png`
  - `18.26.14 (1).jpeg` → `icons-ui/star-moon.png` (home theme toggle)
- Every output at **3× the on-screen size** so high-DPI phones stay sharp; PNG, palette-quantized.
- `scripts/make-icons.mjs`: derive all PWA/apple icon sizes + iOS splash images from `logo-progress.png`.
- Download + subset Poppins and Cairo `woff2` into `public/fonts/`, self-hosted (D10).
- **Accept:** every file in §3 `public/assets` exists, is non-blank, and a contact sheet `public/assets/_contact-sheet.png` was eyeballed.

### Phase 2 — Shared UI kit (1 agent, after P0+P1)
**Agent: `ui-kit`**
- `BottomNav.jsx`: port `old/webetu/src/components/Navbar.jsx` structurally (same `layoutId="activeTab"` motion, same colors/geometry from §1.4) but with i18n labels, cropped icons, `100dvh`-safe padding, and **no mirroring of tab order in RTL** (D8).
- `Field.jsx` implementing D9 exactly: idle → focus (border `--color-brand` + 0 0 0 3px glow, 180 ms), caret visible, error (border `--color-error` + `translateX` shake keyframe 300 ms + inline message slide-down), password eye toggle, label + helper spacing per §1.2.
- `Button.jsx` (disabled mint / enabled brand, pressed scale 0.98), `ThemeToggle.jsx` (cycles system→light→dark, long-press tooltip optional), `ServiceHeader.jsx`, `EmptyState.jsx` (variants A–D), `BannerCarousel.jsx` (framer-motion drag-x, snap to nearest, 2 dots, RTL-aware drag direction), `OtpInput.jsx` (6 boxes, auto-advance, backspace-to-previous, paste-6-digits, digits-only filter).
- **Accept:** a temporary `/styleguide` route rendering every state in EN+AR, light+dark, for Phase 3 sign-off. Delete the route afterwards.

### Phase 3 — Pages, 3 agents in parallel (disjoint file sets)
**Agent `pages-auth`** → `Login.jsx`, `Verify.jsx`, `ProtectedRoute.jsx`, auth keys in `en.json`/`ar.json`
- Login: §1.2 layout, D3 validation (empty → per-field inline error + shake; both filled → brand Continue), submit → `/verify`. Entrance: logo card + form card fade/rise 240 ms staggered.
- Verify: §1.3 top-to-bottom, real QR via a QR lib encoding `otpauth://totp/Progress%20Webetu:2333008110?secret=<data/student.js>&issuer=Progress%20Webetu&algorithm=SHA1&digits=6&period=30`; copy-secret button uses `navigator.clipboard` with a "copied" tick; `Paste code` reads the clipboard into the 6 boxes; `Turn on 2FA` (enabled at 6 digits) → mock session flag → `/home`; `Later` → `/home` too. Back chevron → `/login`.

**Agent `pages-home`** → `Home.jsx`, `Service.jsx`, `data/services.js`, service keys
- Header + `ThemeToggle`, `BannerCarousel` with the 2 crops, 14-tile grid from `data/services.js`, fixed `BottomNav`, scroll container with `pb-[120px]`.
- `Service.jsx`: green header + variant A/B/C/D body per `services.js`, back → `/home`, deep-link-safe (unknown slug → `/home`).

**Agent `pages-account`** → `Cards.jsx`, `Profile.jsx`, `data/student.js`, profile/card keys
- `Cards.jsx`: **copy the rotation logic verbatim** from `old/webetu/src/pages/MyCards.jsx` — `SNAP_THRESHOLD = 45`, `DEAD_ZONE = 10`, `useMotionValue`, `180 / screenWidth` sensitivity, `animate(..., { type:'spring', stiffness:300, damping:30, velocity:0 })`, touch handlers, `[perspective:1200px]`, `[backface-visibility:hidden]`, `touch-none select-none`. Drop the `ID Cards` `<h1>` (D12). Replace the two `<img src="/cards/recto|verso.png">` faces with plain rounded-rect `FRONT`/`BACK` divs at the same footprint, keeping the image slot so real artwork is a drop-in. Add mouse-drag parity so it is testable on a desktop browser.
- `Profile.jsx`: §1.5, with the EN/AR segmented control writing to i18n + `dir`, the 3-way theme control on the shared context, 2FA row → `/verify`, `Information note` → its own empty-state page, **LOGOUT** clearing the mock session → `/login`.

**Phase 3 gate:** the user reviews the `/styleguide` + all 5 pages side by side with the screenshots. Discrepancy from §2 gets settled here.

### Phase 4 — i18n + RTL hardening (1 agent, after P3)
**Agent: `i18n-rtl`**
- Own `en.json` / `ar.json` end-to-end (single writer avoids conflicts): namespaces `login`, `verify`, `home`, `services`, `cards`, `profile`, `common`, `empty`.
- No concatenated strings; use interpolation (`t('verify.secretHint')`, `t('service.title', { name })`).
- Apply the D8 mirroring matrix: **flip** header/title sides, back-arrow direction, label alignment, carousel order + drag direction, `Field` icon side, profile row chevrons, chips scroll direction. **Do not flip** bottom-nav order, the card rotation axis, the OTP box order (left-to-right digits, as in the AR video frame), or the QR/matricule card internals.
- `dir` + `lang` on `<html>` reactively; Cairo swap; verify numerals stay Latin (`UN0601…`, dates, years) as in the references.
- **Accept:** zero hardcoded Latin strings (grep-enforced), no layout overflow at 320 px in AR.

### Phase 5 — PWA + mobile polish (1 agent, after P4)
**Agent: `pwa-hardening`**
- Service worker precache covers fonts + all crops; offline → `offline.html`; navigation fallback works on `/login`.
- iOS: `apple-mobile-web-app-capable`, `black-translucent` status bar, splash sizes, no double-tap zoom, `100dvh`, safe-area on green header + nav, momentum scroll, `-webkit-tap-highlight-color: transparent`.
- Android: status-bar `theme-color` per light/dark, overscroll `none`, install/`beforeinstallprompt` handled quietly.
- Theme `system` mode must follow `matchMedia` live.
- **Accept:** `npm run build && npm run preview` → installable on both platforms, cold start offline on a real device, no white flash on dark theme.

### Phase 6 — Verification loop (1 agent, runs after each of P3–P5 and at the end)
**Agent: `visual-qa`**
- `scripts/verify-shots.mjs` (Playwright, `iPhone 14` + `Pixel 7` contexts): capture the matrix **{login, verify, home, home-slide-2, cards-front, cards-back, profile, service-group-section, service-exams-schedule, service-assessment, service-transcripts} × {en, ar} × {light, dark}** into `qa/out/`.
- Produce side-by-side pairs against the matching screenshot in `qa/compare/` and a written diff list: colors, spacing, radii, font weight/size, icon crop edges, RTL side.
- Also: `npm run lint`, `npm run build`, a11y pass (labels, focus order, 44 px targets, contrast on mint buttons), and `prefers-reduced-motion` fallbacks for the shake/carousel/nav slide.
- Findings route back to the owning Phase agent; loop until the diff list is empty or only contains items the user waved off.

### Dependency graph

```
P0 scaffold ─┬─> P2 ui-kit ─┬─> P3a pages-auth   ─┐
P1 assets  ──┘              ├─> P3b pages-home   ─┼─> P4 i18n-rtl ─> P5 pwa ─> P6 qa (final)
                            └─> P3c pages-account ┘        ^
P6 qa runs opportunistically after P3, P4, P5 ────────────┘
```
P0 and P1 are parallel. P3a/b/c are parallel (disjoint files; `en.json`/`ar.json` are **owned by P4 only** — P3 agents put their keys in `src/i18n/pending/<area>.json` to avoid write conflicts).

---

## 6. Reuse map from `old/webetu`

| Take | From | Into | Notes |
|---|---|---|---|
| Card drag-flip logic | `src/pages/MyCards.jsx` | `src/pages/Cards.jsx` | Verbatim (D12). Only the faces and the `<h1>` change. |
| `VitePWA` config block | `vite.config.js` | `vite.config.js` | Keep iOS workbox options; drop `pid.jpg`/`sw-test.html` ignores. |
| iOS/PWA meta tags | `index.html` | `index.html` | Add per-scheme `theme-color`, font preloads. |
| Bottom nav structure + motion | `src/components/Navbar.jsx` | `src/components/BottomNav.jsx` | Same colors/`layoutId`; i18n labels; cropped icons. |
| Tile button styling | `src/pages/HomePage.jsx` | `src/pages/Home.jsx` | `bg-[#009576] border-[#39a38c] rounded-[10px] h-[60px]` confirmed there. |
| **Do not copy** | `HomePage.jsx` header (avatar instead of theme toggle), single static banner, 13-tile list incl. "Restauration", missing `Enrollments`/`Absences`/`ONOU` | — | The new app differs; §1.4/§1.7 is authoritative. |

---

## 7. Acceptance checklist (definition of done)

- [ ] All 7 routes render at 360×640 and 430×932 with no clipping or horizontal scroll.
- [ ] Login: focus/error/shake/eye behaviors match the video; Continue gated on both fields non-empty.
- [ ] Verify: real QR encodes the mock `otpauth://` URI and a phone authenticator produces a code that the form accepts (any 6 digits accepted per D3); copy + paste work; `Later` reaches Home.
- [ ] Home: 2-slide manual carousel with dot state, 14 tiles in the §1.7 order/labels, theme toggle visible and functional.
- [ ] Cards: drag-to-flip feels identical to the old project (same thresholds, same spring), front/back both reachable, no scroll-jacking on iOS.
- [ ] Profile: avatar, personal info, EN/AR switch, 3-way theme, 2FA row, info note, working logout.
- [ ] Every service tile routes to the correct empty-state variant; back arrow returns home; deep link works.
- [ ] EN and AR complete (no missing-key warnings); RTL mirroring matches the D8 matrix; Arabic uses Cairo.
- [ ] Light, dark, and system all correct on every page, including status-bar/nav colors and no white flash.
- [ ] `npm run lint`, `npm run build`, `npm run preview` clean; installable + offline-capable on Android and iOS.
- [ ] `qa/compare/` side-by-sides reviewed by the user; open diffs either fixed or explicitly waived.

---

## 8. Risks & mitigations

| Risk | Mitigation |
|---|---|
| WhatsApp JPEG artifacts make small icon crops mushy | Crop at 3× and eyeball the contact sheet in P1; fall back to the old project's matching PNGs, then to hand-built inline SVG as last resort. |
| `18.34.09*` profile shots are photos of a screen (skewed, off-color) | Deskew + crop in P1; take colors from the dark login shots instead; flag the profile page for a clean re-shoot. |
| Profile/cards are the least-screenshotted pages (cards has none yet) | Build cards from the old layout per D12; keep the real card artwork as a drop-in image slot. Ask for a clean profile capture during the P3 gate. |
| Tailwind v4 `@theme` + `dark:` variant conflicts with a 3-way (incl. system) theme | Drive dark from a `data-theme` attribute on `<html>` plus a `@custom-variant dark`, set by `ThemeContext` — not `prefers-color-scheme` in CSS alone. |
| RTL + framer-motion drag/carousel and the card's `rotateY` interact badly | Set the carousel's drag axis and initial offset from `dir`; leave the card rotation untouched (D8). Test both languages in P6. |
| Service worker caches stale crops during iteration | `devOptions.enabled: false` (as in the old project); bump the precache version in P5; document a hard-refresh step. |
| i18n write conflicts between parallel P3 agents | Pending-key files per area, merged by the single P4 writer. |
| iOS `100vh`/URL-bar jump on the fixed nav | `100dvh` + safe-area padding from P0 onward, re-checked in P5. |

---

## 9. What I need from you, if anything, before Phase 3

1. The §2 login-header decision (green band vs plain page) — or I default to the static screenshots.
2. A clean (non-photo) capture of the **Profile** page, and the **two-sided ID card** when ready — both are currently only inferable.
3. Anything you want the `Information note` row to open, if it is not just another empty state.
