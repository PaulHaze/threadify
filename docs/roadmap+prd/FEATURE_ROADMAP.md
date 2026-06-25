# Threadify — Feature Roadmap

> **Scope:** features, frameworks, and architecture decisions for the direction *after*
> the MVP CLI ships. **All UI/UX detail (screens, layouts, interactions) lives in
> `GUI_ROADMAP.md`** — this doc points there rather than duplicating it.
> Companion to `threadify_prd.md` (MVP) and `CLAUDE.md` (working spec). Last updated 2026-06-25.

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
3. Authenticates with Spotify once (system browser, PKCE loopback flow).
4. From then on: paste a URL → review/correct the extracted tracks → create the
   playlist. Everything stays local. *(Screen-by-screen UX in `GUI_ROADMAP.md`.)*

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

**Platform-native look & feel is a product goal** (see `GUI_ROADMAP.md`): the app should
feel like a Mac app on macOS, a Windows app on Windows, and respect the user's theme on
Linux. Because Tauri renders in a webview, this is achieved by *theming to match each
platform's conventions* (system font stack, accent colour, control styling, button order,
light/dark following the OS) rather than literal native widgets. Budget for this: a small
per-platform theming layer in the shell, plus platform detection. It does not affect core.

### Repository structure (one repo, light monorepo)

The GUI lives **in this repo** — one product, one MIT licence, and the architecture rule
depends on the Tauri frontend consuming the *same* core, so co-location is what keeps that
cheap and verifiable. No second repo.

When the GUI lands, `core` is promoted from a folder inside the CLI package to a standalone
workspace package both shells depend on **identically**. That's what physically enforces
"core has zero interface-specific code" — if the desktop frontend can only import core the
same way the CLI does, core can't accidentally grow CLI/Node coupling.

Target layout:

```
threadify/
├─ packages/
│  └─ core/            # @threadify/core — today's src/core, logic unchanged
├─ apps/
│  ├─ cli/             # today's src/cli
│  └─ desktop/         # Tauri app
│     ├─ src-tauri/    # Rust shell: keychain, OAuth loopback server, file IO
│     └─ src/          # web frontend (Vite + framework), imports @threadify/core
└─ pnpm-workspace.yaml # packages: ["packages/*", "apps/*"]
```

**Execution-context split (Tauri):** the frontend runs in a **webview (browser JS), not
Node**, so core functions divide by what they need —
- *Pure/networked* (`fetchPage`, `extractAlbums`, `resolveToSpotify`, Spotify search) run
  in the webview; they're already on native `fetch`.
- *OS-privileged* (refresh-token keychain, OAuth loopback callback server, local file IO)
  run on the **Rust side**, exposed as Tauri commands — these are the Phase 2a shell
  adapters. Core is unaffected either way.

**Timing:** do the reorg as the **first task of Phase 2**, after the CLI MVP is green —
not now. The trigger for the monorepo is literally "a second shell exists"; doing it
earlier just adds churn while the MVP is unfinished. The move itself is mostly `git mv`
plus wiring three `package.json`s and the workspace globs.

---

## Phase 1 — CLI MVP *(current, per PRD)*

Ship the two-stage CLI with the JSON review gate. Acceptance criteria in
`threadify_prd.md §10`. **This must be green before any GUI work.**

## Phase 2 — Cross-platform GUI (Tauri)

Build the desktop shell around the existing core. Same pipeline, same review gates, now
visual. **This section tracks capabilities and the shell/core seams only — the screens,
layouts, and interactions are specified in `GUI_ROADMAP.md`.**

**Sequencing:** cross-platform is the end goal, but **macOS ships first** — it's the
primary development platform and where the UX gets nailed. Windows/Linux builds and their
native theming follow once the macOS experience is solid.

### 2a. Foundation (architecture)
- [ ] **Monorepo reorg** (first task): promote `src/core` → `packages/core`
      (`@threadify/core`), move `src/cli` → `apps/cli`, set workspace globs. See
      *Repository structure* above.
- [ ] Scaffold Tauri app under `apps/desktop`; wire the TS core into the webview context.
- [ ] Shell adapters for the Node-specific seams: secure secret storage (OS keychain via
      Tauri plugin), local config persistence, OAuth loopback callback handling.
- [ ] Config layer for the values the GUI exposes: Spotify Client ID/secret + redirect
      URI, LLM provider/key/model, default expand cap, private/public default.

### 2b. First-run setup (capabilities)
- [ ] Detect missing/invalid credentials and route to first-run onboarding.
- [ ] PKCE loopback auth from the desktop shell → store refresh token in the OS keychain.
- [ ] Provider/key selection wired to the existing LLM provider seam.
- [ ] Credential validation before completion (test Spotify token + a cheap LLM ping).

### 2c. Core flow (capabilities)
- [ ] Wire URL → `fetchPage` → `extractAlbums` with progress/cancel states.
- [ ] Visual review gates over the *same* data the CLI's JSON gate exposes — no new
      business logic, the UI only renders state and collects edits.
- [ ] `resolveToSpotify` + dry-run preview (what would be added) before any write.
- [ ] `buildPlaylist`: create / append-to-existing + dedupe; surface results.
- [ ] Expand controls (studio-only, per-artist cap) exposed as options.

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
