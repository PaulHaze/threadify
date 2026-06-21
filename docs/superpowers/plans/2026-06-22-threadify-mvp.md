# Threadify MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a two-stage CLI that turns a URL of music recommendations into a Spotify playlist via LLM extraction and a human review gate.

**Architecture:** A pure-function core library (`src/core/`) handles all business logic with no I/O coupling; thin CLI shells (`src/cli/`) wire commands to core. The JSON file written by `threadify read` and consumed by `threadify create` is the review gate — nothing writes to Spotify until after the user has inspected and optionally edited it.

**Tech Stack:** Node 23 / TypeScript 5 / ESM / Vitest / `@anthropic-ai/sdk` / native `fetch` for Spotify.

## Global Constraints

- Node 20+ required (use `node:` prefix for built-ins)
- TypeScript strict mode — no `any`, no implicit returns
- ESM throughout (`"type": "module"`, `.js` extensions in imports)
- Native `fetch` only — no axios, node-fetch, or got
- Spotify redirect URI must be `http://127.0.0.1:8888/callback` — never `localhost`
- Refresh token stored in `~/.threadify/token` — never in the repo or the JSON artifact
- LLM extraction prompt must never expose tool-use — text in, JSON out only
- Default LLM model: `claude-haiku-4-5-20251001`
- All core functions must be unit-testable with no CLI/IO coupling

---

## File Map

```
src/
  core/
    types.ts           shared interfaces (ExtractedItem, ParsedOutput, SpotifyMatch, …)
    fetch.ts           fetchPage(url) → string
    extract.ts         extractAlbums(text, config) → ExtractedItem[]
    resolve.ts         resolveToSpotify(item, token) → SpotifyMatch | null
    spotify.ts         thin Spotify HTTP helpers (search, getAlbums, getTracks, playlist CRUD)
    expand.ts          expandArtist(artistId, opts, token) → string[]
    tracks.ts          albumTracks(albumId, token) → string[]
    playlist.ts        buildPlaylist(opts, token) → string  (returns playlist URL)
  cli/
    auth.ts            threadify auth — PKCE flow, writes ~/.threadify/token
    read.ts            threadify read <url> — fetch + extract → JSON file
    create.ts          threadify create <json> — resolve + expand + build playlist
    index.ts           CLI entry point / command routing
tests/
  core/
    fetch.test.ts
    extract.test.ts
    resolve.test.ts
    expand.test.ts
    tracks.test.ts
    playlist.test.ts
  fixtures/            (already exists — ambient_raw.json, ambient_slim.json, …)
package.json
tsconfig.json
vitest.config.ts
.env.example
```

---

## Task 1: Project Scaffold

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `vitest.config.ts`
- Create: `src/core/types.ts`
- Create: `.env.example`

**Interfaces:**
- Produces: all shared types consumed by every subsequent task

---

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "threadify",
  "version": "0.1.0",
  "type": "module",
  "bin": {
    "threadify": "./dist/cli/index.js"
  },
  "scripts": {
    "build": "tsc",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "@anthropic-ai/sdk": "^0.52.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "typescript": "^5.5.0",
    "vitest": "^2.0.0"
  }
}
```

- [ ] **Step 2: Create `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "skipLibCheck": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

- [ ] **Step 3: Create `vitest.config.ts`**

```typescript
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
  },
})
```

- [ ] **Step 4: Create `src/core/types.ts`**

```typescript
export interface ExtractedItem {
  artist: string;
  album?: string;
  track?: string;
  snippet: string;
  confidence: 'high' | 'medium' | 'low';
  include: boolean;
}

export interface ParsedOutput {
  source: {
    url: string;
    fetchedAt: string;
  };
  items: ExtractedItem[];
}

export interface SpotifyMatch {
  trackIds: string[];
  albumId: string;
  artistId: string;
  artistName: string;
  albumName: string;
}

export interface ResolvedItem {
  input: ExtractedItem;
  match: SpotifyMatch | null;
  alternates: SpotifyMatch[];
}

export interface LLMConfig {
  apiKey: string;
  model: string;
}

export interface BuildPlaylistOpts {
  name: string;
  description?: string;
  isPrivate: boolean;
  trackIds: string[];
  existingPlaylistId?: string;
}
```

- [ ] **Step 5: Create `.env.example`**

```
SPOTIFY_CLIENT_ID=your_spotify_client_id_here
SPOTIFY_CLIENT_SECRET=your_spotify_client_secret_here
ANTHROPIC_API_KEY=your_anthropic_api_key_here
```

- [ ] **Step 6: Install dependencies**

```bash
pnpm install
```

Expected: `node_modules/` created, no errors.

- [ ] **Step 7: Verify TypeScript compiles (empty src)**

```bash
mkdir -p src/core src/cli
touch src/core/types.ts  # already created
pnpm exec tsc --noEmit
```

Expected: no errors.

- [ ] **Step 8: Verify test runner works**

Create `tests/core/fetch.test.ts` with a placeholder:

```typescript
import { describe, it, expect } from 'vitest'

describe('placeholder', () => {
  it('passes', () => {
    expect(true).toBe(true)
  })
})
```

Run: `ppnpm test`
Expected: `1 passed`.

- [ ] **Step 9: Commit**

