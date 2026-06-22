import { describe, it, expect } from "vitest";
import { buildSearchQuery, scoreMatch } from "../../src/core/resolve.js";
import type { ExtractedItem } from "../../src/core/types.js";

describe("buildSearchQuery", () => {
  it("builds an album query", () => {
    const item: ExtractedItem = {
      artist: "Burial",
      album: "Untrue",
      snippet: "",
      confidence: "high",
      include: true,
    };
    expect(buildSearchQuery(item)).toBe("artist:Burial album:Untrue");
  });

  it("builds a track query", () => {
    const item: ExtractedItem = {
      artist: "Brian Eno",
      track: "Ambient 1",
      snippet: "",
      confidence: "high",
      include: true,
    };
    expect(buildSearchQuery(item)).toBe("artist:Brian Eno track:Ambient 1");
  });

  it("falls back to artist-only query", () => {
    const item: ExtractedItem = {
      artist: "Harold Budd",
      snippet: "",
      confidence: "medium",
      include: true,
    };
    expect(buildSearchQuery(item)).toBe("artist:Harold Budd");
  });
});

describe("scoreMatch", () => {
  it("returns 1 for an exact artist+album match", () => {
    const score = scoreMatch("Burial", "Untrue", "Burial", "Untrue");
    expect(score).toBe(1);
  });

  it("is case-insensitive", () => {
    const score = scoreMatch("burial", "untrue", "Burial", "Untrue");
    expect(score).toBe(1);
  });

  it("returns less than 1 for a partial match", () => {
    const score = scoreMatch("Burial", "Untrue", "Burial", "Untrue (Deluxe)");
    expect(score).toBeGreaterThan(0);
    expect(score).toBeLessThan(1);
  });
});
