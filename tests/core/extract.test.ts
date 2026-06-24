import { describe, it, expect, vi } from "vitest";
import {
  buildExtractionPrompt,
  createLLMProvider,
  createOpenAICompatibleProvider,
  parseExtractionResponse,
  parseWithRetry,
} from "../../src/core/extract.js";

describe("buildExtractionPrompt", () => {
  it("includes the input text", () => {
    const prompt = buildExtractionPrompt("Harold Budd is great");
    expect(prompt).toContain("Harold Budd is great");
  });

  it("instructs JSON output", () => {
    const prompt = buildExtractionPrompt("some text");
    expect(prompt.toLowerCase()).toContain("json");
  });
});

describe("parseExtractionResponse", () => {
  it("parses a valid JSON array of items", () => {
    const raw = JSON.stringify([
      {
        artist: "Harold Budd",
        album: "The Plateaux of Mirror",
        snippet: "Harold Budd is lovely",
        confidence: "high",
      },
    ]);
    const items = parseExtractionResponse(raw);
    expect(items).toHaveLength(1);
    expect(items[0].artist).toBe("Harold Budd");
    expect(items[0].include).toBe(true);
  });

  it("extracts JSON from markdown code fence", () => {
    const raw =
      '```json\n[{"artist":"Burial","album":"Untrue","snippet":"check out Burial","confidence":"high"}]\n```';
    const items = parseExtractionResponse(raw);
    expect(items[0].artist).toBe("Burial");
  });

  it("throws on unparseable JSON response", () => {
    expect(() => parseExtractionResponse("sorry I cannot help")).toThrow(
      "Failed to parse LLM extraction response as JSON",
    );
  });

  it("throws when response is not a JSON array", () => {
    expect(() => parseExtractionResponse('{"artist":"Eno"}')).toThrow(
      "LLM extraction response is not a JSON array",
    );
  });

  it("filters out items with empty artist", () => {
    const raw = JSON.stringify([
      { artist: "", album: "Unknown", snippet: "...", confidence: "low" },
      { artist: "Eno", snippet: "check out Eno", confidence: "medium" },
    ]);
    const items = parseExtractionResponse(raw);
    expect(items).toHaveLength(1);
    expect(items[0].artist).toBe("Eno");
  });

  it("defaults include to true", () => {
    const raw = JSON.stringify([
      { artist: "Eno", snippet: "check out Eno", confidence: "medium" },
    ]);
    const items = parseExtractionResponse(raw);
    expect(items[0].include).toBe(true);
  });
});

describe("parseWithRetry", () => {
  const valid = JSON.stringify([
    { artist: "Eno", snippet: "check out Eno", confidence: "high" },
  ]);

  it("returns parsed items when the first call succeeds", async () => {
    const callModel = vi.fn().mockResolvedValue(valid);
    const items = await parseWithRetry(callModel);
    expect(items[0].artist).toBe("Eno");
    expect(callModel).toHaveBeenCalledTimes(1);
  });

  it("retries once when the first response is unparseable", async () => {
    const callModel = vi
      .fn()
      .mockResolvedValueOnce("sorry I cannot help")
      .mockResolvedValueOnce(valid);
    const items = await parseWithRetry(callModel);
    expect(items[0].artist).toBe("Eno");
    expect(callModel).toHaveBeenCalledTimes(2);
  });

  it("throws if both attempts fail to parse", async () => {
    const callModel = vi.fn().mockResolvedValue("still not JSON");
    await expect(parseWithRetry(callModel)).rejects.toThrow(
      "Failed to parse LLM extraction response as JSON",
    );
    expect(callModel).toHaveBeenCalledTimes(2);
  });
});

describe("createLLMProvider", () => {
  it("uses Anthropic when no provider is configured", () => {
    const provider = createLLMProvider({
      apiKey: "key",
      model: "claude-haiku-4-5-20251001",
    });
    expect(provider.name).toBe("anthropic");
  });

  it("requires a base URL for OpenAI-compatible providers", () => {
    expect(() =>
      createLLMProvider({
        provider: "openai-compatible",
        apiKey: "key",
        model: "kimi-k2.6",
      }),
    ).toThrow("LLM_BASE_URL must be set");
  });
});

describe("createOpenAICompatibleProvider", () => {
  it("maps extraction prompts to an OpenAI-compatible chat completion request", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content:
                '[{"artist":"Burial","album":"Untrue","snippet":"Burial - Untrue","confidence":"high"}]',
            },
          },
        ],
      }),
    });
    const provider = createOpenAICompatibleProvider({
      apiKey: "key",
      baseUrl: "https://api.example.com/v1/",
      fetch: fetchImpl,
    });

    const raw = await provider.complete({
      model: "kimi-k2.6",
      prompt: "Extract JSON",
      maxTokens: 1024,
    });

    expect(raw).toContain("Burial");
    expect(fetchImpl).toHaveBeenCalledWith(
      "https://api.example.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: "Bearer key",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "kimi-k2.6",
          max_tokens: 1024,
          messages: [{ role: "user", content: "Extract JSON" }],
        }),
      },
    );
  });
});
