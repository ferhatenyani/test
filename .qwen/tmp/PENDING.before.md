# Deferred / pending work — accuracy pass

Agents have died repeatedly on `Request timeout after 483s` (~5M tokens each). This file is the durable checklist so a lost agent's remaining scope is not lost with it.

## Wave 1 — geometry (in flight)

| Agent | Scope | Status |
|---|---|---|
| `login` | Login/Field/Button geometry, ids 01–10 | running |
| `verify` | Verify/OtpInput geometry, ids 11–14 | running |
| `home` | Home/BottomNav/BannerCarousel/ThemeToggle, ids 20–25 | running |
| `service` | Service/ServiceHeader/EmptyState, ids 30–39 | running |
| `profile` | Profile.jsx, ids 40–47 | **DEAD — not yet relaunched** (held back to cap concurrency) |

## Wave 2 — deferred out of wave 1 on purpose

These were cut from the geometry briefs so those agents would finish inside their context budget. Each needs its own agent.

1. **Login animation** (user: "not even implemented"). Source is the video, frames already extracted at `qa/debug/video-strip.png` — read that ONCE, not the mp4. Behaviours: card entrance; focus → brand-green border + soft glow + caret; empty/invalid submit → red border + red inline message under the offending pill + shake; password eye toggle; **push/slide transition login → /verify**. Respect `prefers-reduced-motion`.
2. **`scripts/qa/check-login-motion.mjs`** — must measure, not assert: computed border-colour + box-shadow before/after focus; error pill border + message box; peak-to-trough x delta across ~10 shake frames (catches an invisible shake); input `type` before/after eye; URL becomes /verify. Run forward AND backward, both themes, both languages. Fail loudly with a list.
3. **`scripts/qa/check-verify-input.mjs`** — per-digit focus advance, backspace walking backwards and clearing, 6-digit paste, non-digit rejection, button enabled exactly at 6 digits. Both themes + languages.
4. **`scripts/qa/check-home-carousel.mjs`** — forward to end, assert clamp; backward to start, assert clamp; full round trip to catch one-shot bugs; report track offset + active dot index after EVERY gesture. Backward swipes were broken before and a single-gesture test passed it. Both languages + themes.

## Wave 3 — orchestrator only (me), after waves 1–2

- Apply every `qa/requests/*.md` centrally (index.css tokens, icons.jsx, cross-page component changes). Single writer avoids clobbering.
- Full-matrix `node scripts/qa/measure.mjs` + `check.mjs` + `pixdiff.mjs`; confirm no agent regressed another page's numbers.
- `npm run lint` and a production build.
- Cards page stays **excluded** — no reference capture exists. Needs a clean capture from the user, or an explicit call to model it on `old/webetu` MyCards.
- Profile needs a clean (non-photo) re-shoot; its only refs are 2048×1536 photos of a screen, so colour assertions there are inferred from the dark login/home captures, not sampled.

## Known state

- **Gate: 3806 assertions passed, 1 failed, across 30 scenarios.** `qa/specs/` now holds 30 specs; `qa/refs/` holds login/verify/home/service.
- Pixel diff mean **7.77%** over 24 capture-backed scenarios. Best: `35-service-assessment-blank` 0.63%, `31-service-discharge-ar` 1.13%. Worst: the three login keyboard scenarios (24–25%) — masked to exclude the iOS keyboard, but still the least reliable comparisons in the set.
- Baseline before any agent: login mean **13.41%**. Static login states improved to 4.9–7.5%; the keyboard/focus scenarios got *worse* and are unexplained — see below.

## Open item 1 — `33-service-group-section` caption y: artwork-crop hypothesis TESTED AND REFUTED

Measured `public/assets/empty-sad-box.png` directly: 454x410, `hasAlpha false`, 143246/186140 px (77%) within dE<=6 of `#f5f6f8`. Ink bbox x 35..420 y 10..409 => baked margins **left 35 / top 10 / right 33 / bottom 0**. At `w-[302.7px]` the scale is 0.66674 and rendered height is **273.4** (spec: 273.3, exact).

