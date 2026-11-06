/**
 * Small monochrome UI chrome. Inline SVG (not crops) because these must recolour
 * with the theme and a ~20px region of a 591px-wide JPEG is mush. See PLAN.md §2a.
 * Directional glyphs flip themselves under [dir=rtl] via the rtl: variant.
 */
const base = (size) => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  xmlns: 'http://www.w3.org/2000/svg',
  'aria-hidden': true,
  focusable: false,
})

export function UserIcon({ size = 20, ...rest }) {
  return (
    <svg {...base(size)} fill="currentColor" {...rest}>
      <path d="M12 12a4.2 4.2 0 1 0 0-8.4 4.2 4.2 0 0 0 0 8.4Zm0 1.9c-3.6 0-6.7 1.9-6.7 4.7v1.1c0 .5.4.9.9.9h11.6a.9.9 0 0 0 .9-.9v-1.1c0-2.8-3.1-4.7-6.7-4.7Z" />
    </svg>
  )
}

export function LockIcon({ size = 20, ...rest }) {
  return (
    <svg {...base(size)} fill="currentColor" {...rest}>
      <path d="M17.2 9.6h-.7V7.9a4.5 4.5 0 0 0-9 0v1.7h-.7c-1 0-1.8.8-1.8 1.8v6.8c0 1 .8 1.8 1.8 1.8h10.4c1 0 1.8-.8 1.8-1.8v-6.8c0-1-.8-1.8-1.8-1.8ZM13.9 9.6h-3.8V7.9a1.9 1.9 0 0 1 3.8 0v1.7Z" />
    </svg>
  )
}

export function EyeIcon({ size = 20, ...rest }) {
  return (
    <svg {...base(size)} fill="none" stroke="currentColor" strokeWidth="1.7" {...rest}>
      <path d="M2.6 12S6 5.9 12 5.9 21.4 12 21.4 12 18 18.1 12 18.1 2.6 12 2.6 12Z" strokeLinejoin="round" />
      <circle cx="12" cy="12" r="2.9" />
    </svg>
  )
}

export function EyeOffIcon({ size = 20, ...rest }) {
  return (
    <svg {...base(size)} fill="none" stroke="currentColor" strokeWidth="1.7" {...rest}>
      <path d="M9.6 6.3A9.6 9.6 0 0 1 12 6c6 0 9.4 6 9.4 6a17 17 0 0 1-3.1 3.8M6.5 8A16.6 16.6 0 0 0 2.6 12S6 18 12 18a9.7 9.7 0 0 0 3.2-.5" strokeLinecap="round" />
      <path d="M10 10a2.9 2.9 0 0 0 4 4" strokeLinecap="round" />
      <path d="M3.6 3.6 20.4 20.4" strokeLinecap="round" />
    </svg>
  )
}

export function ArrowLeftIcon({ size = 22, ...rest }) {
  return (
    <svg
      {...base(size)}
      fill="none"
      stroke="currentColor"
      strokeWidth="2.1"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`rtl:rotate-180 ${rest.className || ''}`}
      {...{ ...rest, className: undefined }}
    >
      <path d="M19 12H5" />
      <path d="m11 6-6 6 6 6" />
    </svg>
  )
}

export function ChevronRightIcon({ size = 20, ...rest }) {
  return (
    <svg
      {...base(size)}
      fill="none"
      stroke="currentColor"
      strokeWidth="2.1"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`rtl:rotate-180 ${rest.className || ''}`}
      {...{ ...rest, className: undefined }}
    >
      <path d="m9 5 7 7-7 7" />
    </svg>
  )
}

export function ChevronLeftIcon({ size = 20, ...rest }) {
  return (
    <svg
      {...base(size)}
      fill="none"
      stroke="currentColor"
      strokeWidth="2.1"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`rtl:rotate-180 ${rest.className || ''}`}
      {...{ ...rest, className: undefined }}
    >
      <path d="m15 5-7 7 7 7" />
    </svg>
  )
}

