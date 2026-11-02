import { describe, expect, it } from 'vitest'
import {
  alertMessageForHikers,
  alertMessageLines,
  draftFromRepeatedReport,
  draftFromUnconfirmedReport,
  groupSeriousIncidents,
  repeatedRef,
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

  it('splits what a new draft writes', () => {
    const { message } = draftFromUnconfirmedReport({
      created_at: '2026-10-30',
      label: 'Rockfall',
      note: 'Loose rock',
    })
    expect(alertMessageLines(message)).toEqual([
      'Reported by 1 hiker on 30 Oct 2026.',
      'Their report: "Loose rock."',
      'Check conditions before you set out.',
    ])
  })

  it('keeps an admin-written message as it is, apart from its line breaks', () => {
    expect(alertMessageLines('Bridge is closed. Use the north path.')).toEqual([
      'Bridge is closed. Use the north path.',
    ])
    expect(alertMessageLines('First line\n\nSecond line')).toEqual(['First line', 'Second line'])
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

  it('keeps different routes, places and types apart', () => {
    const groups = groupSeriousIncidents([
      incident('a'),
      incident('b', { route_id: 'r2' }),
      incident('c', { point_id: 'p1' }),
      incident('d', { category: 'wildlife' }),
    ])
    expect(groups.map((group) => group.reporter_count)).toEqual([1, 1, 1, 1])
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

  it('has a new reference when another hiker reports it', () => {
    expect(repeatedRef(report)).not.toBe(repeatedRef({ ...report, reporter_count: 3 }))
  })
})

describe('alertMessageForHikers', () => {
  it('removes the old wording from published alerts', () => {
    expect(alertMessageForHikers('Reported by 1 hiker on 30 Oct 2026 and not yet confirmed.')).toBe(
      'Reported by 1 hiker on 30 Oct 2026.',
    )
  })

  it('leaves other text, and a missing message, alone', () => {
    expect(alertMessageForHikers('Bridge is closed.')).toBe('Bridge is closed.')
    expect(alertMessageForHikers(null)).toBeUndefined()
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
  const messageWith = (incidents, change = {}) =>
    withLiveReportCount({ ...alert, ...change }, incidents).message

  it('updates the count and date, and keeps the published quote', () => {
    expect(messageWith(reports('a', 'b'))).toBe(
      'Reported by 2 hikers, most recently on 31 Oct 2026. One report: "Loose." Check conditions before you set out.',
    )
  })

  it('updates a notice published with an older count', () => {
    const message = 'Reported by 2 hikers, most recently on 30 Oct 2026. Latest report: "Loose."'
    expect(messageWith(reports('a', 'b', 'c'), { message })).toBe(
      'Reported by 3 hikers, most recently on 1 Nov 2026. One report: "Loose."',
    )
  })

  it('counts one hiker reporting twice as one', () => {
    expect(messageWith(reports('a', 'a'))).toMatch(/^Reported by 1 hiker on 31 Oct 2026\. Their/)
  })

  it('only counts the same route, place and type', () => {
    const others = [
      incident('b', { route_id: 'r2' }),
      incident('c', { point_id: 'p1' }),
      incident('d', { category: 'wildlife' }),
    ]
    expect(messageWith([...reports('a'), ...others])).toMatch(/^Reported by 1 hiker on/)
  })

  it('counts at a checkpoint for a checkpoint notice', () => {
    const message = 'Reported by 2 hikers, most recently on 30 Oct 2026.'
    const incidents = [
      incident('a', { point_id: 7 }),
      incident('b', { point_id: 7 }),
      incident('c'),
    ]
    expect(messageWith(incidents, { message, external_ref: 'point:7:rockfall:1' })).toMatch(
      /^Reported by 2 hikers/,
    )
  })

  it('leaves the alert alone when it has nothing to update', () => {
    const handWritten = { ...alert, message: 'Bridge is closed.' }
    expect(withLiveReportCount(handWritten, reports('a', 'b'))).toBe(handWritten)
    const noRef = { ...alert, external_ref: null }
    expect(withLiveReportCount(noRef, reports('a', 'b'))).toBe(noRef)
    const noReports = { ...alert }
    expect(withLiveReportCount(noReports, [])).toBe(noReports)
    const hazard = { ...alert, external_ref: 'route-hazard:123' }
    expect(withLiveReportCount(hazard, reports('a', 'b'))).toBe(hazard)
  })
})
