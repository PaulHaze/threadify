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

export async function extractAlbums(
  text: string,
  config: LLMConfig,
): Promise<ExtractedItem[]> {
  const client = new Anthropic({ apiKey: config.apiKey });
  const message = await client.messages.create({
    model: config.model,
    max_tokens: 4096,
    messages: [{ role: "user", content: buildExtractionPrompt(text) }],
  });
  const raw = message.content.find((b) => b.type === "text")?.text ?? "";
  return parseExtractionResponse(raw);
}
