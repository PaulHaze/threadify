# Threadify — Project Context Brief

> Background context for Claude Code. This is **not** the PRD — it's the set of
> decisions and technical constraints already worked out, so work doesn't start
> from scratch or re-litigate settled facts. The PRD/MVP docs will sit alongside this.

## What it is

A personal, open-source tool that takes a URL containing music recommendations
(e.g. a Reddit thread), extracts the artists and albums mentioned, optionally
expands to other albums by those artists, and builds a Spotify playlist from them.

- Repo: https://github.com/PaulHaze/threadify
- Licence: MIT (permissive, community-friendly)
- Single-user by design. **Bring-your-own-keys**: each user supplies their own
  Spotify app credentials and their own LLM API key, and runs it on their own machine.

## Why bring-your-own-keys matters (architecturally)

Because every user creates their own Spotify app and authorises themselves, each
person is the sole user of their own dev-mode app. This means:

- No shared backend, no central app, no infrastructure to host.
- Spotify's 25-user dev-mode cap and "extended quota" review **never apply** — those
  only bite when many users share one app behind one set of credentials.
- No liability for holding other people's tokens or keys; everything stays local.

Trade-off: onboarding friction. Each user must create a Spotify app and get an LLM
key. Fine for a CLI aimed at developers; for the eventual GUI, a guided first-run
setup wizard is a real feature, not an afterthought.

## Architecture (the load-bearing decision)

Write a **core library of pure functions** with no interface-specific code:

- `fetchPage(url)` → text
- `extractAlbums(text)` → `[{ artist, album }]` (LLM does this)
- `resolveToSpotify({artist, album})` → Spotify IDs (Search endpoint)
- `expandArtist(artistId)` → other albums (Get Artist's Albums endpoint)
- `buildPlaylist(tracks)` → playlist

Then ship **thin shells** around that same core:

1. **CLI first** — invoked from a terminal / VS Code terminal. e.g.
   `threadify <url> [--expand] [--dry-run]`
2. **Tauri GUI second** (confirmed direction) — reuses React/TS skills, wraps the
   _same_ core, no rewrite. Built only after the CLI works.

`--dry-run` prints matched artists/albums for confirmation before committing —
this review gate is required, see Risks below.

## Pipeline stages

1. Fetch the page → text.
2. Extract `{artist, album}` pairs (LLM — robust against messy forum prose).
3. Resolve each to real Spotify IDs (Search).
4. Optionally expand to other albums per artist (Get Artist's Albums).
5. Create playlist + add tracks.

## Spotify Web API — current reality (verified, mid-2026)

Spotify gutted its API in two waves (Nov 2024, Feb 2026). What this project needs
**survived**; the discovery layer **did not**.

**Still available (all this tool needs):**

- Search for Item (`GET /search`)
- Get Artist (`GET /artists/{id}`)
- Get Artist's Albums (`GET /artists/{id}/albums`)
- Create Playlist (`POST /me/playlists`)
- Add Items to Playlist

**Removed — do NOT design around these:**

- Recommendations, Related Artists (so "similar artists" discovery is not possible
  via the official API — out of scope, or needs a third-party paid mirror)
- Audio Features / Audio Analysis
- Get Artist's Top Tracks, batch Get Several Artists/Albums, New Releases
- `POST /users/{user_id}/playlists` (use `POST /me/playlists` instead)

**Other Spotify facts:**

- App stays in **development mode** forever (single user) — no quota review.
- A playlist holds **tracks, not albums** — adding "an album" means fetching its
  tracklist and adding every track.
- **Redirect URI gotcha:** `localhost` is no longer allowed. Use a loopback IP
  literal, e.g. `http://127.0.0.1:8888/callback`. HTTP is permitted for loopback.
  If the dashboard won't save, delete any old `localhost` entry entirely.
- Auth: **Authorization Code flow with PKCE** (implicit grant is removed).
  Scopes: `playlist-modify-private`, `playlist-modify-public`
  (add `playlist-read-private` to append to existing playlists).
- Flow: open authorise URL in browser once → tiny local server catches the
  `?code=` callback → exchange for access token (1 hr) + refresh token (effectively
  permanent). Store the **refresh token** locally (dotfile or macOS Keychain via
  keytar). Headless on every run after the one-time browser step.

## LLM extraction step

- Default: Anthropic API (Claude Haiku is plenty). A thread is a few thousand
  tokens → fractions of a cent per run.
- Alternative for zero marginal cost: local model via Ollama (heavier setup,
  slightly messier extraction).
- User brings their own key.

## Reddit / input

- Minimum: append `.json` to a Reddit URL and fetch it, or fetch raw HTML and
  strip to text for arbitrary URLs.
- Reddit throttles unauthenticated/datacentre requests; if flaky, register a free
  Reddit "script" app (100 req/min) for authenticated reads. Add only if needed.

## Risks to design around

- **Fuzzy matching:** the resolve-to-Spotify step is where wrong matches happen
  (covers bands, live vs studio, wrong artist). Always gate playlist creation
  behind a review/confirm step (`--dry-run` in CLI; a confirm screen in the GUI).
- **Prompt injection:** the tool feeds _untrusted forum text_ into an LLM. Keep
  the LLM's job narrow (extract names → JSON); never let scraped text drive
  actions or tool calls directly.

## Open product questions (for the PRD to settle)

- MVP audience: CLI-comfortable users first, or non-technical music lovers from day one?
- Input scope: Reddit only or any URL? URL-only or also paste-a-block-of-text?
- Expand behaviour: all albums, or studio only (exclude live/comp/singles)? Cap per artist?
- Output: playlist naming, public/private default, re-run behaviour (dedupe vs append)?

## Tech stack baseline

- Node 20+, TypeScript.
- Native `fetch`; optionally `@spotify/web-api-ts-sdk`; Anthropic SDK.
- `.env` (gitignored) for Client ID / secret / LLM key.
- Refresh token stored outside the repo (dotfile or Keychain).