Because the bottom margin is 0, art-bottom == ink-bottom and the component's art-to-caption gap is **0.00 CSS px** — which matches scenario 30/31 (0.7) and 32 (0.9). **The asset cannot produce the 11.6 px gap scenario 33 wants.** Do not re-open the crop theory.

Only real asset oddity: the crop is asymmetric and truncated flush to the ink at the bottom (0 vs 35/10/33 elsewhere). Harmless for 3 of 4 captures; worth re-cropping with a little bottom whitespace only if a future reference demands it.

**Recommendation: option (a)** — accept 171.3/444.6 as canonical (3 of 4 captures agree with the build within 0.9 px) and leave 33's assertion red as a documented n=1 reference-set disagreement. Option (c) (per-service +19.4 px) would trade 3 green scenarios for 1.

## Timetable build — APPROVED, NOT YET DONE

User approved building `18.26.05 (2)` Timetable from the single capture: 122 CSS band, scrolling day-pill row (Saturday / **Sunday filled** / Monday / Tuesday, cut off at right edge) at y 157.3-198, caption **"No classes scheduled"**. Scope agreed: header + pills + **EN only** — no AR string (no AR capture exists; inventing it would be fabrication). Keep scenario 37 red on the body until a second reference confirms pill behaviour. Needs a new i18n key in `en/services.json` or `en/empty.json` and a new variant in `src/data/services.js` + `EmptyState.jsx`.


## Login page — state, and the root cause of "the header is not the same"

`check.mjs 01-login … 10-login` → **910 assertions, 0 failed**. pixdiff: static scenes mean **5.92%** (01 4.89, 04 5.74, 06 5.04, 02 5.80, 08 6.50, 07 7.54) vs the 13.41% baseline.

1. **Root cause found: `env(safe-area-inset-top)` resolves to `0px` in headless.** The band was `absolute top-0 h-[calc(env(safe-area-inset-top)+112px)]`, so it painted 0–112 while every capture paints the **first 25 CSS px as page background** and starts the band at 25. That put *every element below the header 25 px too high*. Fixed to `max(25px, env(safe-area-inset-top))` — the convention `ServiceHeader.jsx` already used. **Audit any other component that sizes with `env()`**: in headless QA it silently collapses to 0.
2. **Open item 2 is RESOLVED — not a defect.** The three keyboard scenarios are *translated* ~120.5 CSS px (form-card top 208 in capture vs 328.5 in render; pill hairline 351 vs 379.5) because the iOS keyboard pushed the real page up. A static render cannot match them; their 24–25% is a measurement artifact, and the masks were honestly left alone. Treat those three percentages as non-signal.
3. **Dark brand is a different green: `#1bb495`** (light is `#009577`), measured flat across 400–800 px on band, underline bar and CTA fill. **Corroborated independently by `home`**, which read the active nav dot as `#1bb496` in dark vs `#039477` in light. Unlike the border values I rejected, these are large flat regions, so the earlier rejection does NOT apply. Needs `--color-brand` to become a theme-flipping token (move to the `@theme inline` + `:root`/`[data-theme=dark]` var pattern) — a token-system change, deliberately not attempted at the end of a session.
4. **Field icon must NOT mirror in Arabic** — AR icon ink sits left (57–66) exactly as EN (52.5–67.5) while the value hugs the right. Fixed with `flex-row rtl:flex-row-reverse`. Third instance of the "don't mirror this" pattern (with BottomNav order and the tile grid).
5. A pill holding a value keeps the brand hairline + brand glyph even when **unfocused** (`active = focused || value`).

## DECISION NEEDED — the Latin face is not Poppins

