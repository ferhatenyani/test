# Paste-ready handoff prompt — webetu2 pixel-accuracy pass (final)

Copy everything between the rules into a new chat. It hands over **state, refuted premises
and one new feature spec** — not narrative. The expensive part of these passes is the
negative results, so they are labelled explicitly.

---

Continue the pixel-accuracy pass on the Vite+React PWA at
`C:\Users\MyHomehP\Desktop\work\webetu2` (`screenshots/` = reference).

**READ FIRST (source of truth, do not duplicate):** `qa/PENDING.md`, `qa/ACCURACY.md`,
`qa/requests/*.md`. Trust the DONE/OPEN statuses there — they were machine-verified, not
asserted. This file adds one feature spec and refutes one conclusion in PENDING.md.

## 1. STATE — verified numbers

- Gate: **4121 assertions passed / 1 failed, 38 scenarios.** The ONLY failure is the
  deliberate red `33-service-group-section` svcCaption.y (444.6, Δ19.4 > ±8). **Leave it red.**
- pixdiff: **mean 6.73%** over 24 capture-backed scenarios. Login statics 4.89–7.54%;
  `11-verify` 7.92%; home 4.18–4.73%; `37-service-timetable` 2.96%; service best 0.63%/1.13%.
- Probes, all green: `check-login-motion.mjs` 48/0 · `check-home-carousel.mjs` 36/0 ·
  `check-verify-input.mjs` 120/0.
- `npm run lint`: 0 errors / 6 warnings (pre-existing `react-refresh` on providers).
  Standalone `npm run build` ✓; `banner-2-matricule-ar.png` is in `dist/assets` AND in the
  `dist/sw.js` precache.
- NOT a git repo. Rollback = `backup/pre-accuracy/`.

## 2. DONE (2026-10-26) — the login keyboard animation, implemented and gate-verified

Built. `src/hooks/useKeyboardInset.js` (reusable, Login-only usage) + `Login.jsx`.
The bounce is no longer "not yet measured" — it is measured, below.

### What ships
- **Trigger**: `visualViewport` height shrink ≥150 CSS px **and** an editable element
  focused. The AND is deliberate: `:focus-within` alone fires on a desktop click with
  no keyboard (rejected), and the viewport shrink alone fires when DevTools docks at
  the bottom (>150 px is easy). Neither signal alone is sufficient; together they are.
- **Header** (band + logo card + title + green underline) is ONE `motion.div` with
  `transformOrigin: 'top center'` animating `scale: 1 → 0.65`. Origin = the block's top
  edge = the band top = `INSET`: solving the capture's card top 72.5→57 at scale 0.652
  gives origin y 27.9 ≈ the 25 px status reserve, NOT the card's centre.
- **Band** also fades (`opacity 1 → 0`, 0.14 s) *inside* the scaled block, because the
  video shows its extent ramping (79→88→94→98→101→108→111 px) on the way back — a pure
  cross-fade would show full extent the instant it is detectable.
