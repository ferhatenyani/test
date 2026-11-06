/**
 * Renders a monochrome alpha PNG as a solid colour via CSS mask, so the donor's
 * dark-grey glyph artwork can be painted white on the navy nav / green tiles in
 * both themes without a second set of recoloured assets.
 */
export default function GlyphMask({ src, size = 20, className = '', style }) {
  return (
    <span
      aria-hidden="true"
      className={`inline-block shrink-0 ${className}`}
      style={{
        width: size,
        height: size,
        backgroundColor: 'currentColor',
        WebkitMaskImage: `url(${src})`,
        maskImage: `url(${src})`,
        WebkitMaskRepeat: 'no-repeat',
        maskRepeat: 'no-repeat',
        WebkitMaskPosition: 'center',
        maskPosition: 'center',
        WebkitMaskSize: 'contain',
        maskSize: 'contain',
        ...style,
      }}
    />
  )
}