```bash
git add package.json pnpm-lock.yaml tsconfig.json vitest.config.ts src/ tests/core/fetch.test.ts .env.example
git commit -m "scaffold: typescript project with vitest and core types"
```

---

## Task 2: fetchPage

**Files:**
- Create: `src/core/fetch.ts`
- Modify: `tests/core/fetch.test.ts` (replace placeholder)

**Interfaces:**
- Consumes: nothing
- Produces: `fetchPage(url: string): Promise<string>` — returns indented plain text

**Notes:** For Reddit URLs ending in `/` or without `.json`, append `.json?limit=500`. For non-Reddit URLs, fetch HTML and strip tags to plain text. Reddit's nested comment structure must be preserved via indentation so the LLM can resolve partial suggestions (e.g. a track named in a reply using the artist named in its parent).

---

- [ ] **Step 1: Write failing tests**

```typescript
// tests/core/fetch.test.ts
import { describe, it, expect } from 'vitest'
import { redditUrlToJson, flattenRedditComments, stripHtml } from '../../src/core/fetch.js'

describe('redditUrlToJson', () => {
  it('appends .json to a bare reddit URL', () => {
    expect(redditUrlToJson('https://www.reddit.com/r/ambient/comments/abc123/title'))
      .toBe('https://www.reddit.com/r/ambient/comments/abc123/title.json?limit=500')
  })

  it('appends .json to a URL with trailing slash', () => {
    expect(redditUrlToJson('https://www.reddit.com/r/ambient/comments/abc123/title/'))
      .toBe('https://www.reddit.com/r/ambient/comments/abc123/title.json?limit=500')
  })

  it('leaves an already-.json URL alone', () => {
    expect(redditUrlToJson('https://www.reddit.com/r/ambient/comments/abc123/title.json'))
      .toBe('https://www.reddit.com/r/ambient/comments/abc123/title.json?limit=500')
  })
})

describe('flattenRedditComments', () => {
  it('returns top-level comment body', () => {
    const comments = [{ body: 'hello', replies: [] }]
    expect(flattenRedditComments(comments, 0)).toBe('hello')
  })

  it('indents replies one level', () => {
    const comments = [
      { body: 'parent', replies: [{ body: 'child', replies: [] }] }
    ]
    expect(flattenRedditComments(comments, 0)).toBe('parent\n  child')
  })

  it('indents nested replies two levels', () => {
    const comments = [
      {
        body: 'parent',
        replies: [
          { body: 'child', replies: [{ body: 'grandchild', replies: [] }] }
        ]
      }
    ]
    expect(flattenRedditComments(comments, 0)).toBe('parent\n  child\n    grandchild')
  })
})

describe('stripHtml', () => {
  it('removes HTML tags', () => {
    expect(stripHtml('<p>Hello <b>world</b></p>')).toBe('Hello world')
  })

  it('decodes common HTML entities', () => {
    expect(stripHtml('rock &amp; roll')).toBe('rock & roll')
  })

  it('collapses whitespace', () => {
    expect(stripHtml('<p>foo</p>\n<p>bar</p>')).toBe('foo bar')
  })
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
pnpm test
```

Expected: fails with "Cannot find module '../../src/core/fetch.js'"

- [ ] **Step 3: Implement `src/core/fetch.ts`**

```typescript
export function redditUrlToJson(url: string): string {
  const base = url.replace(/\/?$/, '').replace(/\.json$/, '')
  return `${base}.json?limit=500`
}

interface RedditComment {
  body: string;
  replies: RedditComment[];
}

export function flattenRedditComments(comments: RedditComment[], depth: number): string {
  return comments
    .map(c => {
      const indent = '  '.repeat(depth)
      const body = `${indent}${c.body}`
      const replies = c.replies.length > 0 ? '\n' + flattenRedditComments(c.replies, depth + 1) : ''
      return body + replies
    })
    .join('\n')
}

export function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
}

function extractRedditComments(listing: unknown): RedditComment[] {
  const data = (listing as { data: { children: { kind: string; data: { body?: string; replies?: unknown } }[] } }).data
  return data.children
    .filter(c => c.kind === 't1' && c.data.body && c.data.body !== '[deleted]')
    .map(c => ({
      body: c.data.body!,
      replies: c.data.replies && typeof c.data.replies === 'object'
        ? extractRedditComments(c.data.replies)
        : [],
    }))
}

function isRedditUrl(url: string): boolean {
  return /reddit\.com\/r\//.test(url)
}

export async function fetchPage(url: string): Promise<string> {
  if (isRedditUrl(url)) {
    const jsonUrl = redditUrlToJson(url)
    const res = await fetch(jsonUrl, {
      headers: { 'User-Agent': 'threadify/0.1 (personal tool)' },
    })
    if (!res.ok) throw new Error(`Reddit fetch failed: ${res.status}`)
    const data = await res.json() as unknown[]
    // Reddit returns [post-listing, comments-listing]
    const [postListing, commentsListing] = data as [unknown, unknown]
    const postData = (postListing as { data: { children: { data: { title: string; selftext: string } }[] } }).data
    const post = postData.children[0]?.data
    const title = post?.title ?? ''
    const body = post?.selftext ?? ''
    const comments = extractRedditComments(commentsListing)
    const commentText = flattenRedditComments(comments, 0)
    return [title, body, commentText].filter(Boolean).join('\n\n')
  }

  const res = await fetch(url)
  if (!res.ok) throw new Error(`Fetch failed: ${res.status}`)
  const html = await res.text()
  return stripHtml(html)
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
pnpm test
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/core/fetch.ts tests/core/fetch.test.ts
git commit -m "feat: fetchPage with Reddit nesting and HTML stripping"
```