- **Form card** translates only, never scales. `dy = −(keyboardHeight − spaceBelowCard)`
  ⇒ its bottom lands ON the keyboard's top edge. One rule, both references:
  a360 −(293.5−171.5) = **−122** (the capture's number) and the video device
  −(312−184) = **−128** (measured at frame 28). That agreement is the mechanism, not a
  coincidence. Implemented as a `MotionValue` on a wrapper `<div>`, not React state —
  the target needs a DOM measurement, and state would mean either reading a ref during
  render or setState in an effect (both are lint errors here and real cascading-render
  bugs). The wrapper is measured instead of the form because the form carries the mount
  rise, and rest-bottom is only sampled while the value is at 0, so it cannot feed itself.

### Bounce character — measured from the video, the one thing §2 used to lack
`scripts/qa/kbanim.mjs` (new) on 60 fps frames of `18.56.13.mp4`, 384x832 ≈1x CSS,
**notched device so its safe-area top is ~46, not the captures' 25 — its px are NOT the
captures' px, only its RATIOS and TIMING transfer.**
The 221 extracted frames and the contact sheet were disposable intermediates and are
deleted; re-extract with
`ffmpeg -i "screenshots/WhatsApp Video 2026-10-25 at 18.56.13.mp4" -vf "select='between(t,0.7,4.7)'" -vsync 0 qa\kbframes\f_%04d.png`
and `ffprobe -v error -select_streams v:0 -show_entries frame=best_effort_timestamp_time -of csv=p=0 <video> > qa\kbframes\times.csv`.
**Probe traps that cost this pass real time:** the iOS status bar paints white text at
y 32..43 (a "first run" probe locks onto the clock, not the card); the page bg samples
`#f4f3f8` so a card threshold below ~250 calls background "card" and every run bleeds
into the next feature; the logo artwork is dark enough (min channel 47) to fragment any
white run and to read as ink; the iOS keyboard is a full-bleed WHITE block, so the form
card must be found by a row whose white object is card-wide AND carries the card's own
margins; and a 96 px contact-sheet tile **lied to me** about the band being present in
the keyboard-up state — the pixel probe was right. Trust the numbers, not the thumbnails.
- rest: card top 96, card width 268, band 46..157, form card top 368.
- keyboard up: card top 82, width 158 (**0.586**), band GONE, form top 240 (**−128**).
- **appear** t 1.287→1.555 (0.27 s): form card LEADS (home by frame 28), scale TRAILS
  (settles ~frame 33). No undershoot.
- **dismiss** t 2.073→2.357 (0.28 s): scale passes rest by **+4.5–6%** (268→280→284)
  while the form card is already home. **The bounce is on the way BACK only.**
- Shipped as `{type:'spring', stiffness:420, damping:28}` (header, ~5% overshoot in
  ~0.28 s) and `{stiffness:480, damping:36}` (form, lands and holds).
- **OPEN dial**: the capture says scale 0.65, the video says 0.586. Shipped 0.65 because
  the gate is pinned to the captures. If the on-device eye check says the header shrinks
  too little, `KB_SCALE` in `Login.jsx` is the single constant to revisit — do not
  re-derive it from the video without also re-checking the captures.

### Verification
- `npm run lint` 0 errors / 6 pre-existing warnings; `npm run build` ✓ 391 ms.
- `node scripts/qa/check.mjs login` → **910 assertions, 0 failed, 10 scenarios**.
- Full gate → **4121 passed / 1 failed, 38 scenarios**, i.e. the exact baseline. Only red
  is the deliberate `33-service-group-section`. **The no-keyboard geometry is unchanged.**
- Keyboard lift is now AUTOMATED — `scripts/qa/check-login-keyboard.mjs`, **24 probes / 0 failed**
  across both viewport-resize modes. This reverses the earlier "leave it un-automated" call;
  the reason is below, under "Verification, revisited".
  Scenarios 03/05/09 still sit at ~24–25% in pixdiff, because a *static* render cannot enter the
  lifted state — that caveat stands, it is just no longer the only evidence there is.


### Capture-derived end states (the authoritative statics)
| element | keyboard DOWN `18.25.55` | keyboard UP `18.25.56` | behaviour |
|---|---|---|---|
| green band, curved bottom corners | `col 20`: bg→green **y24.5**, green→bg **y138** | `col 20`: `#f5f6f8` across all 200 CSS, **zero transitions** | **disappears entirely** |
| PROGRES logo card | `col 190`: top **y72.5** → bottom **y235** (h **162.5**) | top **≈y57** → bottom **≈y163** (h **≈106**) | **scales to ≈0.65×** |
| "بوابة الطالب" title ink | **15.5** tall | **≈10** tall | **scales to ≈0.65×** |
| form card (white card with the 2 fields + LOGIN) | top **y330** | top **y208** | **translates −122 CSS, height UNCHANGED** |

- The logo card and the title scale by the **same ratio (~0.65)**, which is what proves it is
  a **scale** and not a re-layout.
- **The bounce applies to the header block as ONE unit** — logo card + title + green underline
  together, as a single transform. **NOT character-by-character, NOT element-by-element.**
- **The form card does NOT scale.** It only moves up to make room for the keyboard.
- On keyboard dismiss, **everything returns to place** (reverse).
- Bounce character is now measured — see "Bounce character" above. Do not re-derive it
  from the video without also re-checking the captures (they disagree on scale: 0.65 vs 0.586).

### Verification, revisited (2026-11-06) — the lift IS now automated
Headless Chromium has **no on-screen keyboard**, so the harness cannot reach this state
*naturally*. The 2026-10-26 decision was therefore "leave it un-automated — no QA-only test
hook in production code, no CDP virtual-keyboard emulation — verify by eye on a phone".
The by-eye pass came back with two defects the static gate could not see (the PROGRES card
scrolled off the top; the header bounced on the way in), which is exactly the failure mode an
un-verified animation produces.

It is now covered **without breaking either half of the original prohibition**:
`check-login-keyboard.mjs` installs a fake `window.visualViewport` EventTarget from the
harness via `addInitScript` and dispatches `resize` on it. Nothing ships in `src/` that exists
only for the test, and no CDP keyboard is emulated — the app is driven through the same public
signal a real keyboard emits.

Two modes are driven because real devices disagree and the old hook only understood one:
- `visual` — Chrome's web-page default: the layout viewport stays, the visual viewport shrinks.
- `content` — **what an installed PWA on Android does**, because there is no browser UI left to
  collapse into: `innerHeight` shrinks WITH the keyboard, so `innerHeight - vv.height` is 0 and
  the old arithmetic reported "no keyboard". This was the on-device bug.

Consequence that still stands: scenarios **03 / 05 / 09 stay at ~24–25%** in pixdiff — a static
render cannot enter the lifted state. That is expected, not a regression.

## 3. NON-NEGOTIABLE RULES

- Captures are **1.5 device px per CSS px** → divide by 1.5. `540x1170`=a360(360x780),
  `591x1280`=a394(394x853). Video ≈1× CSS, read directly.
- Measure with `node scripts/qa/pxprobe.mjs` (text). **IMAGE BUDGET: ≤1 contact sheet per page;
  never read full screenshots or ruler overlays** — agents died at ~5M tokens doing that.
- Specs are transcribed **FROM THE CAPTURE**. Never edit a spec number or widen a tolerance to
  make a red green. If a reference is ambiguous, **leave it red and say so.**
- Thin strokes are NOT assertable by colour (a 2 CSS `#009577` border samples `#1e7d69` under
  the JPEG, 30 off). Assert **state**, not hue. `--field-border` stays rejected.
- `pxprobe` reads `BG`/`MIN` from **ENV, not argv**: `set "BG=f5f6f8" && set "MIN=6" && node
  scripts/qa/pxprobe.mjs <shot> col 20 0 200`. Passing them as trailing args silently falls
  back to `#101115`/Δ24 and returns the whole region as "ink" — a confident wrong answer.
- **A spec can be green because its numbers came from the wrong source.** `check.mjs` compares
  render-vs-spec, so a spec authored from the render (or copied from a sibling page) can never
  disagree. **pixdiff is the only signal that catches it** — any scenario that passes check yet
  diffs badly is suspect by default.
- `check.mjs` `order` is a list of **CHAINS**, each asserted only against itself (a row inside
  card A is above card B; flattening chains produced 8 false failures).
- Baked OS insets differ per device: a360 = 25 top; a394 = 51.5 top / 42.5 bottom. Per-page
  floors are now **DECIDED** (see §5). `Verify.jsx`'s unfloored `calc(env+92px)` is
  capture-validated — do not "fix" it.
- Never run `npm run build` / `vite preview` while another render holds `qa/.lock`;
  `measure.mjs` builds under the lock. `[lock] waiting` is normal.
- `check.mjs` exits 1 while 33 is red, so `a && b && c` stops before pixdiff — run pixdiff
  separately. A zero-scenario run now THROWS. **Classify every run by log content, never by
  exit code.**

## 4. PROVED WRONG — do not re-test, do not inherit

1. **REFUTED (this is the big one): the three keyboard-up login shots are NOT a
   "translation artifact, non-signal".** `qa/PENDING.md` records that they diff at 24–25%
   because "the iOS keyboard **translated** the real page ~120.5 CSS — non-signal, do not
   chase." **Wrong.** A translation moves everything by one delta; measured here the card top
   moves −16, the card bottom −72, the title −93, the form card −122, the card *heights*
   differ, and the green band vanishes outright. **That 24–25% is real signal — it is the
   unimplemented animation in §2.** A previous session measured the symptom, mislabelled it,
   and told the next session not to chase it. That is why the feature kept going missing.
   **Implemented 2026-10-26 (§2); `qa/PENDING.md` Login item 2 is now corrected to REFUTED.**
2. **The banner crop rect had been read off a ruler grid** (labels are 2.25× off), producing
   505×159 = aspect **3.176** against a 346×101 box = **3.426**, so `object-cover` chopped ~7%
   of every banner. Re-measured: device **x36..555, y166.5..318** → 519×152, chop **0.3%**.
3. **Banner slide 1 is pixel-identical EN vs AR** (meanΔ **0.00**, 0.0% of 78,369 px) — there is
   **no** AR variant of `banner-1-studentcamp` and making one is fabrication. Only slide 2
   differs (meanΔ 73.4 / 93.1%) → `banner-2-matricule-ar.png` cropped from `18.56.18`.
   Donor `header-banner.png` 600×152 (3.95) and `homePageHeader.png` 373×95 (3.93) do **not**
   fit the box — capture crops are the correct source for banners.
4. **Scenario 37 was a FALSE GREEN, now fixed.** Its spec asserted `svcBand h 66.7` copied from
   the discharge pages while its own capture measures **123.2** (the "122" figure was also
   slightly off). Built + re-transcribed: header **148.2**, band **123.2**, white day-strip
   **148.2→208 (h 59.8)**, pill ink row **156.5→198.5**, filled Sunday **x103→174.5**.
   **The band grows DOWNWARD only** — title ink stays y59→62 and the disc stays x18/y35.7/41.3,
   so the band must NOT flex-centre its children. Timetable has **NO sad-box art** (`row 250`
   and `row 450` are zero ink full-width). Pills are **content-hugging** (widths 78/71.5/84
   unequal) and which day is filled is n=1 → **deliberately unasserted**. Built **EN only**; no
   Arabic day names or caption invented (`fallbackLng: 'en'`).
5. **Service needs NO Arabic type bump — negative result.** Caption ink measures h 15.5 (EN) vs
   **20.5 (AR)** at the SAME `fontSize 13.5`, but the AR caption is **narrower** (141.5 vs a
   clipped 320). Ink height alone is not a font-size proxy for Arabic (ascenders + dots-below
   inflate it at any size). ×1.26 stands only where width AND height co-scale at matched
   character counts. So `isRtl` stays in Home/BottomNav only — do not "fix" Service.
6. **Mirroring really IS per-component, and `ServiceHeader` genuinely mirrors.** `svcBack`
   x**18 (EN) → 300.7 (AR)** while `svcTitle` holds `cx 180`; a plain flex row does it, **no
   `dir` override wanted**. "Pin everything ltr" is as wrong as "mirror everything". Known
   NON-mirroring: tile grid, BottomNav order, card rotation axis, OTP box order, banner+dots,
   sad-box year chips, field-pill icon.
7. **`--color-brand` must NOT theme-flip.** Dark has two greens: SURFACE `#1bb495` (band,
   underline, CTA — flat over 400–800 px) vs LINE `#009577` (borders, glyphs). Shipped as
   `--color-brand-surface`. Home's dark tiles AND nav pill measure `#019477` in BOTH themes —
   the old "nav dot #1bb496 corroborates a flip" note is **refuted**.
8. **The `!` modifiers were truly redundant and two hex hardcodes are NOT.** Deleted
   `rounded-[8px]!` + three `!` groups in `Verify.jsx`; re-ran `check-verify-input.mjs` after
   and it still reports `radius 8px border 2px`, proving the radius comes from preflight's
   *layered* reset, not the important modifier. **Kept deliberately:** `Login.jsx` title
   `text-[#1c1d21]` (Δ12 off `--ink`, spec 01 asserts `tol.color 8` — swapping turns green→red)
   and copyright `text-[#8a8f98]` (dark capture samples `#8c9093`, Δ2; `--muted` dark is Δ10).
9. **Two probe lessons:** Backspace on OTP box 0 is a **no-op by design** (`i > 0` guards
   `handleKeyDown`), so you cannot clear the row from the left — walk to the last box via the
   component's own ArrowRight. And **after any click, re-assert focus before typing** (clicking
   the CTA moves focus to the button, so a bare `press('6')` typed into nothing). Native
   `Control+V` DOES deliver a real paste in headless Chromium once `clipboard-read/write` are
   granted.
