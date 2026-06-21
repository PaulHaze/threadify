# Threadify — MVP Product Requirements (v0.1)

> Status: Draft for first build (MVP). Companion to `threadify_brief.md` (settled technical context) and `CLAUDE.md` (working spec for contributors/agents). The original free-form draft lives in `threadify_prd.txt` for reference.

## 1. Summary

Threadify turns a URL full of music recommendations (a Reddit thread, a blog post, any HTML page) into a Spotify playlist. It scrapes the page, uses an LLM to extract the `{artist, album}` / `{artist, track}` pairs mentioned in the prose, resolves each to real Spotify IDs, and — after a human review gate — creates a playlist in the user's own account.

It is a **personal, open-source, single-user, bring-your-own-keys** tool. Each user supplies their own Spotify app credentials and their own LLM API key and runs it on their own machine. There is no shared backend.

**MVP surface: a CLI.** A Tauri/macOS GUI is the confirmed next phase, built on the *same* core library, only after the CLI works.

## 2. Goals & non-goals

### Goals (MVP)
- Extract music references from messy forum/HTML prose reliably enough to be useful.
- Always let the user **review and correct** extractions before anything is written to Spotify.
- Create a private Spotify playlist with a user-chosen name/description and add the resolved tracks.
- Ship a clean **core library of pure functions** reused unchanged by the future GUI.
- Be runnable by a developer in <15 minutes from a clear README + onboarding.

### Non-goals (MVP)
- No GUI (next phase).
- No "similar artists" / recommendation discovery — Spotify removed those endpoints.
- No multi-user, no hosted service, no shared credentials.
- No audio analysis / audio features.
- No automatic genre classification or playlist art generation.

## 3. Users & onboarding

Primary user for the MVP: **CLI-comfortable developers** (this is the stated near-term audience; non-technical users are served by the later GUI). The user must, one time:

1. Create a Spotify app (Developer Dashboard), note Client ID/secret, set redirect URI to a loopback literal e.g. `http://127.0.0.1:8888/callback` (**not** `localhost` — Spotify rejects it).
2. Obtain an LLM API key (default: Anthropic / Claude).
3. Run a one-time `threadify auth` (or first run) that opens the browser, captures the `?code=` callback on a tiny local server, and stores the **refresh token** locally. Every run afterwards is headless.

The README walks through all of this. Onboarding friction is accepted for the CLI; a guided wizard is a real GUI feature later.

## 4. Settled product decisions

| Question | Decision (MVP) |
|---|---|
| **Input scope** | Reddit **and** any URL. Reddit fetched via the `.json` trick; arbitrary URLs fetched as HTML and stripped to text. Pasted-text input is a fast-follow, not MVP-blocking. |
| **Expand behaviour** (`--expand`) | Opt-in. **Studio albums only** (exclude live / compilation / single). **Cap per artist** (default 3, configurable). |
| **Playlist visibility** | **Private** by default. |
| **Re-run behaviour** | **Dedupe** — when targeting an existing playlist, skip tracks already present (requires `playlist-read-private`). |
| **CLI shape** | **Two-stage** with an editable JSON file between the stages — this *is* the review gate and mirrors the GUI's split-screen review. |

## 5. CLI design (MVP)

Two primary commands plus auth. The JSON artifact between them is the human review/edit gate.

```
threadify auth
    One-time browser auth; stores the refresh token locally.

threadify read <url> [--out parsed.json] [--track-mode albums|tracks]
    Fetch + extract. Writes a JSON file of extracted {artist, album/track}
    pairs WITH the source snippet each was drawn from, so the user can verify.
    Does NOT touch Spotify.

threadify create <parsed.json> --name "<playlist name>" [--desc "..."]
        [--expand] [--cap N] [--private|--public] [--playlist <id>] [--dry-run]
    Resolves each entry to Spotify IDs, optionally expands per artist,
    prints a resolution summary, and (unless --dry-run) creates/updates the
    playlist. --dry-run prints what WOULD be added and exits.
```

Notes:
- The user is expected to open `parsed.json` and fix any wrong artist/album/track fields before running `create`. This is intentional and central.
- `create` always prints the resolved matches (and any *unmatched* / *ambiguous* entries) before writing, even without `--dry-run`.

### Editable JSON schema (between stages)

