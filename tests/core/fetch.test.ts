import { describe, it, expect } from "vitest";
import {
  redditUrlToJson,
  flattenRedditComments,
  stripHtml,
} from "../../src/core/fetch.js";

describe("redditUrlToJson", () => {
  it("appends .json to a bare reddit URL", () => {
    expect(
      redditUrlToJson("https://www.reddit.com/r/ambient/comments/abc123/title"),
    ).toBe(
      "https://www.reddit.com/r/ambient/comments/abc123/title.json?limit=500",
    );
  });

  it("appends .json to a URL with trailing slash", () => {
    expect(
      redditUrlToJson(
        "https://www.reddit.com/r/ambient/comments/abc123/title/",
      ),
    ).toBe(
      "https://www.reddit.com/r/ambient/comments/abc123/title.json?limit=500",
    );
  });

  it("leaves an already-.json URL alone", () => {
    expect(
      redditUrlToJson(
        "https://www.reddit.com/r/ambient/comments/abc123/title.json",
      ),
    ).toBe(
      "https://www.reddit.com/r/ambient/comments/abc123/title.json?limit=500",
    );
  });
});

describe("flattenRedditComments", () => {
  it("returns top-level comment body", () => {
    const comments = [{ body: "hello", replies: [] }];
    expect(flattenRedditComments(comments, 0)).toBe("hello");
  });

  it("indents replies one level", () => {
    const comments = [
      { body: "parent", replies: [{ body: "child", replies: [] }] },
    ];
    expect(flattenRedditComments(comments, 0)).toBe("parent\n  child");
  });

  it("indents nested replies two levels", () => {
    const comments = [
      {
        body: "parent",
        replies: [
          { body: "child", replies: [{ body: "grandchild", replies: [] }] },
        ],
      },
    ];
    expect(flattenRedditComments(comments, 0)).toBe(
      "parent\n  child\n    grandchild",
    );
  });
});

describe("stripHtml", () => {
  it("removes HTML tags", () => {
    expect(stripHtml("<p>Hello <b>world</b></p>")).toBe("Hello world");
  });

  it("decodes common HTML entities", () => {
    expect(stripHtml("rock &amp; roll")).toBe("rock & roll");
  });

  it("collapses whitespace", () => {
    expect(stripHtml("<p>foo</p>\n<p>bar</p>")).toBe("foo bar");
  });

  it("removes script element contents", () => {
    expect(
      stripHtml("<p>keep</p><script>var x = 1; doStuff();</script>"),
    ).toBe("keep");
  });

  it("removes style element contents", () => {
    expect(stripHtml("<style>.a{color:red}</style><p>keep</p>")).toBe("keep");
  });

  it("removes HTML comments", () => {
    expect(stripHtml("<!-- tracking pixel --><p>keep</p>")).toBe("keep");
  });
});