10. **`Profile.jsx`'s comment cited `qa/specs/*profile*` and `qa/requests/profile.md`, neither
    of which existed**, and claimed its dark surfaces "disagree with index.css's dark tokens" —
    they now EQUAL `--app`/`--card`. Fixed. Profile ids **40–47 now exist**: 308 assertions /
    0 failed, 56 hooks per scenario, built from order chains + nav numbers **transferred** from
    home's verified spec + colours from clean login/home captures. **No Profile-owned x/y/w/h is
    pinned** — that needs the re-shoot (§6).

## 5. DECIDED — do not re-open

- **Safe-area: per-page floors — SUPERSEDED 2026-11-06, do not restore them.** The old entry
  ("keep `max(Npx, env(...))` floors, no shared token") is what produced the on-device
  complaint. Those floors bake a *capture's* OS chrome into CSS: the a394 home capture's
  51.5 top and 42.5 bottom ARE the status bar and the gesture area, so a phone reporting a
  smaller inset pays for them twice — header too low, deck floating too high — while the
  harness stays fully green, because headless `env()` is 0 and the floor silently becomes
  the entire reserve. Now: `--safe-top` / `--safe-bottom` in index.css carry the real inset,
  each page adds only its own margin (home 4.5, nav 8.5), and `measure.mjs` pins the vars to
  the capture device's insets (`SAFE_INSETS` in `scripts/qa/lib.mjs`: a394 47/34, a360
  25/22.7). That is option (b) of `qa/PENDING.md` Phase-2 item 3. Gate unchanged at 4121/1.
