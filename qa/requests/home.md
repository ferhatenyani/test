# Requests from `home` — files I do not own

Everything below is a change to a file outside my ownership row (`src/index.css`,
`src/components/GlyphMask.jsx`, `public/assets/**`). I worked around each one in
my own files where I could, so nothing here blocks the home gate — but the
workaround is a per-page hardcode that should really live in the shared layer.

---

## 1. `src/index.css` — colour tokens disagree with the captures

Sampled from the a394 home captures with `pxprobe at` on large flat areas (not
text, so JPEG noise is ~±1):

| token | now | capture | where I read it |
|---|---|---|---|
| `--app` (light) | `#eef0f3` | **`#f5f6f8`** | `18.22.04` at (10,300) |
| `--app` (dark) | `#171922` | **`#101115`** | `18.56.55 (1)` at (10,300) and (197,830) |
| `--ink` (light) | `#1f2430` | **`#111215`** | darkest 6% mean of the `18.22.04` title band |
| `--ink` (dark) | `#f2f3f7` | `#f2f3f7` ✓ | lightest 6% mean of the `18.56.55 (1)` title band |
| `--color-tile` | `#009576` | **`#009577`** | `18.56.55 (1)` at (35,240) = `#019575`, (60,790) = `#019477` |
| `--color-nav` | `#33354e` | `#33354e` ✓ | exact at (197,800) in both themes |
| `--color-nav-active` | `#009577` | `#009577` ✓ | exact at (60,790) in both themes |

Proposed diff:

```diff
 :root {
-  --app: #eef0f3;
+  --app: #f5f6f8;
   --card: #ffffff;
-  --ink: #1f2430;
+  --ink: #111215;

 [data-theme="dark"] {
-  --app: #171922;
+  --app: #101115;

 @theme {
   --color-brand: #009577;
   --color-brand-dark: #008168;
-  --color-tile: #009576;
+  --color-tile: #009577;
```

**Why it matters beyond home:** `--app` and `--ink` are page-wide. The dark
`--app` is off by up to 13 per channel, which is above `pixdiff`'s 48/channel
threshold only in combination with everything else, but it is a flat fill across
the whole viewport — every page pays for it.

**My interim workaround** (Home only, will want deleting once this lands):
`src/pages/Home.jsx` shell is now
`bg-[#f5f6f8] text-[#111215] dark:bg-[#101115] dark:text-[#f2f3f7]` instead of
`bg-app`, and `homeTitle` carries `text-[#111215] dark:text-[#f2f3f7]`.
The `--color-tile` gap I could not close in my own file without abandoning the
token, so `qa/specs/2*-home*.json` asserts `bg: "#009577"` with
`"tol": { "color": 1 }` and the reason stated in each spec's `source`.

---

## 2. `public/assets/**` — banner 2 is not localised, and it is the worst residual

Per-band diff of `25-home-ar-dark-slide2` puts 47% of the differing pixels in
device rows 192–320, i.e. the banner band and nothing else.

I checked whether that is a placement error before blaming the artwork: shifting
the render against the capture by −10…+10 device px vertically and −6…+6
horizontally is **flat at 47.4% for every offset**, so nothing is misaligned —
the image content itself differs. Same test on `22-home-en-dark` gives 25.5%
as-placed and 23.5% at the best offset, so the English banner is also a content
mismatch, just a milder one.

The cause: the Arabic captures show an **Arabic** second banner
(`18.56.18`: `جامعة بجاية` + `UNIV202133010290`), while we ship one Latin asset
(`18.22.04` / `18.56.55`: `université de Bejaia`) for both languages.

Requested, in priority order:

1. Crop an Arabic variant out of `18.56.18` — the banner occupies CSS
   `x 24..370, y 111..212`, i.e. **device px `x 36..555, y 167..318`** of that
   591×1280 capture — save as `public/assets/banner-2-matricule-ar.png`, and let
   `BannerCarousel` pick the slide list per language. The crop is 1.5× so it
   downsamples cleanly to the 346×101 CSS box.
