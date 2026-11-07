// Mock student record — values transcribed from the reference captures (D11),
// then replaced 2026-11-07 with the owner's real details as printed on the two
// card photos now used as the Cards faces.
//
// `fr`/`ar` pairs because the record is shown in both languages and the card
// carries both: اللقب بن بركان / الاسم سيد علي beside BENBERKAN / SIDALI.
// qa/HANDOFF.md's "FERHATEN Yani" was a mis-transcription off a rotated photo of
// a screen; the card itself is the primary source.
export const STUDENT = {
  fullName: 'BENBERKAN Sidali',
  fullNameAr: 'بن بركان سيد علي',
  placeOfBirth: 'AKBOU',
  placeOfBirthAr: 'أقبو',
  dateOfBirth: '2004-01-09',
  matricule: 'UN06012026232333008110',
  university: 'université de béjaia',
  twoFactorEnabled: true,
}

/** Arabic record when the UI is RTL, Latin (French) otherwise. */
export const nameOf = (isRtl) => (isRtl ? STUDENT.fullNameAr : STUDENT.fullName)
export const placeOfBirthOf = (isRtl) => (isRtl ? STUDENT.placeOfBirthAr : STUDENT.placeOfBirth)

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