- **`33-service-group-section`: accept the 3-of-4 agreement, leave it red.** 171.3 is canonical;
  do not pay +19.4 px across three green scenarios. Closed.
- **Cards page: stays EXCLUDED until the user supplies a capture.** Do not model it on the donor
  MyCards screen. Zero scenarios. Closed.

## 6. REMAINING — in priority order

1. ~~**§2 login keyboard animation** — implement, measure the bounce, correct the refuted
   entry in `qa/PENDING.md`.~~ **DONE 2026-10-26 — see §2 (implemented, bounce measured,
   PENDING.md corrected, gate re-verified 4121/1).** Only the user's on-device eye check
   remains on it.
2. **Latin font stack — the DECIDED APPROACH IS A DEAD END, do not re-walk it.**
   The plan was "read `old/webetu`'s CSS, `@font-face` blocks and bundled `.woff2`/`.ttf` to
   name the actual face". Checked 2026-10-26, and it cannot work:
   - **The donor ships no font binaries at all** — a glob for `**/*.{woff,woff2,ttf,otf,eot}`
     across the entire `old/webetu` tree returns **nothing**, and there is **no `@font-face`**
     anywhere in it. The only `font-family` declarations are system stacks in
     `public/sw-test.html` and `public/offline.html`.
   - The donor's header is `className="... font-poppins text-[20px] font-black"`
     (`src/pages/HomePage.jsx:7`). Since nothing loads Poppins, **`font-poppins` is a dead class
     and the donor renders that heading in a browser fallback** — so the donor's CSS stack names
     no real face and is NOT authoritative. The earlier note in this file claiming "the font
     stack in CSS is still authoritative" is **refuted**.
   - It also says `font-black` = **900**, where the capture's stems match our **800** (§8.1).
     Chasing the donor's weight would have moved it the wrong way.
   - **What actually identifies the reference face is the captures themselves**, and one real
     signal already survives: at matched ink width (143 vs 144) and matched stem width (3.5 vs
     3.5), the capture's title ink is **2 CSS px TALLER** (16.0 vs 14.0). Same width, same
     thickness, taller ink = a different typeface with a larger cap-height ratio, not a
     different weight or size. Candidate faces should be screened on **cap-height/units-per-em
     and advance widths measured from `18.18.55`/`18.22.04`**, not on the donor.
   - **This item is now BLOCKED on a user decision**: either supply the real app's font (or its
     name), or authorise identifying it empirically from the captures by candidate fitting.
     Do not compensate with letter-spacing (tried, rejected — it breaks the digits, which
     already match to 1.4%). Self-host only, never a CDN — the PWA must work offline.
   - Login-page ink targets any candidate must actually hit (all measured from captures):
     title ink **137** (Poppins renders 158), "Registration number" **106** (vs 123),
     "Copyright © 2026" **75.5** (vs 91.5) — while **digits already match to 1.4%**, so a
     candidate must not regress them.
   - Self-host only (via `@fontsource` or a local file). **Never a CDN** — the PWA must work
     offline.
