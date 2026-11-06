// Empty-state variants, keyed to the reference screenshots (D7).
// sad-box        -> cropped illustration + caption
// cal-x          -> grey calendar-with-x disc + caption      (18.26.06 (2))
// blank          -> green header only, no body               (18.26.06 (3))
// sad-box-chips  -> year pills above the illustration        (18.26.06 (4))
// day-pills      -> white day-pill strip + caption, NO art   (18.26.05 (2))
// `caption` is the style of the line under the art. The references are not
// consistent here: 18.26.06 + 18.26.05 render "Data not available currently!"
// strong/near-black and 18.26.05 (1) renders a different sentence entirely,
// while 18.26.06 (1) renders the same sentence muted/grey. See qa/requests.
export const SERVICES = [
  { slug: 'discharge', icon: 'discharge', empty: 'sad-box', caption: 'notRelevant' },
  // day-pills: the ONLY capture of this variant is 18.26.05 (2) (EN). The band is
  // 123.2 tall and there is NO sad-box art — `row 250` and `row 450` are zero ink
  // across the full width. See EmptyState.jsx for the measured strip.
  { slug: 'timetable', icon: 'timetable', empty: 'day-pills', caption: 'noClasses' },
  { slug: 'group-section', icon: 'group-section', empty: 'sad-box', caption: 'muted' },
  { slug: 'exams-schedule', icon: 'exams-schedule', empty: 'cal-x', caption: 'muted' },
  { slug: 'exam-grades', icon: 'exam-grades', empty: 'sad-box', caption: 'strong' },
  { slug: 'assessment', icon: 'assessment', empty: 'blank' },
  { slug: 'percentage', icon: 'percentage', empty: 'sad-box', caption: 'strong' },
  { slug: 'academic-transcripts', icon: 'academic-transcripts', empty: 'sad-box-chips', caption: 'none' },
  { slug: 'debts', icon: 'debts', empty: 'sad-box', caption: 'strong' },
  { slug: 'academic-vacation', icon: 'academic-vacation', empty: 'sad-box', caption: 'strong' },
  { slug: 'enrollments', icon: 'enrollments', empty: 'sad-box', caption: 'strong' },
  { slug: 'absences', icon: 'absences', empty: 'sad-box', caption: 'strong' },
  { slug: 'onou', icon: 'onou', empty: 'sad-box', caption: 'strong' },
  { slug: 'other-services', icon: 'other-services', empty: 'sad-box', caption: 'strong' },
]

export const TRANSCRIPT_YEARS = ['2025-2026', '2024-2025', '2023-2024']

/**
 * Day-pill strip for the Timetable empty state (18.26.05 (2), EN only — there is
 * no AR capture of this variant, so the Arabic labels are NOT invented; they fall
 * back to English via i18next fallbackLng).
 *
 * The strip is white, full-bleed, y 148.2..208 (h 59.8) directly under the taller
 * 123.2 band. Pill ink row measures y 156.5..198.5 (h 42) starting at x 14 and
 * running PAST x 360, so it scrolls horizontally like the transcript year chips.
 *
 * Pill widths in the capture are unequal -- Saturday ink 14..92 (78), the filled
 * Sunday 103..174.5 (71.5), next 186..270 (84) -- so the pills are content-hugging
 * with a fixed ~11 CSS gap, NOT a fixed width. Which day is filled is an n=1
 * observation and is deliberately NOT asserted in qa/specs/37.
 */
export const TIMETABLE_DAYS = [
  'saturday',
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
]

export function findService(slug) {
  return SERVICES.find((s) => s.slug === slug) ?? null
}
