# Requests from `login` — wave 1 (geometry + type pass)

All values below are read with `scripts/qa/pxprobe.mjs` off the a360 login set
(18.25.55, 18.25.56 ×6, 18.25.57), device px ÷ 1.5. I applied each of them as
arbitrary values inside my own files so login matches the captures **now**; the
diffs below are the central fix, after which those arbitrary values can be
dropped. Nothing here is a guess unless it says "cannot resolve".

## 1. `src/index.css` — the dark palette and the field surfaces are off the captures

```diff
 :root {
-  --app: #eef0f3;
+  --app: #f5f6f8;            /* box 330,250 20x15 = 300 px, one colour */
   --card: #ffffff;           /* matches: box 250,335 60x15 = #ffffff */
   --ink: #1f2430;
   --muted: #8a8f98;          /* matches the copyright ink sample #8c9093 */
   --label: #6b7280;
   --hairline: #ececef;
-  --field: #e8eaee;
+  --field: #eef2f3;          /* box 200,400 80x15 = 1200 px of ONE colour */
-  --field-border: #cfd3da;
+  --field-border: #a1a3a2;   /* at 37.5 390 / row 403: darkest hairline sample */
```

```diff
 [data-theme="dark"] {
-  --app: #171922;
+  --app: #101115;            /* box 300,250 30x15 = 450 px of #101115 */
-  --card: #20232e;
+  --card: #171a21;           /* logo card AND form card, box 60,100 / box 25,350 */
-  --field: #2a2e3a;
+  --field: #21252e;          /* box 100,395 100x20 = 2000 px of one colour */
-  --field-border: #3a3f4d;
+  --field-border: #93969d;   /* row 402: the pill outline is LIGHT in dark mode */
   --ink: #f2f3f7;            /* login title ink samples #e6e7eb — 12 off; keep */
```

Why I trust these: each is a flat region of 200–2000 sampled device pixels
reporting a single value, and the same probes on the light captures return
#eef2f3 / #ffffff / #f5f6f8 exactly, so the captures are not drifting globally.
The largest one, `--field-border` in dark (89 off), is visible: the donor's dark
pills are outlined, ours are not.

`--field-border` caveat: a 1 CSS px stroke is 1.5 device px, so no sample is
fully covered and the peak value moves ±10 between scan offsets. #a1a3a2 /
#93969d are the peaks, i.e. lower bounds on how dark/light the true stroke is.

## 2. `src/index.css` — add a dark brand value (this is the header's colour bug)

`--color-brand` is declared once in `@theme` and never flips, so dark mode paints
#009577 where the captures paint #1bb495.

```diff
 @theme {
   --color-brand: #009577;
+  /* not a real dark variant — see the note below before taking this shape */
   --color-brand-dark: #008168;
```

The measurement: `box 12,60 20x20` inside the dark band (18.25.56 (2)) = 400 px
of #1bb495; `box 60,560 40x20` inside the dark LOGIN button (18.25.56 (5)) =
800 px of #1bb495; the dark underline bar reads #1bb495 through its core. The
same probes on the light captures return exactly #009577. The dark *focus* hairline
is NOT that value — it samples #128d71/#138b70, i.e. #009577 — so the donor has
two greens in dark mode (surface brand vs line brand) and I cannot tell from
stills whether that is a token pair or an overlay. Suggested shape, pending your
call:

```diff
 @theme {
   --color-brand: #009577;
   --color-brand-dark: #008168;
 }
+[data-theme="dark"] {
+  --color-brand-surface: #1bb495;  /* band, underline bar, CTA fill */
+}
```

Until then Login.jsx carries `dark:bg-[#1bb495]` on the band/bar and
Button.jsx carries it in its own palette (only Login imports Button.jsx today;
Verify.jsx builds its own <button>s, so this does not touch the 2FA page).

## 3. `src/index.css` — `font: inherit` on form controls is unlayered, so every text/font utility on them is dead code

```diff
-input,
-textarea,
-button {
-  font: inherit;
-}
+@layer base {
+  input,
+  textarea,
+  button {
+    font: inherit;
+  }
+}
```

It is currently written outside any `@layer`, and unlayered author rules outrank
all of Tailwind's layers. Evidence from the measured DOM: an input carrying
`text-[13px] font-medium` reported fontSize **16** / fontWeight **400**, and a
button carrying `text-[13.5px] font-bold tracking-[0.06em]` reported **16 / 400**.
So the field text and the LOGIN label have been rendering at the body's 16/400
for the whole project.

This matters because the captures *do* measure 16 CSS: "202133010290" ink is
106.5 × 11 and "LOGIN" ink is 41.5 × 11.5 cap height (`bbox 72 388 300 418` /
`bbox 60 545 300 590`), which is Poppins digit/cap ratios at 16 px. So no page
gets smaller by this fix — but any page that sets `text-[..]` on an input is
currently lying, and after the fix it will start to apply. Fields to re-measure
afterwards: Login (I set mine to a real 16 px on the pill, which the control
inherits), Verify's matricule field if it uses Field.jsx, and Profile's toggles.

## 4. Harness / scope notes, no diff asked

- **The 25 px status strip is the reason everything looked small and low.** Every
  capture paints y 0..25 with the page background (`col 20 0 60`) and starts the
  band at 24.5..25; a headless render resolves `env(safe-area-inset-top)` to
  0 px. I floored the reserve at 25 px in Login.jsx, matching the convention
  ServiceHeader.jsx already uses. If you would rather the harness emulate the
  inset, that is a `measure.mjs` change (context/viewport) — then the floor can
  come out of my page and out of ServiceHeader.
- **The three keyboard-up captures cannot be pixel-compared.** In 18.25.56 the
  band has left the frame entirely at x=30 (y 20..208 reads page bg, form card
  top at 208 vs 328.5 in the still) while the underline bar reads 256.5 — the
  shifts are not uniform, so the donor page is scrolled/compressed by the
  keyboard, not translated. Our render cannot reproduce that and should not.
  Their diffs (24–25 %) are that, not geometry.
- **Do not add a `fillLoginFocusReg` action.** The filled captures (18.25.56 (1),
  (5), (6)) show the *reg* pill with a brand hairline and brand glyph while the
  *pass* pill is the focused one — i.e. the accent follows a held value, not
  focus. Field.jsx now accents `focused || value.length > 0`, so the existing
  `fillLogin` action (which ends focused on `#pass`, then gets blurred by
  measure.mjs) already matches. Measured: (1) row 403 hairline #11886c and icon
  #0a8165; row 497 hairline #2a9279 and icon #008865.
- **Font family, cannot resolve from stills.** At equal ink height the capture's
  letters are ~10–15 % narrower than Poppins: "Student Portal" 137 (render 158),
  "Registration number" 106 (render 123), "Password" 49.5 (render 57), "LOGIN"
  41.5 (render 44), "Copyright © 2026" 75.5 (render 91.5) — while the *digits*
  match to 1 % (106.5 vs 105), because digits are near-uniform across faces.
  Heights match everywhere, so the sizes are right and only the advances are
  wide: that is the stack, not my components. I did not chase it with heavy
  negative tracking (it would look crushed at 21.5 px); LOGIN is the one place I
  trimmed a token of width (-0.48 px, the old 0.06em of positive tracking was
  pure overshoot). If the donor face can be identified from the video, the fix is
  `--font-poppins` in `@theme` and every page benefits.
