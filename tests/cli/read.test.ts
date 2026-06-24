import { describe, expect, it } from "vitest";
import { resolveLLMConfigFromEnv } from "../../src/cli/read.js";

describe("resolveLLMConfigFromEnv", () => {
  it("defaults to Anthropic Haiku with ANTHROPIC_API_KEY", () => {
    expect(
      resolveLLMConfigFromEnv({
        ANTHROPIC_API_KEY: "anthropic-key",
      }),
    ).toEqual({
      provider: "anthropic",
      apiKey: "anthropic-key",
      model: "claude-haiku-4-5-20251001",
    });
  });

  it("uses OpenAI-compatible provider settings when configured", () => {
    expect(
      resolveLLMConfigFromEnv({
        LLM_PROVIDER: "openai-compatible",
        LLM_API_KEY: "provider-key",
        LLM_MODEL: "kimi-k2.6",
        LLM_BASE_URL: "https://api.moonshot.ai/v1",
      }),
    ).toEqual({
      provider: "openai-compatible",
      apiKey: "provider-key",
      model: "kimi-k2.6",
      baseUrl: "https://api.moonshot.ai/v1",
    });
  });
});