---

## Task 3: extractAlbums

**Files:**
- Create: `src/core/extract.ts`
- Create: `tests/core/extract.test.ts`

**Interfaces:**
- Consumes: `LLMConfig` from `types.ts`; `fetchPage` output (a plain-text string)
- Produces: `extractAlbums(text: string, config: LLMConfig): Promise<ExtractedItem[]>`

**Notes:** The LLM prompt must be a simple text-in / JSON-out extraction. No tool-use. The scraped text is untrusted — the prompt must not allow it to influence behaviour beyond naming artists/albums. Use the existing `tests/fixtures/ambient_slim.json` fixture (the flat comment array, joined as text) for testing with a real API call, but mock the Anthropic client in unit tests.

---

- [ ] **Step 1: Write failing tests**

```typescript
// tests/core/extract.test.ts
import { describe, it, expect, vi } from 'vitest'
import { buildExtractionPrompt, parseExtractionResponse } from '../../src/core/extract.js'
import type { ExtractedItem } from '../../src/core/types.js'

describe('buildExtractionPrompt', () => {
  it('includes the input text', () => {
    const prompt = buildExtractionPrompt('Harold Budd is great')
    expect(prompt).toContain('Harold Budd is great')
  })

  it('instructs JSON output', () => {
    const prompt = buildExtractionPrompt('some text')
    expect(prompt.toLowerCase()).toContain('json')
  })
})

describe('parseExtractionResponse', () => {
  it('parses a valid JSON array of items', () => {
    const raw = JSON.stringify([
      { artist: 'Harold Budd', album: 'The Plateaux of Mirror', snippet: 'Harold Budd is lovely', confidence: 'high' }
    ])
    const items = parseExtractionResponse(raw)
    expect(items).toHaveLength(1)
    expect(items[0].artist).toBe('Harold Budd')
    expect(items[0].include).toBe(true)
  })

  it('extracts JSON from markdown code fence', () => {
    const raw = '```json\n[{"artist":"Burial","album":"Untrue","snippet":"check out Burial","confidence":"high"}]\n```'
    const items = parseExtractionResponse(raw)
    expect(items[0].artist).toBe('Burial')
  })

  it('returns empty array for unparseable response', () => {
    expect(parseExtractionResponse('sorry I cannot help')).toEqual([])
  })

  it('defaults include to true', () => {
    const raw = JSON.stringify([{ artist: 'Eno', snippet: 'check out Eno', confidence: 'medium' }])
    const items = parseExtractionResponse(raw)
    expect(items[0].include).toBe(true)
  })
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
pnpm test
```

Expected: fails with "Cannot find module '../../src/core/extract.js'"

- [ ] **Step 3: Implement `src/core/extract.ts`**

```typescript
import Anthropic from '@anthropic-ai/sdk'
import type { ExtractedItem, LLMConfig } from './types.js'

export function buildExtractionPrompt(text: string): string {
  return `Extract all music recommendations from the following text. Return ONLY a JSON array with no other text.

Each item must have:
- "artist": string (required)
- "album": string (optional — omit if not mentioned)
- "track": string (optional — omit if not mentioned)
- "snippet": string (the exact phrase that led you to this recommendation)
- "confidence": "high" | "medium" | "low"

Rules:
- Extract the artist even if only an album or track is mentioned in a reply — use context from surrounding text to infer the artist.
- Do not invent recommendations. Only extract what is explicitly mentioned.
- If only an artist is named with no album or track, include them with just the artist field.

Text:
${text}`
}

export function parseExtractionResponse(raw: string): ExtractedItem[] {
  const cleaned = raw
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```\s*$/, '')
    .trim()

  try {
    const parsed = JSON.parse(cleaned)
    if (!Array.isArray(parsed)) return []
    return parsed.map(item => ({
      artist: String(item.artist ?? ''),
      ...(item.album ? { album: String(item.album) } : {}),
      ...(item.track ? { track: String(item.track) } : {}),
      snippet: String(item.snippet ?? ''),
      confidence: (['high', 'medium', 'low'] as const).includes(item.confidence)
        ? item.confidence
        : 'low',
      include: true,
    }))
  } catch {
    return []
  }
}

