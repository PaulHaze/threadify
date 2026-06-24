# Task 10 — LLM provider seam

**Date:** 2026-06-25

## What was done

Added a small LLM provider seam around the extraction step so Threadify can keep Anthropic/Haiku as the default while also supporting OpenAI-compatible model APIs such as Kimi, GLM, DeepSeek, OpenRouter, Together, or Groq. The rest of the pipeline still consumes the same `ExtractedItem[]` output from `extractAlbums`.

## Files modified

- `src/core/types.ts`
  - Extended `LLMConfig` with optional `provider` and `baseUrl` fields
  - Supported provider values are `anthropic` and `openai-compatible`

- `src/core/extract.ts`
  - Added `LLMProvider` interface with a single `complete(...)` method
  - Added `createLLMProvider(...)` factory
  - Added Anthropic provider implementation as the default
  - Added OpenAI-compatible provider implementation that calls `/chat/completions`
  - Kept existing prompt building, parsing, retry, chunking, and dedupe behavior intact
  - Preserved parse-error behavior while attaching the original caught error as `cause`

- `src/cli/read.ts`
  - Added `resolveLLMConfigFromEnv(...)` to map environment variables into `LLMConfig`
  - Default behavior remains Anthropic Haiku via `ANTHROPIC_API_KEY`
  - Added support for generic provider settings via `LLM_PROVIDER`, `LLM_API_KEY`, `LLM_MODEL`, and `LLM_BASE_URL`

- `.env.example`
  - Documented the default Anthropic setup
  - Added commented examples for OpenAI-compatible provider configuration

- `tests/core/extract.test.ts`
  - Added tests for default Anthropic provider selection
  - Added tests for missing OpenAI-compatible base URL validation
  - Added tests for OpenAI-compatible chat completion request mapping

- `tests/cli/read.test.ts`
  - Added tests for default Anthropic env resolution
  - Added tests for OpenAI-compatible env resolution

## Verification

- `pnpm test` — 48 tests passed
- `pnpm build` — no errors
- `pnpm lint` — no errors