3. **Profile absolute geometry** — still **blocked on a clean re-shoot**. Its only refs are two
   2048×1536 photos OF A PHYSICAL SCREEN (landscape, moiré, perspective): good for order, never
   for CSS px or colour. Keep to relations until a real screenshot exists.
4. **Home tile border colour** — `--color-tile-border: #39a38c` may not exist at all; only
   `borderWidth: 1` is asserted. Needs someone with the donor CSS (the donor source in item 2 is
   the place to look).
5. **`empty.notAvailable` AR value** — unverified; no AR capture shows that message.
6. **`src/data/student.js` TOTP secret** — unverified fixture string; base32 glyphs at 11.5 CSS
   in a JPEG are not readable. `text` on `secretText` is deliberately NOT asserted.

## 7. ASK BEFORE ACTING

Anything where references conflict: **report it, don't average it.** If a reference is ambiguous,
leave the assertion red and say so. If delegating: disjoint file sets + the `qa/ACCURACY.md`
## 8. SECOND BATCH — user-reported issues (2026-10-26), decisions already taken

§2 (the login keyboard animation) is still priority #1; this batch comes after it.

### 8.1 Home — two items, and these ARE measurable
**VERDICT 2026-10-26 on the header weight: NOT WRONG — do not change it.** Measured with
`pxprobe row` on `18.18.55.jpeg` vs `qa/out/20-home-en-light.png`, same call, MIN 60:
cap-band **stem widths are equal** — row 74 gives 25.0→28.5 (3.5 CSS) in the capture and
25.0→28.5 (3.5) in the render; row 78 gives 8.5/3.5 vs 7.5/2.5. Arabic matches too
(ink w 121 vs 120, ink h **21.5 vs 21.5 exactly**). `font-extrabold` 800 / 20px EN / 22px AR
stays.

**Why the obvious metric lied, so nobody re-walks into it:** aggregate ink-PIXEL count from
`bbox` is NOT a weight proxy across capture-vs-render. The EN title band reads capture 4490 px
vs render 5164 px — 15% "heavier", which looks like a too-bold weight and is not. Cause: the
Playwright PNG is rendered with **LCD subpixel antialiasing**, so stem edges carry chroma
fringes (`#a65215`, `#113c7f`, `#bcd9e2`, `#f5d99b`) that pxprobe's max-channel Δ>60 test
counts as ink edges, while the JPEG capture has no such fringing. Proof that it is an artifact
and not a bias: the tile-label control (validated 600-weight) went the OTHER way, capture 3544
vs render 2830. **Use stem width from a `row` scan to judge weight; never use ink area.**
- A second, real signal hides in the same numbers: EN ink height is **16.0 (capture) vs 14.0
  (render)** at matched width and matched stems. Taller ink at the same size and same weight is
  a **typeface** difference, not a weight difference — i.e. it is evidence for §6.2 (wrong Latin
  face), which is the item to fix, not this one.
- **Top-right colour-mode switcher icon — FIXED 2026-10-26 (shape), redrawn as inline SVG.**
  Identified by cropping the reference glyph (`18.18.55` light, `18.56.17` dark) and, crucially,
  cropping the SAME box out of `qa/out/20-home-en-light.png` for a side-by-side: the reference is
  an outlined crescent + **two solid 5-point stars** (large upper-right, smaller lower-right);
  `StarMoonIcon` shipped a crescent + **one 4-point sparkle**. Redrawn in `icons.jsx`.
  Verified by ink geometry on the toggle box (capture vs render): ink **h 20.5 vs 20.5 exact**,
  **cx 342.5 vs 342.8**, ink w 19.0 vs 21.5. Full gate after the change: **4121/1, unchanged**.
  - **Stars are wrapped in `scale(0.78)` about `(12, 7.6)`.** The y-origin is the cluster's own
    centroid, NOT the viewBox centre — scaling about (12,12) slid the glyph down ~1.3 CSS px
    (cy 77.5 → 78.8). If the stars are resized again, keep that centroid origin.
  - **Known accepted residual:** star overhang ~1.5 CSS px too far right. Closing it would
    shrink the big star below the reference, trading one error for another. The remaining
    deltas — left edge 1.0 px and the whole y-band 1.0 px low — belong to the **crescent, which
    was never touched**: they are pre-existing, not a regression from this change.
  - **Do NOT judge this (or any glyph) by ink-PIXEL count**: capture 638 vs render 578 looks
    like a 9% shortfall but is the LCD-subpixel-fringe artifact (trap 9). Width/height/centre
    from `bbox` are the trustworthy signals; area is not.
  - **Two tooling traps hit here, both mine not the app's:** (a) `qa/out` was **stale** —
    editing `icons.jsx` and running `measure.mjs` without `npm run build` first re-renders the
    OLD bundle, so the first comparison showed a tiny misplaced glyph that was really a stale
    render plus a mismatched tile scale; always `npm run build && measure` before comparing.
    (b) A side-by-side join must log both tile widths; equal-size tiles are not automatic.

