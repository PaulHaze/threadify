# Threadify — GUI Roadmap (WIP)

> Living concept doc for the Threadify desktop GUI. Focus: **UI/UX — screens, layouts,
> interactions.** Feature scope, framework, and architecture decisions live in
> `FEATURE_ROADMAP.md`; this doc owns *how it looks and feels*.
> Companion to `threadify_prd.md` (the CLI/core spec) and `CLAUDE.md` (working spec).
> This is a brainstorming surface — things will change. Nothing here is final.

## Status

- **Phase:** concept / pre-design. The CLI MVP is the prerequisite; the GUI is a thin
  shell over the *same* core library (see `CLAUDE.md` architecture rule).
- **Decided so far:**
  - Navigation: **linear wizard** — one full-window step at a time, big primary button
    advances, Back to revise.
  - Review model: **two distinct review gates** (extraction, then Spotify resolution).
  - Framework/platform (decided in `FEATURE_ROADMAP.md`): **Tauri**, cross-platform.
  - **Look & feel is platform-native, not a single house style.** A Mac build should
    look like a Mac app; a Linux build should respect the user's desktop theme; a Windows
    build should look like Windows. We design the **UX** (what's where, what it does) once;
    the **chrome** adapts per platform.
- **Source of truth for features:** `threadify_final_feature_list.txt` (raw brainstorm).
  This doc organizes that into a structured roadmap.

## Guiding UX principles

1. **The two review gates are the product.** The whole point is letting a human catch
   what the LLM and Spotify get wrong, with the least friction. Every UX decision serves
   "make it fast and obvious to spot and fix a bad row."
2. **Provenance always visible.** The user should never have to trust an extracted item
   blindly — the original source text that produced it is always one glance away.
3. **Nothing is written to Spotify without an explicit confirm.** Mirrors the CLI's
   review gate + `create` summary. No silent auto-guessing of ambiguous matches.
4. **Core stays pure.** The GUI calls the same `fetchPage` / `extractAlbums` /
   `resolveToSpotify` / `expandArtist` / `buildPlaylist` functions. No business logic
   lives in the UI — it only renders state and collects edits.
5. **UX is universal, chrome is native.** The *structure* — which actions exist, where
   they sit in the flow, what each does — is the same everywhere and is what we're nailing
   first. The *presentation* (controls, typography, window chrome, accent colour) follows
   each platform's conventions. Where a convention is genuinely platform-specific (button
   order, menu placement, traffic-light vs. min/max/close), the platform wins over
   consistency-across-platforms.

## The wizard flow

```
[1 Connect] → [2 Source] → [3 Screen extraction] → [4 Resolve on Spotify] → [5 Done]
   Gate 1 = step 3 (did the LLM read the text right?)
   Gate 2 = step 4 (did Spotify match the right release?)
```

Each step is a full window. A persistent slim progress indicator (top) shows the five
steps; completed steps are revisitable via Back without losing edits.

---

### Step 1 — Connect

**Goal:** get the user authenticated with Spotify (and, behind the scenes, confirm an LLM
key is configured).

- **"Log in with Spotify" button** — kicks off the PKCE browser flow, captures the
  loopback callback, stores the refresh token (Keychain). On success the button becomes a
  connected state (avatar / display name + "Connected").
- Blocked state: if not connected, the "Next" affordance is disabled with a clear reason.

#### First-run setup (the onboarding UI before the wizard proper)

Shown only when credentials are missing/invalid. This is the "make BYOK painless" surface
— the feature roadmap leans hard on it, so the UX has to carry it.

