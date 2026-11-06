# Requests from the `verify` agent — 2FA accuracy pass

Nothing here blocks my page; I worked around every item with arbitrary Tailwind
values plus the v4 important modifier in my own files. These are the shared-file
changes worth applying centrally.

## 1. `src/index.css` — unlayered element rules silently beat every Tailwind utility (highest impact)

Tailwind v4 emits utilities inside `@layer utilities`. Any **unlayered** rule in
`index.css` therefore outranks them, no matter what the class says. Two rules in
the file do exactly that, and both hit my page:

```css
/* index.css:131 — kills text-*, font-*, leading-*, tracking-* on every button */
input,
textarea,
button {
  font: inherit;
}

/* index.css:140 — kills rounded-* on every text input */
input[type="text"],
input[type="password"],
input[type="tel"] {
  appearance: none;
  border-radius: 0;
}
```

Evidence from `node scripts/qa/check.mjs 11-verify` before I worked around it:

| element | classes written | computed | expected |
|---|---|---|---|
| `otp0..otp5` | `rounded-[8px]` | `radius: 0` | 8 |
| `pasteBtn` | `text-[11.5px] font-semibold leading-[17px]` | `fontSize 16, fontWeight 400, h 24` | 11.5 / 600 / 17 |
| `cta` | `text-[12.5px] font-bold` | `fontSize 16, fontWeight 400` | 12.5 / 700 |
| `laterBtn` | `text-[10.5px] font-semibold` | `fontSize 16, fontWeight 400` | 10.5 / 600 |

Suggested fix — put both rules in the base layer so utilities can win again:

```css
@layer base {
  input,
  textarea,
  button {
    font: inherit;
  }
  input[type="text"],
  input[type="password"],
  input[type="tel"] {
    appearance: none;
    border-radius: 0;
  }
}
```

My workaround (keep or drop after the fix — it is harmless either way):
`rounded-[8px]!` in `src/components/OtpInput.jsx`, and `text-[11.5px]!
font-semibold! leading-[17px]!` / `text-[12.5px]! font-bold!` /
`text-[10.5px]! font-semibold!` in `src/pages/Verify.jsx`. **`src/components/Field.jsx`
almost certainly has the same latent bug** (its inputs cannot take a
`rounded-*` utility today) — worth checking in the login agent's next wave.

## 2. `src/components/Button.jsx` — `md` size is 40 CSS, the 2FA CTA is 42

Capture `18.35.12.jpeg`, `bbox 0 640 394 700` vs `#ffffff` Δ>13 → the CTA spans
y 644..686 (**h 42 CSS**) and x 27..366. `row 646 / 665 / 684` at Δ>60 shows the
left edge at 42 near the top and 28.5 mid-height, i.e. an inset of 13.5 at 2 CSS
from the top → **radius = h/2 = 21 (pill)**, not 20.

`md: 'h-[40px] text-[12.5px] tracking-[0.02em]'` is 2 CSS short. Login's CTA is
the `lg` size (50 CSS) so this looks safe to change:

```js
md: 'h-[42px] text-[12.5px] tracking-[0.02em]',
```

I used local markup instead (I do not own `Button.jsx` this pass). Note the
capture's CTA is a **horizontal gradient**, not a flat tint: `at 40,670 → #73c6b2`
and `at 350,670 → #74e6cf` (R stays 0x73, G/B rise to the right). My local CTA
uses `from-[#73c6b2] to-[#74e6cf]`; `Button.jsx` currently has
`from-[#74c9ae] to-[#7ee6c6]`, which is ~20 levels off in G at the left end.

## 3. `src/index.css` tokens that do not match the capture (informational — I did not assert them)

| token | value | capture sample | Δ (max channel) |
|---|---|---|---|
| `--app` (light) | `#eef0f3` | page bg `#f5f6f8` (row y=512, col x=10) | 7 |
| `--field` (light) | `#e8eaee` | OTP fill `#eef2f3` (`box 100,585 44x12` → 76% `#eef2f3`) | 8 |
| `--field-border` | `#cfd3da` | idle box border cores `#c6c6c8..#d1d2d4` (mean ≈ `#cccdd0`) | 10 |
| `--ink` | `#1f2430` | heading ink `#1c1d21` / `#1f2024` | 15 |
| `--warn-bg` | `#fdf1df` | amber fill `#efe7d2..#fff6ed` | 15 |

The last three are within what a 1.5× JPEG of a phone screen can resolve on a
thin stroke, so I left the tokens alone and used `tol.color` 12–16 in the specs
instead. `--app` at Δ7 is the one I would revisit — it is a flat fill, so the
measurement is clean, and it shifts every page's background.

## 4. `src/data/student.js` — TOTP secret cannot be verified (no action)

The capture's secret row reads (best effort) `P1SA ZL33 GU7V 63Q2 0HS 5CQU FEM 5731`;
the fixture ships `P7SA ZLK3 GUTK 63IQ RJKS GCQU FE7H ST7I`. Both are 36 chars, so
the ink width (229.5 CSS) cannot arbitrate, and base32 glyphs at 11.5 CSS in a
JPEG are not reliably readable. I deliberately did **not** assert `text` on
`secretText`. Flagging only so the string is treated as unverified, not as agreed.
