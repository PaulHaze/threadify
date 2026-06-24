import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { parseArgs } from 'node:util'
import { getAccessToken } from './auth.js'
import { resolveParsed, planPlaylist } from '../core/workflow.js'
import { buildPlaylist } from '../core/playlist.js'
import type { ParsedOutput, ResolutionSummary } from '../core/types.js'

function printSummary(summary: ResolutionSummary): void {
  console.log(`Matched:    ${summary.matched.length}`)
  console.log(`Unmatched:  ${summary.unmatched.length}`)
  console.log(`Artist-only: ${summary.artistOnly.length}`)

  if (summary.unmatched.length > 0) {
    console.log('\nUnmatched items:')
    summary.unmatched.forEach(r =>
      console.log(`  - ${r.input.artist}${r.input.album ? ` / ${r.input.album}` : ''}`)
    )
  }

  const ambiguous = summary.matched.filter(r => r.alternates.length > 0)
  if (ambiguous.length > 0) {
    console.log('\nAmbiguous (first match used, alternates available):')
    ambiguous.forEach(r => {
      console.log(`  - ${r.input.artist} / ${r.input.album ?? r.input.track}`)
      r.alternates.slice(0, 2).forEach(a => console.log(`      alt: ${a.artistName} / ${a.albumName}`))
    })
  }

  if (summary.artistOnly.length > 0) {
    console.log('\nArtist-only (use --expand to include their studio albums):')
    summary.artistOnly.forEach(r => console.log(`  - ${r.input.artist}`))
  }
}

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
  const summary = await resolveParsed(activeItems, token)
  printSummary(summary)

  const trackIds = await planPlaylist(summary, { expand, cap }, token)

  if (dryRun) {
    console.log(`\nTracks that would be added: ${trackIds.length}`)
    console.log('--dry-run: no playlist written.')
    return
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