At matched ink height the donor's Latin letters are **10–21% narrower** than ours: title ink 137 (ref) vs 158 (render), "Registration number" 106 vs 123, "Copyright © 2026" 75.5 vs 91.5 — while **digits match to 1.4%**. So every measured *size* is right and only the horizontal **advances** are wrong; no tracking fix was applied because compensating with negative letter-spacing would break the digits. This is a font-stack decision (candidates: a narrower geometric sans, or accept Poppins and document the residual). It is likely the single biggest remaining contributor to login's ~5% static diff.

## Wave 3 — FIRST ACTION: re-run the full matrix

`node scripts/qa/measure.mjs && node scripts/qa/check.mjs && node scripts/qa/pixdiff.mjs`. The 3806/1 figure predates the login agent's final edits; login and home were each only re-verified for their own pages. Nothing has confirmed cross-page non-regression since the central `index.css` cascade fixes changed what utilities actually apply to controls.


## Harness limitation — focus state is unmeasurable (separate from the keyboard artifact above)

**`scripts/qa/measure.mjs` calls `document.activeElement.blur()` and `window.scrollTo(0,0)` before dumping the DOM.** So:
- No render can ever show a **focus** state, yet `18.35.12` shows OTP box 1 focused and the login focus captures show a green-bordered pill. Any focus assertion is unmeasurable by construction.
- The blur+scroll was inherited from the old `verify-shots.mjs` to keep framing stable, but it actively destroys the state those three scenarios exist to check.

**Fix (not applied — it changes measured values for every scenario and could break currently-green specs):** stop blurring; instead reset scroll only when nothing is focused, and add an explicit `focusTarget` per scenario so focus state is captured deliberately. Then re-baseline all specs that assert border/box-shadow. Verify with `bbox` on capture vs render, not the masked percentage.

## Other harness limits found by agents (unfixed, real)

- `check.mjs` reads computed `backgroundColor`, which is **transparent under a `background-image`** — so gradients (2FA sheet bar `#0f8b6f→#0bcba4`, disabled CTA `#73c6b2→#74e6cf`) can only be asserted geometrically, never by colour. Needs a `backgroundImage` expectation field.
- `parseColor` cannot read Tailwind v4 `oklab(...)`; `rounded-full` reports `33554400px`. Both documented in `qa-harness-traps` memory — author explicit values instead.
- Now-redundant workarounds left in agent files: `!` important modifiers in `OtpInput.jsx` / `Verify.jsx` (`rounded-[8px]!`, `text-[11.5px]!` …) that compensated for the two unlayered `index.css` rules. Harmless, but they can be dropped now that the root cause is fixed.

## Home page — state, and two findings that outlive it

`check.mjs 20- 21- 22- 23- 24- 25-` → **1924 assertions, 0 failed**. `pixdiff` mean **6.71%** (best `21-home-en-light-slide2` 5.23%, worst `25-home-ar-dark-slide2` 8.84%).

1. **PLAN.md's D8 "mirror the grid in RTL" is WRONG — the Arabic tile grid is NOT mirrored.** Evidence: the AR glyph ink boxes are *pixel-identical* to the EN ones at the same screen positions, and per-character label widths only fit LTR order (`الديون` 6 chars at x=29 vs `عطلة أكاديمية` 13 at x=67; RTL would demand 2.2 and 11 px/char). Fixed with `dir="ltr"` on the grid container + `dir="auto"` per label. **Audit every other page for the same false assumption** — BottomNav order was already known not to mirror; the grid was the second case.
2. **Arabic needs ~1.26× larger type than Latin** (labels) and ~1.18× (nav labels) — width *and* height scale together, so it is size, not font. Now `isRtl`-conditional in Home; **Profile / Service / Verify AR type may need the same treatment** and were never checked for it.
3. **The largest remaining visual gap is an asset, not code.** An offset sweep (−10..+10 y, −6..+6 x) on scenario 25 is **flat at 47.4% for every offset**, so nothing is misaligned — the *artwork* differs. The AR captures show an Arabic banner-2; we ship one Latin asset. Crop it from `18.56.18` at device `x36–555, y167–318`. Our 505×159 (3.176) vs the 346×101 box (3.426) forces a ~7% `object-cover` crop.
4. Backward carousel swipes **work** — verified on drags, flicks, and past-threshold small drags, with correct clamping at both ends and the old "second gesture clamps" bug gone. A full test script is still owed (wave 2).
5. Unresolved honestly: **tile border colour** — the edge is a plain 2px AA ramp from page bg to green in both themes at MIN=40 and MIN=8, so a 1px `#39a38c` border is not supported by the captures. Only `borderWidth: 1` is asserted; no colour claimed.