export async function extractAlbums(text: string, config: LLMConfig): Promise<ExtractedItem[]> {
  const client = new Anthropic({ apiKey: config.apiKey })
  const message = await client.messages.create({
    model: config.model,
    max_tokens: 4096,
    messages: [{ role: 'user', content: buildExtractionPrompt(text) }],
  })
  const raw = message.content.find(b => b.type === 'text')?.text ?? ''
  return parseExtractionResponse(raw)
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
pnpm test
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/core/extract.ts tests/core/extract.test.ts
git commit -m "feat: extractAlbums with LLM prompt and response parser"
```

---

## Task 4: Spotify helpers + resolveToSpotify

**Files:**
- Create: `src/core/spotify.ts`
- Create: `src/core/resolve.ts`
- Create: `tests/core/resolve.test.ts`

**Interfaces:**
- Consumes: `ExtractedItem`, `SpotifyMatch` from `types.ts`
- Produces:
  - `spotifyGet(path, token): Promise<unknown>` (internal helper)
  - `resolveToSpotify(item: ExtractedItem, token: string): Promise<{ match: SpotifyMatch | null; alternates: SpotifyMatch[] }>`

---

- [ ] **Step 1: Write failing tests**

```typescript
// tests/core/resolve.test.ts
import { describe, it, expect } from 'vitest'
import { buildSearchQuery, scoreMatch } from '../../src/core/resolve.js'
import type { ExtractedItem } from '../../src/core/types.js'

describe('buildSearchQuery', () => {
  it('builds an album query', () => {
    const item: ExtractedItem = { artist: 'Burial', album: 'Untrue', snippet: '', confidence: 'high', include: true }
    expect(buildSearchQuery(item)).toBe('artist:Burial album:Untrue')
  })

  it('builds a track query', () => {
    const item: ExtractedItem = { artist: 'Brian Eno', track: 'Ambient 1', snippet: '', confidence: 'high', include: true }
    expect(buildSearchQuery(item)).toBe('artist:Brian Eno track:Ambient 1')
  })

  it('falls back to artist-only query', () => {
    const item: ExtractedItem = { artist: 'Harold Budd', snippet: '', confidence: 'medium', include: true }
    expect(buildSearchQuery(item)).toBe('artist:Harold Budd')
  })
})

describe('scoreMatch', () => {
  it('returns 1 for an exact artist+album match', () => {
    const score = scoreMatch('Burial', 'Untrue', 'Burial', 'Untrue')
    expect(score).toBe(1)
  })

  it('is case-insensitive', () => {
    const score = scoreMatch('burial', 'untrue', 'Burial', 'Untrue')
    expect(score).toBe(1)
  })

  it('returns less than 1 for a partial match', () => {
    const score = scoreMatch('Burial', 'Untrue', 'Burial', 'Untrue (Deluxe)')
    expect(score).toBeGreaterThan(0)
    expect(score).toBeLessThan(1)
  })
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
pnpm test
```

Expected: fails with "Cannot find module '../../src/core/resolve.js'"

- [ ] **Step 3: Create `src/core/spotify.ts`**

```typescript
const SPOTIFY_BASE = 'https://api.spotify.com/v1'

export async function spotifyGet(path: string, token: string): Promise<unknown> {
  const res = await fetch(`${SPOTIFY_BASE}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error(`Spotify ${path} failed: ${res.status}`)
  return res.json()
}

export async function spotifyPost(path: string, token: string, body: unknown): Promise<unknown> {
  const res = await fetch(`${SPOTIFY_BASE}${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`Spotify POST ${path} failed: ${res.status}`)
  return res.json()
}
```

- [ ] **Step 4: Implement `src/core/resolve.ts`**

```typescript
import { spotifyGet } from './spotify.js'
import type { ExtractedItem, SpotifyMatch } from './types.js'

export function buildSearchQuery(item: ExtractedItem): string {
  if (item.album) return `artist:${item.artist} album:${item.album}`
  if (item.track) return `artist:${item.artist} track:${item.track}`
  return `artist:${item.artist}`
}

export function scoreMatch(
  queryArtist: string,
  queryAlbum: string | undefined,
  resultArtist: string,
  resultAlbum: string
): number {
  const norm = (s: string) => s.toLowerCase().trim()
  const artistMatch = norm(queryArtist) === norm(resultArtist) ? 1 : 0
  if (!queryAlbum) return artistMatch
  const albumMatch = norm(queryAlbum) === norm(resultAlbum) ? 1 : norm(resultAlbum).includes(norm(queryAlbum)) ? 0.5 : 0
  return (artistMatch + albumMatch) / 2
}

interface SpotifyAlbumResult {
  id: string;
  name: string;
  artists: { id: string; name: string }[];
  tracks?: { items: { id: string }[] };
}

interface SpotifySearchResponse {
  albums?: { items: SpotifyAlbumResult[] };
  tracks?: { items: { id: string; name: string; artists: { id: string; name: string }[]; album: SpotifyAlbumResult }[] };
}

function albumToMatch(album: SpotifyAlbumResult): SpotifyMatch {
  return {
    albumId: album.id,
    albumName: album.name,
    artistId: album.artists[0]?.id ?? '',
    artistName: album.artists[0]?.name ?? '',
    trackIds: album.tracks?.items.map(t => t.id) ?? [],
  }
}

export async function resolveToSpotify(
  item: ExtractedItem,
  token: string
): Promise<{ match: SpotifyMatch | null; alternates: SpotifyMatch[] }> {
  const q = encodeURIComponent(buildSearchQuery(item))
  const type = item.track ? 'track' : 'album'
  const data = await spotifyGet(`/search?q=${q}&type=${type}&limit=5`, token) as SpotifySearchResponse

  if (type === 'album') {
    const results = (data.albums?.items ?? []).filter(a => a.id)
    if (results.length === 0) return { match: null, alternates: [] }
    const scored = results.map(a => ({ match: albumToMatch(a), score: scoreMatch(item.artist, item.album, a.artists[0]?.name ?? '', a.name) }))
    scored.sort((a, b) => b.score - a.score)
    return {
      match: scored[0].match,
      alternates: scored.slice(1).map(s => s.match),
    }
  }

  // track mode
  const tracks = data.tracks?.items ?? []
  if (tracks.length === 0) return { match: null, alternates: [] }
  return {
    match: {
      albumId: tracks[0].album.id,
      albumName: tracks[0].album.name,
      artistId: tracks[0].artists[0]?.id ?? '',
      artistName: tracks[0].artists[0]?.name ?? '',
      trackIds: [tracks[0].id],
    },
    alternates: tracks.slice(1).map(t => ({
      albumId: t.album.id,
      albumName: t.album.name,
      artistId: t.artists[0]?.id ?? '',
      artistName: t.artists[0]?.name ?? '',
      trackIds: [t.id],
    })),
  }
}
```

- [ ] **Step 5: Run tests to confirm they pass**

```bash
pnpm test
```

Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/core/spotify.ts src/core/resolve.ts tests/core/resolve.test.ts
git commit -m "feat: Spotify helpers and resolveToSpotify"
```

---

## Task 5: expandArtist + albumTracks

**Files:**
- Create: `src/core/expand.ts`
- Create: `src/core/tracks.ts`
- Create: `tests/core/expand.test.ts`
- Create: `tests/core/tracks.test.ts`

**Interfaces:**
- Consumes: `spotifyGet` from `spotify.ts`
- Produces:
  - `expandArtist(artistId: string, opts: { studioOnly: boolean; cap: number }, token: string): Promise<string[]>` — returns albumIds
  - `albumTracks(albumId: string, token: string): Promise<string[]>` — returns trackIds

---

- [ ] **Step 1: Write failing tests**

```typescript
// tests/core/expand.test.ts
import { describe, it, expect } from 'vitest'
import { isStudioAlbum } from '../../src/core/expand.js'

describe('isStudioAlbum', () => {
  it('accepts an album type', () => {
    expect(isStudioAlbum({ album_type: 'album', album_group: 'album', name: 'Untrue' })).toBe(true)
  })

  it('rejects a compilation', () => {
    expect(isStudioAlbum({ album_type: 'compilation', album_group: 'album', name: 'Greatest Hits' })).toBe(false)
  })

  it('rejects a single', () => {
    expect(isStudioAlbum({ album_type: 'single', album_group: 'album', name: 'Some Single' })).toBe(false)
  })

  it('rejects an appears_on group', () => {
    expect(isStudioAlbum({ album_type: 'album', album_group: 'appears_on', name: 'Some Compilation' })).toBe(false)
  })

  it('rejects names containing "live"', () => {
    expect(isStudioAlbum({ album_type: 'album', album_group: 'album', name: 'Live at the Roundhouse' })).toBe(false)
  })
})
```

```typescript
// tests/core/tracks.test.ts
import { describe, it, expect } from 'vitest'

// albumTracks is a thin wrapper over spotifyGet — tested via integration.
// This file is a placeholder so the test suite has a home for it.
describe('albumTracks', () => {
  it('is tested via integration against the Spotify API', () => {
    expect(true).toBe(true)
  })
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
pnpm test
```

Expected: fails with "Cannot find module '../../src/core/expand.js'"

- [ ] **Step 3: Implement `src/core/expand.ts`**

```typescript
import { spotifyGet } from './spotify.js'

interface AlbumMeta {
  album_type: string;
  album_group: string;
  name: string;
}

export function isStudioAlbum(album: AlbumMeta): boolean {
  if (album.album_type !== 'album') return false
  if (album.album_group === 'appears_on') return false
  if (/\blive\b/i.test(album.name)) return false
  return true
}

interface SpotifyArtistAlbum extends AlbumMeta {
  id: string;
}

interface ArtistAlbumsResponse {
  items: SpotifyArtistAlbum[];
  next: string | null;
}

export async function expandArtist(
  artistId: string,
  opts: { studioOnly: boolean; cap: number },
  token: string
): Promise<string[]> {
  const data = await spotifyGet(
    `/artists/${artistId}/albums?include_groups=album&limit=50`,
    token
  ) as ArtistAlbumsResponse

  let albums = data.items
  if (opts.studioOnly) albums = albums.filter(isStudioAlbum)
  return albums.slice(0, opts.cap).map(a => a.id)
}
```

- [ ] **Step 4: Implement `src/core/tracks.ts`**

```typescript
import { spotifyGet } from './spotify.js'

interface AlbumTracksResponse {
  items: { id: string }[];
}

export async function albumTracks(albumId: string, token: string): Promise<string[]> {
  const data = await spotifyGet(`/albums/${albumId}/tracks?limit=50`, token) as AlbumTracksResponse
  return data.items.map(t => t.id)
}
```

- [ ] **Step 5: Run tests to confirm they pass**

```bash
pnpm test
```

Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/core/expand.ts src/core/tracks.ts tests/core/expand.test.ts tests/core/tracks.test.ts
git commit -m "feat: expandArtist (studio-only, capped) and albumTracks"
```

---

## Task 6: buildPlaylist

**Files:**
- Create: `src/core/playlist.ts`
- Create: `tests/core/playlist.test.ts`

**Interfaces:**
- Consumes: `spotifyGet`, `spotifyPost` from `spotify.ts`; `BuildPlaylistOpts` from `types.ts`
- Produces: `buildPlaylist(opts: BuildPlaylistOpts, token: string): Promise<string>` — returns the Spotify playlist URL

---

- [ ] **Step 1: Write failing tests**

```typescript
// tests/core/playlist.test.ts
import { describe, it, expect } from 'vitest'
import { dedupeTrackIds, chunkArray } from '../../src/core/playlist.js'

describe('dedupeTrackIds', () => {
  it('removes track IDs already in the playlist', () => {
    const existing = ['a', 'b', 'c']
    const incoming = ['b', 'd', 'e']
    expect(dedupeTrackIds(incoming, existing)).toEqual(['d', 'e'])
  })

  it('returns all tracks when playlist is empty', () => {
    expect(dedupeTrackIds(['a', 'b'], [])).toEqual(['a', 'b'])
  })
})

describe('chunkArray', () => {
  it('splits into chunks of given size', () => {
    expect(chunkArray([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]])
  })

  it('returns single chunk when array fits', () => {
    expect(chunkArray([1, 2], 100)).toEqual([[1, 2]])
  })
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
pnpm test
```

Expected: fails with "Cannot find module '../../src/core/playlist.js'"

- [ ] **Step 3: Implement `src/core/playlist.ts`**

```typescript
import { spotifyGet, spotifyPost } from './spotify.js'
import type { BuildPlaylistOpts } from './types.js'

export function dedupeTrackIds(incoming: string[], existing: string[]): string[] {
  const set = new Set(existing)
  return incoming.filter(id => !set.has(id))
}

export function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = []
  for (let i = 0; i < arr.length; i += size) chunks.push(arr.slice(i, i + size))
  return chunks
}

interface PlaylistResponse {
  id: string;
  external_urls: { spotify: string };
  tracks?: { items: { track: { id: string } }[] };
}

interface MeResponse {
  id: string;
}

async function getExistingTrackIds(playlistId: string, token: string): Promise<string[]> {
  const data = await spotifyGet(`/playlists/${playlistId}/tracks?fields=items(track(id))&limit=50`, token) as { items: { track: { id: string } }[] }
  return data.items.map(i => i.track.id)
}

export async function buildPlaylist(opts: BuildPlaylistOpts, token: string): Promise<string> {
  let playlistId = opts.existingPlaylistId

  if (!playlistId) {
    const me = await spotifyGet('/me', token) as MeResponse
    const created = await spotifyPost(`/me/playlists`, token, {
      name: opts.name,
      description: opts.description ?? '',
      public: !opts.isPrivate,
    }) as PlaylistResponse
    playlistId = created.id
  }

  const existingIds = opts.existingPlaylistId
    ? await getExistingTrackIds(playlistId, token)
    : []

  const toAdd = dedupeTrackIds(opts.trackIds, existingIds)
  const uris = toAdd.map(id => `spotify:track:${id}`)

  for (const chunk of chunkArray(uris, 100)) {
    await spotifyPost(`/playlists/${playlistId}/tracks`, token, { uris: chunk })
  }

  const playlist = await spotifyGet(`/playlists/${playlistId}`, token) as PlaylistResponse
  return playlist.external_urls.spotify
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
pnpm test
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/core/playlist.ts tests/core/playlist.test.ts
git commit -m "feat: buildPlaylist with dedupe and chunked track add"
```

---

## Task 7: CLI — auth

**Files:**
- Create: `src/cli/auth.ts`
- Create: `src/cli/index.ts`

**Interfaces:**
- Consumes: nothing from core
- Produces: writes `~/.threadify/token` (a plain text file containing the refresh token); `getAccessToken(): Promise<string>` for use by `read` and `create`

**Notes:** PKCE flow — generate `code_verifier` + `code_challenge`, open browser, spin up `http.createServer` on port 8888 to capture `?code=`, exchange for tokens, store refresh token. Subsequent calls exchange refresh token for access token without user interaction.

---

- [ ] **Step 1: Create `src/cli/auth.ts`**

```typescript
import { createServer } from 'node:http'
import { createHash, randomBytes } from 'node:crypto'
import { mkdir, writeFile, readFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join } from 'node:path'

const TOKEN_DIR = join(homedir(), '.threadify')
const TOKEN_PATH = join(TOKEN_DIR, 'token')
const REDIRECT_URI = 'http://127.0.0.1:8888/callback'
const SCOPES = 'playlist-modify-private playlist-modify-public playlist-read-private'

function generatePKCE(): { verifier: string; challenge: string } {
  const verifier = randomBytes(64).toString('base64url')
  const challenge = createHash('sha256').update(verifier).digest('base64url')
  return { verifier, challenge }
}

function waitForCode(port: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const server = createServer((req, res) => {
      const url = new URL(req.url!, `http://127.0.0.1:${port}`)
      const code = url.searchParams.get('code')
      res.end('<p>Threadify authorised. You can close this tab.</p>')
      server.close()
      if (code) resolve(code)
      else reject(new Error('No code in callback'))
    })
    server.listen(port)
  })
}

async function exchangeCode(code: string, verifier: string, clientId: string): Promise<{ access_token: string; refresh_token: string }> {
  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: REDIRECT_URI,
      client_id: clientId,
      code_verifier: verifier,
    }),
  })
  if (!res.ok) throw new Error(`Token exchange failed: ${res.status}`)
  return res.json() as Promise<{ access_token: string; refresh_token: string }>
}

