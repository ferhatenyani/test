# Requests from `service`

## 1. `scripts/qa/ruler.mjs` prints a grid whose labels are 2.25x off — blocks every page

`cssPerPx` is wrong, so the numbers burned into the overlay cannot be transcribed.

```js
const cssPerPx = scale / ZOOM          // current: 1.5 / 2 = 0.75
```

The extracted region is resized to `region.width * ZOOM`, so the buffer holds
`scale * ZOOM` device-scaled px per CSS px, and CSS px per output px is its
reciprocal:

```js
const cssPerPx = 1 / (scale * ZOOM)    // fix: 1/3 = 0.3333
```

Proof, no judgement involved: a full `540x1170` capture is 360 CSS wide, and
`node scripts/qa/ruler.mjs "WhatsApp Image 2026-10-25 at 18.26.05.jpeg"` writes an
overlay whose vertical labels run to **810** and horizontal to **1755** — exactly
2.25x the real extent. The loop bound `originCssX + W * cssPerPx` inherits the same
error, so it draws 2.25x too many lines at 2.25x too tight a spacing. Anyone reading
a number off this overlay is transcribing `real value x 2.25`.

I worked around it with raw-pixel probes (`qa/debug/service-scan.mjs`, `art-geom.mjs`,
`detail-scan.mjs`, `chips-scan.mjs`, `service-probe.mjs`) and did not use the ruler at
all. Those are scratch tooling for my page; the fix belongs to the harness. **Suggest
every agent re-checks anything they transcribed off a ruler overlay.**

## 2. `check.mjs` / `measure.mjs` id filter is `startsWith`, not substring

`node scripts/qa/check.mjs service` reports `0 scenarios` — `loadRefs`/`scenarios`
match by substring but `check.mjs` matches `id.startsWith(o)`, and the ACCURACY.md
usage line says "id prefix". Page names are in the middle of ids (`30-service-…`), so
the documented invocation silently checks nothing and exits 0. Either make `check.mjs`
use the same substring match as `scenarios()`, or correct the brief.

## 3. Tailwind v4 output is unparsable by `lib.mjs` `parseColor`

`bg-white/20` computes to `oklab(0.999994 0.0000455678 0.0000200868 / 0.2)` and
`parseColor` returns null → `check.mjs` reports `unparsable` and the assertion can
never pass. Same class of problem for any `/opacity` utility. Two ways out, your call:

- teach `parseColor` `oklab()`/`oklch()`, or
- tell agents to write `bg-[rgba(255,255,255,0.2)]`.

I did the latter in `ServiceHeader.jsx` so the disc colour is assertable.

## 4. `rounded-full` cannot be asserted as a radius

Chrome reports `borderTopLeftRadius` as `33554400px` for a pill, so `radius` in a spec
is unusable against `rounded-full`. I switched to explicit radii
(`rounded-[20.65px]`, `rounded-[18.35px]`) to keep the shape asserted. Worth a note in
the brief, or a `radius: "pill"` sentinel in `check.mjs`.

## 5. Findings on the reference set itself (no action needed from you, but they change specs)

- **A variant exists in the captures that is not in `src/data/services.js`.**
  `18.26.05 (2)` **Timetable** has a **122 CSS** green band (not 66.7), a
  horizontally-scrolling day-pill row at y 157.3–198 (`Saturday` outlined, `Sunday`
  filled green, `Monday`, `Tuesday`, cut off at the right edge), a calendar-x glyph and
  the caption **"No classes scheduled"** — a string in no i18n file, and a different
  empty-state message from every other capture. I deliberately did **not** build it:
  one capture gives no evidence for the pill behaviour, and inventing an Arabic
  translation for "No classes scheduled" would be fabrication. Scenario
  `37-service-timetable-days` is in `qa/refs/service.json` with the header asserted and
  the body left red on purpose (14.41% differing, worst in the set) so the gap stays
  visible.
- **The same sentence is rendered in two styles.** `18.26.06` (Exam Grades) draws
  "Data not available currently!" near-black `#1a1a20` with ink 207.3 CSS wide;
  `18.26.06 (1)` (Group and Section) and `18.26.06 (2)` (Exams Schedule) draw it grey
  `#6c7278` at 185.3 wide. The width ratio 1.11 fixes two sizes (~13.5 and ~12), so it
  is not a weight difference. Encoded as a per-service `caption` field.
- **`src/i18n/{en,ar}/empty.json` had one key whose two locales were different
  messages.** `notAvailable` EN = "Data not available currently!" but AR =
  "عذرا، انت غير معني" = "sorry, you are not concerned", which is the *other* reference
  message. `18.26.05 (1)` proves the EN form of that second message: **"Based on your
  profile, this information is not relevant to your needs."** I added `notRelevant` and
  pointed `discharge` at it. The AR value of `notAvailable` is now unverified — no AR
  capture shows that message.
- **`18.26.06 (4)` Academic transcripts has no caption at all** under the illustration.
- **The sad-box block position is not consistent across captures of the same variant**
  (art element top 165.8 / 171.3 / 179.1 CSS). The header is pixel-identical in all
  eight, so it is not a scroll offset. Specs carry the per-capture number with a stated
  `tol` and the component follows the 18.26.05 pair.
