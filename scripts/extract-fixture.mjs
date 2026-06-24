/**
 * Dev script: run LLM extraction on a pre-fetched slim fixture.
 * Usage (from project root): node scripts/extract-fixture.mjs <fixture-path> <playlist-name>
 * Example: node scripts/extract-fixture.mjs tests/fixtures/ambient_slim.json ambient-chill
 */

import { readFile, mkdir, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'

const { default: dotenv } = await import('dotenv')
dotenv.config()

const { extractAlbums } = await import(new URL('../dist/core/extract.js', import.meta.url).href)

const [,, fixturePath, playlistName] = process.argv
if (!fixturePath || !playlistName) {
  console.error('Usage: node scripts/extract-fixture.mjs <fixture-path> <playlist-name>')
  process.exit(1)
}

const apiKey = process.env.ANTHROPIC_API_KEY
if (!apiKey) { console.error('ANTHROPIC_API_KEY not set'); process.exit(1) }

const fixture = JSON.parse(await readFile(resolve(fixturePath), 'utf8'))
const text = [fixture.post_title, fixture.post_body, fixture.comments.join('\n')]
  .filter(Boolean)
  .join('\n\n')

console.log(`Extracting from "${fixture.post_title}" (${fixture.comment_count} comments)...`)

const items = await extractAlbums(text, {
  apiKey,
  model: process.env.LLM_MODEL ?? 'claude-haiku-4-5-20251001',
})

const output = {
  source: { url: fixture.source, fetchedAt: new Date().toISOString() },
  items,
}

const outDir = join(process.cwd(), 'music', playlistName)
await mkdir(outDir, { recursive: true })
await writeFile(join(outDir, 'parsed.json'), JSON.stringify(output, null, 2), 'utf8')
console.log(`Wrote ${items.length} items to music/${playlistName}/parsed.json`)
