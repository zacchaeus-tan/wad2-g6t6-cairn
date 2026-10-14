const DIFFICULTY_LABELS = ['Easy', 'Moderate', 'Hard', 'Strenuous']

export function difficultyLabel(value) {
  if (value === null || value === undefined) return '—'
  const index = Math.min(Math.max(Math.round(Number(value)), 1), 4) - 1
  return DIFFICULTY_LABELS[index]
}

export function formatDate(value) {
  if (!value) return ''
  return new Date(value).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}
