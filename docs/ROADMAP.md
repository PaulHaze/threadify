# Threadify — Roadmap

> Companion to `threadify_prd.md` (MVP) and `CLAUDE.md` (working spec).
> Captures the direction *after* the MVP CLI ships. Last updated 2026-06-25.

## Product stance (settled)

Threadify stays **open-source, BYOK, single-user, local-only — permanently.**
There is no hosted service, no shared backend, no managed keys.

Every user supplies and stores locally:

- Their **own Spotify developer app** (Client ID/secret + loopback redirect URI).
- Their **own LLM API key** (Anthropic by default, any OpenAI-compatible provider).

Secrets never leave the user's machine. If someone wants to fork this into a paid
multi-tenant product, they're welcome to — that work is explicitly out of scope here.

### Why no shared Spotify access point (decision record)

Investigated June 2026 and rejected. Spotify's **Extended Quota Mode** — the only way
to let arbitrary users log in through one shared app — now requires *all* of: a
legally registered business entity (individuals barred since 15 May 2025), an active
launched service, and **≥ 250,000 monthly active users**. That's a chicken-and-egg
wall no indie/hobby project can clear. Development Mode (Feb 2026) is also capped at
**5 users per app** and requires the app owner to hold Spotify Premium. Conclusion:
BYO-Spotify-dev-app is not a temporary limitation — it is the permanent model.
The roadmap's job is to make that setup *painless*, not to remove it.

## End-goal experience

A user on Mac, Windows, or Linux:

1. Downloads a single installer/executable from GitHub Releases.
2. Runs it. A **first-run setup wizard** walks them through pasting their Spotify
   app credentials and LLM key (with links/screenshots for creating the Spotify app).
3. Clicks **Log in with Spotify** once (system browser, PKCE loopback flow).
4. From then on: paste a URL → review the extracted tracks in a split-screen editor →
   create the playlist. Everything stays local.

## Technology decision

**Framework: Tauri** (cross-platform — one codebase builds Mac/Windows/Linux).
Fallback: Electron if the Rust toolchain proves too painful (reuses the Node core
verbatim at the cost of a ~130 MB binary).

Rationale: the existing core/shell architecture already isolates the Node-specific
seams (secret storage, OAuth callback server, file IO) as shell concerns, so Tauri's
native equivalents drop into the shell layer without touching core. The PKCE loopback
auth flow from the CLI works unchanged in a desktop shell.

The TypeScript **core library is reused unchanged.** Only new shell adapters are
written per the existing architecture rule.

---

## Phase 1 — CLI MVP *(current, per PRD)*

Ship the two-stage CLI with the JSON review gate. Acceptance criteria in
`threadify_prd.md §10`. **This must be green before any GUI work.**

## Phase 2 — Cross-platform GUI (Tauri)

Build the desktop shell around the existing core. Same pipeline, visual review gate.

### 2a. Foundation
- [ ] Scaffold Tauri app; wire the TS core into the webview context.
- [ ] Shell adapters: secure secret storage (OS keychain via Tauri plugin),
      local config, OAuth loopback callback handling.
- [ ] Settings screen: Spotify Client ID/secret + redirect URI, LLM provider/key/model,
      default expand cap, private/public default.

### 2b. First-run setup wizard
- [ ] Detect missing credentials → guided wizard.
- [ ] Step-by-step Spotify dev-app creation help (links, screenshots, copy-paste fields).
- [ ] LLM key + provider selection.
- [ ] **Log in with Spotify** button → PKCE loopback → store refresh token in keychain.
- [ ] Validate credentials before finishing (test Spotify token + a cheap LLM ping).

### 2c. Core flow UI
- [ ] URL input + fetch/extract with progress states (fetching → extracting).
- [ ] **Split-screen review gate**: editable table of extracted items —
      artist/album/track fields, `include` toggles, confidence badge, source snippet,
      unmatched/ambiguous flagged. (This *is* the GUI form of the JSON review gate.)
- [ ] Resolve + dry-run preview (what would be added) before any write.
- [ ] Create / append-to-existing playlist; show dedupe results.
- [ ] Expand controls (studio-only, per-artist cap) surfaced as UI options.

## Phase 3 — Distribution & polish

### 3a. Build & release
- [ ] GitHub Actions matrix build → Mac (`.dmg`), Windows (`.msi`/`.exe`),
      Linux (`.AppImage` + `.deb`).
- [ ] Tagged GitHub Releases with downloadable artifacts.
- [ ] Auto-update (Tauri updater) — optional.

### 3b. Trust & install friction (BYOK reality)
- [ ] Mac: code-sign + notarize (Apple Developer ID, ~$99/yr) **or** document the
      right-click-open Gatekeeper workaround.
- [ ] Windows: code-signing cert **or** document the SmartScreen "Run anyway" path.
- [ ] Linux: no signing drama; document AppImage/deb install.

### 3c. Robustness
- [ ] Friendly error surfaces: bad/expired key, Spotify rate limit, expired refresh
      token (re-auth prompt), zero matches.
- [ ] In-app help linking to the install/setup docs.

## Phase 4 — Nice-to-haves (unordered backlog)

- [ ] Pasted-text / drag-drop input (no URL needed).
- [ ] Local cache of resolved artist/album → Spotify IDs (faster re-runs).
- [ ] Local LLM via Ollama as a first-class zero-cost provider.
- [ ] Cross-comment suggestion resolution (PRD §12 open question — artist named in a
      top-level comment, tracks/albums suggested in nested replies).
- [ ] Playlist art / description niceties.

## Out of scope (forever, for this repo)

- Hosted/multi-tenant service, shared backend, managed LLM keys.
- Shared Spotify access point / Extended Quota Mode (see decision record above).
- Monetization. (A fork is free to pursue any of the above — MIT licence.)

## Cross-cutting docs commitment

Because all setup burden stays with the user, **excellent install/setup docs are a
first-class deliverable**, not an afterthought: a README + a step-by-step "create your
Spotify app" guide + "get an LLM key" guide, with screenshots, surfaced both in the
repo and inside the app's setup wizard.