### 8.2 Cards — behaviour only, no reference needed
**STATUS 2026-10-26: DONE and VERIFIED AT RUNTIME.** `scripts/qa/check-cards-tap.mjs` →
**44 probes · 0 failed** (light/dark × en/ar). Measured: every tap and every swipe travels
**±180°** and RAMPES through **20–29 distinct angles** (never a step); right half → +180 and
left half → −180, i.e. a tap rotates the same way the equivalent swipe does; the full cycle
right/right/left/left returns to the front face and a repeat round-trip still flips, so it is
not one-shot; two taps back-to-back travel 180° not 360°, proving `isAnimatingRef` rejects the
second; a 6 px drag (inside `DEAD_ZONE`) still flips; a 40 px drag (20°, below `SNAP_THRESHOLD`
45°) still snaps back to 0. **Nothing further is needed here unless the user calls the tap
direction backwards** — then invert the one comparison against `centre` in `settleDrag`.

Two probe bugs found and fixed on the way, both in the harness and not the app — record them
before anyone re-writes this probe: (1) for `rotateY`, the column-major matrix puts **−sinθ**
at `m13`, so `atan2(m13, m11)` reads the OPPOSITE sign to the committed rotation; this alone
failed 33 of 34 probes while every travel magnitude and resting face was already correct.
Calibrate the readout against the known-good drag path, not against expectation. (2) A 60-frame
sampling window truncates the spring tail (residuals 173.4–176.6°), so `TOL` must be ~8, not 3.
Also: `findstr /C:"probes ·"` returns nothing under cmd's codepage — the `·` is non-ASCII, so
the filter exits 1 and looks like a test failure. Filter on ASCII only.

- **Tapping the card's left/right side must rotate it exactly as a swipe does.** Verified:
  `Cards.jsx` is **drag-only** today — `beginDrag/moveDrag/settleDrag/cancelDrag`,
  `DEAD_ZONE = 10`, `dragSensitivity = 180/screenWidth`, `settleDrag` commits ±180 past a
  threshold. There is no tap handler.
- Implement by **reusing `settleDrag`'s existing `animate()` call and spring**, targeting
  `baseRotationRef.current ± 180`, so the motion is identical rather than a second hand-tuned
  animation. Sign comes from which side was tapped.
- Cards still has **zero visual captures** (§5) — appearance stays out of scope; this interaction
  needs no reference, so it is safe to build.

**What was actually built** (`src/pages/Cards.jsx`): the spring is now one module-level
`SPRING` (300/30/velocity 0) shared by `settleDrag`, `cancelDrag` and the tap, so a tap is
literally the same animation, not a look-alike. `beginDrag` sets `isTapRef = true`;
`moveDrag` clears it only once the gesture exceeds `DEAD_ZONE`; `settleDrag(tapX)` takes the
up coordinate (`changedTouches[0].clientX` / mouseup `clientX`, both wired) and when
`isTapRef` survived to settle, targets `baseRotationRef ± 180` by which half of
`cardRef.getBoundingClientRect()` was touched. `data-testid="card"` was added to the rotating
element. **Direction convention: right half → +180 (as a rightward swipe), left half → −180.**
That sign choice is a guess — the references never show a tap. If the user calls it backwards,
invert the one comparison against `centre`; do not restructure.

**Probe recipe** (`scripts/qa/check-cards-tap.mjs`, mirroring `check-login-motion.mjs`'s
launch/auth pattern — copy it, do not invent one): the DOM transform is `rotateY`, so a
`DOMMatrix` read cannot distinguish 0 from 360 and cannot give the accumulated sign.
**Sample the matrix every ~16 ms through the flip and unwrap consecutive shortest deltas**;
their sum is the signed travel. Assert per gesture: (a) total = ±180 exactly, (b) the sign
matches the side tapped, (c) it RAMPED through ≥10 intermediate angles rather than stepping —
the ramp-vs-step test that caught the nav bug class in §8.6, (d) the resting face is the
expected front/back. Cover the full cycle: right, right (360 ⇒ front again), left, left
(0), then a repeat round-trip to catch one-shot breakage; plus one real swipe forward and
back to prove the drag path still commits, and a tap issued mid-animation to prove
`isAnimatingRef` still rejects it. Run it in both themes and both languages. Fail loudly
with a list, never exit 0 on zero gestures executed.

