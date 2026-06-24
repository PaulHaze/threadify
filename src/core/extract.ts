import Anthropic from "@anthropic-ai/sdk";
import type { ExtractedItem, LLMConfig } from "./types.js";

export function buildExtractionPrompt(text: string): string {
  return `Extract all music recommendations from the following text. Return ONLY a JSON array with no other text.

Each item must have:
- "artist": string (required)
- "album": string (optional — omit if not mentioned)
- "track": string (optional — omit if not mentioned)
- "snippet": string (the exact phrase that led you to this recommendation)
- "confidence": "high" | "medium" | "low"

Rules:
- Extract the artist even if only an album or track is mentioned in a reply — use context from surrounding text to infer the artist.
- Do not invent recommendations. Only extract what is explicitly mentioned.
- If only an artist is named with no album or track, include them with just the artist field.

Text:
${text}`;
}

export function parseExtractionResponse(raw: string): ExtractedItem[] {
  const cleaned = raw
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```\s*$/, "")
    .trim();

  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch (e) {
    throw new Error(`Failed to parse LLM extraction response as JSON: ${(e as Error).message}`);
  }

  if (!Array.isArray(parsed)) {
    throw new Error("LLM extraction response is not a JSON array");
  }

  return parsed
    .map((item) => ({
      artist: String(item.artist ?? ""),
      ...(item.album ? { album: String(item.album) } : {}),
      ...(item.track ? { track: String(item.track) } : {}),
      snippet: String(item.snippet ?? ""),
      confidence: (["high", "medium", "low"] as const).includes(item.confidence)
        ? item.confidence
        : "low",
      include: true,
    }))
    .filter((item) => item.artist.length > 0);
}

function dedupeItems(items: ExtractedItem[]): ExtractedItem[] {
  const seen = new Set<string>()
  return items.filter(item => {
    const key = `${item.artist.toLowerCase()}|${(item.album ?? item.track ?? '').toLowerCase()}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function chunkLines(text: string, linesPerChunk: number): string[] {
  const lines = text.split('\n')
  const chunks: string[] = []
  for (let i = 0; i < lines.length; i += linesPerChunk) {
    chunks.push(lines.slice(i, i + linesPerChunk).join('\n'))
  }
  return chunks
}

const LINES_PER_CHUNK = 150
const MAX_OUTPUT_TOKENS = 8096

export async function parseWithRetry(
  callModel: () => Promise<string>,
): Promise<ExtractedItem[]> {
  try {
    return parseExtractionResponse(await callModel())
  } catch {
    // One retry — a fresh sample usually recovers a malformed response.
    return parseExtractionResponse(await callModel())
  }
}

async function extractChunk(client: Anthropic, text: string, model: string): Promise<ExtractedItem[]> {
  const callModel = async () => {
    const message = await client.messages.create({
      model,
      max_tokens: MAX_OUTPUT_TOKENS,
      messages: [{ role: "user", content: buildExtractionPrompt(text) }],
    })
    return message.content.find((b) => b.type === "text")?.text ?? ""
  }
  return parseWithRetry(callModel)
}

export async function extractAlbums(
  text: string,
  config: LLMConfig,
): Promise<ExtractedItem[]> {
  const client = new Anthropic({ apiKey: config.apiKey })
  const lines = text.split('\n').length

  if (lines <= LINES_PER_CHUNK) {
    return extractChunk(client, text, config.model)
  }

  const chunks = chunkLines(text, LINES_PER_CHUNK)
  const results: ExtractedItem[] = []
  for (const chunk of chunks) {
    const items = await extractChunk(client, chunk, config.model)
    results.push(...items)
  }
  return dedupeItems(results)
}