```jsonc
{
  "source": { "url": "https://...", "fetchedAt": "2026-06-22T10:00:00Z" },
  "items": [
    {
      "artist": "Burial",
      "album": "Untrue",          // or "track" for track-mode
      "snippet": "...the obvious pick is Burial's Untrue...", // provenance
      "confidence": "high",       // LLM-reported, advisory only
      "include": true             // user can flip to false to skip
    }
  ]
}
```

## 6. Core library (interface-agnostic)

The CLI and the future GUI are thin shells over these pure functions. No interface-specific code leaks into core.

| Function | Responsibility |
|---|---|
| `fetchPage(url)` → `text` | Reddit `.json` or HTML→text. |
| `extractAlbums(text)` → `[{artist, album, snippet, confidence}]` | LLM extraction. Narrow job: text in, JSON out. |
| `resolveToSpotify({artist, album})` → `SpotifyMatch \| null` | Search endpoint; returns best match + alternates for ambiguity. |
| `expandArtist(artistId, {studioOnly, cap})` → `albumId[]` | Get Artist's Albums, filtered + capped. |
| `albumTracks(albumId)` → `trackId[]` | A playlist holds tracks, so albums are expanded to their tracklist. |
| `buildPlaylist({name, desc, private, trackIds, existingPlaylistId?})` | Create/append + dedupe. |

## 7. Pipeline

1. **Fetch** page → text.
2. **Extract** `{artist, album/track}` pairs via LLM (with provenance snippet).
3. *(review gate — user edits JSON)*
4. **Resolve** each to Spotify IDs (Search). Surface unmatched/ambiguous.
5. *(optional)* **Expand** to studio albums per artist (capped).
6. Expand any albums to their **tracklists**.
7. **Create/append** playlist, **dedupe** against existing tracks.

## 8. Technical baseline

- **Runtime/lang:** Node 20+, TypeScript. Native `fetch`.
- **Spotify:** Authorization Code + PKCE. Scopes: `playlist-modify-private`, `playlist-modify-public`, `playlist-read-private` (for dedupe/append). App stays in development mode forever. Optionally `@spotify/web-api-ts-sdk`.
- **LLM:** Default Anthropic / Claude. Recommended model: **Claude Haiku 4.5** (`claude-haiku-4-5-20251001`) — a thread is a few thousand tokens, so cost is a fraction of a cent per run. Pluggable provider; local model via Ollama is a documented zero-marginal-cost alternative (post-MVP nicety).
- **Secrets:** `.env` (gitignored) for Client ID/secret + LLM key. Refresh token stored outside the repo (dotfile or macOS Keychain via keytar).
- **Licence:** MIT.

## 9. Security & correctness guardrails

- **Prompt injection:** scraped forum text is untrusted. The LLM's only job is extract names → JSON. Scraped text MUST NOT drive actions, tool calls, or command behaviour. No tool-use exposed to the extraction prompt.
- **Fuzzy-match safety:** resolution is where wrong matches happen (covers, live vs studio, wrong artist). Playlist writes are *always* gated behind the JSON review + the `create` resolution summary. Unmatched/ambiguous entries are reported, not silently dropped or guessed.
- **No secrets in logs or the JSON artifact.**

## 10. MVP acceptance criteria

- [ ] `threadify auth` completes browser flow once and stores a refresh token; subsequent commands run headless.
- [ ] `threadify read <reddit-url>` and `<arbitrary-url>` both produce a JSON file of extracted items with provenance snippets.
- [ ] Editing the JSON (fixing/removing items, toggling `include`) is respected by `create`.
- [ ] `threadify create` resolves items, prints a clear summary incl. unmatched/ambiguous, and `--dry-run` writes nothing.
- [ ] Without `--dry-run`, a private playlist is created in the user's account with the resolved tracks.
- [ ] Re-running `create` against the same playlist adds no duplicates.
- [ ] `--expand` adds only studio albums, capped per artist.
- [ ] Core functions are unit-testable with no CLI/IO coupling.

## 11. Out of scope / later

- Tauri macOS GUI with split-screen review + inline editing (next major phase).
- Pasted-text / stdin input.
- Local LLM (Ollama) as a first-class provider.
- Linux/Windows builds; web wrapper.
- Authenticated Reddit "script" app (add only if unauthenticated fetches prove flaky).

## 12. Open questions (post-MVP)

- Track-vs-album default when a thread mixes both.
- How aggressively to merge near-duplicate artist spellings before resolution.
- Whether to persist a small local cache of resolved artist/album → Spotify IDs.