### 8.3 Profile — BY EYE, on the user's instruction, with a guardrail
**STATUS 2026-10-26: 4 of 5 done, all labelled user-directed in `Profile.jsx`, nothing written
into `qa/specs/`.** Titles now `text-muted` (qaLangLabel/qaThemeLabel/qaNoteTitle/qa2faTitle),
`InfoRow` value `font-extrabold`→`font-bold`, logout pill `rounded-full`→`rounded-[14px]`, both
segmented containers `rounded-full`→`rounded-[12px]` with inner buttons 12→9 and 10→8. Full gate
afterwards unchanged at **4121/1** — safe because the only `radius` assertions in
`qa/specs/4x-profile-*` belong to **navBar/navPill**, and no Profile-owned colour or radius is
pinned. **Magnitudes are deliberately modest and unverified** — only the user's eye can settle
them. **Item 5 ("most row icons wrong") is BLOCKED, not unsolved** — same blocker as item 3
below. The only Profile refs are the two `18.34.09` photos of a physical screen, so a ~20 px
glyph is unreadable mush and it cannot be established *which* icons are wrong or what they
should be. The donor does ship candidates (`location-icon.png`, `calendar-icon.png`,
`language-icon.png`, `user-icon.png`, `signal-icon.png`, `flag-icon.png`), but §8.4.4 forbids
mapping donor glyphs by filename (four tile glyphs are already known inverted) and shape-matching
needs a legible reference. **A Profile re-shoot unblocks it; do not swap glyphs on a guess.**

Reported: `Akbou` / `12-03-2003` weight too big · settings row titles should be **gray not
black** · logout pill **too rounded** · EN/AR + theme segmented controls **too rounded** · most
row **icons wrong**.

**The user explicitly chose "match by eye against the photos".** Honour that, but carry the
constraint with it:
- These are **directed opinions, not measurements.** Profile's only refs remain two 2048×1536
  photos of a physical screen (moire, perspective, landscape).
- **Do not write these numbers into `qa/specs/4x-profile-*` as if capture-derived.** Those specs
  are deliberately limited to order chains + transferred nav values + colours from clean
  login/home captures (§4 item 10). Putting eyeballed px/weights there manufactures exactly the
  false-green class already refuted in this file.
- If a spec entry is unavoidable, mark it `user-directed` in its `note`.
- **The Profile re-shoot is still the standing blocked decision** and would upgrade all six of
  these to measurements.

### 8.4 Icon sourcing policy (decided)
1. **Donor high-res PNGs where they exist** — `old/webetu/public/assets` ships 116–143 px alpha
   PNGs, strictly better than cropping a ~20 px region out of a 591 px JPEG.
2. **Otherwise crop from the real captures**, accepting the resolution limit.
3. **`onou` and `absences` have NO donor source at all** (recorded in `crop-assets.mjs`; they are
   inline SVG today) — so the ONOU tile must be cropped or supplied by the user. Ask before
   hand-drawing it.
4. **Never trust a donor filename to describe a webetu2 glyph** — four tile glyphs are inverted
   vs the names. Map by measured shape as `TILES` does, and verify with
   `node scripts/verify-tiles.mjs`, which compares **decoded pixels, not bytes** (the pipeline
   re-encodes every PNG so byte hashes never match).

### 8.5 Information-note modal (new feature, new references)
**STATUS 2026-10-26: BUILT and EXERCISED — `scripts/qa/check-info-note.mjs` 44 probes · 0 failed.**
User decisions taken this session: build **structurally** from the photos and tune by eye; the
blue-vs-white row difference is a **photo artifact** (one state ships); the CTA opens the URL in
a **new tab**. `src/components/InformationNoteModal.jsx` + `CloseIcon`/`ExternalLinkIcon` in
`icons.jsx`; the Profile row's `navigate('/service/other-services')` was **replaced** by
`setNoteOpen(true)`, and copy lives in `src/i18n/{en,ar}/profile.json` under `note.*`.
Verified: opens with URL still `/profile`; exactly 4 declarations; **X mirrors** (centre 302.0 EN
vs 58.0 AR about modal centre 180.0) using a plain flex row, **no `dir` override**; card stays
inside the viewport (312x614 EN / 312x519 AR in 360x780); CTA and both inline "See" links carry
`target=_blank rel=noopener noreferrer` to `https://progres.mesrs.dz/donnees/`; closes via X,
Escape and scrim; 3/3 reopen cycles. Full gate unchanged at **4121/1** (the static gate cannot
see this feature at all — it screenshots /profile with the modal closed — which is exactly why
the probe exists).
- **Shot→state mapping, now ESTABLISHED** (read once as a contact sheet, then at native res):
  `informations1` = EN light, `info3` = EN light (same modal), `info2` = **AR light**,
  `info4` = **AR dark**. All four are **1536x2048 photos of a physical screen**, so they give
  order and proportion only — no px, no colour — and nothing from them was written into
  `qa/specs/4x-profile-*`.
- **Transcribe at native resolution, do not read legal copy off a contact sheet.** Cropping the
  1536x2048 originals corrected three errors the 300px tiles produced: the law is
  **18-07 dated 10 June 2018** (the tile read 16-01/2016), the name is **FERHATEN Yani** (tile
  read FERHATNI), and there are **FOUR** declarations (the tile looked like five). The AR text
  independently confirms 18-07/2018. The declaration copy exists in **no** source file and the
  donor has none — it was only ever in these photos.
- **`DONNEES_URL` and the new-tab behaviour are still an ASSUMPTION** marked as such in the
  component — no reference shows what happens after the CTA is pressed.
- Console mojibake (`Ù…Ø°ÙƒØ±Ø©`) in probe logs is cmd's codepage, **not** bad data: the
  assertion compares against Arabic literals and passes. Don't "fix" the i18n over it.