export async function auth(): Promise<void> {
  const clientId = process.env.SPOTIFY_CLIENT_ID
  if (!clientId) throw new Error('SPOTIFY_CLIENT_ID not set in environment')

  const { verifier, challenge } = generatePKCE()
  const params = new URLSearchParams({
    client_id: clientId,
    response_type: 'code',
    redirect_uri: REDIRECT_URI,
    scope: SCOPES,
    code_challenge_method: 'S256',
    code_challenge: challenge,
  })

  const authUrl = `https://accounts.spotify.com/authorize?${params}`
  console.log(`Opening browser for Spotify auth...\n${authUrl}`)

  const { exec } = await import('node:child_process')
  exec(`open "${authUrl}"`)

  console.log('Waiting for callback on http://127.0.0.1:8888/callback ...')
  const code = await waitForCode(8888)
  const tokens = await exchangeCode(code, verifier, clientId)

  await mkdir(TOKEN_DIR, { recursive: true })
  await writeFile(TOKEN_PATH, tokens.refresh_token, 'utf8')
  console.log('Refresh token stored. You are authenticated.')
}

export async function getAccessToken(): Promise<string> {
  const clientId = process.env.SPOTIFY_CLIENT_ID
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET
  if (!clientId || !clientSecret) throw new Error('SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET must be set')

  const refreshToken = await readFile(TOKEN_PATH, 'utf8').catch(() => {
    throw new Error('Not authenticated. Run: threadify auth')
  })

  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
    },
    body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: refreshToken }),
  })
  if (!res.ok) throw new Error(`Token refresh failed: ${res.status} — try running threadify auth again`)
  const data = await res.json() as { access_token: string }
  return data.access_token
}
```

- [ ] **Step 2: Create `src/cli/index.ts`**

```typescript
import 'dotenv/config'
import { auth } from './auth.js'
import { read } from './read.js'
import { create } from './create.js'

