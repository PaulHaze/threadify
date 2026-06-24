# GPT Code Suggestions

Review date: 2026-06-25

Scope: codebase review against `CLAUDE.md`, `threadify_brief.md`, `threadify_prd.md`, the changelog, and the current implementation. No code changes were made as part of the review.

Verification at review time:

- `pnpm test` passed: 31 tests across 6 files
- `pnpm build` passed
- `pnpm lint` passed

## Highest-value improvements

### 1. Settle the CLI contract before the GUI

The docs and spec describe this workflow:

```bash
threadify read <url> --out parsed.json
threadify create <parsed.json> --name "Playlist Name"
```

The implementation currently uses:

```bash
threadify read <url> <playlist-name>
threadify create <playlist-name>
```

and stores/loads the review artifact at:

```text
music/<playlistName>/parsed.json
```

Relevant files:

- `src/cli/read.ts`
- `src/cli/create.ts`
- `README.md`
- `threadify_prd.md`
- `CLAUDE.md`

Recommendation: decide whether the project wants an explicit parsed JSON path or a playlist-folder workflow, then align code, README, changelog, and PRD. For the future Tauri app, an explicit artifact or in-memory parsed object will likely be easier to reuse than a hidden folder convention.

### 2. Split resolve/preview from playlist writing

`create` currently resolves items and prints a summary, but `--dry-run` exits before computing the final track IDs that would be added. This means dry-run confirms that nothing will be written, but it does not fully show what the command would add.

Relevant file:

- `src/cli/create.ts`

Recommendation: introduce a shared workflow step that produces a playlist plan before any Spotify write:

- resolved matches
- unmatched items
- ambiguous items
- selected alternates
- track IDs to add
- duplicate/skipped track count
- final add count

Then let both CLI and GUI call the same plan step, with a separate write step afterward.

### 3. Fix Spotify pagination

Several Spotify reads only request the first page.

Current risks:

- Existing playlist dedupe only checks the first 50 playlist tracks, so appending to larger playlists can still create duplicates.
- `albumTracks` only fetches the first 50 tracks from an album, so long albums, deluxe albums, or large editions may be truncated.
- `expandArtist` fetches one page of albums. This is less risky because `cap` defaults to 3, but it can still miss eligible studio albums if the first page contains filtered-out items.

Relevant files:

- `src/core/playlist.ts`
- `src/core/tracks.ts`
- `src/core/expand.ts`

Recommendation: add a small paginated Spotify helper and unit tests with mocked responses for multi-page playlists and albums.

### 4. Treat artist-only matches more cautiously

For extracted items that only contain an artist, `resolveToSpotify` builds an artist-only search query but searches albums. `create` can then add the first returned album when `--expand` is false. That is a risky silent guess because an artist mention does not imply a specific album.

Relevant files:

- `src/core/resolve.ts`
- `src/cli/create.ts`

Recommendation: make artist-only items require either:

- `--expand`, using capped studio albums for that artist, or
- user selection of a specific album/track during review.

At minimum, artist-only items should be surfaced as needing review instead of being converted into the first Spotify album result.

### 5. Improve ambiguity semantics

Currently, any search result with alternates is reported as ambiguous, but the first result is still used automatically.

Relevant files:

- `src/core/resolve.ts`
- `src/cli/create.ts`

Recommendation: use score thresholds:

- exact/high-confidence matches can be auto-selected
- close-score alternatives should be marked ambiguous
- low-score first results should be treated as unresolved

This matters more for the GUI because users will expect to choose between candidates instead of having the first candidate silently selected.

## GUI-readiness work

The core is mostly interface-agnostic, which is a good foundation. The next architecture step should be a small shared workflow layer that both CLI and Tauri can call.

Suggested shape:

```ts
readSource(url) -> ParsedOutput
resolveParsed(parsed) -> ResolutionSummary
planPlaylist(summary, opts) -> PlaylistPlan
writePlaylist(plan) -> playlistUrl
```

This would keep Tauri from reimplementing CLI orchestration and would give the GUI clean intermediate states for:

- fetch progress
- extraction result review
- alternate selection
- unresolved item handling
- final playlist preview
- write confirmation

## Other useful improvements

### Add mocked Spotify tests

Current tests mostly cover pure helpers. The Spotify-heavy paths are comparatively under-tested, and `tests/core/tracks.test.ts` is effectively a placeholder.

Good test targets:

- paginated playlist dedupe
- paginated album tracks
- playlist creation with track chunks of 100
- append-to-existing behavior
- `--expand` behavior with studio-only filtering
- low-confidence/ambiguous resolution behavior

Relevant files:

- `tests/core/tracks.test.ts`
- `tests/core/playlist.test.ts`
- `tests/core/expand.test.ts`
- `tests/core/resolve.test.ts`

### Validate parsed LLM output more strictly

`parseExtractionResponse` currently converts missing fields to strings and can return items with an empty artist. It also returns an empty list on parse failure, which makes an LLM format failure look like a valid no-results extraction.

Relevant file:

- `src/core/extract.ts`

Recommendation:

- discard or report items with empty `artist`
- reject items that have neither album nor track only if product behavior decides artist-only is not actionable
- distinguish "valid empty extraction" from "failed to parse model response"

### Improve arbitrary HTML extraction

`stripHtml` is regex-based and will include script/style/nav noise on many pages. It is acceptable for a first CLI MVP, but a GUI user pasting arbitrary URLs will expect better results.

Relevant file:

- `src/core/fetch.ts`

Recommendation: consider a small HTML-to-readable-text dependency or a DOM parser/readability-style extraction layer before the GUI phase.

### Harden auth UX before packaging

The auth flow works as a small CLI implementation, but GUI packaging will need better failure handling.

Relevant file:

- `src/cli/auth.ts`

Potential improvements:

- handle port `8888` already being in use
- add callback timeout
- provide a manual browser fallback if `open` fails
- set restrictive token-file permissions
- consider macOS Keychain storage for the GUI phase

## Suggested next order

1. Align the CLI contract with the docs and PRD.
2. Extract a shared resolve/preview/playlist-plan workflow.
3. Fix Spotify pagination and add mocked tests.
4. Tighten artist-only and ambiguity handling.
5. Improve HTML extraction and auth UX before starting the Tauri shell.