### 8.6 Tab switching — the nav must not unmount (structural fix)
**STATUS 2026-10-26: DONE and VERIFIED.** `BottomNav` is now rendered once by `App.jsx`
as a sibling of the `AnimatePresence` block, gated on `TABS = ['/home','/cards','/profile']`
(Service and the auth pages never had it, and still don't). The per-page `<BottomNav />`
renders and imports are gone from `Home.jsx`, `Cards.jsx`, `Profile.jsx`. Tab variants lost
their `exit` so `mode="wait"` resolves immediately; a cross-fade (`mode="sync"`) was rejected
because both pages carry `.app-shell { min-height: 100dvh }` and the document would be briefly
200dvh tall during the overlap.
Verified by `scripts/qa/check-tab-nav.mjs` → **56 probes · 0 failed** (light/dark × en/ar):
`navBar` missing in **0 of 70 sampled frames** across all 16 transitions (the reported bug),
the pill **glides through 13–14 distinct x positions stepping exactly 104 CSS px**
(24 → 128 → 232 → back; 104 = the a360 bar's 312/3 — the 346 in the component comment is the
a394 figure), the URL really changed so the frames landed on a live transition, and the nav is
absent on `/login` and `/service/discharge`. Full gate re-run after the hoist: **4121/1, 38
scenarios, unchanged** — the hoist did not disturb the nav geometry the home and profile specs
assert. lint 0 errors / build ✓.
**Harness quirk found here:** `vite preview --port 4190 --strictPort` never came up for this
probe in two attempts, while 4187 and 4189 both work — so the probe uses **4189**. If a new
probe dies at `waitForServer`, suspect the port before suspecting the code, and note that
`--strictPort` means it aborts rather than falling back.

Symptom: switching between the 3 tab pages does a full refresh where even the bottom nav
disappears; the pill and the green focus should glide left/right.

**Root cause (confirmed by reading `App.jsx`):** the whole `<Routes>` tree — **including
`BottomNav`** — sits inside the keyed `motion.div` with `mode="wait"`, so every tab change
unmounts the nav, waits for the exit, then remounts it.

Robust fix, in order:
1. **Hoist `BottomNav` out of the animated container**, as a sibling of `<Routes>`, rendered from
   the location on protected routes only (home/cards/profile/service). It then never unmounts,
   so there is nothing to flash.
2. **Drop `mode="wait"` for tab switches.** Keep the push only for `/login↔/verify`, which is
   what the video shows; tabs cross-fade, or don't animate on exit at all.
3. **`layoutId="activeTab"` already exists** on the pill — it cannot glide while its subtree
   unmounts. Once the nav is persistent it glides for free. If it still jumps, the usual cause is
   a `key` change remounting it; keep item keys stable.

**Verification gap to close:** pixdiff screenshots single pages and **cannot see this at all**.
Write a probe that switches tabs and asserts (a) `data-qa="navBar"` exists continuously across
the transition and (b) the pill's x passes through intermediate positions — **ramp vs step**, the
technique `check-login-motion.mjs` uses, with thresholds in the measured gap, not tuned to pass.

### 8.7 Arabic type — separate investigation (decided)
**STATUS 2026-10-26: NOT REPRODUCED. No change made — and none should be made on the current
evidence.** Measured AR capture-vs-render on every element that could be measured cleanly, using
ink **width/height/centre** (never area, per trap 9):
- **AR login title** (`18.25.56 (4)` vs `06-login-ar-dark`): w **117.5 vs 117.5**, h **21.0 vs
  21.0**, cx **179.3 vs 179.3** — an exact match. Weight is therefore not wrong. (Its ink area
  reads 4021 vs 4284, +6.5%, which is the LCD-fringe artifact, not bolder strokes.)
- **AR home title** (`18.56.17` vs `24-home-ar-dark`): w 121 vs 120, h **21.5 vs 21.5** — match.
- **AR nav labels** (the `x1.18` bump): w **301.0 vs 302.0** (0.3%), h 15.0 vs 15.0, cx 175.0 vs
  175.0 — the bump is correct.
- **AR login field labels**: render runs ~3.4% narrower (w 87 vs 90, 83.5 vs 86.5) while the
  right anchor matches to 1.5 px. **Ambiguous, not a defect**: a single different character in
  the transcribed string produces the same signature, and 3 CSS px is inside the noise of a 1.5x
  JPEG. Do NOT "fix" this with a size bump — §4 item 5 is a prior negative result for exactly
  that move, and ink height is not an Arabic size proxy (ascenders + dots-below).
- **AR tile labels**: unmeasurable this way. `bbox` extent is uninformative here (the label and
  the glyph art span the band, so it reports the full box); the only number is `n` (capture 2317
  vs render 1739), and area is the metric trap 9 forbids — it also ran the OPPOSITE direction to
  the login title's area gap, which is what proves area says nothing about weight.
- Tile green is NOT a discrepancy: capture `#069278`/`#108c72` vs render `#009577`, max channel
  delta 16 — ordinary JPEG softening around the shipped value.
**To reopen this, get a specific element + screenshot from the user.** "Arabic style and weight
are inaccurate" is not reproducible numerically across the four elements measured, and guessing
further risks breaking the `x1.26` / `x1.18` scales that the captures do confirm. If a real
complaint exists it is more likely the **face** (Cairo vs something else) than the weights, and
that needs glyph-shape comparison, not size arithmetic.

---