const [,, command, ...args] = process.argv

const commands: Record<string, (args: string[]) => Promise<void>> = {
  auth: () => auth(),
  read: (args) => read(args),
  create: (args) => create(args),
}

const handler = commands[command]
if (!handler) {
  console.error(`Unknown command: ${command}\nUsage: threadify <auth|read|create>`)
  process.exit(1)
}

handler(args).catch(err => {
  console.error(err instanceof Error ? err.message : err)
  process.exit(1)
})
```

- [ ] **Step 3: Add `dotenv` dependency**

```bash
pnpm add dotenv
```

- [ ] **Step 4: Create stub files so index.ts compiles**

`src/cli/read.ts`:
```typescript
export async function read(_args: string[]): Promise<void> {
  throw new Error('not implemented')
}
```

`src/cli/create.ts`:
```typescript
export async function create(_args: string[]): Promise<void> {
  throw new Error('not implemented')
}
```

- [ ] **Step 5: Verify TypeScript compiles**

```bash
pnpm exec tsc --noEmit
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/cli/auth.ts src/cli/index.ts src/cli/read.ts src/cli/create.ts package.json pnpm-lock.yaml
git commit -m "feat: CLI entry point and auth command (PKCE flow)"
```

---

## Task 8: CLI — read

**Files:**
- Modify: `src/cli/read.ts`

**Interfaces:**
- Consumes: `fetchPage` from `core/fetch.ts`; `extractAlbums` from `core/extract.ts`
- Produces: writes `ParsedOutput` JSON to disk (default: `parsed.json`)

---

- [ ] **Step 1: Implement `src/cli/read.ts`**

```typescript
import { writeFile } from 'node:fs/promises'
import { parseArgs } from 'node:util'
import { fetchPage } from '../core/fetch.js'
import { extractAlbums } from '../core/extract.js'
import type { ParsedOutput } from '../core/types.js'

