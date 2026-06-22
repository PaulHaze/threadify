import { describe, it, expect } from "vitest";
import {
  buildExtractionPrompt,
  parseExtractionResponse,
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

  it("returns empty array for unparseable response", () => {
    expect(parseExtractionResponse("sorry I cannot help")).toEqual([]);
  });

  it("defaults include to true", () => {
    const raw = JSON.stringify([
      { artist: "Eno", snippet: "check out Eno", confidence: "medium" },
    ]);
    const items = parseExtractionResponse(raw);
    expect(items[0].include).toBe(true);
  });
});
