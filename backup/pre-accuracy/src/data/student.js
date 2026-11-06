// Mock student record — values transcribed from the reference captures (D11).
export const STUDENT = {
  fullName: 'FERHATEN Yani',
  placeOfBirth: 'AKBOU',
  dateOfBirth: '2003-03-12',
  matricule: 'UN06012026232333008110',
  university: 'université de béjaia',
  twoFactorEnabled: true,
}

// Base32 secret backing the otpauth:// URI rendered as a real scannable QR (D6).
export const TOTP_SECRET = 'P7SAZLK3GUTK63IQRJKSGCQUFE7HST7I'

// Grouped for display exactly as the screenshot shows it.
export const TOTP_SECRET_DISPLAY = 'P7SA ZLK3 GUTK 63IQ RJKS GCQU FE7H ST7I'

export const TOTP_LABEL = 'Progress Webetu:2333008110'

export function totpUri() {
  const params = new URLSearchParams({
    secret: TOTP_SECRET,
    issuer: 'Progress Webetu',
    algorithm: 'SHA1',
    digits: '6',
    period: '30',
  })
  return `otpauth://totp/${encodeURIComponent(TOTP_LABEL)}?${params.toString()}`
}
