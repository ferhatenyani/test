// Empty-state variants, keyed to the reference screenshots (D7).
// sad-box  -> cropped illustration + "Data not available currently!"
// cal-x    -> grey calendar-with-x glyph + same line
// blank    -> green header only
// sad-box-chips -> year chips above the sad-box illustration
export const SERVICES = [
  { slug: 'discharge', icon: 'discharge', empty: 'sad-box' },
  { slug: 'timetable', icon: 'timetable', empty: 'sad-box' },
  { slug: 'group-section', icon: 'group-section', empty: 'sad-box' },
  { slug: 'exams-schedule', icon: 'exams-schedule', empty: 'cal-x' },
  { slug: 'exam-grades', icon: 'exam-grades', empty: 'sad-box' },
  { slug: 'assessment', icon: 'assessment', empty: 'blank' },
  { slug: 'percentage', icon: 'percentage', empty: 'sad-box' },
  { slug: 'academic-transcripts', icon: 'academic-transcripts', empty: 'sad-box-chips' },
  { slug: 'debts', icon: 'debts', empty: 'sad-box' },
  { slug: 'academic-vacation', icon: 'academic-vacation', empty: 'sad-box' },
  { slug: 'enrollments', icon: 'enrollments', empty: 'sad-box' },
  { slug: 'absences', icon: 'absences', empty: 'sad-box' },
  { slug: 'onou', icon: 'onou', empty: 'sad-box' },
  { slug: 'other-services', icon: 'other-services', empty: 'sad-box' },
]

export const TRANSCRIPT_YEARS = ['2025-2026', '2024-2025', '2023-2024']

export function findService(slug) {
  return SERVICES.find((s) => s.slug === slug) ?? null
}