export function ShieldCheckIcon({ size = 20, ...rest }) {
  return (
    <svg {...base(size)} fill="none" stroke="currentColor" strokeWidth="1.7" {...rest}>
      <path d="M12 3.1 4.9 5.9v5.3c0 4.3 3 8.3 7.1 9.4 4.1-1.1 7.1-5.1 7.1-9.4V5.9L12 3.1Z" strokeLinejoin="round" />
      <path d="m8.9 11.9 2.2 2.2 4-4.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function InfoIcon({ size = 20, ...rest }) {
  return (
    <svg {...base(size)} fill="none" stroke="currentColor" strokeWidth="1.7" {...rest}>
      <circle cx="12" cy="12" r="8.9" />
      <path d="M12 11v5.2" strokeLinecap="round" />
      <circle cx="12" cy="7.9" r="1.05" fill="currentColor" stroke="none" />
    </svg>
  )
}

export function AlertCircleIcon({ size = 20, ...rest }) {
  return (
    <svg {...base(size)} fill="currentColor" {...rest}>
      <path d="M12 2.8a9.2 9.2 0 1 0 0 18.4 9.2 9.2 0 0 0 0-18.4Zm-.95 5.1h1.9l-.3 6.1h-1.3l-.3-6.1Zm.95 8.9a1.2 1.2 0 1 1 0-2.4 1.2 1.2 0 0 1 0 2.4Z" />
    </svg>
  )
}

export function BuildingIcon({ size = 20, ...rest }) {
  return (
    <svg {...base(size)} fill="currentColor" {...rest}>
      <path d="M4.4 20.6V6.1c0-.6.4-1 1-1h6.5c.6 0 1 .4 1 1v14.5m-8.5 0h18.2M8.1 8.9h1.2M8.1 11.9h1.2M8.1 14.9h1.2M12.9 20.6v-9.1h4.8c.6 0 1 .4 1 1v8.1m-2.9-6.6h.9m-.9 3h.9m-.9 3h.9" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function CalendarXIcon({ size = 26, ...rest }) {
  return (
    <svg {...base(size)} fill="none" stroke="currentColor" strokeWidth="1.7" {...rest}>
      <rect x="3.4" y="5.1" width="17.2" height="15.5" rx="2.4" />
      <path d="M3.4 9.6h17.2M8.1 3.4v3.4M15.9 3.4v3.4" strokeLinecap="round" />
      <path d="m10.1 13.1 3.8 3.8M13.9 13.1l-3.8 3.8" strokeLinecap="round" />
    </svg>
  )
}

export function TranslateIcon({ size = 21, ...rest }) {
  return (
    <svg {...base(size)} fill="none" stroke="currentColor" strokeWidth="1.6" {...rest}>
      <path d="M3.2 5.4h8.4M7.4 3.6v1.8M9.6 5.4c0 3.4-2.6 6.4-6.4 7.6M5.6 9.2c1 1.9 2.9 3.4 5.2 4" strokeLinecap="round" />
      <path d="m12.4 20.4 3.9-9.4 3.9 9.4m-6.6-2.2h5.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function PinIcon({ size = 21, ...rest }) {
  return (
    <svg {...base(size)} fill="currentColor" {...rest}>
      <path d="M12 2.9a6.4 6.4 0 0 0-6.4 6.4c0 4.7 5.3 10.9 5.6 11.2a1 1 0 0 0 1.5 0c.3-.3 5.6-6.5 5.6-11.2A6.4 6.4 0 0 0 12 2.9Zm0 8.7a2.3 2.3 0 1 1 0-4.6 2.3 2.3 0 0 1 0 4.6Z" />
    </svg>
  )
}

export function CalendarIcon({ size = 21, ...rest }) {
  return (
    <svg {...base(size)} fill="currentColor" {...rest}>
      <path d="M17.8 4.9h-1.2V3.6a1.1 1.1 0 0 0-2.2 0v1.3H9.6V3.6a1.1 1.1 0 0 0-2.2 0v1.3H6.2a2.5 2.5 0 0 0-2.5 2.5v1.4h16.6V7.4a2.5 2.5 0 0 0-2.5-2.5ZM3.7 19.7a2.2 2.2 0 0 0 2.2 2.2h12.2a2.2 2.2 0 0 0 2.2-2.2v-9.6H3.7v9.6Z" />
    </svg>
  )
}

export function LogoutIcon({ size = 20, ...rest }) {
  return (
    <svg
      {...base(size)}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`rtl:rotate-180 ${rest.className || ''}`}
      {...{ ...rest, className: undefined }}
    >
      <path d="M9.5 20.4H5.6a1.9 1.9 0 0 1-1.9-1.9V5.5a1.9 1.9 0 0 1 1.9-1.9h3.9" />
      <path d="m15.6 16.6 4.6-4.6-4.6-4.6M20.2 12H9.5" />
    </svg>
  )
}

export function CopyIcon({ size = 19, ...rest }) {
  return (
    <svg {...base(size)} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" {...rest}>
      <rect x="8.6" y="8.6" width="11.4" height="11.4" rx="2.2" />
      <path d="M15.4 5.4V4.8a1.4 1.4 0 0 0-1.4-1.4H4.8a1.4 1.4 0 0 0-1.4 1.4V14c0 .8.6 1.4 1.4 1.4h.6" strokeLinecap="round" />
    </svg>
  )
}

export function ClipboardIcon({ size = 17, ...rest }) {
  return (
    <svg {...base(size)} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" {...rest}>
      <path d="M8.6 4.4H6.4a1.8 1.8 0 0 0-1.8 1.8v12.4a1.8 1.8 0 0 0 1.8 1.8h11.2a1.8 1.8 0 0 0 1.8-1.8V6.2a1.8 1.8 0 0 0-1.8-1.8h-2.2" />
      <rect x="8.6" y="2.6" width="6.8" height="3.6" rx="1.2" />
    </svg>
  )
}

export function CheckIcon({ size = 16, ...rest }) {
  return (
    <svg {...base(size)} fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" {...rest}>
      <path d="m4.5 12.5 4.7 4.7L19.5 6.9" />
    </svg>
  )
}

/** Modal dismiss. */
export function CloseIcon({ size = 18, ...rest }) {
  return (
    <svg {...base(size)} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" {...rest}>
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  )
}

/** External-link mark on the information-note CTA. */
export function ExternalLinkIcon({ size = 17, ...rest }) {
  return (
    <svg {...base(size)} fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" {...rest}>
      <path d="M14 4h6v6" />
      <path d="M20 4 11 13" />
      <path d="M18 14v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4" />
    </svg>
  )
}

/**
 * Home header toggle: outlined crescent + TWO solid 5-point stars — one large
 * upper-right, one smaller below it to the right. Transcribed from the a394 home
 * captures (`18.18.55` light, `18.56.17` dark); the previous shape was a single
 * 4-point sparkle, which is what the "wrong icon" report was about.
 */
export function StarMoonIcon({ size = 26, ...rest }) {
  return (
    <svg {...base(size)} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" {...rest}>
      <path d="M17.9 14.6A7.4 7.4 0 0 1 9.4 6.2a7.4 7.4 0 1 0 8.5 8.4Z" />
      {/* Scaled 0.78 about x=12 (pulls the star pair's right edge in) but about
          y=7.6, the cluster's own centroid — scaling about the viewBox centre
          instead shifted the glyph down ~1.3 CSS px (cy 77.5 -> 78.8). */}
      <g transform="translate(12 7.6) scale(0.78) translate(-12 -7.6)">
        <path
          d="M18.6 3 19.36 5.35 21.83 5.35 19.84 6.8 20.6 9.15 18.6 7.7 16.6 9.15 17.36 6.8 15.37 5.35 17.84 5.35Z"
          fill="currentColor"
          stroke="none"
        />
        <path
          d="M21.6 9.5 22.07 10.95 23.6 10.95 22.36 11.85 22.84 13.3 21.6 12.4 20.36 13.3 20.84 11.85 19.6 10.95 21.13 10.95Z"
          fill="currentColor"
          stroke="none"
        />
      </g>
    </svg>
  )
}

export function ThemeSystemIcon({ size = 19, ...rest }) {
  return (
    <svg {...base(size)} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" {...rest}>
      <path d="M4 4h16v11H4z" />
      <path d="M9 19h6M12 15v4" />
      <path d="m5.4 18.6 13.2-13.2" opacity=".9" />
    </svg>
  )
}

export function ThemeMoonIcon({ size = 19, ...rest }) {
  return (
    <svg {...base(size)} fill="currentColor" {...rest}>
      <path d="M20.1 14.6A8.6 8.6 0 0 1 9.4 3.9a8.6 8.6 0 1 0 10.7 10.7Z" />
    </svg>
  )
}

export function ThemeSunIcon({ size = 19, ...rest }) {
  return (
    <svg {...base(size)} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" {...rest}>
      <circle cx="12" cy="12" r="4.1" fill="currentColor" stroke="none" />
      <path d="M12 2.6v2.1M12 19.3v2.1M2.6 12h2.1M19.3 12h2.1M5.4 5.4l1.5 1.5M17.1 17.1l1.5 1.5M18.6 5.4l-1.5 1.5M6.9 17.1l-1.5 1.5" />
    </svg>
  )
}

/** 24px white glyph for the two tiles the donor project has no artwork for. */
export function TileGlyph({ slug, className, ...rest }) {
  if (slug === 'absences') return <AlertCircleIcon size={20} className={className} {...rest} />
  if (slug === 'onou') return <BuildingIcon size={20} className={className} {...rest} />
  return null
}
