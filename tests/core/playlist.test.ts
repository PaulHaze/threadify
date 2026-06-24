import { describe, it, expect } from 'vitest'
import { dedupeTrackIds, chunkArray } from '../../src/core/playlist.js'

describe('dedupeTrackIds', () => {
  it('removes track IDs already in the playlist', () => {
    const existing = ['a', 'b', 'c']
    const incoming = ['b', 'd', 'e']
    expect(dedupeTrackIds(incoming, existing)).toEqual(['d', 'e'])
  })

  it('returns all tracks when playlist is empty', () => {
    expect(dedupeTrackIds(['a', 'b'], [])).toEqual(['a', 'b'])
  })
})

describe('chunkArray', () => {
  it('splits into chunks of given size', () => {
    expect(chunkArray([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]])
  })

  it('returns single chunk when array fits', () => {
    expect(chunkArray([1, 2], 100)).toEqual([[1, 2]])
  })
})
