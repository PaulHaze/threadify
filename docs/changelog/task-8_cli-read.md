# Task 8 — CLI read command

**Date:** 2026-06-25

## What was done

Implemented `threadify read <url> [--out parsed.json]`. The command fetches the given URL (Reddit or arbitrary HTML via `fetchPage`), runs LLM extraction (`extractAlbums`), and writes a `ParsedOutput` JSON file — the human review gate between fetching and playlist creation.

## Files modified

- `src/cli/read.ts` (was a stub)
  - Parses `url` positional and optional `--out` flag via `node:util parseArgs`
  - Requires `ANTHROPIC_API_KEY` in environment; respects optional `LLM_MODEL` override
  - Calls `fetchPage` then `extractAlbums`, wraps result in `ParsedOutput` shape, writes to disk
  - Prints progress lines and a final count

## Verification

- `pnpm exec tsc --noEmit` — no errors
- `pnpm test` — 31 tests passed (all prior suites unchanged)