2. While in there: our `banner-1-studentcamp.png` / `banner-2-matricule.png` are
   505×159 (aspect 3.176) but the capture's banner box is 346×101 (aspect 3.426).
   I hold the box at 346×101 with `object-cover`, which crops ~7% off the top and
   bottom of the asset. If a 346×101-shaped crop can be taken from
   `18.18.55` / `18.22.04` instead, the crop can go away.

I did not do these myself: `public/assets/**` is not in my row, and hand-rebuilt
artwork is worse than a crop.

---

## 3. `src/components/GlyphMask.jsx` — cannot carry a `data-qa`

`GlyphMask` takes `src`, `size`, `className`, `style` and hardcodes
`aria-hidden`, so there is no way to put an assertion hook on the glyph itself.
I wrapped every one of them in my own `<span data-qa=…>` (14 tiles + 3 nav
items), which measures the 20×20 *box* rather than the mask. That is fine for
geometry but it adds a wrapper per glyph purely for the harness.

Proposed diff — accept and spread unknown props:

```diff
-export default function GlyphMask({ src, size = 20, className = '', style }) {
+export default function GlyphMask({ src, size = 20, className = '', style, ...rest }) {
   return (
     <span
       aria-hidden="true"
       className={`inline-block shrink-0 ${className}`}
+      {...rest}
       style={{
```

If this lands I will delete the wrapper spans in `Home.jsx` and `BottomNav.jsx`
and repoint `tileGlyph-*` / `navIcon-*` at the masks directly. Until then the
wrappers stay and the specs keep asserting the box.

---

## 4. `--color-tile-border: #39a38c` — I could not confirm it exists in the capture

The tile edge is a plain 2 CSS px anti-aliased ramp straight from page
background to the green fill, in both themes and at both `MIN=40` and `MIN=8`:

```
18.56.55 (1) row 300:  26.0 #101115 → 26.5 #003e35 → 27.0 #0f6e5a → 28.5 #11987a
18.22.04   row 250:    24.0 #f5f6f8 → 24.5 #13856c → 28.0 #0e826b
```

A 1px `#39a38c` border would show as a distinctly lighter ~1.5 device px band;
there is no such band. So either the border is absent or it is the same green as
the fill. I left `border border-tile-border` in place and assert only
`borderWidth: 1` in the specs — I am **not** claiming a border colour, and I
could not read one confidently. Someone with the donor CSS should settle it;
`25-home-ar-dark-slide2` and the tile bands are where a wrong border would show.

---

## 5. Harness: the captures include OS inset rows that `env()` cannot reproduce

The captures are a standalone PWA on a phone: content starts at CSS y≈51.5 and
the nav's bottom edge is at y 810.5, i.e. **42.5 px above** the 853 viewport
bottom. Under `measure.mjs` `env(safe-area-inset-*)` resolves to 0, so a page
using only `env()` renders 51.5 px too high and 30 px too tall at the bottom.

I floored mine at the captured values inside my own files
(`pt-[max(51.5px,env(safe-area-inset-top))]`,
`pb-[max(42.5px,env(safe-area-inset-bottom))]`), which is correct against these
captures but is a per-page hardcode. Two cleaner options for whoever owns the
harness:

- give the login/home refs a shared `--safe-top` / `--safe-bottom` custom
  property in `index.css` set to the captured insets, and have pages use
  `max(var(--safe-top), env(safe-area-inset-top))`; or
- have `measure.mjs` inject the insets (Playwright cannot set `env()`, so this
  means the same custom-property route behind an init script).

`DEFAULT_MASK.a394` is `[[0,41],[1243,1280]]` device = CSS 0–27 and 829–853, but
the status-bar glyphs in `18.22.04` reach CSS y≈31, so the top mask band is a few
rows short of covering the OS chrome. Not worth changing unless someone's page
happens to put content up there.
