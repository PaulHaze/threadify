import { describe, it, expect } from "vitest";
import { isStudioAlbum } from "../../src/core/expand.js";

describe("isStudioAlbum", () => {
  it("accepts an album type", () => {
    expect(
      isStudioAlbum({ album_type: "album", album_group: "album", name: "Untrue" }),
    ).toBe(true);
  });

  it("rejects a compilation", () => {
    expect(
      isStudioAlbum({
        album_type: "compilation",
        album_group: "album",
        name: "Greatest Hits",
      }),
    ).toBe(false);
  });

  it("rejects a single", () => {
    expect(
      isStudioAlbum({
        album_type: "single",
        album_group: "album",
        name: "Some Single",
      }),
    ).toBe(false);
  });

  it("rejects an appears_on group", () => {
    expect(
      isStudioAlbum({
        album_type: "album",
        album_group: "appears_on",
        name: "Some Compilation",
      }),
    ).toBe(false);
  });

  it("rejects names containing 'live'", () => {
    expect(
      isStudioAlbum({
        album_type: "album",
        album_group: "album",
        name: "Live at the Roundhouse",
      }),
    ).toBe(false);
  });
});