- **Guided, step-by-step panel** for creating a Spotify dev app: short instructions with
  links and screenshots, and **copy-paste fields** for Client ID/secret and the redirect
  URI (pre-filled with the correct loopback literal so the user can't fat-finger it).
- **LLM provider + key**: provider picker (Anthropic default / OpenAI-compatible), API key
  field, optional model/base-URL fields — mirrors the provider seam.
- **Validate before finishing:** a "Test connection" affordance that confirms the Spotify
  token works and pings the LLM cheaply, with clear pass/fail per credential. No dead-ends.
- Open question: how much of this is a one-time wizard vs. always reachable from Settings.

### Step 2 — Source

**Goal:** capture the URL and the intended playlist name.

- **URL input** — paste a Reddit thread or *any* page (music blog, DJ setlist, etc.).
  Light validation (looks like a URL). No scraping happens until submit.
- **Playlist name field** — required before proceeding (can still be edited later).
- *(Later)* Optional: description, private/public toggle, track-vs-album mode.
- **Submit / "Extract" button** — runs `fetchPage` → `extractAlbums`. Show a clear
  loading state (this is an LLM round-trip; could be a few seconds).

### Step 3 — Screen extraction *(Review Gate 1)*

**Goal:** let the user confirm the LLM read the source text correctly, before any Spotify
calls. **This is the split-screen step.**

**Layout: split screen.**
- **Left pane — source text** (read-only). The original fetched text. For Reddit,
  nesting preserved as indentation. Selecting/clicking a row on the right highlights the
  snippet it came from on the left (provenance link).
- **Right pane — extracted items**, a two-column **Artist | Album** (or **Track**) table.

**Per-row interactions:**
- **Inline edit** of artist and album/track fields (LLM mistakes, e.g. treating "Also"
  as an album title).
- **Swap button** — a small ⇄ control in the middle of each row (appears on hover) to
  flip Artist ↔ Album when the LLM got the order backwards.
- **Include toggle** — keep/skip the row (maps to the JSON `include` flag).
- **Confidence indicator** — advisory only (LLM-reported); low-confidence rows visually
  flagged so the eye goes to them first.
- **Add row manually** — for something the user knows the LLM missed.
- *(Open)* Delete row vs. just toggling include — decide one canonical "remove" gesture.

**Worked examples (from the brainstorm):**

> Source: *"Also by Bill Evans. Nights of ballads and blues by McCoy Tyner."*
> Extracted:
> - `Bill Evans — Also`  ← user fixes/skips ("Also" is not an album)
> - `McCoy Tyner — Nights of Ballads and Blues`

> Source: *"Can't go wrong with Chet Baker… Especially … The Touch of Your Lips and This Is Always."*
> Extracted:
> - `Chet Baker — The Touch of Your Lips`
> - `Chet Baker — This Is Always`

**Primary action:** **Confirm extraction →** sends the cleaned list to Spotify resolution.

### Step 4 — Resolve on Spotify *(Review Gate 2)*

**Goal:** confirm Spotify matched the right release for each item, and assemble the final
track set. Runs `resolveToSpotify` (+ optional `expandArtist` / `albumTracks`).

**Layout idea: tabbed.** (From the brainstorm — exact tabs TBD.)
- **Playlist tab** — the list of submitted Artist/Album items, each paired with its
  matched Spotify result:
  - **Album/track thumbnail** + matched title/artist next to each submitted item.
  - **Show only the best match by default**, with a **"more options"** expander to pick
    an alternate when the match is wrong or ambiguous *(needs Spotify Search to return +
    surface alternates — flagged as an API task)*.
  - **Delete** the whole item/album.
  - **Edit & re-resolve** — fix a typo or swap album↔single intent and re-run resolution
    for just that row (e.g. got a single named *X* when the user wanted the album *X*).
  - **Unmatched / ambiguous** items clearly called out, never silently dropped.
- **Tracks tab** *(tentative)* — the flattened tracklist that will actually be added
  (since playlists hold tracks, not albums). Useful when `--expand`-style album expansion
  is on. Open question: is a separate Tracks tab worth it for MVP-GUI, or noise?

**Primary action:** **Create playlist** — only here does `buildPlaylist` write to Spotify
(create/append + dedupe). A pre-write summary (counts, unmatched) echoes the CLI's
behaviour.

### Step 5 — Done

**Goal:** confirm success and offer next actions.

- Success confirmation + **"Open in Spotify"** link to the new playlist.
- Summary: N tracks added, M skipped as duplicates, K unmatched.
- **Start another** (reset to Step 2) without re-authenticating.

---

## Cross-cutting UI concerns (to flesh out)

- **Loading & long-running states:** scraping + LLM extraction (step 2→3) and resolution
  (step 3→4) are async and can take seconds. Need clear progress, and cancel.
- **Error handling:** fetch failures (dead URL, Reddit rate limit), LLM errors/timeouts,
  Spotify auth expiry mid-flow, zero items extracted. Each needs a non-dead-end UX.
- **Empty/edge states:** page with no music in it; everything low-confidence; all rows
  unmatched on Spotify.
- **Editing safety:** Back/revise must not silently discard edits made in a later step.
- **Settings surface:** keys, default private/public, expand cap, LLM provider/model
  (the PRD's provider seam) — probably a separate settings panel, not in the wizard.

## Platform-native look & feel

The deliberate stance: **nail the UX once, let each platform supply the look.** We are not
designing a single branded skin — we're designing *behaviour and placement*, then letting
the app feel at home on whatever OS it's running on.

What stays the same on every platform (this is what we're nailing first):
- The five-step flow and the two review gates.
- Which actions exist and what they do (extract, swap, include/skip, edit & re-search,
  delete, create playlist).
- The information hierarchy on each screen (source vs. extracted; submitted vs. matched).

What adapts per platform (defer to OS convention, don't fight it):
- **Primary/secondary button order.** macOS puts the confirming button on the **right**
  (e.g. `Cancel | Confirm`); Windows and most Linux/GNOME conventions put it on the
  **left** (`Confirm | Cancel`). Our wizard's "Back / Next" pair must follow the host
  platform — so the roadmap describes buttons by **role** (primary-advance,
  secondary-back, destructive), never by fixed screen position.
- **Window chrome & controls:** traffic-light buttons + unified titlebar on macOS;
  standard min/max/close on Windows; whatever the user's Linux desktop theme dictates.
- **Native widgets where they matter:** file pickers, menus, system fonts, accent colour,
  light/dark following the OS setting.

> Tauri renders the UI in a webview, so "native" here means **theming to match platform
> conventions** (system font stack, accent colour, control styling, button order), not
> literal OS widgets. The cost of getting this right is real and is called out as a build
> consideration in `FEATURE_ROADMAP.md`. Revisit specifics with the `frontend-design`
> skill once the UX is locked.

## Open questions

- How much first-run onboarding (keys, Spotify app setup) lives in the GUI vs. assumed
  pre-configured from `.env`?
- Single canonical "remove a row" gesture — include-toggle vs. delete — pick one.
- Is the **Tracks tab** in step 4 worth it for the first GUI, or does it just add noise?
- Album-vs-track default when a thread mixes both (also an open PRD question).
- Surfacing Spotify **alternate matches**: how many, ranked how? Needs Search-side work.
- Multi-comment suggestion stitching (artist named up-thread, album named in a reply) —
  a core/LLM concern, but it affects how provenance highlighting works in Gate 1.
- Re-running against an **existing playlist** (append + dedupe) — where does choosing the
  target playlist fit in the wizard?

## Explicitly out of scope (for now)

- Non-macOS builds (revisit if/when we go cross-platform).
- In-app playback / previews.
- Genre tagging, playlist art generation, audio features (Spotify removed those anyway).
- Multi-user / accounts / shared backend — stays single-user BYOK.
