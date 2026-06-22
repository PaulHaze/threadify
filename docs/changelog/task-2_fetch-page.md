# Task 2 — fetchPage

**Date:** 2026-06-22
**Branch:** fetch-page

## What was done

Implemented the `fetchPage` core function with full TDD. Also added ESLint + Prettier linting during this branch.

## Files created / modified

### Core implementation
- `src/core/fetch.ts` — `fetchPage(url)` with two paths:
  - **Reddit URLs**: appends `.json?limit=500`, fetches the post + comments listing, flattens nested comments to indented plain text so the LLM can resolve partial suggestions (e.g. a track reply that refers to an artist named in the parent comment)
  - **Generic URLs**: fetches HTML and strips tags/entities to plain text
  - Exported helpers: `redditUrlToJson`, `flattenRedditComments`, `stripHtml`

### Tests
- `tests/core/fetch.test.ts` — 9 unit tests covering:
  - `redditUrlToJson`: bare URL, trailing slash, already-.json URL
  - `flattenRedditComments`: single comment, one level of replies, two levels of nesting
  - `stripHtml`: tag removal, entity decoding, whitespace collapse

### Linting setup (added during this branch)
- `eslint.config.mjs` — flat config ESLint 9 with `typescript-eslint` and `eslint-config-prettier`, scoped to `src/**/*.ts`
- `prettier.config.mjs` — `singleQuote`, `trailingComma: all`, `semi`, 80 col / 2 space
- `.prettierignore` — excludes `pnpm-lock.yaml`, `tests/fixtures/`, `docs/`, `*.md`
- `package.json` — added `lint`, `format`, `format:check` scripts

## Verification

- `pnpm lint` — no errors
- `pnpm format:check` — all files conformant
- `pnpm test` — 9 tests passed

## Commits

- `691f939` add a fetch function to grab url
- `d59b254` add linting
