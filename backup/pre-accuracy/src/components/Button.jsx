import { motion } from 'framer-motion'

/**
 * Pill CTA. Measured: login button 50 CSS with 13.5 CSS letterspaced label;
 * the 2FA confirm button 40 CSS with a mint left-to-right gradient while
 * inactive, solid brand once the form is complete.
 */
export default function Button({
  children,
  active = true,
  disabled = false,
  size = 'lg',
  variant = 'primary',
  className = '',
  ...rest
}) {
  const sizes = {
    lg: 'h-[50px] text-[13.5px] tracking-[0.06em]',
    md: 'h-[40px] text-[12.5px] tracking-[0.02em]',
  }
  const palette =
    variant === 'danger'
      ? 'bg-danger'
      : active
        ? 'bg-brand active:bg-brand-dark'
        : 'bg-gradient-to-r from-[#74c9ae] to-[#7ee6c6]'

  return (
    <motion.button
      whileTap={disabled ? undefined : { scale: 0.985 }}
      transition={{ duration: 0.12 }}
      disabled={disabled}
      className={`w-full rounded-full text-white font-bold ${sizes[size]} ${palette} ${className}`}
      {...rest}
    >
      {children}
    </motion.button>
  )
}
