# Task 7 — CLI auth command

**Date:** 2026-06-25

## What was done

Added the CLI entry point and the `threadify auth` command. Auth implements the full Spotify PKCE flow: generates a code verifier/challenge, opens the browser to the Spotify authorisation URL, spins up a local HTTP server to capture the `?code=` callback, exchanges it for tokens, and stores the refresh token at `~/.threadify/token`. Subsequent commands call `getAccessToken()` which exchanges the stored refresh token for a short-lived access token without user interaction. Stub files for `read` and `create` are included so the entry point compiles.

## Files created

- `src/cli/auth.ts`
  - `generatePKCE()` — produces a random `code_verifier` and its SHA-256 `code_challenge` (base64url encoded)
  - `waitForCode(port)` — spins up a one-shot HTTP server, captures the `?code=` query param from the Spotify callback, closes the server, resolves the promise
  - `exchangeCode(code, verifier, clientId)` — POSTs to `https://accounts.spotify.com/api/token` to exchange the auth code for access + refresh tokens
  - `auth()` — orchestrates the full flow; writes refresh token to `~/.threadify/token`
  - `getAccessToken()` — reads stored refresh token and exchanges it for a fresh access token; used by `read` and `create`

- `src/cli/index.ts` — CLI entry point; loads `.env`, dispatches to `auth` / `read` / `create` by argv, exits with error message on failure

- `src/cli/read.ts` — stub (throws "not implemented"); implemented in Task 8
- `src/cli/create.ts` — stub (throws "not implemented"); implemented in Task 9

## Dependencies added

- `dotenv` — loads `.env` at CLI startup

## Verification

- `pnpm exec tsc --noEmit` — no errors
- `pnpm test` — 31 tests passed (all prior suites unchanged)
