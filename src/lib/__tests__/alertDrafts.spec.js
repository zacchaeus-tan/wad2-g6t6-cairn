import { describe, expect, it } from 'vitest'
import {
  alertMessageLines,
  draftFromRepeatedReport,
  groupSeriousIncidents,
  withLiveReportCount,
} from '../alertDrafts'

describe('alertMessageLines', () => {
  it('splits a published report into who, what and advice', () => {
    expect(
      alertMessageLines(
        'Reported by 1 hiker on 30 Oct 2026 and not yet confirmed. Their report: "a rock almost hit me." Check conditions before you set out.',
      ),
    ).toEqual([
      'Reported by 1 hiker on 30 Oct 2026.',
      'Their report: "a rock almost hit me."',
      'Check conditions before you set out.',
    ])
  })
})

const incident = (user_id, overrides = {}) => ({
  route_id: 'r1',
  point_id: null,
  category: 'rockfall',
  note: `Note from ${user_id}`,
  created_at: '2026-10-30T00:00:00Z',
  incident_categories: { label: 'Rockfall' },
  reviews: { user_id, profiles: { display_name: user_id } },
  ...overrides,
})

describe('groupSeriousIncidents', () => {
  it('keeps a route-wide report when a second hiker makes it, with the count', () => {
    const [report, ...rest] = groupSeriousIncidents([incident('a'), incident('b')])
    expect(rest).toEqual([])
    expect(report.reporter_count).toBe(2)
    expect(report.note).toBe('Note from a')
  })

  it('counts one hiker reporting twice as one', () => {
    expect(groupSeriousIncidents([incident('a'), incident('a')])[0].reporter_count).toBe(1)
  })
})

describe('repeated reports', () => {
  const report = groupSeriousIncidents([incident('a'), incident('b')])[0]

  it('drafts a danger notice with the real count', () => {
    const draft = draftFromRepeatedReport(report)
    expect(draft.severity).toBe('danger')
    expect(alertMessageLines(draft.message)).toEqual([
      'Reported by 2 hikers, most recently on 30 Oct 2026.',
      'Latest report: "Note from a."',
      'Check conditions before you set out.',
    ])
  })
})

describe('withLiveReportCount', () => {
  const alert = {
    route_id: 'r1',
    external_ref: 'unconfirmed:route:rockfall:123',
    message:
      'Reported by 1 hiker on 30 Oct 2026 and not yet confirmed. Their report: "Loose." Check conditions before you set out.',
  }
  const reports = (...users) =>
    users.map((user_id, index) =>
      incident(user_id, { created_at: new Date(Date.UTC(2026, 9, 30 + index)).toISOString() }),
    )

  it('updates the count and date, and keeps the published quote', () => {
    expect(withLiveReportCount(alert, reports('a', 'b')).message).toBe(
      'Reported by 2 hikers, most recently on 31 Oct 2026. One report: "Loose." Check conditions before you set out.',
    )
  })
})
