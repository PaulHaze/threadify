# Task 3 — extractAlbums

**Date:** 2026-06-22
**Branch:** extract-albums

## What was done

Implemented the LLM extraction layer — the function that takes a plain-text page dump and returns structured music recommendations. Unit tests cover the prompt builder and response parser; the live `extractAlbums` function (which calls Anthropic) is tested separately via integration.

## Files created

### Core implementation
- `src/core/extract.ts`
  - `buildExtractionPrompt(text)` — constructs the text-in / JSON-out prompt. Instructs the LLM to infer the artist from parent-comment context when only an album or track is mentioned in a reply. No tool-use allowed in the prompt.
  - `parseExtractionResponse(raw)` — parses the LLM's response, handling both bare JSON and markdown code fences. Defaults `include: true` on every item. Returns `[]` on unparseable output rather than throwing.
  - `extractAlbums(text, config)` — calls Anthropic (`claude-haiku-4-5-20251001` by default) and pipes the result through the parser.

### Tests
- `tests/core/extract.test.ts` — 6 unit tests covering:
  - `buildExtractionPrompt`: includes input text, instructs JSON output
  - `parseExtractionResponse`: valid JSON array, markdown code fence stripping, unparseable response, `include` defaulting to `true`

## Verification

- `pnpm lint` — no errors
- `pnpm format:check` — all files conformant
- `pnpm test` — 15 tests passed (9 fetch + 6 extract)
