import { describe, it, expect } from 'vitest'
import { buildResolutionSummary } from '../../src/core/workflow.js'
import type { ResolvedItem } from '../../src/core/types.js'

const makeItem = (overrides: Partial<ResolvedItem['input']> = {}): ResolvedItem['input'] => ({
  artist: 'Test Artist',
  snippet: 'test snippet',
  confidence: 'high',
  include: true,
  ...overrides,
})

const makeMatch = (overrides = {}) => ({
  albumId: 'album1',
  albumName: 'Test Album',
  artistId: 'artist1',
  artistName: 'Test Artist',
  trackIds: ['track1'],
  ...overrides,
})

describe('buildResolutionSummary', () => {
  it('puts resolved album items in matched', () => {
    const resolved: ResolvedItem[] = [
      { input: makeItem({ album: 'Test Album' }), match: makeMatch(), alternates: [] },
    ]
    const summary = buildResolutionSummary(resolved)
    expect(summary.matched).toHaveLength(1)
    expect(summary.unmatched).toHaveLength(0)
    expect(summary.artistOnly).toHaveLength(0)
  })

  it('puts unresolved items in unmatched', () => {
    const resolved: ResolvedItem[] = [
      { input: makeItem({ album: 'Unknown Album' }), match: null, alternates: [] },
    ]
    const summary = buildResolutionSummary(resolved)
    expect(summary.unmatched).toHaveLength(1)
    expect(summary.matched).toHaveLength(0)
  })

  it('puts artist-only items in artistOnly', () => {
    const resolved: ResolvedItem[] = [
      { input: makeItem(), match: makeMatch(), alternates: [] },
    ]
    const summary = buildResolutionSummary(resolved)
    expect(summary.artistOnly).toHaveLength(1)
    expect(summary.matched).toHaveLength(0)
  })

  it('handles a mix of matched, unmatched, and artist-only', () => {
    const resolved: ResolvedItem[] = [
      { input: makeItem({ album: 'Album A' }), match: makeMatch(), alternates: [] },
      { input: makeItem({ album: 'Album B' }), match: null, alternates: [] },
      { input: makeItem(), match: makeMatch(), alternates: [] },
    ]
    const summary = buildResolutionSummary(resolved)
    expect(summary.matched).toHaveLength(1)
    expect(summary.unmatched).toHaveLength(1)
    expect(summary.artistOnly).toHaveLength(1)
  })
})
