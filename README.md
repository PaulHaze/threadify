# Threadify

Turn a URL full of music recommendations — a Reddit thread, a blog post, any HTML
page — into a Spotify playlist. Threadify scrapes the page, uses an LLM to pull out
the artists, albums and tracks mentioned in the prose, lets you **review and
correct** what it found, then builds a playlist in your own Spotify account.

It's a **personal, open-source, bring-your-own-keys** tool. You supply your own
Spotify app credentials and your own LLM API key, and it runs entirely on your
machine — there is no shared server.

> **Status:** early development. The CLI is being built first; a macOS GUI is the
> planned next phase. See [`threadify_prd.md`](./threadify_prd.md) for the MVP spec.

## How it works

```
URL ──fetch──▶ page text ──LLM──▶ {artist, album} pairs ──▶ [ you review/edit ]
                                                                    │
   Spotify playlist ◀──create──── resolved track IDs ◀──Spotify Search──┘
```

1. **Fetch** the page (Reddit threads via the `.json` endpoint; other pages as HTML).
2. **Extract** the music references with an LLM (robust against messy forum prose).
3. **Review** — Threadify writes an editable JSON file so you can fix any misreads
   before anything touches Spotify.
4. **Resolve** each entry to a real Spotify track, optionally **expand** to more
   albums by the same artist.
5. **Create** a private playlist and add the tracks (de-duplicated on re-runs).

## Planned CLI (MVP)

```bash
# one-time browser sign-in; stores your refresh token locally
threadify auth

# fetch + extract → editable parsed.json (does NOT touch Spotify)
threadify read <url> --out parsed.json

# ...open parsed.json, fix any wrong artist/album/track fields...

# resolve + build the playlist (use --dry-run to preview first)
threadify create parsed.json --name "Reddit Ambient Picks" --dry-run
threadify create parsed.json --name "Reddit Ambient Picks"
```

Useful flags: `--expand` (add studio albums by each artist, capped),
`--public`, `--playlist <id>` (append to an existing playlist), `--dry-run`.

## Requirements

- [Node.js](https://nodejs.org/) 20+
- A **Spotify Developer** app (free)
- An **LLM API key** — Anthropic / Claude by default (Claude Haiku is plenty)

## Setup

> Detailed, step-by-step instructions will land here as the CLI takes shape. The
> outline:

1. **Create a Spotify app** at the
   [Spotify Developer Dashboard](https://developer.spotify.com/dashboard). Note the
   Client ID and secret. Set the redirect URI to a loopback literal —
   `http://127.0.0.1:8888/callback` (Spotify no longer allows `localhost`).
2. **Get an LLM key** (e.g. from the Anthropic Console).
3. **Configure** a gitignored `.env` with your Client ID/secret and LLM key.
4. **Run `threadify auth` once** to authorise in the browser. After that, every run
   is headless.

## Privacy & safety

- Everything runs locally; your keys and tokens never leave your machine.
- Scraped page text is treated as untrusted — the LLM only extracts names, it never
  drives actions.
- Nothing is written to Spotify until you've reviewed the extracted list.

## Roadmap

- [ ] CLI MVP (`auth` / `read` / `create`)
- [ ] `--expand` (studio albums per artist, capped)
- [ ] macOS GUI (Tauri) with split-screen review + inline editing
- [ ] Local LLM (Ollama) provider option
- [ ] Paste-a-block-of-text input
- [ ] Linux / Windows builds

## Contributing

This is a personal open-source project. Issues and PRs welcome once the MVP lands.

## Licence

[MIT](./LICENSE)
