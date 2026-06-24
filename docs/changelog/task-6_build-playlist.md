# Task 6 — buildPlaylist

**Date:** 2026-06-25

## What was done

Implemented the final core function: `buildPlaylist`, which creates or appends to a Spotify playlist with deduplication. Also extracted two pure helpers (`dedupeTrackIds`, `chunkArray`) that are fully unit-tested independently of the Spotify API.

## Files created

### Core implementation
- `src/core/playlist.ts`
  - `dedupeTrackIds(incoming, existing)` — filters `incoming` to only IDs not already in `existing`; used to prevent duplicate tracks on re-run
  - `chunkArray(arr, size)` — splits an array into chunks of at most `size`; Spotify's add-tracks endpoint accepts max 100 URIs per request
  - `buildPlaylist(opts, token)` — creates a new private/public playlist (or targets an existing one), fetches existing track IDs for dedupe, converts track IDs to `spotify:track:` URIs, adds them in chunks of 100, and returns the playlist URL

### Tests
- `tests/core/playlist.test.ts` — 4 unit tests covering the pure helpers:
  - `dedupeTrackIds`: removes already-present IDs; passes all through when playlist is empty
  - `chunkArray`: splits unevenly-sized arrays correctly; handles arrays smaller than chunk size

## Verification

- `pnpm test` — 31 tests passed (all prior suites + 4 new playlist tests)
