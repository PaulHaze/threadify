# CLAUDE.md — Threadify working spec

Authoritative working context for Claude Code / agents on this repo. Read this
before making changes. Deeper background lives in `threadify_brief.md`; the MVP
requirements live in `threadify_prd.md`.

## What this project is

An open-source, **single-user, bring-your-own-keys** CLI that turns a URL of music
recommendations (Reddit thread or any HTML page) into a Spotify playlist via an LLM
extraction step and a human review gate. A Tauri/macOS GUI is the confirmed next
phase, built on the *same* core — no rewrite.

- Repo: https://github.com/PaulHaze/threadify · Licence: MIT
- No shared backend. Each user runs their own Spotify dev-mode app + own LLM key.

## Architecture rule (load-bearing — do not violate)

Write a **core library of pure functions** with zero interface-specific code, then
put thin shells (CLI now, GUI later) around it. If you find yourself importing CLI
concerns into core (argv, stdout formatting, prompts), stop — that belongs in the
shell.

Core functions:
- `fetchPage(url)` → text (Reddit `.json` or HTML→text)
- `extractAlbums(text)` → `[{artist, album, snippet, confidence}]` (LLM)
- `resolveToSpotify({artist, album})` → Spotify match | null (Search)
- `expandArtist(artistId, {studioOnly, cap})` → albumIds
- `albumTracks(albumId)` → trackIds
- `buildPlaylist({...})` → create/append + dedupe

## MVP scope (settled decisions)

- **CLI, two-stage** with an editable JSON file between stages = the review gate:
  - `threadify auth` — one-time browser PKCE auth, stores refresh token locally.
  - `threadify read <url> [--out parsed.json]` — fetch + extract → JSON (no Spotify).
  - `threadify create <json> --name "..." [--desc] [--expand] [--cap N] [--dry-run] [--playlist <id>]`
- **Input:** Reddit (via `.json`) **and** arbitrary URLs (HTML→text).
- **Expand:** opt-in, **studio albums only**, **capped per artist** (default 3).
- **Playlist:** **private** by default; **dedupe** on re-run/append.
- `create` always prints a resolution summary (incl. unmatched/ambiguous) before
  writing; `--dry-run` writes nothing.

## Tech baseline

- Node 20+, TypeScript, native `fetch`.
- Spotify: **Authorization Code + PKCE**. Scopes: `playlist-modify-private`,
  `playlist-modify-public`, `playlist-read-private`. App stays in dev mode forever.
- LLM: default **Anthropic / Claude Haiku 4.5** (`claude-haiku-4-5-20251001`),
  pluggable. Ollama is a post-MVP alternative.
- Secrets: `.env` (gitignored) for Client ID/secret + LLM key. Refresh token stored
  outside the repo (dotfile or macOS Keychain via keytar). **Never commit secrets;
  never log them; never write them into the JSON artifact.**

## Hard constraints (must hold)

1. **Prompt-injection safety:** scraped page text is untrusted. The LLM only
   extracts names → JSON. Scraped text must never drive tool calls, actions, or
   command behaviour. No tool-use in the extraction prompt.
2. **Review gate is mandatory:** no playlist write happens without the JSON review
   step and the `create` summary. Don't auto-guess ambiguous matches silently.
3. **Spotify reality (verified mid-2026):** Recommendations, Related Artists,
   Audio Features/Analysis, Top Tracks, batch endpoints, New Releases are **gone** —
   do not design around them. Use `POST /me/playlists` (not `/users/{id}/playlists`).
4. **Redirect URI:** use a loopback literal like `http://127.0.0.1:8888/callback`,
   never `localhost`.
5. **Playlists hold tracks, not albums** — expand albums to tracklists before adding.
6. Keep core pure and unit-testable; no CLI/IO coupling in core.

## Working agreements

- Use TDD for core functions (skill: `superpowers:test-driven-development`).
- Prefer small, reviewable changes. Don't add the GUI, Ollama, or pasted-text input
  until the CLI MVP acceptance criteria in `threadify_prd.md` are met.
- Don't commit or push unless asked.

## Status

Pre-implementation. Specs agreed; no code yet. Next step: scaffold the TS project +
core library skeleton with tests.
