import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { parseArgs } from 'node:util'
import { getAccessToken } from './auth.js'
import { resolveToSpotify } from '../core/resolve.js'
import { expandArtist } from '../core/expand.js'
import { albumTracks } from '../core/tracks.js'
import { buildPlaylist } from '../core/playlist.js'
import type { ParsedOutput, ResolvedItem } from '../core/types.js'

export async function create(args: string[]): Promise<void> {
  const { positionals, values } = parseArgs({
    args,
    allowPositionals: true,
    options: {
      name: { type: 'string' },
      desc: { type: 'string' },
      expand: { type: 'boolean', default: false },
      cap: { type: 'string', default: '3' },
      playlist: { type: 'string' },
      'dry-run': { type: 'boolean', default: false },
      public: { type: 'boolean', default: false },
    },
  })

  const playlistName = positionals[0]
  if (!playlistName) throw new Error('Usage: threadify create <playlist-name> [--name "Override Title"]')

  const spotifyName = (values.name as string | undefined) ?? playlistName
  const jsonPath = join(process.cwd(), 'music', playlistName, 'parsed.json')

  const raw = await readFile(jsonPath, 'utf8').catch(() => {
    throw new Error(`No parsed.json found at ${jsonPath} — run threadify read first`)
  })
  const parsed: ParsedOutput = JSON.parse(raw)
  const activeItems = parsed.items.filter(i => i.include)

  const token = await getAccessToken()
  const cap = parseInt(values.cap as string, 10)
  const expand = values.expand as boolean
  const dryRun = values['dry-run'] as boolean

  console.log(`\nResolving ${activeItems.length} items...\n`)
  const resolved: ResolvedItem[] = []

  for (const item of activeItems) {
    const { match, alternates } = await resolveToSpotify(item, token)
    resolved.push({ input: item, match, alternates })
  }

  const matched = resolved.filter(r => r.match)
  const unmatched = resolved.filter(r => !r.match)
  const ambiguous = resolved.filter(r => r.alternates.length > 0)

  console.log(`Matched:   ${matched.length}`)
  console.log(`Unmatched: ${unmatched.length}`)
  if (unmatched.length > 0) {
    console.log('\nUnmatched items:')
    unmatched.forEach(r => console.log(`  - ${r.input.artist}${r.input.album ? ` / ${r.input.album}` : ''}`))
  }
  if (ambiguous.length > 0) {
    console.log('\nAmbiguous (first match used, alternates available):')
    ambiguous.forEach(r => {
      console.log(`  - ${r.input.artist} / ${r.input.album ?? r.input.track}`)
      r.alternates.slice(0, 2).forEach(a => console.log(`      alt: ${a.artistName} / ${a.albumName}`))
    })
  }

  if (dryRun) {
    console.log('\n--dry-run: no playlist written.')
    return
  }

  const trackIds: string[] = []

  for (const r of matched) {
    if (!r.match) continue

    if (expand) {
      const albumIds = await expandArtist(r.match.artistId, { studioOnly: true, cap }, token)
      for (const albumId of albumIds) {
        const ids = await albumTracks(albumId, token)
        trackIds.push(...ids)
      }
    } else if (r.match.trackIds.length > 0) {
      trackIds.push(...r.match.trackIds)
    } else {
      const ids = await albumTracks(r.match.albumId, token)
      trackIds.push(...ids)
    }
  }

  const url = await buildPlaylist({
    name: spotifyName,
    description: values.desc as string | undefined,
    isPrivate: !(values.public as boolean),
    trackIds,
    existingPlaylistId: values.playlist as string | undefined,
  }, token)

  console.log(`\nPlaylist created: ${url}`)
}