Its token requests (`--app`, `--ink`, `--color-tile` → `#009577`) were **already applied centrally** — so the interim hardcodes in `Home.jsx` (`bg-[#f5f6f8] text-[#111215] …`) can now be dropped back to `bg-app`/`text-ink`. Still open from `qa/requests/home.md`: `GlyphMask` can't forward `data-qa` (needs `{...rest}`; 17 wrapper spans added meanwhile), and a shared `--safe-top/--safe-bottom` for the ~51.5/42.5px baked OS insets that `env()` cannot reproduce.


`check.mjs 11- 12- 13- 14-` → **641 assertions, 0 failed**. `pixdiff 11-verify` → **7.93%** (meanΔ 18.4). PLAN.md's "OTP boxes 45×50" was **wrong** — measured 46×54, pitch 50, gap 4, row 296 centred, fill `#eef2f3`, idle border 2 CSS `#cfd3da`, radius 8. Also corrected: gutters 18→16, copy icon moved first→last, secret row's white card removed, sheet radius 11→20, CTA h 40→42 r 21, QR card 168→163×165, back chevron is **ink-coloured not green** and 24 not 17. Scenarios 12/13/14 have `capture: null`. **Unasserted on purpose:** OTP digit size (boxes empty in the capture) and the base32 secret glyphs (illegible).


## Central fixes applied to `src/index.css` (orchestrator, 2026-10-26)

1. Deleted `input,textarea,button{font:inherit}` — unlayered, it beat every utility. Tailwind v4 preflight already does this *inside* `@layer base`. Wrapping it in `@layer base` is **wrong here**: `@tailwindcss/vite` mangles it to invalid `:is() input`. Verified by brace-tracing compiled CSS.
2. Removed `border-radius:0` from the `input[type=…]` rule for the same reason (preflight covers it); this had been forcing every text input to radius 0.
3. Tokens applied from converged measurements: `--app` #f5f6f8 / #101115 (two agents, different captures, agreed; dark confirmed 100%-flat over 450px), `--ink` #111215, `--field` #eef2f3 (corroborated by the 2FA capture's OTP fill), `--card` #171a21 (probe read #171a21/#171a23), `--color-tile` #009577.
4. **Two requested tokens rejected**: `--field-border` light #a1a3a2 was REFUTED — probing the 2FA capture's OTP borders reads #d6d6d8..#dedede, and the login agent had itself flagged its value as a "lower bound" from an under-sampled 1px stroke. Dark #93969d rejected for the same reason (same unreliable category, no capture to adjudicate). Both left at their original values.
5. `qa/specs/13,14-verify-*dark*`: 16 colour expectations re-anchored to the dark **login** capture, because those scenarios have `capture: null` and their old values were render-derived (self-referential). Provenance written into each spec's `source`.

**Harness bugs fixed**: `check.mjs` prefix→substring filter + **exit 2 on zero matches** (it used to report a vacuous green for the exact command in the brief); `ruler.mjs` `cssPerPx` 2.25x error.

## Wave 3 — still to do

- Relaunch `profile` (ids 40–47). Its 34 `data-qa` hooks in `Profile.jsx` survive; no spec written yet.
- Re-run `node scripts/qa/pixdiff.mjs` after the keyboard investigation.
- `npm run lint` + production build.
- Cards page stays **excluded** — no reference capture exists.
- Profile needs a clean (non-photo) re-shoot; its only refs are 2048×1536 photos of a screen.

