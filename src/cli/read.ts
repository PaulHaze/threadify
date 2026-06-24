import { writeFile } from 'node:fs/promises'
import { parseArgs } from 'node:util'
import { fetchPage } from '../core/fetch.js'
import { extractAlbums } from '../core/extract.js'
import type { ParsedOutput } from '../core/types.js'

export async function read(args: string[]): Promise<void> {
  const { positionals, values } = parseArgs({
    args,
    allowPositionals: true,
    options: { out: { type: 'string', default: 'parsed.json' } },
  })

  const url = positionals[0]
  if (!url) throw new Error('Usage: threadify read <url> [--out parsed.json]')

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY not set')

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

  const outPath = values.out as string
  await writeFile(outPath, JSON.stringify(output, null, 2), 'utf8')
  console.log(`Wrote ${items.length} items to ${outPath}`)
}
