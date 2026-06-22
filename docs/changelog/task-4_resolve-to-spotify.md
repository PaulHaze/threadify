# Task 4 — Spotify helpers + resolveToSpotify

**Date:** 2026-06-22
**Branch:** resolve-to-spotify

## What was done

Implemented the thin Spotify HTTP layer and the resolution logic that matches an extracted artist/album/track against the Spotify search API. Unit tests cover the pure helper functions; the live `resolveToSpotify` call (which hits the API) is tested via integration.

## Files created

### Core implementation
- `src/core/spotify.ts`
  - `spotifyGet(path, token)` — authenticated GET against the Spotify Web API
  - `spotifyPost(path, token, body)` — authenticated POST (used by playlist CRUD in Task 6)

- `src/core/resolve.ts`
  - `buildSearchQuery(item)` — constructs a Spotify search query: `artist:X album:Y`, `artist:X track:Y`, or `artist:X` depending on what fields are present
  - `scoreMatch(queryArtist, queryAlbum, resultArtist, resultAlbum)` — scores a Spotify result 0–1: exact match = 1, partial album match (result contains query) = 0.5, no match = 0; case-insensitive
  - `resolveToSpotify(item, token)` — searches Spotify, scores results, returns `{ match, alternates }`. Handles album and track search modes separately.

### Tests
- `tests/core/resolve.test.ts` — 6 unit tests covering:
  - `buildSearchQuery`: album query, track query, artist-only fallback
  - `scoreMatch`: exact match, case-insensitivity, partial match scoring

## Verification

- `pnpm lint` — no errors
- `pnpm format:check` — all files conformant
- `pnpm test` — 21 tests passed (9 fetch + 6 extract + 6 resolve)
