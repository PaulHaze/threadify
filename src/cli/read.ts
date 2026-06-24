import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { fetchPage } from '../core/fetch.js'
import { extractAlbums } from '../core/extract.js'
import type { LLMConfig, ParsedOutput } from '../core/types.js'

const DEFAULT_LLM_MODEL = 'claude-haiku-4-5-20251001'

type Env = Record<string, string | undefined>

export function resolveLLMConfigFromEnv(env: Env): LLMConfig {
  const provider = env.LLM_PROVIDER ?? 'anthropic'
  if (provider !== 'anthropic' && provider !== 'openai-compatible') {
    throw new Error(`Unsupported LLM_PROVIDER: ${provider}`)
  }

  const apiKey = env.LLM_API_KEY ?? env.ANTHROPIC_API_KEY
  if (!apiKey) {
    throw new Error(
      provider === 'anthropic'
        ? 'ANTHROPIC_API_KEY or LLM_API_KEY not set'
        : 'LLM_API_KEY not set',
    )
  }

  return {
    provider,
    apiKey,
    model: env.LLM_MODEL ?? DEFAULT_LLM_MODEL,
    ...(provider === 'openai-compatible' ? { baseUrl: env.LLM_BASE_URL } : {}),
  }
}

export async function read(args: string[]): Promise<void> {
  const [url, playlistName] = args
  if (!url || !playlistName) throw new Error('Usage: threadify read <url> <playlist-name>')

  const llmConfig = resolveLLMConfigFromEnv(process.env)

  const outDir = join(process.cwd(), 'music', playlistName)
  const outPath = join(outDir, 'parsed.json')

  console.log(`Fetching ${url} ...`)
  const text = await fetchPage(url)

  console.log('Extracting music references...')
  const items = await extractAlbums(text, llmConfig)

  const output: ParsedOutput = {
    source: { url, fetchedAt: new Date().toISOString() },
    items,
  }

  await mkdir(outDir, { recursive: true })
  await writeFile(outPath, JSON.stringify(output, null, 2), 'utf8')
  console.log(`Wrote ${items.length} items to ${outPath}`)
}
