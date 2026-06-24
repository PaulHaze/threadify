import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { fetchPage } from '../core/fetch.js'
import { extractAlbums } from '../core/extract.js'
import type { ParsedOutput } from '../core/types.js'

export async function read(args: string[]): Promise<void> {
  const [url, playlistName] = args
  if (!url || !playlistName) throw new Error('Usage: threadify read <url> <playlist-name>')

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY not set')

  const outDir = join(process.cwd(), 'music', playlistName)
  const outPath = join(outDir, 'parsed.json')

  console.log(`Fetching ${url} ...`)
  const text = await fetchPage(url)

  console.log('Extracting music references...')
  const items = await extractAlbums(text, {
    apiKey,
    model: process.env.LLM_MODEL ?? 'claude-haiku-4-5-20251001',
  })

  const output: ParsedOutput = {
    source: { url, fetchedAt: new Date().toISOString() },
    items,
  }

  await mkdir(outDir, { recursive: true })
  await writeFile(outPath, JSON.stringify(output, null, 2), 'utf8')
  console.log(`Wrote ${items.length} items to ${outPath}`)
}
