import { resolveToSpotify } from './resolve.js'
import { expandArtist } from './expand.js'
import { albumTracks } from './tracks.js'
import type { ExtractedItem, ResolvedItem, ResolutionSummary } from './types.js'

export function buildResolutionSummary(resolved: ResolvedItem[]): ResolutionSummary {
  const matched: ResolvedItem[] = []
  const unmatched: ResolvedItem[] = []
  const artistOnly: ResolvedItem[] = []

  for (const r of resolved) {
    const isArtistOnly = !r.input.album && !r.input.track
    if (isArtistOnly) {
      artistOnly.push(r)
    } else if (r.match) {
      matched.push(r)
    } else {
      unmatched.push(r)
    }
  }

  return { matched, unmatched, artistOnly }
}

export async function resolveParsed(
  items: ExtractedItem[],
  token: string,
): Promise<ResolutionSummary> {
  const resolved: ResolvedItem[] = []

  for (const item of items) {
    const { match, alternates } = await resolveToSpotify(item, token)
    resolved.push({ input: item, match, alternates })
  }

  return buildResolutionSummary(resolved)
}

export async function planPlaylist(
  summary: ResolutionSummary,
  opts: { expand: boolean; cap: number },
  token: string,
): Promise<string[]> {
  const trackIds: string[] = []

  for (const r of summary.matched) {
    if (!r.match) continue
    if (opts.expand) {
      const albumIds = await expandArtist(r.match.artistId, { studioOnly: true, cap: opts.cap }, token)
      for (const albumId of albumIds) {
        trackIds.push(...await albumTracks(albumId, token))
      }
    } else if (r.match.trackIds.length > 0) {
      trackIds.push(...r.match.trackIds)
    } else {
      trackIds.push(...await albumTracks(r.match.albumId, token))
    }
  }

  if (opts.expand) {
    for (const r of summary.artistOnly) {
      if (!r.match) continue
      const albumIds = await expandArtist(r.match.artistId, { studioOnly: true, cap: opts.cap }, token)
      for (const albumId of albumIds) {
        trackIds.push(...await albumTracks(albumId, token))
      }
    }
  }

  return trackIds
}