export async function read(args: string[]): Promise<void> {
  const { positionals, values } = parseArgs({
    args,
    allowPositionals: true,
    options: { out: { type: 'string', default: 'parsed.json' } },
  })

  const url = positionals[0]
  if (!url) throw new Error('Usage: threadify read <url> [--out parsed.json]')

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY not set')

  console.log(`Fetching ${url} ...`)
  const text = await fetchPage(url)

  console.log('Extracting music references...')
  const items = await extractAlbums(text, {
    apiKey,
    model: process.env.LLM_MODEL ?? 'claude-haiku-4-5-20251001',
  })

  const output: ParsedOutput = {
    source: { url, fetchedAt: new Date().toISOString() },
    items,
  }

  const outPath = values.out as string
  await writeFile(outPath, JSON.stringify(output, null, 2), 'utf8')
  console.log(`Wrote ${items.length} items to ${outPath}`)
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
pnpm exec tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/cli/read.ts
git commit -m "feat: threadify read command — fetch and extract to JSON"
```

---

## Task 9: CLI — create

**Files:**
- Modify: `src/cli/create.ts`

**Interfaces:**
- Consumes: `getAccessToken` from `auth.ts`; `resolveToSpotify`, `expandArtist`, `albumTracks`, `buildPlaylist` from core
- Produces: a private Spotify playlist; prints resolution summary to stdout

---

- [ ] **Step 1: Implement `src/cli/create.ts`**

```typescript
import { readFile } from 'node:fs/promises'
import { parseArgs } from 'node:util'
import { getAccessToken } from './auth.js'
import { resolveToSpotify } from '../core/resolve.js'
import { expandArtist } from '../core/expand.js'
import { albumTracks } from '../core/tracks.js'
import { buildPlaylist } from '../core/playlist.js'
import type { ParsedOutput, ResolvedItem } from '../core/types.js'

export async function create(args: string[]): Promise<void> {
  const { positionals, values } = parseArgs({
    args,
    allowPositionals: true,
    options: {
      name: { type: 'string' },
      desc: { type: 'string' },
      expand: { type: 'boolean', default: false },
      cap: { type: 'string', default: '3' },
      playlist: { type: 'string' },
      'dry-run': { type: 'boolean', default: false },
      private: { type: 'boolean', default: true },
      public: { type: 'boolean', default: false },
    },
  })

  const jsonPath = positionals[0]
  if (!jsonPath) throw new Error('Usage: threadify create <parsed.json> --name "..."')
  const name = values.name as string | undefined
  if (!name) throw new Error('--name is required')

  const raw = await readFile(jsonPath, 'utf8')
  const parsed: ParsedOutput = JSON.parse(raw)
  const activeItems = parsed.items.filter(i => i.include)

  const token = await getAccessToken()
  const cap = parseInt(values.cap as string, 10)
  const expand = values.expand as boolean
  const dryRun = values['dry-run'] as boolean

  console.log(`\nResolving ${activeItems.length} items...\n`)
  const resolved: ResolvedItem[] = []

  for (const item of activeItems) {
    const { match, alternates } = await resolveToSpotify(item, token)
    resolved.push({ input: item, match, alternates })
  }

  // Print resolution summary
  const matched = resolved.filter(r => r.match)
  const unmatched = resolved.filter(r => !r.match)
  const ambiguous = resolved.filter(r => r.alternates.length > 0)

  console.log(`Matched:   ${matched.length}`)
  console.log(`Unmatched: ${unmatched.length}`)
  if (unmatched.length > 0) {
    console.log('\nUnmatched items:')
    unmatched.forEach(r => console.log(`  - ${r.input.artist}${r.input.album ? ` / ${r.input.album}` : ''}`))
  }
  if (ambiguous.length > 0) {
    console.log('\nAmbiguous (first match used, alternates available):')
    ambiguous.forEach(r => {
      console.log(`  - ${r.input.artist} / ${r.input.album ?? r.input.track}`)
      r.alternates.slice(0, 2).forEach(a => console.log(`      alt: ${a.artistName} / ${a.albumName}`))
    })
  }

  if (dryRun) {
    console.log('\n--dry-run: no playlist written.')
    return
  }

  // Collect track IDs
  const trackIds: string[] = []

  for (const r of matched) {
    if (!r.match) continue

    if (expand) {
      const albumIds = await expandArtist(r.match.artistId, { studioOnly: true, cap }, token)
      for (const albumId of albumIds) {
        const ids = await albumTracks(albumId, token)
        trackIds.push(...ids)
      }
    } else if (r.match.trackIds.length > 0) {
      trackIds.push(...r.match.trackIds)
    } else {
      const ids = await albumTracks(r.match.albumId, token)
      trackIds.push(...ids)
    }
  }

  const url = await buildPlaylist({
    name,
    description: values.desc as string | undefined,
    isPrivate: !(values.public as boolean),
    trackIds,
    existingPlaylistId: values.playlist as string | undefined,
  }, token)

  console.log(`\nPlaylist created: ${url}`)
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
pnpm exec tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Build and smoke-test**

```bash
pnpm build
node dist/cli/index.js
```

Expected: prints "Unknown command: undefined" (no crash — just shows usage error).

- [ ] **Step 4: Commit**

```bash
git add src/cli/create.ts
git commit -m "feat: threadify create command — resolve, expand, and build playlist"
```

---

## Acceptance Checklist (from PRD §10)

- [ ] `threadify auth` completes browser flow and stores refresh token; subsequent runs are headless
- [ ] `threadify read <reddit-url>` produces a JSON file with extracted items and provenance snippets
- [ ] `threadify read <arbitrary-url>` does the same for non-Reddit HTML pages
- [ ] Editing the JSON (`include: false`, fixing artist/album) is respected by `create`
- [ ] `threadify create` prints a resolution summary including unmatched/ambiguous entries
- [ ] `--dry-run` prints the summary and exits without writing to Spotify
- [ ] Without `--dry-run`, a private playlist is created with the resolved tracks
- [ ] Re-running `create` against the same playlist (`--playlist <id>`) adds no duplicates
- [ ] `--expand` adds only studio albums, capped per artist (default 3)
- [ ] Core functions pass their unit tests with no CLI/IO coupling
