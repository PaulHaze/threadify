# Task 5 — expandArtist + albumTracks

**Date:** 2026-06-25

## What was done

Implemented the two functions that expand an artist or album into individual track IDs — the last pure-core pieces needed before `buildPlaylist`. `isStudioAlbum` is fully unit-tested; both network-bound functions (`expandArtist`, `albumTracks`) are thin wrappers over `spotifyGet` and are covered by integration testing.

## Files created

### Core implementation
- `src/core/expand.ts`
  - `isStudioAlbum(album)` — returns `true` only when `album_type === "album"`, `album_group !== "appears_on"`, and the name doesn't contain the word "live" (case-insensitive); filters out singles, compilations, appearances, and live records
  - `expandArtist(artistId, { studioOnly, cap }, token)` — fetches an artist's albums from Spotify, optionally filters to studio albums only, and returns the first `cap` album IDs

- `src/core/tracks.ts`
  - `albumTracks(albumId, token)` — fetches up to 50 tracks for an album and returns their IDs; a playlist holds tracks not albums, so this is always called before adding to a playlist

### Tests
- `tests/core/expand.test.ts` — 5 unit tests covering `isStudioAlbum`:
  - accepts a normal studio album
  - rejects compilations, singles, appears_on groups, and names containing "live"
- `tests/core/tracks.test.ts` — placeholder confirming `albumTracks` is covered via integration

## Verification

- `pnpm test` — 26 tests passed (9 fetch + 6 extract + 6 resolve + 5 expand + 1 tracks placeholder)
