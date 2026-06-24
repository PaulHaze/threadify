# Task 9 — CLI create command

**Date:** 2026-06-25

## What was done

Implemented `threadify create <parsed.json> --name "..."`, completing the full two-stage CLI pipeline. The command reads the JSON review artifact, resolves each included item against the Spotify search API, prints a resolution summary (matched / unmatched / ambiguous), and — unless `--dry-run` is set — builds the playlist via `buildPlaylist`.

## Files modified

- `src/cli/create.ts` (was a stub)
  - Parses all flags: `--name`, `--desc`, `--expand`, `--cap`, `--playlist`, `--dry-run`, `--public`
  - Filters `parsed.items` to only those with `include: true`
  - Resolves each item via `resolveToSpotify`; collects matches, unmatched, and ambiguous entries
  - Prints a resolution summary before any write; `--dry-run` exits here
  - For matched items: if `--expand`, calls `expandArtist` (studio only, capped) then `albumTracks` for each; otherwise uses `match.trackIds` directly or falls back to `albumTracks` for album matches
  - Calls `buildPlaylist` with `isPrivate` defaulting to `true` unless `--public` is passed

## Verification

- `pnpm exec tsc --noEmit` — no errors
- `pnpm build && node dist/cli/index.js` — prints "Unknown command: undefined\nUsage: threadify <auth|read|create>" (expected)
- `pnpm test` — 31 tests passed (all prior suites unchanged)
